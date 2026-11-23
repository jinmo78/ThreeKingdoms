// 세력·등급·병과 표시용 메타 정보 (Tailwind 클래스는 동적 생성하지 않고 문자열 그대로 둠)
import type { Faction, Rarity, SkillEffect, StatKey, Troop } from '../types';

export const FACTION: Record<Faction, { label: string; full: string; text: string; bg: string; ring: string; hex: string; frame: string; wash: string }> = {
  wei: { label: '위', full: '위나라', text: 'text-sky-300', bg: 'bg-[#264B77]', ring: 'ring-[#264B77]/70', hex: '#264B77', frame: 'border-[#264B77]', wash: 'bg-[linear-gradient(180deg,rgba(38,75,119,0.22),transparent_72%)]' },
  shu: { label: '촉', full: '촉나라', text: 'text-emerald-300', bg: 'bg-[#276347]', ring: 'ring-[#276347]/70', hex: '#276347', frame: 'border-[#276347]', wash: 'bg-[linear-gradient(180deg,rgba(39,99,71,0.22),transparent_72%)]' },
  wu: { label: '오', full: '오나라', text: 'text-rose-300', bg: 'bg-[#9B2C2C]', ring: 'ring-[#9B2C2C]/70', hex: '#9B2C2C', frame: 'border-[#9B2C2C]', wash: 'bg-[linear-gradient(180deg,rgba(155,44,44,0.22),transparent_72%)]' },
  qun: { label: '군', full: '군웅', text: 'text-orange-300', bg: 'bg-[#7A5C32]', ring: 'ring-[#7A5C32]/70', hex: '#7A5C32', frame: 'border-[#7A5C32]', wash: 'bg-[linear-gradient(180deg,rgba(122,92,50,0.24),transparent_72%)]' },
};
export const FACTIONS: Faction[] = ['wei', 'shu', 'wu', 'qun'];

export const RARITY: Record<Rarity, { border: string; text: string; badge: string; glow: string; ring: string }> = {
  SSR: {
    border: 'border-[#E2B866]',
    text: 'text-amber-300',
    badge: 'bg-gradient-to-b from-amber-200 to-amber-500 text-[#3a2300] shadow-[0_0_8px_rgba(251,191,36,0.55)]',
    glow: 'shadow-[0_0_24px_-4px_rgba(198,161,91,0.65)]',
    ring: 'ring-2 ring-amber-300/90',
  },
  SR: {
    border: 'border-[#E2B866]/70',
    text: 'text-violet-300',
    badge: 'bg-violet-600 text-violet-50',
    glow: 'shadow-[0_0_18px_-6px_rgba(198,161,91,0.45)]',
    ring: 'ring-2 ring-violet-400/80',
  },
  R: {
    border: 'border-[#E2B866]/45',
    text: 'text-stone-300',
    badge: 'bg-slate-500 text-slate-50',
    glow: '',
    ring: 'ring-1 ring-slate-400/40',
  },
};

export const TROOP: Record<Troop, { label: string; emoji: string; seal: string }> = {
  cavalry: { label: '기병', emoji: '🐎', seal: '騎' },
  infantry: { label: '보병', emoji: '🛡️', seal: '步' },
  archer: { label: '궁병', emoji: '🏹', seal: '弓' },
};

/** 기병 > 궁병 > 보병 > 기병 */
export const TROOP_BEATS: Record<Troop, Troop> = {
  cavalry: 'archer',
  archer: 'infantry',
  infantry: 'cavalry',
};
export function troopMatchup(a: Troop, b: Troop): 'adv' | 'dis' | 'even' {
  if (TROOP_BEATS[a] === b) return 'adv';
  if (TROOP_BEATS[b] === a) return 'dis';
  return 'even';
}

export const STAT_LABEL: Record<StatKey, string> = { war: '무력', int: '지력', lead: '통솔' };

export const EFFECT_LABEL: Record<SkillEffect, string> = {
  strike: '단일 강타',
  sweep: '전체 공격',
  disrupt: '교란',
  heal: '회복',
};

/** 제1·제2·제3부대. 밝은/어두운 화면 모두에서 쓰도록 테마가 바꿔 둔 색만 쓴다. */
export const UNIT_TINT = [
  { card: 'border-red-900/80 bg-red-950/50', title: 'text-red-300', bar: 'bg-red-500', chip: 'bg-red-900/70 text-red-300' },
  { card: 'border-sky-900/80 bg-sky-950/60', title: 'text-sky-300', bar: 'bg-sky-500', chip: 'bg-sky-900/70 text-sky-300' },
  { card: 'border-emerald-900/80 bg-emerald-950/60', title: 'text-emerald-300', bar: 'bg-emerald-500', chip: 'bg-emerald-900/70 text-emerald-300' },
] as const;

export const SLOT_LABEL = {
  commander: { label: '주장', hint: '병과·전법 결정' },
  vice1: { label: '부장', hint: '연쇄 1단' },
  vice2: { label: '부장', hint: '연쇄 2단' },
  strategist: { label: '참모', hint: '연쇄 3단 · 발동률↑' },
  aide1: { label: '보좌', hint: '능력 일부 · 시너지' },
  aide2: { label: '보좌', hint: '능력 일부 · 시너지' },
} as const;
