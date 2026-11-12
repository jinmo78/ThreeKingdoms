// ============================================================
// AI 군단 생성 — 모의전 · 천하 토벌전용
// 세력별 장수 풀에서 무작위로 18명을 뽑아 "자동 편성"으로 3부대를 구성
// (플레이어와 같은 알고리즘이라 시너지를 제대로 맞춘 상대가 나옴)
// ============================================================
import { RECRUITABLE } from '../data/generals';
import { FACTION } from '../data/meta';
import type { EnemyUnit, Faction, GeneralDef, OwnedGeneral } from '../types';
import { SLOTS } from '../types';
import { autoFormation } from './autoFormation';
import { mulberry32 } from './rng';

export type ArmyTheme = Faction | 'mixed';
export const ARMY_THEMES: ArmyTheme[] = ['wei', 'shu', 'wu', 'qun', 'mixed'];

export function themeLabel(t: ArmyTheme) {
  return t === 'mixed' ? '혼성군' : `${FACTION[t].full}군`;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface ArmyOptions {
  /** 정예: SSR·SR 장수만 사용 */
  elite?: boolean;
  /** 장수 돌파 단계 (능력치 +4%/단계) */
  stars?: number;
}

export function generateArmy(theme: ArmyTheme, level: number, seed: number, opts: ArmyOptions = {}): EnemyUnit[] {
  const rng = mulberry32(seed);
  let pool: GeneralDef[] = RECRUITABLE.filter((g) => theme === 'mixed' || g.faction === theme);
  if (opts.elite) pool = pool.filter((g) => g.rarity !== 'R');
  const picked = shuffle(pool, rng).slice(0, 18);
  const roster: Record<string, OwnedGeneral> = {};
  for (const g of picked) roster[g.id] = { level, exp: 0, stars: opts.stars ?? 0 };
  return autoFormation(roster)
    .filter((u) => u.commander)
    .map((u) => ({ members: SLOTS.map((s) => u[s]), level, stars: opts.stars ?? 0 }));
}
