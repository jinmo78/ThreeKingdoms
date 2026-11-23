// ============================================================
// 주의 군령 — 주 단위 시드 고정 제약 모의전
// · 부대 2개 / 한 병과만 등 제약 1개. 보상은 얇은 금화
// ============================================================
import type { EnemyUnit, Troop, Unit } from '../types';
import { SLOTS } from '../types';
import { generateArmy, type ArmyTheme } from './aiArmy';

export type DecreeConstraint =
  | { kind: 'units'; max: number; label: string }
  | { kind: 'troop'; troop: Troop; label: string };

export interface WeeklyDecree {
  week: string;
  theme: ArmyTheme;
  level: number;
  stars: number;
  constraint: DecreeConstraint;
  enemies: EnemyUnit[];
  rewardGold: number;
}

const THEMES: ArmyTheme[] = ['wei', 'shu', 'wu', 'qun', 'mixed'];
const TROOPS: Troop[] = ['cavalry', 'infantry', 'archer'];
const TROOP_KO: Record<Troop, string> = { cavalry: '기병', infantry: '보병', archer: '궁병' };

function weekKey(now: number): string {
  const d = new Date(now);
  // UTC 기준 ISO 주: 연도-Www
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((tmp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function weekSeed(week: string): number {
  let h = 2166136261;
  for (let i = 0; i < week.length; i++) h = Math.imul(h ^ week.charCodeAt(i), 16777619);
  return (h >>> 0) || 1;
}

export function decreeOfWeek(now = Date.now()): WeeklyDecree {
  const week = weekKey(now);
  const seed = weekSeed(week);
  const theme = THEMES[seed % THEMES.length];
  const kind = seed % 2 === 0 ? 'units' : 'troop';
  const constraint: DecreeConstraint = kind === 'units'
    ? { kind: 'units', max: 2, label: '부대 2개만' }
    : { kind: 'troop', troop: TROOPS[seed % 3], label: `${TROOP_KO[TROOPS[seed % 3]]}만` };
  const level = 40 + (seed % 40); // 40~79
  const stars = Math.min(5, Math.floor(level / 20));
  return {
    week,
    theme,
    level,
    stars,
    constraint,
    enemies: generateArmy(theme, level, seed, { elite: level >= 60, stars }),
    rewardGold: 80 + (seed % 5) * 20,
  };
}

/** 편성이 이번 주 군령 제약을 지키는지 */
export function decreeFormationOk(formation: Unit[], constraint: DecreeConstraint): boolean {
  const live = formation.filter((u) => u.commander);
  if (constraint.kind === 'units') return live.length <= constraint.max;
  // 주장 병과만 본다 — 호출측에서 GENERAL_MAP으로 검사
  return true;
}

export function decreeTroopOk(
  formation: Unit[],
  constraint: DecreeConstraint,
  troopOf: (id: string) => Troop | null,
): boolean {
  if (constraint.kind !== 'troop') return true;
  for (const u of formation) {
    if (!u.commander) continue;
    for (const s of SLOTS) {
      const id = u[s];
      if (!id) continue;
      const t = troopOf(id);
      if (t && t !== constraint.troop) return false;
    }
  }
  return true;
}
