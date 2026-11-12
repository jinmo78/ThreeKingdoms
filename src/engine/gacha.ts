// 장수 등용(가챠)
import { RECRUITABLE } from '../data/generals';
import type { GeneralDef, Rarity } from '../types';

export const PULL_COST = { single: 100, ten: 900 } as const;
export const RATES: Record<Rarity, number> = { SSR: 0.05, SR: 0.25, R: 0.7 };

function rollRarity(rng: () => number): Rarity {
  const r = rng();
  if (r < RATES.SSR) return 'SSR';
  if (r < RATES.SSR + RATES.SR) return 'SR';
  return 'R';
}

function pickOf(rarity: Rarity, rng: () => number): GeneralDef {
  const pool = RECRUITABLE.filter((g) => g.rarity === rarity);
  return pool[Math.floor(rng() * pool.length)];
}

/** 10연 등용은 마지막 1회에 SR 이상 확정 */
export function rollGenerals(count: number, rng: () => number = Math.random): GeneralDef[] {
  const out: GeneralDef[] = [];
  for (let i = 0; i < count; i++) out.push(pickOf(rollRarity(rng), rng));
  if (count >= 10 && out.every((g) => g.rarity === 'R')) {
    out[count - 1] = pickOf(rng() < RATES.SSR / (RATES.SSR + RATES.SR) ? 'SSR' : 'SR', rng);
  }
  return out;
}
