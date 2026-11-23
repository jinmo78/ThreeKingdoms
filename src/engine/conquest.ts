// ============================================================
// 천하 토벌전 — 4-3 적벽 클리어 후 열리는 끝없는 도전
// · 층마다 위 → 촉 → 오 → 군웅 군단이 번갈아 등장, 5층마다 정예 혼성군(보스)
// · 층의 적 구성은 고정(시드 = 층 번호)이라 같은 층은 편성을 바꿔 가며 재도전 가능
// · 적 레벨은 ENEMY_LEVEL_CAP에서 자르고, UNIFY_FLOOR(천하통일) 이후는 정예·만돌파 구성
// ============================================================
import type { EnemyUnit } from '../types';
import { generateArmy, type ArmyTheme } from './aiArmy';

const ROTATION: ArmyTheme[] = ['wei', 'shu', 'wu', 'qun'];

/** SSR 만랩(150) 구간에 맞춘 적 레벨 천장 */
export const ENEMY_LEVEL_CAP = 160;
/** 이 층을 깨면 천하통일. 이후 층은 레벨 고정·정예 구성 */
export const UNIFY_FLOOR = 100;
/** 각인: 층당 +0.4%, 상한 +20% (50층분) */
export const IMPRINT_PER_FLOOR = 0.004;
export const IMPRINT_CAP = 0.2;

export interface ConquestFloor {
  floor: number;
  theme: ArmyTheme;
  boss: boolean;
  level: number;
  stars: number;
  enemies: EnemyUnit[];
  reward: { gold: number; exp: number };
  unified: boolean;
}

export function imprintBonus(conquestBest: number): number {
  return Math.min(IMPRINT_CAP, Math.max(0, conquestBest) * IMPRINT_PER_FLOOR);
}

export function conquestFloor(floor: number): ConquestFloor {
  const boss = floor % 5 === 0;
  // 100층이 천하통일. 그 다음 층부터 레벨 고정·정예 구성
  const afterUnify = floor > UNIFY_FLOOR;
  const theme: ArmyTheme = boss || afterUnify ? 'mixed' : ROTATION[(floor - 1) % ROTATION.length];
  const cappedFloor = Math.min(floor, UNIFY_FLOOR);
  const raw = 16 + cappedFloor + (boss || afterUnify ? 2 : 0);
  const level = Math.min(ENEMY_LEVEL_CAP, raw);
  const stars = Math.min(5, Math.floor(cappedFloor / 10));
  const elite = boss || afterUnify;
  const enemyStars = afterUnify ? 5 : stars;
  const enemies = generateArmy(theme, level, floor * 7919 + 17, { elite, stars: enemyStars });
  return {
    floor,
    theme,
    boss,
    level,
    stars: enemyStars,
    enemies,
    reward: { gold: 40 + floor * 4 + (boss ? 60 : 0), exp: 450 + floor * 15 },
    unified: floor >= UNIFY_FLOOR,
  };
}
