// ============================================================
// 부대 프로필 — 장수 3명의 능력치를 슬롯 가중치로 합산
// ============================================================
import type { GeneralDef, Rarity, Slot, StatKey, Stats, Troop } from '../types';
import { SLOTS, STRATEGIST_INDEX } from '../types';
import { calcSynergy, type SynergyResult } from './synergy';

/** 표시 등급별 레벨 상한. R→SR→SSR 품계마다 리셋해 다시 키운다. */
export const LEVEL_CAP: Record<Rarity, number> = { R: 50, SR: 100, SSR: 150 };
/** @deprecated 호환용. 상한은 maxLevel(shownRarity(...))를 쓴다. */
export const MAX_LEVEL = LEVEL_CAP.SSR;
export const MAX_STARS = 5;
export const PROMOTE_COST = { SR: 800, SSR: 2000 } as const;

export function maxLevel(rarity: Rarity): number {
  return LEVEL_CAP[rarity];
}

/** 태생 기준 품계 최대 횟수. R는 두 번(SR→SSR), SR는 한 번, SSR는 0. */
export function maxPromote(base: Rarity): number {
  if (base === 'R') return 2;
  if (base === 'SR') return 1;
  return 0;
}

/** 승급 후 보여줄 등급. promote 단계만큼 올라간다. */
export function shownRarity(base: Rarity, promote = 0): Rarity {
  const steps = Math.max(0, promote ?? 0);
  if (base === 'R') return steps >= 2 ? 'SSR' : steps >= 1 ? 'SR' : 'R';
  if (base === 'SR') return steps >= 1 ? 'SSR' : 'SR';
  return 'SSR';
}

/** 지금 표시 등급에서 한 단계 위. SSR이면 null. */
export function promoteTarget(base: Rarity, promote = 0): 'SR' | 'SSR' | null {
  const shown = shownRarity(base, promote);
  if (shown === 'R') return 'SR';
  if (shown === 'SR') return 'SSR';
  return null;
}

/** 레벨당 +4%, 돌파(★)당 +4%. 품계는 배율 없이 상한만 연다. */
export function effectiveStats(def: GeneralDef, level: number, stars: number, _promote = 0): Stats {
  const m = (1 + (level - 1) * 0.04) * (1 + stars * 0.04);
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
  /** 이 장수가 전법을 쓸 때 위력 배율에 더한다. 장비. */
  skillPower?: number;
  /** 부대 전법 발동률에 더한다. 장비. */
  skillRateAdd?: number;
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

/** 토벌 각인 등 전투력 배율을 능력·병력·전투력에 곱한다. */
export function applyImprint(p: UnitProfile, bonus: number): UnitProfile {
  if (bonus <= 0) return p;
  const m = 1 + bonus;
  return {
    ...p,
    atk: p.atk * m,
    intel: p.intel * m,
    def: p.def * m,
    hp: Math.round(p.hp * m),
    power: Math.round(p.power * m),
  };
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
  // 주장 전법 발동률: 기본 + 참모 지력 + 장비(서책)
  const strategistInt = members[STRATEGIST_INDEX]?.stats.int ?? 0;
  const gearRate = members.reduce((sum, m) => sum + (m?.skillRateAdd ?? 0), 0);
  const skillRate = Math.min(0.7, commander.def.skill.rate + strategistInt * 0.001 + gearRate);

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
