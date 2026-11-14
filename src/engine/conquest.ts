// ============================================================
// 천하 토벌전 — 4-3 적벽 클리어 후 열리는 끝없는 도전
// · 층마다 위 → 촉 → 오 → 군웅 군단이 번갈아 등장, 5층마다 정예 혼성군(보스)
// · 층의 적 구성은 고정(시드 = 층 번호)이라 같은 층은 편성을 바꿔 가며 재도전 가능
// ============================================================
import type { EnemyUnit } from '../types';
import { generateArmy, type ArmyTheme } from './aiArmy';

const ROTATION: ArmyTheme[] = ['wei', 'shu', 'wu', 'qun'];

export interface ConquestFloor {
  floor: number;
  theme: ArmyTheme;
  boss: boolean;
  level: number;
  stars: number;
  enemies: EnemyUnit[];
  reward: { gold: number; exp: number };
}

export function conquestFloor(floor: number): ConquestFloor {
  const boss = floor % 5 === 0;
  const theme: ArmyTheme = boss ? 'mixed' : ROTATION[(floor - 1) % ROTATION.length];
  const level = 16 + floor + (boss ? 2 : 0);
  // 10층마다 적 장수 돌파 +1 (최대 ★5)
  const stars = Math.min(5, Math.floor(floor / 10));
  return {
    floor,
    theme,
    boss,
    level,
    stars,
    enemies: generateArmy(theme, level, floor * 7919 + 17, { elite: boss, stars }),
    reward: { gold: 80 + floor * 8 + (boss ? 120 : 0), exp: 450 + floor * 15 },
  };
}
