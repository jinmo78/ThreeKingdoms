// ============================================================
// 자동 편성 — 시너지를 고려한 탐욕 배치 + 교체 개선
// ------------------------------------------------------------
// 1부대부터 차례로:
//  1) 주장 후보(상위 몇 명)마다 나머지 칸을 "넣었을 때 점수가 가장 오르는 장수"로 채움
//  2) 각 칸을 남은 장수와 바꿔 보며 점수가 오르면 교체 (개선이 없을 때까지, 최대 3회)
//  3) 가장 점수가 높은 부대를 확정하고 사용한 장수는 다음 부대 후보에서 제외
// 점수 = 전투력 × (1 + 연쇄 확률 × 0.5) × (1 + 전법 발동률 × 0.3)
// ============================================================
import { GENERAL_MAP } from '../data/generals';
import type { OwnedGeneral, Unit } from '../types';
import { SLOTS } from '../types';
import { buildProfile, makeMember, type UnitMember } from './unit';

const COMMANDER_CANDIDATES = 8;
const MAX_PASSES = 3;

export function unitScore(members: (UnitMember | null)[]): number {
  const p = buildProfile(members);
  if (!p) return 0;
  return p.power * (1 + p.synergy.chainRate * 0.5) * (1 + p.skillRate * 0.3);
}

export function autoFormation(roster: Record<string, OwnedGeneral>, unitCount = 3): Unit[] {
  const pool = new Map<string, UnitMember>();
  for (const [id, o] of Object.entries(roster)) {
    const def = GENERAL_MAP[id];
    if (def) pool.set(id, makeMember(def, o.level, o.stars, o.promote ?? 0));
  }

  const used = new Set<string>();
  const units: Unit[] = [];

  for (let u = 0; u < unitCount; u++) {
    const free = [...pool.keys()].filter((id) => !used.has(id));
    if (free.length === 0) {
      units.push(emptyUnit());
      continue;
    }
    // 주장 후보: 단독 부대 점수 상위
    const commanders = free
      .map((id) => ({ id, s: unitScore([pool.get(id)!, null, null, null, null, null]) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, COMMANDER_CANDIDATES)
      .map((x) => x.id);

    let best: { ids: (string | null)[]; score: number } | null = null;
    for (const cmd of commanders) {
      const ids: (string | null)[] = [cmd, null, null, null, null, null];
      const toMembers = () => ids.map((id) => (id ? pool.get(id)! : null));
      const avail = () => free.filter((id) => !ids.includes(id));

      // 1) 탐욕 채우기
      for (let i = 1; i < SLOTS.length; i++) {
        let pick: string | null = null;
        let pickScore = -1;
        for (const id of avail()) {
          ids[i] = id;
          const s = unitScore(toMembers());
          if (s > pickScore) {
            pickScore = s;
            pick = id;
          }
        }
        ids[i] = pick;
      }

      // 2) 교체 개선 (주장 포함 모든 칸, 같은 부대 안 자리 바꾸기도 시도)
      let score = unitScore(toMembers());
      for (let pass = 0; pass < MAX_PASSES; pass++) {
        let improved = false;
        for (let i = 0; i < SLOTS.length; i++) {
          for (const id of avail()) {
            const prev = ids[i];
            ids[i] = id;
            const s = unitScore(toMembers());
            if (s > score + 1e-6) {
              score = s;
              improved = true;
            } else ids[i] = prev;
          }
          for (let j = i + 1; j < SLOTS.length; j++) {
            [ids[i], ids[j]] = [ids[j], ids[i]];
            const s = ids[0] ? unitScore(toMembers()) : 0;
            if (s > score + 1e-6) {
              score = s;
              improved = true;
            } else [ids[i], ids[j]] = [ids[j], ids[i]];
          }
        }
        if (!improved) break;
      }

      if (!best || score > best.score) best = { ids: [...ids], score };
    }

    const unit = emptyUnit();
    best!.ids.forEach((id, i) => {
      unit[SLOTS[i]] = id;
      if (id) used.add(id);
    });
    units.push(unit);
  }
  return units;
}

function emptyUnit(): Unit {
  return { commander: null, vice1: null, vice2: null, strategist: null, aide1: null, aide2: null };
}
