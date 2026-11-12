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

export interface TroopAdvice {
  /** 적 주장 병과별 부대 수 */
  enemyCounts: Record<Troop, number>;
  /** 병과별 점수 (우위 +1, 열세 -1) */
  scores: Record<Troop, number>;
  /** 점수가 가장 높은 병과들 */
  best: Troop[];
  /** 적이 한 병과로 쏠려 있어 상성이 크게 작용하는지 */
  lopsided: boolean;
}

export function troopAdvice(enemies: Troop[]): TroopAdvice {
  const enemyCounts = { cavalry: 0, infantry: 0, archer: 0 } as Record<Troop, number>;
  for (const e of enemies) enemyCounts[e]++;
  const scores = {} as Record<Troop, number>;
  for (const t of TROOPS) {
    const m = matchupVs(t, enemies);
    scores[t] = m.adv - m.dis;
  }
  const top = Math.max(...TROOPS.map((t) => scores[t]));
  return {
    enemyCounts,
    scores,
    best: TROOPS.filter((t) => scores[t] === top),
    lopsided: Math.max(...TROOPS.map((t) => enemyCounts[t])) >= Math.max(2, Math.ceil(enemies.length * 0.66)),
  };
}

/** 우위/열세 판정 문구 등급 */
export function matchupGrade(m: MatchupCount): 'good' | 'bad' | 'even' {
  if (m.adv > m.dis) return 'good';
  if (m.dis > m.adv) return 'bad';
  return 'even';
}
