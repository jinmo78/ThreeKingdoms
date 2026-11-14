// ============================================================
// 게임 상태 — Zustand + persist(localStorage)
// 저장 대상: 금화 · 보유 장수 · 부대 편성 · 스테이지 진행도
// 로그인한 경우에는 같은 본문을 Firestore에도 올린다.
// ============================================================
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { STAGE_MAP } from '../data/stages';
import { simulateBattle, type BattleResult } from '../engine/battle';
import { autoFormation } from '../engine/autoFormation';
import { DAILY_PULLS, DUPLICATE_REFUND, PULL_COST, rollGenerals, todayKey } from '../engine/gacha';
import { randomSeed } from '../engine/rng';
import type { ArmyTheme } from '../engine/aiArmy';
import { conquestFloor } from '../engine/conquest';
import { emptyUnit, enemyUnitsToProfiles, playerProfiles } from '../engine/profiles';
import { expToNext, MAX_LEVEL, MAX_STARS, PROMOTE_COST, promoteTarget } from '../engine/unit';

export { emptyUnit, enemyProfiles, playerProfiles, unitProfile } from '../engine/profiles';
import type { EnemyUnit, GeneralDef, OwnedGeneral, Slot, Unit } from '../types';
import { GENERAL_MAP } from '../data/generals';
import { SLOTS } from '../types';
import { freshSave, migrateSave, pickSave, SAVE_VERSION, type SaveData } from './saveData';

export type { SaveData } from './saveData';
export { SAVE_VERSION } from './saveData';

export type View = 'campaign' | 'formation' | 'recruit' | 'roster' | 'challenge' | 'battle';

export interface RecruitResult {
  def: GeneralDef;
  isNew: boolean;
  stars: number;
  refund: number;
}

export interface BattleReward {
  gold: number;
  exp: number;
  firstClear: boolean;
  levelUps: { id: string; from: number; to: number }[];
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
  recruit: (count: 1 | 10) => RecruitResult[] | null;
  assign: (unit: number, slot: Slot, id: string | null) => void;
  clearUnit: (unit: number) => void;
  /** 보유 장수로 3부대를 시너지 고려해 자동 편성 */
  autoForm: () => void;
  /** 태생 등급에서 품계를 한 단계 올린다. 금화가 부족하면 false */
  promote: (id: string) => boolean;
  /** 편성 전체 교체 (적군 맞춤 편성 적용) */
  applyFormation: (units: Unit[]) => void;
  /** 편성 화면 상성 힌트의 상대 — 스테이지 id | 'conquest' | 'practice' (저장 안 함) */
  focusStage: string | null;
  setFocusStage: (id: string) => void;
  startBattle: (stageId: string) => boolean;
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

export const useGame = create<GameState>()(
  persist(
    (set, get) => ({
      started: false,
      gold: 0,
      roster: {},
      formation: [emptyUnit(), emptyUnit(), emptyUnit()],
      cleared: {},
      totalPulls: 0,
      conquestBest: 0,
      conquestFailFloor: 0,
      recruitDay: '',
      recruitUsed: 0,
      view: 'campaign',
      battle: null,
      entered: false,

      enter: () => set({ entered: true, view: 'campaign' }),
      goTitle: () => set({ entered: false }),
      newGame: () => set({ ...freshSave(), view: 'campaign', battle: null, entered: true }),

      setView: (view) => set({ view }),

      recruit: (count) => {
        const cost = count === 10 ? PULL_COST.ten : PULL_COST.single;
        const state = get();
        const today = todayKey();
        const used = state.recruitDay === today ? state.recruitUsed : 0;
        if (used + count > DAILY_PULLS) return null;
        if (state.gold < cost) return null;
        const next = { ...state.roster };
        let refundTotal = 0;
        const results = rollGenerals(count).map((def): RecruitResult => {
          const cur = next[def.id];
          if (!cur) {
            next[def.id] = { level: 1, exp: 0, stars: 0, promote: 0 };
            return { def, isNew: true, stars: 0, refund: 0 };
          }
          if (cur.stars < MAX_STARS) {
            next[def.id] = { ...cur, stars: cur.stars + 1 };
            return { def, isNew: false, stars: cur.stars + 1, refund: 0 };
          }
          const refund = DUPLICATE_REFUND[def.rarity];
          refundTotal += refund;
          return { def, isNew: false, stars: cur.stars, refund };
        });
        set({
          gold: state.gold - cost + refundTotal,
          roster: next,
          totalPulls: state.totalPulls + count,
          recruitDay: today,
          recruitUsed: used + count,
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

      autoForm: () => set({ formation: autoFormation(get().roster) }),
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
      applyFormation: (units) => set({ formation: units.map((u) => ({ ...emptyUnit(), ...u })) }),
      focusStage: null,
      setFocusStage: (focusStage) => set({ focusStage }),

      startBattle: (stageId) => {
        const { formation, roster, cleared, gold } = get();
        const stage = STAGE_MAP[stageId];
        const mine = playerProfiles(formation, roster);
        if (!stage || mine.length === 0) return false;

        const result = simulateBattle(mine, enemyUnitsToProfiles(stage.enemies), randomSeed());

        // 보상은 전투 계산 즉시 확정 (새로고침으로 결과를 바꿀 수 없게)
        const firstClear = result.win && !cleared[stageId];
        const rewardGold = result.win
          ? stage.reward.gold + (firstClear ? stage.firstClearGold : 0)
          : Math.round(stage.reward.gold * 0.2);
        const rewardExp = result.win ? stage.reward.exp : Math.round(stage.reward.exp * 0.3);

        const { roster: nextRoster, levelUps } = grantExp(roster, formation, rewardExp);

        set({
          gold: gold + rewardGold,
          roster: nextRoster,
          cleared: result.win ? { ...cleared, [stageId]: (cleared[stageId] ?? 0) + 1 } : cleared,
          battle: {
            mode: 'stage', title: stage.title, subtitle: stage.id, stageId, enemies: stage.enemies,
            result, reward: { gold: rewardGold, exp: rewardExp, firstClear, levelUps },
          },
          view: 'battle',
          focusStage: stageId,
        });
        return true;
      },

      startPractice: (enemies, title) => {
        const { formation, roster } = get();
        const mine = playerProfiles(formation, roster);
        if (mine.length === 0) return false;
        const result = simulateBattle(mine, enemyUnitsToProfiles(enemies), randomSeed());
        set({ battle: { mode: 'practice', title, subtitle: '모의전 · 보상 없음', enemies, result, reward: null }, view: 'battle', focusStage: 'practice' });
        return true;
      },

      startConquest: () => {
        const { formation, roster, gold, conquestBest, cleared } = get();
        if (!cleared['4-3']) return false;
        const mine = playerProfiles(formation, roster);
        if (mine.length === 0) return false;
        const f = conquestFloor(conquestBest + 1);
        const result = simulateBattle(mine, enemyUnitsToProfiles(f.enemies), randomSeed());
        const rewardGold = result.win ? f.reward.gold : Math.round(f.reward.gold * 0.1);
        const rewardExp = result.win ? f.reward.exp : Math.round(f.reward.exp * 0.3);
        const { roster: nextRoster, levelUps } = grantExp(roster, formation, rewardExp);
        set({
          gold: gold + rewardGold,
          roster: nextRoster,
          conquestBest: result.win ? f.floor : conquestBest,
          conquestFailFloor: result.win ? get().conquestFailFloor : f.floor,
          focusStage: 'conquest',
          battle: {
            mode: 'conquest', title: `천하 토벌전 ${f.floor}층`, subtitle: f.boss ? '정예 혼성군' : '', floor: f.floor,
            enemies: f.enemies, result, reward: { gold: rewardGold, exp: rewardExp, firstClear: result.win, levelUps },
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
      // v1(주장·부장·참모 3칸) → v2(6칸) → v3(품계 승급) → v4(하루 등용 횟수)
      migrate: (persisted, version) => migrateSave(persisted, version),
      storage: createJSONStorage(() => localStorage),
      partialize: (s): SaveData => pickSave(s),
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
