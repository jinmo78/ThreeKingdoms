// 인연(시너지 태그) 정의
// tiers: 같은 인연 태그를 가진 장수가 count명 이상 한 부대에 있으면 power(전투력)·chain(연쇄 확률) 보너스
import { GENERALS } from './generals';

export interface BondTier {
  count: number;
  power: number;
  chain: number;
}
export interface BondDef {
  id: string;
  desc: string;
  tiers: BondTier[];
}

export const BONDS: BondDef[] = [
  { id: '도원결의', desc: '복숭아 동산에서 맺은 의형제의 맹세', tiers: [{ count: 2, power: 0.1, chain: 0.1 }, { count: 3, power: 0.25, chain: 0.3 }] },
  { id: '오호대장군', desc: '촉을 대표하는 다섯 명의 맹장', tiers: [{ count: 2, power: 0.08, chain: 0.06 }, { count: 3, power: 0.18, chain: 0.15 }] },
  { id: '위나라의 기둥', desc: '조조를 떠받친 위의 중신들', tiers: [{ count: 2, power: 0.08, chain: 0.06 }, { count: 3, power: 0.18, chain: 0.15 }] },
  { id: '강동의 호걸', desc: '장강을 지킨 손가의 장수들', tiers: [{ count: 2, power: 0.08, chain: 0.06 }, { count: 3, power: 0.18, chain: 0.15 }] },
  { id: '천하의 책사', desc: '천하의 판을 읽는 모사들', tiers: [{ count: 2, power: 0.04, chain: 0.12 }, { count: 3, power: 0.08, chain: 0.25 }] },
  { id: '적벽의 불꽃', desc: '적벽에서 함께 불길을 일으킨 연합', tiers: [{ count: 2, power: 0.1, chain: 0.1 }, { count: 3, power: 0.22, chain: 0.25 }] },
  { id: '연환계', desc: '미인과 맹장, 폭군이 얽힌 계략', tiers: [{ count: 2, power: 0.1, chain: 0.1 }, { count: 3, power: 0.2, chain: 0.3 }] },
  { id: '서량 철기', desc: '서량의 거친 기마 군단', tiers: [{ count: 2, power: 0.08, chain: 0.05 }, { count: 3, power: 0.16, chain: 0.12 }] },
  { id: '반동탁 연합', desc: '폭군 토벌을 위해 모인 제후들', tiers: [{ count: 2, power: 0.06, chain: 0.05 }, { count: 3, power: 0.14, chain: 0.12 }] },
  { id: '황천당립', desc: '푸른 하늘이 죽고 누런 하늘이 선다', tiers: [{ count: 2, power: 0.1, chain: 0.05 }, { count: 3, power: 0.2, chain: 0.2 }] },
];

export const BOND_MAP: Record<string, BondDef> = Object.fromEntries(BONDS.map((b) => [b.id, b]));

/** 인연별 소속 장수 (등용 가능한 장수만) */
export function bondMembers(bondId: string) {
  return GENERALS.filter((g) => g.recruitable !== false && g.bonds.includes(bondId));
}
