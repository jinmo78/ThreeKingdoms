// ============================================================
// 부대 프로필 — 장수 3명의 능력치를 슬롯 가중치로 합산
// ============================================================
import type { GeneralDef, Rarity, Slot, StatKey, Stats, Troop } from '../types';
import { SLOTS, STRATEGIST_INDEX } from '../types';
import { calcSynergy, type SynergyResult } from './synergy';

export const MAX_LEVEL = 40;
export const MAX_STARS = 5;
/** 품계를 한 단계 올리면 능력치 +10%. 태생 R·SR만 가능하고 SSR은 그대로다. */
export const PROMOTE_BONUS = 0.1;
export const PROMOTE_COST = { SR: 800, SSR: 2000 } as const;

/** 승급 후 보여줄 등급. promote가 0이면 태생 등급. */
export function shownRarity(base: Rarity, promote = 0): Rarity {
  if ((promote ?? 0) < 1) return base;
  if (base === 'R') return 'SR';
  if (base === 'SR') return 'SSR';
  return 'SSR';
}

/** 한 단계 위 등급. SSR은 더 오르지 않는다. */
export function promoteTarget(base: Rarity): 'SR' | 'SSR' | null {
  if (base === 'R') return 'SR';
  if (base === 'SR') return 'SSR';
  return null;
}

/** 레벨당 +4%, 돌파(★)당 +4%, 품계 승급 시 +10% */
export function effectiveStats(def: GeneralDef, level: number, stars: number, promote = 0): Stats {
  const m = (1 + (level - 1) * 0.04) * (1 + stars * 0.04) * (1 + ((promote ?? 0) > 0 ? PROMOTE_BONUS : 0));
  return {
    war: Math.round(def.stats.war * m),
    int: Math.round(def.stats.int * m),
    lead: Math.round(def.stats.lead * m),
  };
}

export function expToNext(level: number) {
  return 30 + level * 20;
}

export interface UnitMember {
  def: GeneralDef;
  level: number;
  stars: number;
  promote: number;
  stats: Stats;
}

export interface UnitProfile {
  /** SLOTS 순서 [주장, 부장, 부장, 참모, 보좌, 보좌] */
  members: (UnitMember | null)[];
  name: string;
  troop: Troop;
  hp: number;
  atk: number;
  intel: number;
  def: number;
  speed: number;
  skillRate: number;
  synergy: SynergyResult;
  power: number;
}

// 슬롯별 능력 반영 비율: 주장은 무력·통솔, 참모는 지력 위주
const AIDE = { war: 0.15, int: 0.15, lead: 0.15, hp: 3 };
const SLOT_WEIGHT: Record<Slot, Record<StatKey, number> & { hp: number }> = {
  commander: { war: 1.0, int: 0.4, lead: 1.0, hp: 16 },
  vice1: { war: 0.5, int: 0.25, lead: 0.4, hp: 7 },
  vice2: { war: 0.5, int: 0.25, lead: 0.4, hp: 7 },
  strategist: { war: 0.2, int: 1.0, lead: 0.3, hp: 6 },
  aide1: AIDE,
  aide2: AIDE,
};

export function makeMember(def: GeneralDef, level: number, stars: number, promote = 0): UnitMember {
  return { def, level, stars, promote: promote ?? 0, stats: effectiveStats(def, level, stars, promote) };
}

/** 주장이 없으면 null */
export function buildProfile(members: (UnitMember | null)[]): UnitProfile | null {
  const commander = members[0];
  if (!commander) return null;

  let atk = 0;
  let intel = 0;
  let def = 0;
  let hp = 300;
  SLOTS.forEach((slot, i) => {
    const m = members[i];
    if (!m) return;
    const w = SLOT_WEIGHT[slot];
    atk += m.stats.war * w.war;
    intel += m.stats.int * w.int;
    def += m.stats.lead * w.lead;
    hp += m.stats.lead * w.hp;
  });

  const synergy = calcSynergy(members.map((m) => m?.def ?? null));
  const troop = commander.def.troop;
  const speed = 10 + intel * 0.02 + (troop === 'cavalry' ? 2 : 0);
  // 주장 전법 발동률: 기본 + 참모 지력 보정
  const strategistInt = members[STRATEGIST_INDEX]?.stats.int ?? 0;
  const skillRate = Math.min(0.6, commander.def.skill.rate + strategistInt * 0.001);

  const power = Math.round((atk + intel * 0.8 + def * 0.8) * synergy.powerMult * 2 + hp * 0.2);

  return {
    members,
    name: `${commander.def.name} 부대`,
    troop,
    hp: Math.round(hp),
    atk,
    intel,
    def,
    speed,
    skillRate,
    synergy,
    power,
  };
}
