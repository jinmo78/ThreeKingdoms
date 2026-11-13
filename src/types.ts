// ============================================================
// 핵심 데이터 타입
// ============================================================

export type Faction = 'wei' | 'shu' | 'wu' | 'qun';
export type Rarity = 'SSR' | 'SR' | 'R';
/** 상성: 기병 > 궁병 > 보병 > 기병 */
export type Troop = 'cavalry' | 'infantry' | 'archer';
/** war: 무력 · int: 지력 · lead: 통솔 */
export type StatKey = 'war' | 'int' | 'lead';
export type Stats = Record<StatKey, number>;

/**
 * 전법 효과
 * - strike : 적 1부대 강타
 * - sweep  : 적 전체 피해
 * - disrupt: 적 1부대 피해 + 행동 게이지 감소
 * - heal   : 병력이 가장 적은 아군 부대 회복
 */
export type SkillEffect = 'strike' | 'sweep' | 'disrupt' | 'heal';

export interface Skill {
  name: string;
  effect: SkillEffect;
  /** 위력 배율 */
  power: number;
  /** 위력 계산 기준 능력 */
  scaling: StatKey;
  /** 주장으로 배치됐을 때의 기본 발동률 (0~1) */
  rate: number;
  desc: string;
}

export interface GeneralDef {
  id: string;
  name: string;
  /** 짧은 수식어 (예: 미염공) */
  title: string;
  faction: Faction;
  rarity: Rarity;
  troop: Troop;
  stats: Stats;
  skill: Skill;
  /** 인연 태그 */
  bonds: string[];
  /** false면 적 전용 장수 (등용 불가) */
  recruitable?: boolean;
}

export interface OwnedGeneral {
  level: number;
  exp: number;
  /** 중복 등용 시 오르는 돌파 단계 (0~5) */
  stars: number;
  /** 품계 승급 횟수. 태생 등급에서 한 단계만 (R→SR, SR→SSR) */
  promote?: number;
}

/**
 * 부대 6칸: 주장 1 · 부장 2 · 참모 1 · 보좌 2
 * - 주장: 부대 병과와 주 전법 결정
 * - 부장1 → 부장2 → 참모: 연쇄 전법 1·2·3단
 * - 보좌: 전법은 없지만 능력치 일부와 시너지(세력·병과·인연) 인원수에 기여
 */
export type Slot = 'commander' | 'vice1' | 'vice2' | 'strategist' | 'aide1' | 'aide2';
export const SLOTS: Slot[] = ['commander', 'vice1', 'vice2', 'strategist', 'aide1', 'aide2'];
/** 연쇄 전법 순서 */
export const CHAIN_SLOTS: Slot[] = ['vice1', 'vice2', 'strategist'];
export const STRATEGIST_INDEX = 3;
export type Unit = Record<Slot, string | null>;

export interface EnemyUnit {
  /** SLOTS 순서 (주장은 필수) */
  members: (string | null)[];
  level: number;
  /** 돌파 단계 (기본 0) */
  stars?: number;
}

export interface Stage {
  id: string;
  chapter: number;
  title: string;
  desc: string;
  enemies: EnemyUnit[];
  reward: { gold: number; exp: number };
  firstClearGold: number;
}

export interface Chapter {
  id: number;
  title: string;
  year: string;
  desc: string;
}
