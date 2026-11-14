// 장수 등용(가챠)
import { RECRUITABLE } from '../data/generals';
import type { GeneralDef, Rarity } from '../types';

export const PULL_COST = { single: 100, ten: 900 } as const;
/** 하루 등용 횟수. 1회는 1칸, 10연은 10칸을 쓴다 */
export const DAILY_PULLS = 10;
/** 돌파 ★5 이후 중복 환급. 등용 비용(100·900)을 되돌리지 않을 만큼만 */
export const DUPLICATE_REFUND = { SSR: 30, SR: 12, R: 5 } as const;
export const RATES: Record<Rarity, number> = { SSR: 0.05, SR: 0.25, R: 0.7 };

export function todayKey(now = new Date()) {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

/** 오늘 남은 등용 횟수. 날짜가 바뀌면 다시 DAILY_PULLS */
export function pullsRemaining(day: string | undefined, used: number | undefined, now = new Date()) {
  if (day !== todayKey(now)) return DAILY_PULLS;
  return Math.max(0, DAILY_PULLS - (used ?? 0));
}

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
