// ============================================================
// 공성 — 부대 부상과 성 수비대 피해
// ------------------------------------------------------------
// · 출정한 부대의 남은 병력, 공격받은 성 수비대의 남은 병력을 비율(0~1)로 저장
// · 회복은 시간이 지나면 저절로 — 저장된 시각으로 그때그때 계산 (타이머 없음)
// · 순수 함수: 저장소(localStorage)와 무관
// ============================================================

import type { Unit } from '../types';
import type { Tactic } from './tactics';

/** 행군 중인 부대. 도착 시각(eta)이 지나면 전투가 풀린다. */
export interface March {
  id: string;
  stageId: string;
  /** 출발 시점의 부대 편성 (이후 편성을 바꿔도 영향 없음) */
  units: Unit[];
  /** 출발할 때 고른 전술 (비용은 출발 때 냈다) */
  tactic: Tactic;
  from: number;
  eta: number;
}
export const MAX_MARCHES = 3;
/** 행군 시간 — 지도 위 성이 멀수록(스테이지 번호가 클수록) 오래 걸린다 */
export const marchMs = (stageIndex: number) => (10 + stageIndex * 3) * 1000;

export interface Wound {
  /** 기록 시점의 남은 병력 비율 (0~1) */
  r: number;
  /** 기록 시각 (ms) */
  t: number;
}
export type Wounds = Record<string, Wound>;

/** 병력 0에서 가득 찰 때까지 걸리는 시간 */
export const SQUAD_RECOVER_MS = 3 * 60_000;
export const GARRISON_RECOVER_MS = 15 * 60_000;
/** 이 비율 미만의 부대는 출정할 수 없다 */
export const MIN_SORTIE = 0.1;

/** 부대는 주장 기준으로 구분한다 (편성 칸 순서를 바꿔도 부상이 사라지지 않게) */
export const squadKey = (commanderId: string) => `u:${commanderId}`;
export const garrisonKey = (stageId: string, index: number) => `c:${stageId}:${index}`;

export function ratioOf(wounds: Wounds, key: string, now: number, fullMs: number): number {
  const w = wounds[key];
  if (!w) return 1;
  return Math.min(1, Math.max(0, w.r + Math.max(0, now - w.t) / fullMs));
}

/** 새 비율을 기록한다. 거의 가득 찼으면 기록을 지운다. */
export function withRatio(wounds: Wounds, key: string, ratio: number, now: number): Wounds {
  const next = { ...wounds };
  if (ratio >= 0.999) delete next[key];
  else next[key] = { r: Math.max(0, ratio), t: now };
  return next;
}

/** 성의 수비대 기록을 모두 지운다 (점령) */
export function clearGarrison(wounds: Wounds, stageId: string): Wounds {
  const prefix = `c:${stageId}:`;
  const next: Wounds = {};
  for (const [k, v] of Object.entries(wounds)) if (!k.startsWith(prefix)) next[k] = v;
  return next;
}

/** 이미 다 회복된 기록은 버린다 */
export function pruneWounds(wounds: Wounds, now: number): Wounds {
  const next: Wounds = {};
  for (const [k, v] of Object.entries(wounds)) {
    const full = k.startsWith('u:') ? SQUAD_RECOVER_MS : GARRISON_RECOVER_MS;
    if (ratioOf(wounds, k, now, full) < 0.999) next[k] = v;
  }
  return next;
}
