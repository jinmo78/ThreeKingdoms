// 편성(장수 id) → 전투 프로필 변환. 저장소(localStorage)와 무관해서 Web Worker에서도 사용
import { getGeneral, GENERAL_MAP } from '../data/generals';
import { STAGE_MAP } from '../data/stages';
import type { OwnedGeneral, Unit } from '../types';
import { SLOTS } from '../types';
import { buildProfile, makeMember, type UnitProfile } from './unit';

export const emptyUnit = (): Unit => ({ commander: null, vice1: null, vice2: null, strategist: null, aide1: null, aide2: null });

export function unitProfile(u: Unit, roster: Record<string, OwnedGeneral>): UnitProfile | null {
  return buildProfile(
    SLOTS.map((slot) => {
      const id = u[slot];
      const owned = id ? roster[id] : undefined;
      return id && owned && GENERAL_MAP[id] ? makeMember(getGeneral(id), owned.level, owned.stars) : null;
    }),
  );
}

/** 편성된 부대 → 전투 프로필 (주장 없는 부대는 제외) */
export function playerProfiles(formation: Unit[], roster: Record<string, OwnedGeneral>): UnitProfile[] {
  return formation.map((u) => unitProfile(u, roster)).filter((p): p is UnitProfile => !!p);
}

export function enemyProfiles(stageId: string): UnitProfile[] {
  return STAGE_MAP[stageId].enemies.map(
    (e) =>
      buildProfile(
        SLOTS.map((_, i) => e.members[i] ?? null).map((id) => (id ? makeMember(getGeneral(id), e.level, 0) : null)),
      )!,
  );
}
