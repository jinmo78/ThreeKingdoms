// 편성 저장·불러오기가 쓰는 금화. 배치한 장수의 등급을 더한다.
import { GENERAL_MAP } from '../data/generals';
import type { Rarity, Unit } from '../types';
import { SLOTS } from '../types';
import { shownRarity } from './unit';

export const FORMATION_GOLD: Record<Rarity, number> = { R: 10, SR: 20, SSR: 30 };
/** 적군 맞춤 편성 한 번. 저장보다 비싸고 승급보다는 싸다. */
export const COUNTER_GOLD = 200;
export const PRESET_LIMIT = 6;
/** v5 편성 포인트 1점 → 금화. 등급 비용이 10배가 된 것과 같다. */
export const LEGACY_POINT_GOLD = 10;

type RosterPromote = Record<string, { promote?: number } | undefined>;

export function generalGold(id: string, promote = 0) {
  const def = GENERAL_MAP[id];
  if (!def) return 0;
  return FORMATION_GOLD[shownRarity(def.rarity, promote)];
}

export function unitGold(unit: Unit, roster: RosterPromote) {
  let n = 0;
  for (const slot of SLOTS) {
    const id = unit[slot];
    if (id) n += generalGold(id, roster[id]?.promote ?? 0);
  }
  return n;
}

export function formationGold(units: Unit[], roster: RosterPromote) {
  return units.reduce((sum, unit) => sum + unitGold(unit, roster), 0);
}

/** 불러오기는 저장의 절반 */
export function presetLoadCost(units: Unit[], roster: RosterPromote) {
  const n = formationGold(units, roster);
  if (n <= 0) return 0;
  return Math.ceil(n / 2);
}
