// ============================================================
// 적군 맞춤 편성 — 실제 전투 시뮬레이션 승률로 편성을 개선
// ------------------------------------------------------------
// 1) 시작점: 현재 편성과 자동 편성 중 승률이 높은 쪽
// 2) 무작위 변형(자리 바꾸기 · 대기 장수 투입 · 상성 유리한 주장으로 교체)을
//    시간 예산 안에서 반복하고, 승률이 오르면 채택 (같은 난수 시드 묶음으로 비교해 잡음 최소화)
// 3) 탐색에 쓰지 않은 시드로 현재 편성과 다시 비교해, 실제로 나아졌을 때만 제안
// ============================================================
import { getGeneral } from '../data/generals';
import type { EnemyUnit, OwnedGeneral, Unit } from '../types';
import { SLOTS } from '../types';
import { autoFormation } from './autoFormation';
import { simulateBattle } from './battle';
import { briefOf, troopAdvice } from './matchup';
import { enemyUnitsToProfiles, playerProfiles } from './profiles';
import { mulberry32 } from './rng';
import type { UnitProfile } from './unit';

export interface CounterInput {
  roster: Record<string, OwnedGeneral>;
  formation: Unit[];
  enemies: EnemyUnit[];
  budgetMs?: number;
}

export interface CounterResult {
  formation: Unit[];
  /** 현재 편성 예상 승률 (0~1) */
  before: number;
  /** 제안 편성 예상 승률 (0~1) */
  after: number;
  improved: boolean;
  tried: number;
}

const SEARCH_BATTLES = 100;
const FINAL_BATTLES = 400;
const SEARCH_SEEDS = Array.from({ length: SEARCH_BATTLES }, (_, i) => 1 + i * 7919);
const FINAL_SEEDS = Array.from({ length: FINAL_BATTLES }, (_, i) => 500_009 + i * 104_729);

type Ids = (string | null)[][];

const toIds = (f: Unit[]): Ids => [0, 1, 2].map((i) => SLOTS.map((s) => f[i]?.[s] ?? null));
const toUnits = (ids: Ids): Unit[] => ids.map((u) => Object.fromEntries(SLOTS.map((s, i) => [s, u[i]])) as Unit);

function winRate(ids: Ids, roster: Record<string, OwnedGeneral>, enemy: UnitProfile[], seeds: number[]): number {
  const mine = playerProfiles(toUnits(ids), roster);
  if (mine.length === 0) return 0;
  let w = 0;
  for (const s of seeds) if (simulateBattle(mine, enemy, s).win) w++;
  return w / seeds.length;
}

export function counterFormation(input: CounterInput, onProgress?: (ratio: number, best: number) => void): CounterResult {
  const { roster, budgetMs = 3000 } = input;
  const enemy = enemyUnitsToProfiles(input.enemies);
  const advice = troopAdvice(enemy.map(briefOf));
  const all = Object.keys(roster);
  const goodCommanders = all.filter((id) => advice.best.includes(getGeneral(id).troop));
  const rng = mulberry32(0x5eed + all.length);
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const start = now();

  const current = toIds(input.formation);
  const auto = toIds(autoFormation(roster));
  let best = current;
  let bestWr = winRate(current, roster, enemy, SEARCH_SEEDS);
  const autoWr = winRate(auto, roster, enemy, SEARCH_SEEDS);
  if (autoWr > bestWr) {
    best = auto;
    bestWr = autoWr;
  }

  let tried = 0;
  while (now() - start < budgetMs && bestWr < 1) {
    const cand = best.map((u) => [...u]);
    const used = new Set(cand.flat().filter(Boolean) as string[]);
    const bench = all.filter((id) => !used.has(id));
    const a = Math.floor(rng() * 3);
    const r = rng();
    if (r < 0.25 && goodCommanders.length) {
      // 상성이 유리한 장수를 주장으로 (다른 칸에 있으면 자리 교환)
      const pick = goodCommanders[Math.floor(rng() * goodCommanders.length)];
      const at = cand.flatMap((u, ui) => u.map((id, si) => (id === pick ? [ui, si] : null))).find(Boolean);
      if (at) [cand[a][0], cand[at[0]][at[1]]] = [cand[at[0]][at[1]], cand[a][0]];
      else cand[a][0] = pick;
    } else if (r < 0.65 || bench.length === 0) {
      const b = Math.floor(rng() * 3);
      const sa = Math.floor(rng() * 6);
      const sb = Math.floor(rng() * 6);
      [cand[a][sa], cand[b][sb]] = [cand[b][sb], cand[a][sa]];
    } else {
      cand[a][Math.floor(rng() * 6)] = bench[Math.floor(rng() * bench.length)];
    }
    // 장수가 남는데 주장이 빈 부대는 무효
    if (cand.every((u) => !u[0]) || cand.some((u) => !u[0] && u.some(Boolean))) continue;

    tried++;
    const w = winRate(cand, roster, enemy, SEARCH_SEEDS);
    if (w > bestWr) {
      best = cand;
      bestWr = w;
    }
    if (tried % 10 === 0) onProgress?.(Math.min(1, (now() - start) / budgetMs), bestWr);
  }

  const before = winRate(current, roster, enemy, FINAL_SEEDS);
  const after = winRate(best, roster, enemy, FINAL_SEEDS);
  const improved = after > before + 0.02;
  return { formation: toUnits(improved ? best : current), before, after: improved ? after : before, improved, tried };
}
