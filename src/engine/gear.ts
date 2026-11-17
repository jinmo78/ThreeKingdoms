// 장비 능력치 · 성장 비용. 전투 프로필과 저장소가 같이 쓴다.
import { GEAR_MAP, type GearDef } from '../data/gear';
import type { GearSlot, OwnedGear, OwnedGeneral, Rarity, Stats } from '../types';
import type { UnitMember } from './unit';

export const GEAR_MAX_LEVEL = 10;
export const GEAR_MAX_ENHANCE = 5;
export const GEAR_PROMOTE_SHARDS = 5;
/** 같은 장비를 출진 인원만큼 모을 수 있다. 3부대 × 6칸. */
export const GEAR_COPY_MAX = 18;

const RANK: Rarity[] = ['R', 'SR', 'SSR'];
const BASE: Record<Rarity, number> = { R: 4, SR: 8, SSR: 14 };

export type GearBag = Record<string, OwnedGear>;

export function gearRarity(def: GearDef, promote: number): Rarity {
  return RANK[Math.min(RANK.length - 1, RANK.indexOf(def.rarity) + Math.max(0, promote))];
}

export function gearPromoteLeft(def: GearDef, promote: number) {
  return RANK.length - 1 - RANK.indexOf(gearRarity(def, promote));
}

/** 현재 등급의 고정 능력 + 레벨(2레벨마다 +1) + 강화마다 +1. 전법형은 능력치가 절반이다. */
export function gearBonus(def: GearDef, owned: OwnedGear) {
  const base = BASE[gearRarity(def, owned.promote)] + Math.floor((owned.level - 1) / 2) + owned.enhance;
  return def.focus === 'skill' ? Math.max(2, Math.floor(base / 2)) : base;
}

/** 무기를 끼운 장수가 전법을 쓰면 위력이 오르고, 서책은 부대 전법 발동률이 오른다. */
export function gearSkill(def: GearDef, owned: OwnedGear): { power: number; rate: number } {
  const rank = gearRarity(def, owned.promote);
  const scale = def.focus === 'skill' ? 1.6 : 1;
  const power = (rank === 'SSR' ? 0.08 : rank === 'SR' ? 0.05 : 0.03) * scale;
  const rate = (rank === 'SSR' ? 0.03 : rank === 'SR' ? 0.02 : 0.01) * scale;
  if (def.slot === 'tome') return { power: 0, rate };
  if (def.slot === 'armor') return { power: power * 0.5, rate: 0 };
  return { power, rate: 0 };
}

export function withGear(member: UnitMember, owned: OwnedGeneral | undefined, bag: GearBag): UnitMember {
  const add = gearStats(owned, bag);
  let skillPower = 0;
  let skillRateAdd = 0;
  if (owned?.gear) {
    for (const id of Object.values(owned.gear)) {
      if (!id) continue;
      const def = GEAR_MAP[id];
      const item = bag[id];
      if (!def || !item) continue;
      const sk = gearSkill(def, item);
      skillPower += sk.power;
      skillRateAdd += sk.rate;
    }
  }
  if (!add.war && !add.int && !add.lead && !skillPower && !skillRateAdd) return member;
  return {
    ...member,
    stats: { war: member.stats.war + add.war, int: member.stats.int + add.int, lead: member.stats.lead + add.lead },
    skillPower,
    skillRateAdd,
  };
}

export function gearStats(owned: OwnedGeneral | undefined, bag: GearBag): Stats {
  const add: Stats = { war: 0, int: 0, lead: 0 };
  if (!owned?.gear) return add;
  for (const id of Object.values(owned.gear)) {
    if (!id) continue;
    const def = GEAR_MAP[id];
    const item = bag[id];
    if (!def || !item) continue;
    add[def.stat] += gearBonus(def, item);
  }
  return add;
}

export function gearLevelCost(level: number) {
  return 20 * level;
}
export function gearEnhanceCost(enhance: number) {
  return 60 * (enhance + 1);
}
export function gearPromoteCost(next: 'SR' | 'SSR') {
  return next === 'SR' ? 250 : 600;
}

export function emptyOwnedGear(): OwnedGear {
  return { level: 1, enhance: 0, promote: 0, shards: 0, count: 1 };
}

export function gearCount(item: OwnedGear | undefined) {
  return Math.min(GEAR_COPY_MAX, Math.max(1, item?.count ?? 1));
}

/** 없으면 1개, 상한 미만이면 1개 추가, 상한이면 파편 +1 */
export function grantGear(bag: GearBag, id: string): { bag: GearBag; drop: { name: string; isNew: boolean; copy?: boolean } | null } {
  const def = GEAR_MAP[id];
  if (!def) return { bag, drop: null };
  const cur = bag[id];
  if (!cur) return { bag: { ...bag, [id]: emptyOwnedGear() }, drop: { name: def.name, isNew: true } };
  if (gearCount(cur) < GEAR_COPY_MAX) {
    return { bag: { ...bag, [id]: { ...cur, count: gearCount(cur) + 1 } }, drop: { name: def.name, isNew: false, copy: true } };
  }
  return { bag: { ...bag, [id]: { ...cur, shards: cur.shards + 1 } }, drop: { name: def.name, isNew: false } };
}

export function wearersOf(roster: Record<string, OwnedGeneral>, gearId: string): string[] {
  const ids: string[] = [];
  for (const [id, owned] of Object.entries(roster)) {
    if (owned.gear && Object.values(owned.gear).includes(gearId)) ids.push(id);
  }
  return ids;
}

/** generalId가 있으면 그 장수에게 끼운다. 빈 개수가 없으면 다른 장수에게서 하나 옮긴다. null이면 전원에게서 벗긴다. */
export function equipOn(roster: Record<string, OwnedGeneral>, generalId: string | null, gearId: string, count = 1) {
  const def = GEAR_MAP[gearId];
  if (!def) return roster;
  const slot: GearSlot = def.slot;
  const others = wearersOf(roster, gearId).filter((id) => id !== generalId);
  const steal = generalId && others.length >= count ? others[0] : null;
  const next: Record<string, OwnedGeneral> = {};
  for (const [id, owned] of Object.entries(roster)) {
    const gear = { ...(owned.gear ?? {}) };
    if (!generalId && gear[slot] === gearId) delete gear[slot];
    if (id === steal && gear[slot] === gearId) delete gear[slot];
    if (id === generalId) gear[slot] = gearId;
    next[id] = { ...owned, gear };
  }
  return next;
}

export function unequipOne(roster: Record<string, OwnedGeneral>, generalId: string, gearId: string) {
  const owned = roster[generalId];
  if (!owned?.gear) return roster;
  const gear = { ...owned.gear };
  for (const slot of Object.keys(gear) as GearSlot[]) {
    if (gear[slot] === gearId) delete gear[slot];
  }
  return { ...roster, [generalId]: { ...owned, gear } };
}
