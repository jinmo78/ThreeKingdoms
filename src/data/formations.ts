// 부대 진형 — 슬롯 반영 비율과 전투 보정 (패도식)
export type FormationId = 'basic' | 'fengshi' | 'fangyuan' | 'yanxing' | 'youjie';

export interface FormationCombat {
  /** 합산 공격력 배율 */
  atkMul: number;
  /** 합산 방어력 배율 */
  defMul: number;
  /** 최대 병력 배율 */
  hpMul: number;
  /** 전법 위력 배율 */
  skillPowerMul: number;
  /** 일반 공격 피해 배율 */
  attackMul: number;
  /** 시작 행동 게이지 보너스 (선공) */
  gaugeBonus: number;
  /** 활성화된 인연 1개당 연쇄 확률 가산 */
  chainPerBond: number;
}

export interface FormationDef {
  id: FormationId;
  name: string;
  hanja: string;
  desc: string;
  /** 주장·부장·보좌 능력 반영 비율. 참모는 진형과 무관(기존 가중치) */
  scale: { commander: number; vice: number; aide: number };
  combat: FormationCombat;
  /** UI용 짧은 효과 문구 */
  buffs: string[];
  debuffs: string[];
}

export const DEFAULT_FORMATION_ID: FormationId = 'basic';

export const FORMATIONS: FormationDef[] = [
  {
    id: 'basic',
    name: '기본진',
    hanja: '基本陣',
    desc: '균형 잡힌 기본 배치. 보정 없음.',
    scale: { commander: 1.0, vice: 0.3, aide: 0.1 },
    combat: { atkMul: 1, defMul: 1, hpMul: 1, skillPowerMul: 1, attackMul: 1, gaugeBonus: 0, chainPerBond: 0 },
    buffs: [],
    debuffs: [],
  },
  {
    id: 'fengshi',
    name: '봉시진',
    hanja: '鋒矢陣',
    desc: '화살촉처럼 뚫는다. 공격과 선공을 얻고 방어를 내준다.',
    scale: { commander: 1.0, vice: 0.4, aide: 0.1 },
    combat: { atkMul: 1.2, defMul: 0.85, hpMul: 1, skillPowerMul: 1, attackMul: 1, gaugeBonus: 28, chainPerBond: 0 },
    buffs: ['공격 +20%', '선공 우선'],
    debuffs: ['방어 −15%'],
  },
  {
    id: 'fangyuan',
    name: '방원진',
    hanja: '方圓陣',
    desc: '원을 그려 버틴다. 병력·방어를 키우고 공격을 줄인다.',
    scale: { commander: 0.9, vice: 0.35, aide: 0.15 },
    combat: { atkMul: 0.85, defMul: 1.25, hpMul: 1.25, skillPowerMul: 1, attackMul: 1, gaugeBonus: 0, chainPerBond: 0 },
    buffs: ['방어 +25%', '병력 +25%'],
    debuffs: ['공격 −15%'],
  },
  {
    id: 'yanxing',
    name: '안행진',
    hanja: '雁行陣',
    desc: '기러기 떼처럼 전법을 모은다.',
    scale: { commander: 1.0, vice: 0.3, aide: 0.2 },
    combat: { atkMul: 1, defMul: 1, hpMul: 1, skillPowerMul: 1.2, attackMul: 0.9, gaugeBonus: 0, chainPerBond: 0 },
    buffs: ['전법 위력 +20%'],
    debuffs: ['일반 공격 −10%'],
  },
  {
    id: 'youjie',
    name: '우결진',
    hanja: '友結陣',
    desc: '인연을 모아 연쇄를 부춘다. 주장 비중을 낮추고 부장·보좌를 키운다.',
    scale: { commander: 0.6, vice: 0.5, aide: 0.3 },
    combat: { atkMul: 1, defMul: 1, hpMul: 1, skillPowerMul: 1, attackMul: 1, gaugeBonus: 0, chainPerBond: 0.05 },
    buffs: ['인연당 연쇄 +5%'],
    debuffs: [],
  },
];

export const FORMATION_MAP: Record<FormationId, FormationDef> = Object.fromEntries(
  FORMATIONS.map((f) => [f.id, f]),
) as Record<FormationId, FormationDef>;

export const FORMATION_IDS = FORMATIONS.map((f) => f.id);

export function isFormationId(v: unknown): v is FormationId {
  return typeof v === 'string' && v in FORMATION_MAP;
}

export function formationOf(id: FormationId | null | undefined): FormationDef {
  return FORMATION_MAP[isFormationId(id) ? id : DEFAULT_FORMATION_ID];
}
