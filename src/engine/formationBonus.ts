// 진형 구성 맞춤 조건부 보너스 — 순수 함수 (UI·프로필·전투 공용)
import type { FormationDef, FormationId } from '../data/formations';
import { formationOf } from '../data/formations';
import type { GeneralDef } from '../types';
import type { SynergyResult } from './synergy';
import { FACTION_TIERS } from './synergy';
import type { UnitMember } from './unit';

export interface FormationCondStatus {
  /** UI에 보여줄 조건 한 줄 (없으면 기본진) */
  hint: string;
  /** 조건 달성 여부 */
  active: boolean;
  /** 개시 로그·배지용 짧은 이름 */
  label: string;
}

export interface FormationCombatResolved {
  atkMul: number;
  defMul: number;
  hpMul: number;
  skillPowerMul: number;
  attackMul: number;
  gaugeBonus: number;
  chainPerBond: number;
  /** 연쇄 전법(1단+) 위력 배율 — 우결진 인연 2+ */
  chainSkillMul: number;
  cond: FormationCondStatus;
}

function present(members: (UnitMember | null)[] | (GeneralDef | null)[]): GeneralDef[] {
  return members
    .map((m) => (m && 'def' in m ? m.def : m))
    .filter((g): g is GeneralDef => !!g);
}

function sameTroopCount(defs: GeneralDef[]): number {
  if (defs.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of defs) counts.set(g.troop, (counts.get(g.troop) ?? 0) + 1);
  return Math.max(0, ...counts.values());
}

function factionTierStep(defs: GeneralDef[]): number {
  const counts = new Map<string, number>();
  for (const g of defs) counts.set(g.faction, (counts.get(g.faction) ?? 0) + 1);
  const n = Math.max(0, ...counts.values());
  let step = 0;
  for (const t of FACTION_TIERS) if (n >= t.count) step++;
  return step;
}

/** 편성 UI·프로필용 — 장수 정의만으로 조건 달성 여부 */
export function formationCondStatus(
  formationId: FormationId | string | null | undefined,
  members: (UnitMember | null)[] | (GeneralDef | null)[],
  synergy?: SynergyResult,
): FormationCondStatus {
  const form = formationOf(formationId as FormationId);
  const defs = present(members);
  const bondCount = synergy
    ? synergy.list.filter((s) => s.kind === 'bond').length
    : 0;

  switch (form.id) {
    case 'fengshi': {
      const n = sameTroopCount(defs);
      return {
        hint: '동일 병과 3인',
        active: n >= 3,
        label: '병과통일',
      };
    }
    case 'fangyuan': {
      const step = factionTierStep(defs);
      return {
        hint: '세력 시너지 활성',
        active: step > 0,
        label: '세력결속',
      };
    }
    case 'yanxing': {
      const cmd = members[0];
      const stats = cmd && 'stats' in cmd && cmd.stats
        ? cmd.stats
        : cmd && 'def' in cmd && cmd.def
          ? cmd.def.stats
          : null;
      // UnitMember면 유효 능력, GeneralDef면 태생 — 편성 UI는 보통 UnitMember 경로
      const int = stats?.int ?? 0;
      const war = stats?.war ?? 0;
      const active = int > war;
      return {
        hint: '주장 지력 > 무력',
        active,
        label: '책략특화',
      };
    }
    case 'youjie': {
      const n = bondCount || (synergy?.list.filter((s) => s.kind === 'bond').length ?? 0);
      // 인연 개수는 synergy 필요 — 없으면 직접 계산하지 않고 false (프로필에서 넘김)
      return {
        hint: '활성 인연 2개',
        active: n >= 2,
        label: '인연연환',
      };
    }
    default:
      return { hint: '', active: false, label: '' };
  }
}

/** 기본 진형 보정 + 구성 맞춤 추가 보너스 */
export function resolveFormationCombat(
  formationId: FormationId | string | null | undefined,
  members: (UnitMember | null)[],
  synergy: SynergyResult,
): FormationCombatResolved {
  const form = formationOf(formationId as FormationId);
  const base = form.combat;
  const defs = present(members);
  const bondCount = synergy.list.filter((s) => s.kind === 'bond').length;
  const cond = formationCondStatus(form.id, members, synergy);

  let { atkMul, defMul, hpMul, skillPowerMul, attackMul, gaugeBonus, chainPerBond } = base;
  let chainSkillMul = 1;

  if (form.id === 'fengshi' && cond.active) {
    atkMul *= 1.15;
    gaugeBonus += 16;
  }
  if (form.id === 'fangyuan' && cond.active) {
    const step = Math.max(1, factionTierStep(defs));
    const add = 1 + 0.08 * step;
    defMul *= add;
    hpMul *= add;
  }
  if (form.id === 'yanxing' && cond.active) {
    skillPowerMul *= 1.15;
    gaugeBonus += 12;
  }
  if (form.id === 'youjie') {
    // 인연당 연쇄는 buildProfile에서 bondCount로 적용. 여기선 2+일 때 연쇄 위력만
    if (bondCount >= 2) {
      chainSkillMul = 1.15;
      cond.active = true;
    }
  }

  return {
    atkMul, defMul, hpMul, skillPowerMul, attackMul, gaugeBonus, chainPerBond,
    chainSkillMul,
    cond,
  };
}

/** 진형 선택 모달용 조건 문구 (데이터 쪽 설명) */
export function formationCondHint(form: FormationDef): string {
  switch (form.id) {
    case 'fengshi': return '동일 병과 3인 → 공격 +15% · 선공 강화';
    case 'fangyuan': return '세력 시너지 → 단계당 방어·병력 +8%';
    case 'yanxing': return '주장 지력>무력 → 전법 +15% · 게이지';
    case 'youjie': return '인연 2개+ → 연쇄 전법 위력 +15%';
    default: return '';
  }
}
