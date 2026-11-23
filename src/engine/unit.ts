// ============================================================
// 부대 프로필 — 장수 능력치를 슬롯·진형 가중치로 합산
// ============================================================
import { DEFAULT_FORMATION_ID, formationOf, type FormationId } from '../data/formations';
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
  /** 적용된 진형 */
  formationId: FormationId;
  formationName: string;
  /** 전법 위력 배율 (안행진 등) */
  skillPowerMul: number;
  /** 일반 공격 피해 배율 */
  attackMul: number;
  /** 시작 행동 게이지 보너스 (봉시진 선공) */
  gaugeBonus: number;
  /** 연쇄 확률 가산 (우결진 = 인연 수 × 비율) */
  chainBonus: number;
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

/** 100% 반영 시 역할 모양. 진형 scale을 곱해 실제 가중치가 된다. 참모는 고정. */
const ROLE_SHAPE = {
  commander: { war: 1.0, int: 0.4, lead: 1.0, hp: 16 },
  vice: { war: 1.0, int: 0.5, lead: 0.8, hp: 14 },
  aide: { war: 1.0, int: 1.0, lead: 1.0, hp: 30 },
} as const;
const STRATEGIST_WEIGHT = { war: 0.2, int: 1.0, lead: 0.3, hp: 6 };

function slotWeight(slot: Slot, scale: { commander: number; vice: number; aide: number }): Record<StatKey, number> & { hp: number } {
  if (slot === 'strategist') return STRATEGIST_WEIGHT;
  if (slot === 'commander') {
    const s = scale.commander;
    const sh = ROLE_SHAPE.commander;
    return { war: sh.war * s, int: sh.int * s, lead: sh.lead * s, hp: sh.hp * s };
  }
  if (slot === 'vice1' || slot === 'vice2') {
    const s = scale.vice;
    const sh = ROLE_SHAPE.vice;
    return { war: sh.war * s, int: sh.int * s, lead: sh.lead * s, hp: sh.hp * s };
  }
  const s = scale.aide;
  const sh = ROLE_SHAPE.aide;
  return { war: sh.war * s, int: sh.int * s, lead: sh.lead * s, hp: sh.hp * s };
}

export function makeMember(def: GeneralDef, level: number, stars: number, promote = 0): UnitMember {
  return { def, level, stars, promote: promote ?? 0, stats: effectiveStats(def, level, stars, promote) };
}

/** 주장이 없으면 null. formationId 없으면 기본진. */
export function buildProfile(
  members: (UnitMember | null)[],
  formationId: FormationId | string | null | undefined = DEFAULT_FORMATION_ID,
): UnitProfile | null {
  const commander = members[0];
  if (!commander) return null;
  const form = formationOf(formationId as FormationId);

  let atk = 0;
  let intel = 0;
  let def = 0;
  let hp = 300;
  SLOTS.forEach((slot, i) => {
    const m = members[i];
    if (!m) return;
    const w = slotWeight(slot, form.scale);
    atk += m.stats.war * w.war;
    intel += m.stats.int * w.int;
    def += m.stats.lead * w.lead;
    hp += m.stats.lead * w.hp;
  });

  const fx = form.combat;
  atk *= fx.atkMul;
  def *= fx.defMul;
  hp *= fx.hpMul;

  const synergy = calcSynergy(members.map((m) => m?.def ?? null));
  const troop = commander.def.troop;
  const speed = 10 + intel * 0.02 + (troop === 'cavalry' ? 2 : 0);
  const strategistInt = members[STRATEGIST_INDEX]?.stats.int ?? 0;
  const gearRate = members.reduce((sum, m) => sum + (m?.skillRateAdd ?? 0), 0);
  const skillRate = Math.min(0.7, commander.def.skill.rate + strategistInt * 0.001 + gearRate);

  const bondCount = synergy.list.filter((s) => s.kind === 'bond').length;
  const chainBonus = fx.chainPerBond > 0 ? bondCount * fx.chainPerBond : 0;

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
    formationId: form.id,
    formationName: form.name,
    skillPowerMul: fx.skillPowerMul,
    attackMul: fx.attackMul,
    gaugeBonus: fx.gaugeBonus,
    chainBonus,
  };
}
