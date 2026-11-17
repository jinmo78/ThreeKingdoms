// ============================================================
// 게임 상태 — Zustand + persist(localStorage)
// 저장 대상: 금화 · 보유 장수 · 부대 편성 · 스테이지 진행도
// 로그인한 경우에는 같은 본문을 Firestore에도 올린다.
// ============================================================
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { GEAR_MAP, conquestGearId, stageGearId } from '../data/gear';
import { isUnlocked, STAGE_MAP, STAGES, stageIndex } from '../data/stages';
import { simulateBattle, type BattleResult } from '../engine/battle';
import { autoFormation } from '../engine/autoFormation';
import { PRESET_LIMIT, formationGold } from '../engine/formationBook';
import { attendancePreview, recruitCost, todayKey, withDailyFreeGrant } from '../engine/attendance';
import { DUPLICATE_REFUND, rollGenerals } from '../engine/gacha';
import { randomSeed } from '../engine/rng';
import type { ArmyTheme } from '../engine/aiArmy';
import { conquestFloor } from '../engine/conquest';
import {
  GEAR_MAX_ENHANCE, GEAR_MAX_LEVEL, GEAR_PROMOTE_SHARDS,
  equipOn, gearCount, gearEnhanceCost, gearLevelCost, gearPromoteCost, gearPromoteLeft, gearRarity, grantGear, unequipOne,
} from '../engine/gear';
import { emptyUnit, enemyUnitsToProfiles, playerProfiles, unitProfile } from '../engine/profiles';
import {
  GARRISON_RECOVER_MS, MAX_MARCHES, MIN_SORTIE, SQUAD_RECOVER_MS, clearGarrison, garrisonKey, marchMs, pruneWounds, ratioOf, squadKey, withRatio,
} from '../engine/siege';
import { expToNext, MAX_LEVEL, MAX_STARS, PROMOTE_COST, promoteTarget } from '../engine/unit';

export { emptyUnit, enemyProfiles, playerProfiles, unitProfile } from '../engine/profiles';
import type { EnemyUnit, GeneralDef, OwnedGeneral, Slot, Unit } from '../types';
import { GENERAL_MAP } from '../data/generals';
import { SLOTS } from '../types';
import { freshSave, migrateSave, pickSave, sanitizeFormation, SAVE_VERSION, type SaveData } from './saveData';

export type { SaveData } from './saveData';
export { SAVE_VERSION } from './saveData';

export type View = 'campaign' | 'formation' | 'recruit' | 'roster' | 'challenge' | 'battle';

const PLAY_VIEWS: View[] = ['campaign', 'formation', 'recruit', 'roster', 'challenge'];
function isPlayView(v: unknown): v is View {
  return typeof v === 'string' && (PLAY_VIEWS as string[]).includes(v);
}

export interface RecruitResult {
  def: GeneralDef;
  isNew: boolean;
  stars: number;
  refund: number;
  /** 이번 등용에 쓴 무료 횟수 · 금화 */
  freeUsed?: number;
  goldSpent?: number;
}

export interface BattleReward {
  gold: number;
  exp: number;
  firstClear: boolean;
  levelUps: { id: string; from: number; to: number }[];
  /** 이번 전투에서 나온 장비. 이미 가진 것이면 파편 */
  gear?: { name: string; isNew: boolean; copy?: boolean };
}

/** stage: 원정 · practice: 모의전(보상 없음) · conquest: 천하 토벌전 */
export type BattleMode = 'stage' | 'practice' | 'conquest';

export interface ActiveBattle {
  mode: BattleMode;
  title: string;
  subtitle: string;
  stageId?: string;
  floor?: number;
  enemies: EnemyUnit[];
  result: BattleResult;
  /** 모의전은 null */
  reward: BattleReward | null;
  /** 원정: 공성 결과 — 점령 여부와 남은 수비대 */
  siege?: { captured: boolean; left: number; total: number };
}

export type PracticeDifficulty = -3 | 0 | 3 | 6;
export interface PracticeSettings {
  theme: ArmyTheme;
  diff: PracticeDifficulty;
  seed: number;
}
export interface PracticeRecord {
  id: number;
  opponent: string;
  commanders: string;
  winRate: number;
  avgChains: number;
}

interface GameState extends SaveData {
  view: View;
  battle: ActiveBattle | null;
  /** 이번 접속에서 타이틀 화면을 지나왔는지 (저장 안 함) */
  entered: boolean;
  enter: () => void;
  /** 저장은 두고 첫 화면으로 돌아간다 */
  goTitle: () => void;
  newGame: () => void;
  setView: (v: View) => void;
  /** 날짜가 바뀌었으면 일일 무료 등용을 지급 */
  refreshDailyFree: () => void;
  /** 오늘 출석. 이미 했으면 null */
  claimAttendance: () => { streak: number; reward: number } | null;
  recruit: (count: 1 | 10) => RecruitResult[] | null;
  assign: (unit: number, slot: Slot, id: string | null) => void;
  clearUnit: (unit: number) => void;
  /** 보유 장수로 3부대를 시너지 고려해 자동 편성 */
  autoForm: () => void;
  /** 태생 등급에서 품계를 한 단계 올린다. 금화가 부족하면 false */
  promote: (id: string) => boolean;
  /** 장비를 장수에게 끼우거나, generalId가 없으면 모두에게서 벗긴다 */
  equipGear: (generalId: string | null, gearId: string) => void;
  /** 그 장수에게서만 장비를 벗긴다 */
  unequipGear: (generalId: string, gearId: string) => void;
  gearLevelUp: (id: string) => 'ok' | 'missing' | 'max' | 'shard' | 'gold';
  gearEnhance: (id: string) => 'ok' | 'missing' | 'max' | 'shard' | 'gold';
  gearPromote: (id: string) => 'ok' | 'missing' | 'max' | 'need' | 'shard' | 'gold';
  /** 편성 전체 교체 (적군 맞춤 편성 적용) */
  applyFormation: (units: Unit[]) => void;
  /** 금화를 더하거나 뺀다. 잔액이 0 미만이면 바꾸지 않는다. */
  adjustGold: (delta: number) => boolean;
  /** 현재 편성을 금화로 저장. 비용은 배치 장수 등급 합 */
  savePreset: (name: string) => 'ok' | 'name' | 'full' | 'empty' | 'gold';
  /** 저장한 편성을 무료로 덮어쓴다 */
  loadPreset: (id: string) => 'ok' | 'missing' | 'empty';
  deletePreset: (id: string) => void;
  /** 편성 화면 상성 힌트의 상대 — 스테이지 id | 'conquest' | 'practice' (저장 안 함) */
  focusStage: string | null;
  setFocusStage: (id: string) => void;
  /** 출정: 도착 시각이 되면 전투가 풀린다. picks는 편성 번호(0~2), 없으면 출정 가능한 부대 전부 */
  startMarch: (stageId: string, picks?: number[]) => boolean;
  /** 도착한 부대가 있으면 전투를 계산해 전투 화면을 연다 */
  resolveMarches: () => boolean;
  /** 모의전 관전 (보상 없음) */
  startPractice: (enemies: EnemyUnit[], title: string) => boolean;
  /** 천하 토벌전 다음 층 도전 */
  startConquest: () => boolean;
  closeBattle: () => void;
  /** 모의전 설정과 100전 측정 기록 (저장 안 함) */
  practice: PracticeSettings;
  setPractice: (p: Partial<PracticeSettings>) => void;
  practiceLog: PracticeRecord[];
  addPracticeRecord: (r: Omit<PracticeRecord, 'id'>) => void;
}

/** 출진 장수 전원에게 경험치 지급 */
function grantExp(roster: Record<string, OwnedGeneral>, formation: Unit[], amount: number) {
  const next = { ...roster };
  const levelUps: BattleReward['levelUps'] = [];
  const deployed = new Set(formation.filter((u) => u.commander).flatMap((u) => SLOTS.map((s) => u[s])));
  for (const id of deployed) {
    if (!id || !next[id]) continue;
    let { level, exp } = next[id];
    const from = level;
    exp += amount;
    while (level < MAX_LEVEL && exp >= expToNext(level)) {
      exp -= expToNext(level);
      level++;
    }
    if (level >= MAX_LEVEL) exp = 0;
    next[id] = { ...next[id], level, exp };
    if (level > from) levelUps.push({ id, from, to: level });
  }
  return { roster: next, levelUps };
}

/** 승리 시 장비. 없으면 바로 지급하고, 있으면 첫 클리어는 파편, 재도전은 40%. */
function stageDrop(gear: SaveData['gear'], stageId: string, win: boolean, firstClear: boolean) {
  if (!win) return { gear, drop: null as { name: string; isNew: boolean; copy?: boolean } | null };
  const index = STAGES.findIndex((s) => s.id === stageId);
  const stage = STAGES[index];
  const id = stage ? stageGearId(stage.chapter, index) : null;
  if (!id) return { gear, drop: null };
  if (gear[id] && !firstClear && Math.random() >= 0.4) return { gear, drop: null };
  const granted = grantGear(gear, id);
  return { gear: granted.bag, drop: granted.drop };
}

/** 도착한 부대의 공성전을 계산해 상태 변화분을 돌려준다. 출정할 부대가 없으면 null */
function siegeBattle(s: GameState, stageId: string, units: Unit[], now: number): Partial<GameState> | null {
  const { roster, cleared, fought, gold, gear, wounds } = s;
  const stage = STAGE_MAP[stageId];
  if (!stage) return null;

  const squads = units
    .map((u) => ({ u, p: unitProfile(u, roster, gear), r: ratioOf(wounds, squadKey(u.commander!), now, SQUAD_RECOVER_MS) }))
    .filter((q): q is typeof q & { p: NonNullable<typeof q.p> } => !!q.p && q.r >= MIN_SORTIE);
  if (squads.length === 0) return null;

  // 수비대: 점령한 성은 새 수비대, 아직이면 지난 공격에서 남은 병력
  const already = (cleared[stageId] ?? 0) > 0;
  let defenders = stage.enemies
    .map((e, i) => ({ i, p: enemyUnitsToProfiles([e])[0], r: already ? 1 : ratioOf(wounds, garrisonKey(stageId, i), now, GARRISON_RECOVER_MS) }))
    .filter((d) => d.p && d.r > 0.001);
  if (defenders.length === 0) defenders = stage.enemies.map((e, i) => ({ i, p: enemyUnitsToProfiles([e])[0], r: 1 })).filter((d) => d.p);

  const result = simulateBattle(
    squads.map((q) => q.p), defenders.map((d) => d.p), randomSeed(),
    [squads.map((q) => q.r), defenders.map((d) => d.r)],
  );

  // 전투 뒤 남은 병력을 기록 (승리하면 성이 함락돼 수비대 기록은 사라진다)
  const left = result.events[result.events.length - 1].hp;
  let nextWounds = wounds;
  squads.forEach((q, k) => { nextWounds = withRatio(nextWounds, squadKey(q.u.commander!), left[0][k] / q.p.hp, now); });
  if (result.win) nextWounds = clearGarrison(nextWounds, stageId);
  else if (!already) defenders.forEach((d, k) => { nextWounds = withRatio(nextWounds, garrisonKey(stageId, d.i), left[1][k] / d.p.hp, now); });
  nextWounds = pruneWounds(nextWounds, now);
  const standing = result.win ? 0 : left[1].filter((h) => h > 0).length;

  // 보상은 전투 계산 즉시 확정 (새로고침으로 결과를 바꿀 수 없게)
  // 금화·경험치는 첫 클리어에만. 장비는 승리하면 따로 나온다.
  const firstClear = result.win && !already;
  const rewardGold = already ? 0 : result.win
    ? stage.reward.gold + stage.firstClearGold
    : Math.round(stage.reward.gold * 0.2);
  const rewardExp = already ? 0 : result.win ? stage.reward.exp : Math.round(stage.reward.exp * 0.3);
  const granted = rewardExp > 0
    ? grantExp(roster, squads.map((q) => q.u), rewardExp)
    : { roster, levelUps: [] as BattleReward['levelUps'] };
  const dropped = stageDrop(gear, stageId, result.win, firstClear);
  const reward = !rewardGold && !rewardExp && !dropped.drop
    ? null
    : { gold: rewardGold, exp: rewardExp, firstClear, levelUps: granted.levelUps, gear: dropped.drop ?? undefined };

  return {
    gold: gold + rewardGold,
    roster: granted.roster,
    gear: dropped.gear,
    wounds: nextWounds,
    cleared: result.win ? { ...cleared, [stageId]: (cleared[stageId] ?? 0) + 1 } : cleared,
    fought: { ...fought, [stageId]: (fought[stageId] ?? 0) + 1 },
    battle: {
      mode: 'stage', title: stage.title, subtitle: stage.id, stageId, enemies: stage.enemies,
      result,
      reward,
      siege: { captured: result.win, left: standing, total: stage.enemies.length },
    },
    view: 'battle',
    focusStage: stageId,
  };
}

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      started: false,
      gold: 0,
      roster: {},
      formation: [emptyUnit(), emptyUnit(), emptyUnit()],
      cleared: {},
      fought: {},
      totalPulls: 0,
      conquestBest: 0,
      conquestFailFloor: 0,
      freePulls: 0,
      freeGrantDay: '',
      attendDay: '',
      attendStreak: 0,
      presets: [],
      gear: {},
      wounds: {},
      marches: [],
      view: 'campaign',
      battle: null,
      entered: false,

      enter: () => {
        const state = get();
        const granted = withDailyFreeGrant({ freePulls: state.freePulls, freeGrantDay: state.freeGrantDay });
        set({
          entered: true,
          view: 'campaign',
          ...(granted.changed ? { freePulls: granted.freePulls, freeGrantDay: granted.freeGrantDay } : {}),
        });
      },
      goTitle: () => set({ entered: false }),
      newGame: () => set({ ...freshSave(), view: 'campaign', battle: null, entered: true }),

      setView: (view) => set({ view }),

      refreshDailyFree: () => {
        const state = get();
        const next = withDailyFreeGrant({ freePulls: state.freePulls, freeGrantDay: state.freeGrantDay });
        if (!next.changed) return;
        set({ freePulls: next.freePulls, freeGrantDay: next.freeGrantDay });
      },

      claimAttendance: () => {
        const state = get();
        const granted = withDailyFreeGrant({ freePulls: state.freePulls, freeGrantDay: state.freeGrantDay });
        const preview = attendancePreview(state.attendDay, state.attendStreak);
        if (!preview.canClaim) {
          if (granted.changed) set({ freePulls: granted.freePulls, freeGrantDay: granted.freeGrantDay });
          return null;
        }
        set({
          freePulls: granted.freePulls + preview.reward,
          freeGrantDay: granted.freeGrantDay,
          attendDay: todayKey(),
          attendStreak: preview.nextStreak,
        });
        return { streak: preview.nextStreak, reward: preview.reward };
      },

      recruit: (count) => {
        const state = get();
        const granted = withDailyFreeGrant({ freePulls: state.freePulls, freeGrantDay: state.freeGrantDay });
        const cost = recruitCost(count, granted.freePulls);
        if (state.gold < cost.gold) {
          if (granted.changed) set({ freePulls: granted.freePulls, freeGrantDay: granted.freeGrantDay });
          return null;
        }
        const next = { ...state.roster };
        let refundTotal = 0;
        const results = rollGenerals(count).map((def): RecruitResult => {
          const cur = next[def.id];
          if (!cur) {
            next[def.id] = { level: 1, exp: 0, stars: 0, promote: 0 };
            return { def, isNew: true, stars: 0, refund: 0, freeUsed: cost.freeUsed, goldSpent: cost.gold };
          }
          if (cur.stars < MAX_STARS) {
            next[def.id] = { ...cur, stars: cur.stars + 1 };
            return { def, isNew: false, stars: cur.stars + 1, refund: 0, freeUsed: cost.freeUsed, goldSpent: cost.gold };
          }
          const refund = DUPLICATE_REFUND[def.rarity];
          refundTotal += refund;
          return { def, isNew: false, stars: cur.stars, refund, freeUsed: cost.freeUsed, goldSpent: cost.gold };
        });
        set({
          gold: state.gold - cost.gold + refundTotal,
          roster: next,
          totalPulls: state.totalPulls + count,
          freePulls: granted.freePulls - cost.freeUsed,
          freeGrantDay: granted.freeGrantDay,
        });
        return results;
      },

      assign: (unitIdx, slot, id) => {
        const formation = get().formation.map((u) => ({ ...u }));
        // 같은 장수는 한 자리에만 배치
        if (id) for (const u of formation) for (const s of SLOTS) if (u[s] === id) u[s] = null;
        formation[unitIdx][slot] = id;
        set({ formation });
      },

      clearUnit: (unitIdx) => {
        const formation = get().formation.map((u, i) => (i === unitIdx ? emptyUnit() : u));
        set({ formation });
      },

      autoForm: () => set({ formation: autoFormation(get().roster, 3, get().gear) }),
      promote: (id) => {
        const { gold, roster } = get();
        const owned = roster[id];
        const def = GENERAL_MAP[id];
        if (!owned || !def || (owned.promote ?? 0) > 0) return false;
        if (owned.level < MAX_LEVEL || owned.stars < MAX_STARS) return false;
        const target = promoteTarget(def.rarity);
        if (!target) return false;
        const cost = PROMOTE_COST[target];
        if (gold < cost) return false;
        set({ gold: gold - cost, roster: { ...roster, [id]: { ...owned, promote: 1 } } });
        return true;
      },
      equipGear: (generalId, gearId) => {
        const { roster, gear } = get();
        if (!gear[gearId] || (generalId != null && !roster[generalId])) return;
        set({ roster: equipOn(roster, generalId, gearId, gearCount(gear[gearId])) });
      },
      unequipGear: (generalId, gearId) => {
        if (!get().roster[generalId]) return;
        set({ roster: unequipOne(get().roster, generalId, gearId) });
      },
      gearLevelUp: (id) => {
        const { gold, gear } = get();
        const owned = gear[id];
        if (!owned || !GEAR_MAP[id]) return 'missing';
        if (owned.level >= GEAR_MAX_LEVEL) return 'max';
        if (owned.shards < 1) return 'shard';
        const cost = gearLevelCost(owned.level);
        if (gold < cost) return 'gold';
        set({ gold: gold - cost, gear: { ...gear, [id]: { ...owned, level: owned.level + 1, shards: owned.shards - 1 } } });
        return 'ok';
      },
      gearEnhance: (id) => {
        const { gold, gear } = get();
        const owned = gear[id];
        if (!owned || !GEAR_MAP[id]) return 'missing';
        if (owned.enhance >= GEAR_MAX_ENHANCE) return 'max';
        if (owned.shards < 2) return 'shard';
        const cost = gearEnhanceCost(owned.enhance);
        if (gold < cost) return 'gold';
        set({ gold: gold - cost, gear: { ...gear, [id]: { ...owned, enhance: owned.enhance + 1, shards: owned.shards - 2 } } });
        return 'ok';
      },
      gearPromote: (id) => {
        const { gold, gear } = get();
        const owned = gear[id];
        const def = GEAR_MAP[id];
        if (!owned || !def) return 'missing';
        if (gearPromoteLeft(def, owned.promote) <= 0) return 'max';
        if (owned.level < GEAR_MAX_LEVEL || owned.enhance < GEAR_MAX_ENHANCE) return 'need';
        if (owned.shards < GEAR_PROMOTE_SHARDS) return 'shard';
        const next = gearRarity(def, owned.promote + 1);
        if (next !== 'SR' && next !== 'SSR') return 'max';
        const cost = gearPromoteCost(next);
        if (gold < cost) return 'gold';
        set({
          gold: gold - cost,
          gear: { ...gear, [id]: { ...owned, promote: owned.promote + 1, shards: owned.shards - GEAR_PROMOTE_SHARDS } },
        });
        return 'ok';
      },
      applyFormation: (units) => set({ formation: units.map((u) => ({ ...emptyUnit(), ...u })) }),
      adjustGold: (delta) => {
        const gold = get().gold + delta;
        if (!Number.isFinite(gold) || gold < 0) return false;
        set({ gold });
        return true;
      },
      savePreset: (name) => {
        const state = get();
        const trimmed = name.replace(/\s+/g, ' ').trim().slice(0, 12);
        if (!trimmed) return 'name';
        if (state.presets.length >= PRESET_LIMIT) return 'full';
        const cost = formationGold(state.formation, state.roster);
        if (cost <= 0) return 'empty';
        if (state.gold < cost) return 'gold';
        const id = `p${Date.now().toString(36)}${Math.floor(Math.random() * 36).toString(36)}`;
        set({
          gold: state.gold - cost,
          presets: [...state.presets, { id, name: trimmed, units: state.formation.map((u) => ({ ...u })) }],
        });
        return 'ok';
      },
      loadPreset: (id) => {
        const state = get();
        const preset = state.presets.find((p) => p.id === id);
        if (!preset) return 'missing';
        const units = sanitizeFormation(preset.units, state.roster);
        if (!units.some((u) => SLOTS.some((s) => u[s]))) return 'empty';
        set({ formation: units });
        return 'ok';
      },
      deletePreset: (id) => set({ presets: get().presets.filter((p) => p.id !== id) }),
      focusStage: null,
      setFocusStage: (focusStage) => set({ focusStage }),

      startMarch: (stageId, picks) => {
        const { formation, roster, cleared, gear, wounds, marches } = get();
        const stage = STAGE_MAP[stageId];
        if (!stage || !isUnlocked(stageId, cleared) || marches.length >= MAX_MARCHES) return false;
        const now = Date.now();
        const busy = new Set(marches.flatMap((m) => m.units.map((u) => u.commander)));
        const units = formation
          .filter((u, i) => u.commander && (!picks || picks.includes(i)) && !busy.has(u.commander)
            && ratioOf(wounds, squadKey(u.commander), now, SQUAD_RECOVER_MS) >= MIN_SORTIE
            && unitProfile(u, roster, gear))
          .map((u) => ({ ...u }));
        if (units.length === 0) return false;
        const eta = now + marchMs(stageIndex(stageId));
        set({ marches: [...marches, { id: `${now}-${stageId}`, stageId, units, from: now, eta }], focusStage: stageId });
        return true;
      },

      resolveMarches: () => {
        const s = get();
        if (s.battle) return false;
        const now = Date.now();
        const due = s.marches.filter((m) => m.eta <= now).sort((a, b) => a.eta - b.eta)[0];
        if (!due) return false;
        const patch = siegeBattle(s, due.stageId, due.units, now);
        set({ ...(patch ?? {}), marches: s.marches.filter((m) => m.id !== due.id) });
        return !!patch;
      },

      startPractice: (enemies, title) => {
        const { formation, roster, gear } = get();
        const mine = playerProfiles(formation, roster, gear);
        if (mine.length === 0) return false;
        const result = simulateBattle(mine, enemyUnitsToProfiles(enemies), randomSeed());
        set({ battle: { mode: 'practice', title, subtitle: '모의전 · 보상 없음', enemies, result, reward: null }, view: 'battle', focusStage: 'practice' });
        return true;
      },

      startConquest: () => {
        const { formation, roster, gold, conquestBest, cleared, gear } = get();
        if (!cleared['4-3']) return false;
        const mine = playerProfiles(formation, roster, gear);
        if (mine.length === 0) return false;
        const f = conquestFloor(conquestBest + 1);
        const result = simulateBattle(mine, enemyUnitsToProfiles(f.enemies), randomSeed());
        const rewardGold = result.win ? f.reward.gold : Math.round(f.reward.gold * 0.1);
        const rewardExp = result.win ? f.reward.exp : Math.round(f.reward.exp * 0.3);
        const { roster: nextRoster, levelUps } = grantExp(roster, formation, rewardExp);
        const grantedGear = result.win ? grantGear(gear, conquestGearId(f.floor)) : null;
        set({
          gold: gold + rewardGold,
          roster: nextRoster,
          gear: grantedGear?.bag ?? gear,
          conquestBest: result.win ? f.floor : conquestBest,
          conquestFailFloor: result.win ? get().conquestFailFloor : f.floor,
          focusStage: 'conquest',
          battle: {
            mode: 'conquest', title: `천하 토벌전 ${f.floor}층`, subtitle: f.boss ? '정예 혼성군' : '', floor: f.floor,
            enemies: f.enemies, result,
            reward: { gold: rewardGold, exp: rewardExp, firstClear: result.win, levelUps, gear: grantedGear?.drop ?? undefined },
          },
          view: 'battle',
        });
        return true;
      },

      closeBattle: () => {
        const mode = get().battle?.mode;
        set({ battle: null, view: mode && mode !== 'stage' ? 'challenge' : 'campaign' });
      },

      practice: { theme: 'mixed', diff: 0, seed: randomSeed() },
      setPractice: (p) => set({ practice: { ...get().practice, ...p } }),
      practiceLog: [],
      addPracticeRecord: (r) => set({ practiceLog: [{ ...r, id: Date.now() }, ...get().practiceLog].slice(0, 8) }),
    }),
    {
      name: 'oath-banner-save',
      version: SAVE_VERSION,
      // v1(주장·부장·참모 3칸) → … → v8(전투 횟수) → v9(무료 등용·출석)
      migrate: (persisted, version) => {
        const save = migrateSave(persisted, version);
        const src = (persisted && typeof persisted === 'object' ? persisted : {}) as { entered?: unknown; view?: unknown };
        const view = isPlayView(src.view) ? src.view : 'campaign';
        // 예전 저장에는 입장 기록이 없다. 이미 시작한 기록은 새로고침해도 게임 화면에 남긴다.
        const entered = src.entered === true || (src.entered == null && save.started);
        return { ...save, entered, view };
      },
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const state = { ...current, ...(persisted as object) } as GameState;
        const fought = { ...(state.fought ?? {}) };
        for (const [id, n] of Object.entries(state.cleared ?? {})) {
          if (n > 0 && fought[id] == null) fought[id] = n;
        }
        return { ...state, fought };
      },
      partialize: (s) => ({
        ...pickSave(s),
        entered: s.entered,
        view: s.view === 'battle' ? (s.battle?.mode === 'stage' ? 'campaign' : 'challenge') : s.view,
      }),
    },
  ),
);

/** 클라우드에서 받은 기록으로 저장 본문만 바꾼다. 화면 이동과 로그인은 건드리지 않는다. */
export function applySaveState(save: SaveData) {
  const view = useGame.getState().view;
  useGame.setState({
    ...pickSave(save),
    battle: null,
    view: view === 'battle' ? 'campaign' : view,
  });
}
