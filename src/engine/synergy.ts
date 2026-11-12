// ============================================================
// 시너지 계산 — 부대 = SLOTS 순서 [주장, 부장, 부장, 참모, 보좌, 보좌]
// ------------------------------------------------------------
// · 세력 결속 : 같은 세력 3 / 4 / 6명
// · 병과 통일 : 주장과 같은 병과 3 / 4 / 6명 (부대 병과 = 주장 병과)
// · 인연      : 같은 인연 태그 보유 장수 수에 따른 단계 보너스 (bonds.ts)
// · 명참모    : 참모 지력 90 이상
// 결과: 전투력 배율(powerMult) · 연쇄 전법 발동 확률(chainRate)
// ============================================================
import { BOND_MAP } from '../data/bonds';
import { FACTION, TROOP } from '../data/meta';
import type { GeneralDef } from '../types';
import { STRATEGIST_INDEX } from '../types';

export type SynergyKind = 'faction' | 'troop' | 'bond' | 'sage';

export interface ActiveSynergy {
  key: string;
  kind: SynergyKind;
  label: string;
  detail: string;
  power: number;
  chain: number;
  /** 최고 단계 달성 여부 */
  maxed: boolean;
}

export interface SynergyResult {
  list: ActiveSynergy[];
  powerMult: number;
  chainRate: number;
}

export const BASE_CHAIN = 0.15;
export const MAX_CHAIN = 0.85;

export const FACTION_TIERS = [
  { count: 3, power: 0.05, chain: 0.04 },
  { count: 4, power: 0.1, chain: 0.08 },
  { count: 6, power: 0.18, chain: 0.15 },
];
export const TROOP_TIERS = [
  { count: 3, power: 0.05, chain: 0 },
  { count: 4, power: 0.09, chain: 0.05 },
  { count: 6, power: 0.15, chain: 0.1 },
];
export const SAGE = { minInt: 90, power: 0, chain: 0.1 };

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
export function bonusText(power: number, chain: number) {
  const parts: string[] = [];
  if (power) parts.push(`전투력 +${pct(power)}`);
  if (chain) parts.push(`연쇄 +${pct(chain)}`);
  return parts.join(' · ');
}

function bestTier<T extends { count: number }>(tiers: T[], count: number): T | null {
  let best: T | null = null;
  for (const t of tiers) if (count >= t.count) best = t;
  return best;
}

/** members: SLOTS 순서 (빈 칸은 null) */
export function calcSynergy(members: (GeneralDef | null)[]): SynergyResult {
  const list: ActiveSynergy[] = [];
  const present = members.filter((m): m is GeneralDef => !!m);

  // 세력 결속
  const factionCount = new Map<string, number>();
  for (const g of present) factionCount.set(g.faction, (factionCount.get(g.faction) ?? 0) + 1);
  for (const [f, n] of factionCount) {
    const tier = bestTier(FACTION_TIERS, n);
    if (!tier) continue;
    const meta = FACTION[f as GeneralDef['faction']];
    list.push({
      key: `faction-${f}`, kind: 'faction', label: `${meta.full} 결속 ×${n}`,
      detail: bonusText(tier.power, tier.chain), power: tier.power, chain: tier.chain, maxed: n >= 6,
    });
  }

  // 병과 통일 (주장 기준)
  const commander = members[0];
  if (commander) {
    const n = present.filter((g) => g.troop === commander.troop).length;
    const tier = bestTier(TROOP_TIERS, n);
    if (tier) {
      const t = TROOP[commander.troop];
      list.push({
        key: `troop-${commander.troop}`, kind: 'troop', label: `${t.emoji} ${t.label} 통일 ×${n}`,
        detail: bonusText(tier.power, tier.chain), power: tier.power, chain: tier.chain, maxed: n >= 6,
      });
    }
  }

  // 인연 (같은 장수 중복은 1명으로 셈)
  const bondHolders = new Map<string, Set<string>>();
  for (const g of present) {
    for (const b of g.bonds) {
      if (!bondHolders.has(b)) bondHolders.set(b, new Set());
      bondHolders.get(b)!.add(g.id);
    }
  }
  for (const [bondId, holders] of bondHolders) {
    const def = BOND_MAP[bondId];
    if (!def) continue;
    const tier = bestTier(def.tiers, holders.size);
    if (!tier) continue;
    const top = def.tiers[def.tiers.length - 1];
    list.push({
      key: `bond-${bondId}`, kind: 'bond', label: `${bondId} (${holders.size}/${top.count})`,
      detail: bonusText(tier.power, tier.chain), power: tier.power, chain: tier.chain, maxed: tier === top,
    });
  }

  // 명참모
  const strategist = members[STRATEGIST_INDEX];
  if (strategist && strategist.stats.int >= SAGE.minInt) {
    list.push({
      key: 'sage', kind: 'sage', label: `명참모 ${strategist.name}`,
      detail: bonusText(SAGE.power, SAGE.chain), power: SAGE.power, chain: SAGE.chain, maxed: true,
    });
  }

  const power = list.reduce((s, x) => s + x.power, 0);
  const chain = list.reduce((s, x) => s + x.chain, 0);
  // 인연 → 세력 → 병과 → 명참모 순으로 보여 줌
  const order: Record<SynergyKind, number> = { bond: 0, faction: 1, troop: 2, sage: 3 };
  list.sort((a, b) => order[a.kind] - order[b.kind]);

  return {
    list,
    powerMult: 1 + power,
    chainRate: Math.min(MAX_CHAIN, BASE_CHAIN + chain),
  };
}
