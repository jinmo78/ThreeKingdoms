// 저장 본문. 브라우저(localStorage)와 Firestore가 같은 모양을 쓴다.
import { GENERAL_MAP } from '../data/generals';
import { emptyUnit } from '../engine/profiles';
import { MAX_LEVEL, MAX_STARS } from '../engine/unit';
import type { OwnedGeneral, Unit } from '../types';

export const SAVE_VERSION = 4;

export interface SaveData {
  started: boolean;
  gold: number;
  roster: Record<string, OwnedGeneral>;
  formation: Unit[];
  cleared: Record<string, number>;
  totalPulls: number;
  /** 천하 토벌전 최고 돌파 층 */
  conquestBest: number;
  /** 가장 최근에 패배한 토벌전 층 */
  conquestFailFloor: number;
  /** 등용 횟수를 센 날짜 (YYYY-MM-DD) */
  recruitDay: string;
  recruitUsed: number;
}

const STARTERS = ['liubei', 'zhangfei', 'lusu', 'xuchu', 'mizhu', 'jianyong', 'huaxiong', 'huanggai'];

export function freshSave(): SaveData {
  const roster: Record<string, OwnedGeneral> = {};
  for (const id of STARTERS) roster[id] = { level: 1, exp: 0, stars: 0, promote: 0 };
  return {
    started: true,
    gold: 1500,
    roster,
    // 도원결의(유비·장비)와 촉한의 기틀(유비·미축·간옹)이 바로 보이도록 미리 배치
    formation: [
      { commander: 'liubei', vice1: 'zhangfei', vice2: 'xuchu', strategist: 'lusu', aide1: 'mizhu', aide2: 'jianyong' },
      emptyUnit(),
      emptyUnit(),
    ],
    cleared: {},
    totalPulls: 0,
    conquestBest: 0,
    conquestFailFloor: 0,
    recruitDay: '',
    recruitUsed: 0,
  };
}

function clampInt(n: unknown, min: number, max: number, fallback: number) {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : fallback;
  return Math.min(max, Math.max(min, v));
}

function sanitizeRoster(raw: unknown): Record<string, OwnedGeneral> {
  if (!raw || typeof raw !== 'object') return {};
  const roster: Record<string, OwnedGeneral> = {};
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!GENERAL_MAP[id] || !value || typeof value !== 'object') continue;
    const g = value as Partial<OwnedGeneral>;
    roster[id] = {
      level: clampInt(g.level, 1, MAX_LEVEL, 1),
      exp: clampInt(g.exp, 0, 1_000_000, 0),
      stars: clampInt(g.stars, 0, MAX_STARS, 0),
      promote: g.promote ? 1 : 0,
    };
  }
  return roster;
}

function sanitizeFormation(raw: unknown, roster: Record<string, OwnedGeneral>): Unit[] {
  const seen = new Set<string>();
  const take = (id: unknown) => {
    if (typeof id !== 'string' || !roster[id] || seen.has(id)) return null;
    seen.add(id);
    return id;
  };
  const list = Array.isArray(raw) ? raw : [];
  const units: Unit[] = [];
  for (let i = 0; i < 3; i++) {
    const u = (list[i] && typeof list[i] === 'object' ? list[i] : {}) as Partial<Unit> & { vice?: string | null };
    units.push({
      commander: take(u.commander),
      vice1: take(u.vice1 ?? u.vice),
      vice2: take(u.vice2),
      strategist: take(u.strategist),
      aide1: take(u.aide1),
      aide2: take(u.aide2),
    });
  }
  return units;
}

export function sanitizeSave(raw: unknown): SaveData {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<SaveData>;
  const roster = sanitizeRoster(src.roster);
  const cleared: Record<string, number> = {};
  if (src.cleared && typeof src.cleared === 'object') {
    for (const [id, n] of Object.entries(src.cleared)) {
      if (!/^[\w-]{1,16}$/.test(id)) continue;
      cleared[id] = clampInt(n, 0, 9999, 0);
    }
  }
  const recruitDay = typeof src.recruitDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.recruitDay) ? src.recruitDay : '';
  return {
    started: typeof src.started === 'boolean' ? src.started : Object.keys(roster).length > 0,
    gold: clampInt(src.gold, 0, 1_000_000_000, 0),
    roster,
    formation: sanitizeFormation(src.formation, roster),
    cleared,
    totalPulls: clampInt(src.totalPulls, 0, 1_000_000_000, 0),
    conquestBest: clampInt(src.conquestBest, 0, 999, 0),
    conquestFailFloor: clampInt(src.conquestFailFloor, 0, 999, 0),
    recruitDay,
    recruitUsed: clampInt(src.recruitUsed, 0, 10, 0),
  };
}

/** v1(3칸) → v2(6칸) → v3(승급) → v4(하루 등용 횟수) */
export function migrateSave(persisted: unknown, version: number): SaveData {
  const src = (persisted && typeof persisted === 'object' ? { ...(persisted as Record<string, unknown>) } : {}) as Record<string, unknown>;
  if (version < 2 && Array.isArray(src.formation)) {
    const old = src.formation as (Partial<Unit> & { vice?: string | null })[];
    src.formation = old.map((u) => ({
      ...emptyUnit(),
      commander: u?.commander ?? null,
      vice1: u?.vice ?? u?.vice1 ?? null,
      strategist: u?.strategist ?? null,
    }));
  }
  if (version < 3 && src.roster && typeof src.roster === 'object') {
    const roster = { ...(src.roster as Record<string, OwnedGeneral>) };
    for (const id of Object.keys(roster)) roster[id] = { ...roster[id], promote: roster[id]?.promote ?? 0 };
    src.roster = roster;
  }
  if (version < 4) {
    if (typeof src.recruitDay !== 'string') src.recruitDay = '';
    if (typeof src.recruitUsed !== 'number') src.recruitUsed = 0;
  }
  return sanitizeSave(src);
}

export function pickSave(s: SaveData): SaveData {
  return {
    started: s.started,
    gold: s.gold,
    roster: s.roster,
    formation: s.formation,
    cleared: s.cleared,
    totalPulls: s.totalPulls,
    conquestBest: s.conquestBest,
    conquestFailFloor: s.conquestFailFloor,
    recruitDay: s.recruitDay,
    recruitUsed: s.recruitUsed,
  };
}

export function saveSignature(s: SaveData): string {
  const save = pickSave(s);
  const roster: SaveData['roster'] = {};
  for (const id of Object.keys(save.roster).sort()) {
    const g = save.roster[id];
    roster[id] = { level: g.level, exp: g.exp, stars: g.stars, promote: g.promote ?? 0 };
  }
  const cleared: SaveData['cleared'] = {};
  for (const id of Object.keys(save.cleared).sort()) cleared[id] = save.cleared[id];
  return JSON.stringify({ ...save, roster, cleared });
}

/** 아직 출사표 전이거나, 시작 배치 그대로인 기록 */
export function isFreshSave(s: SaveData): boolean {
  if (!s.started) return true;
  return saveSignature(s) === saveSignature(freshSave());
}

export function saveSummary(s: SaveData): string {
  const generals = Object.keys(s.roster).length;
  const clears = Object.values(s.cleared).filter((n) => n > 0).length;
  return `금화 ${s.gold.toLocaleString('ko-KR')} · 장수 ${generals} · 클리어 ${clears}`;
}
