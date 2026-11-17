// ============================================================
// 내정 — 점령한 성의 금화 수입
// ------------------------------------------------------------
// · 성마다 시간당 수입이 쌓이고(최대 8시간분), 징수할 때 금화로 받는다
// · 내정 투자로 성 레벨을 올리면 수입이 늘고, 수비 부대를 두면 +25%
// · 쌓인 양은 마지막 징수 시각으로 계산 (타이머 없음)
// 순수 함수: 저장소와 무관
// ============================================================
import type { Unit } from '../types';

export interface Castle {
  level: number;
  /** 수비 부대 (출발 시점 편성 복사본). 없으면 null */
  garrison: Unit | null;
  /** 마지막 징수 시각 (ms) */
  since: number;
}

export const CASTLE_MAX_LEVEL = 5;
/** 성에 쌓아 둘 수 있는 최대 시간 */
export const STORE_CAP_HOURS = 8;
const HOUR_MS = 3_600_000;

export const newCastle = (now: number): Castle => ({ level: 1, garrison: null, since: now });

/** 시간당 수입: 뒤쪽 성일수록 많고, 레벨당 +35%, 수비 부대 +25% */
export function incomePerHour(stageIndex: number, castle: Castle): number {
  const base = 6 + stageIndex * 1.5;
  return base * (1 + 0.35 * (castle.level - 1)) * (castle.garrison ? 1.25 : 1);
}

/** 지금 징수할 수 있는 금화 */
export function accrued(stageIndex: number, castle: Castle, now: number): number {
  const hours = Math.min(STORE_CAP_HOURS, Math.max(0, now - castle.since) / HOUR_MS);
  return Math.floor(incomePerHour(stageIndex, castle) * hours);
}

/** 내정 투자 비용 (현재 레벨 → 다음 레벨) */
export const upgradeCost = (stageIndex: number, level: number) => Math.round(100 * level * (1 + stageIndex / 6));
