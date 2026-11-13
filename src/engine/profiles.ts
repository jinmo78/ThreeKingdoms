// 편성(장수 id) → 전투 프로필 변환. 저장소(localStorage)와 무관해서 Web Worker에서도 사용
import { GENERAL_MAP } from '../data/generals';
import { STAGE_MAP } from '../data/stages';
import type { EnemyUnit, OwnedGeneral, Unit } from '../types';
import { SLOTS } from '../types';
import { buildProfile, makeMember, type UnitProfile } from './unit';

export const emptyUnit = (): Unit => ({ commander: null, vice1: null, vice2: null, strategist: null, aide1: null, aide2: null });

export function unitProfile(u: Unit, roster: Record<string, OwnedGeneral>): UnitProfile | null {
  if (!u) return null;
  return buildProfile(
    SLOTS.map((slot) => {
      const id = u[slot];
      const owned = id ? roster[id] : undefined;
      const def = id ? GENERAL_MAP[id] : undefined;
      return id && owned && def ? makeMember(def, owned.level, owned.stars, owned.promote ?? 0) : null;
    }),
  );
}

/** 편성된 부대 → 전투 프로필 (주장 없는 부대는 제외) */
export function playerProfiles(formation: Unit[], roster: Record<string, OwnedGeneral>): UnitProfile[] {
  return formation.map((u) => unitProfile(u, roster)).filter((p): p is UnitProfile => !!p);
}

/** 출진 장수(주장이 있는 부대의 장수) 평균 레벨 — 모의전 상대 레벨 기준 */
export function deployedAvgLevel(formation: Unit[], roster: Record<string, OwnedGeneral>): number {
  const ids = formation
    .filter((u) => u.commander)
    .flatMap((u) => SLOTS.map((s) => u[s]))
    .filter((id): id is string => !!id && !!roster[id]);
  return ids.length ? Math.round(ids.reduce((s, id) => s + roster[id].level, 0) / ids.length) : 1;
}

/** 적 부대 정의 → 전투 프로필. 알 수 없는 장수 id나 주장이 없는 부대는 건너뛴다. */
export function enemyUnitsToProfiles(units: EnemyUnit[]): UnitProfile[] {
  const profiles: UnitProfile[] = [];
  for (const e of units) {
    const profile = buildProfile(
      SLOTS.map((_, i) => {
        const id = e.members[i];
        const def = id ? GENERAL_MAP[id] : undefined;
        return def ? makeMember(def, e.level, e.stars ?? 0) : null;
      }),
    );
    if (profile) profiles.push(profile);
  }
  return profiles;
}

export function enemyProfiles(stageId: string): UnitProfile[] {
  const stage = STAGE_MAP[stageId];
  return stage ? enemyUnitsToProfiles(stage.enemies) : [];
}
