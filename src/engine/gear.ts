// 장비 능력치 · 성장 비용. 전투 프로필과 저장소가 같이 쓴다.
import { GEAR_MAP, type GearDef } from '../data/gear';
import type { GearSlot, OwnedGear, OwnedGeneral, Rarity, Stats } from '../types';
import type { UnitMember } from './unit';

export const GEAR_MAX_LEVEL = 10;
export const GEAR_MAX_ENHANCE = 5;
export const GEAR_PROMOTE_SHARDS = 5;

const RANK: Rarity[] = ['R', 'SR', 'SSR'];
const BASE: Record<Rarity, number> = { R: 4, SR: 8, SSR: 14 };

export type GearBag = Record<string, OwnedGear>;

export function gearRarity(def: GearDef, promote: number): Rarity {
  return RANK[Math.min(RANK.length - 1, RANK.indexOf(def.rarity) + Math.max(0, promote))];
}

export function gearPromoteLeft(def: GearDef, promote: number) {
  return RANK.length - 1 - RANK.indexOf(gearRarity(def, promote));
}

/** 현재 등급의 고정 능력 + 레벨(2레벨마다 +1) + 강화마다 +1 */
export function gearBonus(def: GearDef, owned: OwnedGear) {
  return BASE[gearRarity(def, owned.promote)] + Math.floor((owned.level - 1) / 2) + owned.enhance;
}

export function withGear(member: UnitMember, owned: OwnedGeneral | undefined, bag: GearBag): UnitMember {
  const add = gearStats(owned, bag);
  if (!add.war && !add.int && !add.lead) return member;
  return {
    ...member,
    stats: { war: member.stats.war + add.war, int: member.stats.int + add.int, lead: member.stats.lead + add.lead },
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
  return { level: 1, enhance: 0, promote: 0, shards: 0 };
}

/** 없으면 새로 넣고, 있으면 파편 +1 */
export function grantGear(bag: GearBag, id: string): { bag: GearBag; drop: { name: string; isNew: boolean } | null } {
  const def = GEAR_MAP[id];
  if (!def) return { bag, drop: null };
  const cur = bag[id];
  if (!cur) return { bag: { ...bag, [id]: emptyOwnedGear() }, drop: { name: def.name, isNew: true } };
  return { bag: { ...bag, [id]: { ...cur, shards: cur.shards + 1 } }, drop: { name: def.name, isNew: false } };
}

export function wearerOf(roster: Record<string, OwnedGeneral>, gearId: string): string | null {
  for (const [id, owned] of Object.entries(roster)) {
    if (owned.gear && Object.values(owned.gear).includes(gearId)) return id;
  }
  return null;
}

export function equipOn(roster: Record<string, OwnedGeneral>, generalId: string | null, gearId: string) {
  const def = GEAR_MAP[gearId];
  if (!def) return roster;
  const slot: GearSlot = def.slot;
  const next: Record<string, OwnedGeneral> = {};
  for (const [id, owned] of Object.entries(roster)) {
    const gear = { ...(owned.gear ?? {}) };
    if (gear[slot] === gearId) delete gear[slot];
    if (id === generalId) gear[slot] = gearId;
    next[id] = { ...owned, gear };
  }
  return next;
}
