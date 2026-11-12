// 병과 상성 분석 — 부대 병과(= 주장 병과) 기준
import { troopMatchup } from '../data/meta';
import type { Troop } from '../types';

export const TROOPS: Troop[] = ['cavalry', 'infantry', 'archer'];

export interface MatchupCount {
  adv: number;
  dis: number;
}

/** 내 병과 하나가 적 부대들을 상대로 우위/열세인 수 */
export function matchupVs(mine: Troop, enemies: Troop[]): MatchupCount {
  let adv = 0;
  let dis = 0;
  for (const e of enemies) {
    const m = troopMatchup(mine, e);
    if (m === 'adv') adv++;
    else if (m === 'dis') dis++;
  }
  return { adv, dis };
}

export interface EnemyBrief {
  troop: Troop;
  power: number;
  name: string;
}

export interface TroopAdvice {
  /** 적 주장 병과별 부대 수 */
  enemyCounts: Record<Troop, number>;
  /** 병과별 점수: 우위인 적 부대 전투력 합 - 열세인 적 부대 전투력 합 */
  scores: Record<Troop, number>;
  /** 점수가 가장 높은 병과들 (순서 무관) */
  best: Troop[];
  /** 적 병과가 고르게 섞여 어느 병과도 확실히 유리하지 않음 */
  balanced: boolean;
  /** 적이 한 병과에 몰려 있어 상성이 크게 작용함 */
  lopsided: boolean;
  /** 가장 강한 적 부대와 그 부대에 유리한 병과 */
  strongest: EnemyBrief;
  strongestCounter: Troop;
}

/**
 * 추천 병과: 각 병과를 주장으로 세웠을 때 유리한 적 부대 전투력 합에서 불리한 적 부대 전투력 합을 뺀 값이 가장 큰 병과.
 * 전투력으로 가중하므로 적이 1병과씩 섞여 있어도 강한 적 부대 쪽으로 기운다.
 */
export function troopAdvice(enemies: EnemyBrief[]): TroopAdvice {
  const enemyCounts = { cavalry: 0, infantry: 0, archer: 0 } as Record<Troop, number>;
  for (const e of enemies) enemyCounts[e.troop]++;
  const total = enemies.reduce((s, e) => s + e.power, 0) || 1;
  const scores = {} as Record<Troop, number>;
  for (const t of TROOPS) {
    scores[t] = 0;
    for (const e of enemies) {
      const m = matchupVs(t, [e.troop]);
      scores[t] += (m.adv - m.dis) * e.power;
    }
  }
  const top = Math.max(...TROOPS.map((t) => scores[t]));
  // 최고점과 5% 이내면 공동 추천
  const best = TROOPS.filter((t) => scores[t] >= top - total * 0.05);
  const strongest = enemies.reduce((a, b) => (b.power > a.power ? b : a));
  const strongestCounter = TROOPS.find((t) => matchupVs(t, [strongest.troop]).adv > 0)!;
  return {
    enemyCounts,
    scores,
    best,
    balanced: top < total * 0.15,
    lopsided: Math.max(...TROOPS.map((t) => enemyCounts[t])) >= Math.max(2, Math.ceil(enemies.length * 0.66)),
    strongest,
    strongestCounter,
  };
}

export function briefOf(p: { troop: Troop; power: number; name: string }): EnemyBrief {
  return { troop: p.troop, power: p.power, name: p.name };
}

/** 우위/열세 판정 문구 등급 */
export function matchupGrade(m: MatchupCount): 'good' | 'bad' | 'even' {
  if (m.adv > m.dis) return 'good';
  if (m.dis > m.adv) return 'bad';
  return 'even';
}
