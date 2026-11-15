// 저장 본문. 브라우저(localStorage)와 Firestore가 같은 모양을 쓴다.
import { GENERAL_MAP } from '../data/generals';
import { LEGACY_POINT_GOLD, PRESET_LIMIT } from '../engine/formationBook';
import { DAILY_PULLS } from '../engine/gacha';
import { emptyUnit } from '../engine/profiles';
import { MAX_LEVEL, MAX_STARS } from '../engine/unit';
import type { OwnedGeneral, Unit } from '../types';
import { SLOTS } from '../types';

export const SAVE_VERSION = 8;

export interface FormationPreset {
  id: string;
  name: string;
  units: Unit[];
}

export interface SaveData {
  started: boolean;
  gold: number;
  roster: Record<string, OwnedGeneral>;
  formation: Unit[];
  cleared: Record<string, number>;
  /** 스테이지를 싸운 횟수. 승패와 상관없이 오르며, 맞춤 편성 개방에 쓴다. */
  fought: Record<string, number>;
  totalPulls: number;
  /** 천하 토벌전 최고 돌파 층 */
  conquestBest: number;
  /** 가장 최근에 패배한 토벌전 층 */
  conquestFailFloor: number;
  /** 등용 횟수를 센 날짜 (YYYY-MM-DD) */
  recruitDay: string;
  recruitUsed: number;
  presets: FormationPreset[];
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
    fought: {},
    totalPulls: 0,
    conquestBest: 0,
    conquestFailFloor: 0,
    recruitDay: '',
    recruitUsed: 0,
    presets: [],
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

export function sanitizeFormation(raw: unknown, roster: Record<string, OwnedGeneral>): Unit[] {
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

function sanitizePresets(raw: unknown, roster: Record<string, OwnedGeneral>): FormationPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: FormationPreset[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const preset = item as Partial<FormationPreset>;
    if (typeof preset.id !== 'string' || !/^[\w-]{1,24}$/.test(preset.id)) continue;
    if (out.some((p) => p.id === preset.id)) continue;
    const name = typeof preset.name === 'string' ? preset.name.replace(/\s+/g, ' ').trim().slice(0, 12) : '';
    if (!name) continue;
    const units = sanitizeFormation(preset.units, roster);
    if (!units.some((u) => SLOTS.some((s) => u[s]))) continue;
    out.push({ id: preset.id, name, units });
    if (out.length >= PRESET_LIMIT) break;
  }
  return out;
}

export function sanitizeSave(raw: unknown): SaveData {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Partial<SaveData>;
  const roster = sanitizeRoster(src.roster);
  const cleared = sanitizeCounts(src.cleared);
  const fought = sanitizeCounts(src.fought);
  for (const [id, n] of Object.entries(cleared)) {
    if (fought[id] == null) fought[id] = n;
  }
  const recruitDay = typeof src.recruitDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(src.recruitDay) ? src.recruitDay : '';
  return {
    started: typeof src.started === 'boolean' ? src.started : Object.keys(roster).length > 0,
    gold: clampInt(src.gold, 0, 1_000_000_000, 0),
    roster,
    formation: sanitizeFormation(src.formation, roster),
    cleared,
    fought,
    totalPulls: clampInt(src.totalPulls, 0, 1_000_000_000, 0),
    conquestBest: clampInt(src.conquestBest, 0, 999, 0),
    conquestFailFloor: clampInt(src.conquestFailFloor, 0, 999, 0),
    recruitDay,
    recruitUsed: clampInt(src.recruitUsed, 0, DAILY_PULLS, 0),
    presets: sanitizePresets(src.presets, roster),
  };
}

function sanitizeCounts(raw: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [id, n] of Object.entries(raw)) {
    if (!/^[\w-]{1,16}$/.test(id)) continue;
    const count = clampInt(n, 0, 9999, 0);
    if (count > 0) out[id] = count;
  }
  return out;
}

/** v1(3칸) → v2(6칸) → v3(승급) → v4(하루 등용 횟수) → v5(편성 저장) → v6(저장 비용이 금화) → v8(전투 횟수) */
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
  if (version < 5) {
    if (typeof src.points !== 'number') src.points = 60;
    if (!Array.isArray(src.presets)) src.presets = [];
  }
  if (version < 6) {
    const leftover = typeof src.points === 'number' && Number.isFinite(src.points) ? Math.max(0, Math.floor(src.points)) : 0;
    const gold = typeof src.gold === 'number' && Number.isFinite(src.gold) ? src.gold : 0;
    src.gold = gold + leftover * LEGACY_POINT_GOLD;
    delete src.points;
  }
  if (version < 8) {
    const fought = src.fought && typeof src.fought === 'object' ? { ...(src.fought as Record<string, unknown>) } : {};
    const cleared = src.cleared && typeof src.cleared === 'object' ? src.cleared as Record<string, unknown> : {};
    for (const [id, n] of Object.entries(cleared)) {
      if (typeof n === 'number' && n > 0 && fought[id] == null) fought[id] = n;
    }
    src.fought = fought;
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
    fought: s.fought,
    totalPulls: s.totalPulls,
    conquestBest: s.conquestBest,
    conquestFailFloor: s.conquestFailFloor,
    recruitDay: s.recruitDay,
    recruitUsed: s.recruitUsed,
    presets: s.presets,
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
  const fought: SaveData['fought'] = {};
  for (const id of Object.keys(save.fought).sort()) fought[id] = save.fought[id];
  const presets = [...save.presets].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify({ ...save, roster, cleared, fought, presets });
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
