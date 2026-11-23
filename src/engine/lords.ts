// ============================================================
// AI 군주 공성 — 8-3 클리어 후 점령한 성을 노린다
// · 빈 수비·낮은 레벨 성을 우선. 패배 시 성 레벨만 -1 (로스터 유지)
// · 행군 타이머와 같은 비동기. 전투 시드는 위협 id로 고정
// ============================================================
import type { EnemyUnit, Unit } from '../types';
import { generateArmy } from './aiArmy';
import type { Castle } from './domain';

function hash(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return h >>> 0;
}

export interface LordDef {
  id: string;
  name: string;
}

export const LORDS: LordDef[] = [
  { id: 'caocao', name: '조조' },
  { id: 'liubei', name: '유비' },
  { id: 'sunquan', name: '손권' },
  { id: 'yuanshao', name: '원소' },
  { id: 'dongzhuo', name: '동탁' },
];

export interface LordThreat {
  id: string;
  stageId: string;
  lordId: string;
  eta: number;
  level: number;
}

/** 동시 위협 상한 */
export const MAX_THREATS = 2;
/** 위협 행군 시간 (ms) */
export const THREAT_MARCH_MS = 90_000;
/** 다음 위협까지 최소 간격 */
export const THREAT_COOLDOWN_MS = 180_000;
/** 군주 적 레벨 (SSR 성장 중반) */
export const LORD_ENEMY_LEVEL = 80;

export function lordById(id: string): LordDef | undefined {
  return LORDS.find((l) => l.id === id);
}

/** 점령한 성 중 수비가 없거나 레벨이 낮은 곳을 고른다 */
export function pickThreatTarget(
  castles: Record<string, Castle>,
  busy: Set<string>,
  seed: number,
): string | null {
  const ids = Object.keys(castles).filter((id) => !busy.has(id));
  if (ids.length === 0) return null;
  ids.sort((a, b) => {
    const ca = castles[a];
    const cb = castles[b];
    const ga = ca.garrison ? 1 : 0;
    const gb = cb.garrison ? 1 : 0;
    if (ga !== gb) return ga - gb;
    if (ca.level !== cb.level) return ca.level - cb.level;
    return a.localeCompare(b);
  });
  const pool = ids.slice(0, Math.min(4, ids.length));
  return pool[Math.abs(seed) % pool.length] ?? null;
}

/** 열린 위협이 MAX 미만이면 하나 추가. 8-3 미클리어면 그대로 */
export function ensureThreats(
  cleared: Record<string, number>,
  castles: Record<string, Castle>,
  threats: LordThreat[],
  now: number,
  lastThreatAt: number,
): { threats: LordThreat[]; lastThreatAt: number } {
  const list = threats ?? [];
  if ((cleared['8-3'] ?? 0) <= 0) return { threats: list, lastThreatAt };
  const active = list.filter((t) => castles[t.stageId]);
  if (active.length >= MAX_THREATS) return { threats: active, lastThreatAt };
  if (now - lastThreatAt < THREAT_COOLDOWN_MS && active.length > 0) {
    return { threats: active, lastThreatAt };
  }
  const busy = new Set(active.map((t) => t.stageId));
  const stageId = pickThreatTarget(castles, busy, hash(`${now}|${active.length}`));
  if (!stageId) return { threats: active, lastThreatAt };
  const lord = LORDS[hash(`lord|${stageId}|${now}`) % LORDS.length];
  const next: LordThreat = {
    id: `t${now.toString(36)}${active.length}`,
    stageId,
    lordId: lord.id,
    eta: now + THREAT_MARCH_MS,
    level: LORD_ENEMY_LEVEL,
  };
  return { threats: [...active, next], lastThreatAt: now };
}

export function lordArmy(threat: LordThreat): EnemyUnit[] {
  return generateArmy('mixed', threat.level, hash(threat.id) || 1, { elite: true, stars: 3 });
}

/** 수비가 없으면 패배. 있으면 호출측에서 전투 후 win을 넘긴다. */
export function applyThreatResult(
  castle: Castle,
  win: boolean,
): Castle {
  if (win) return castle;
  return { ...castle, level: Math.max(1, castle.level - 1) };
}

export function garrisonUnit(castle: Castle): Unit | null {
  return castle.garrison;
}
