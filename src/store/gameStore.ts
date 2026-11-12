// ============================================================
// 게임 상태 — Zustand + persist(localStorage)
// 저장 대상: 금화 · 보유 장수 · 부대 편성 · 스테이지 진행도
// ============================================================
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getGeneral, GENERAL_MAP } from '../data/generals';
import { STAGE_MAP } from '../data/stages';
import { simulateBattle, type BattleResult } from '../engine/battle';
import { PULL_COST, rollGenerals } from '../engine/gacha';
import { randomSeed } from '../engine/rng';
import { buildProfile, expToNext, makeMember, MAX_LEVEL, MAX_STARS, type UnitProfile } from '../engine/unit';
import type { GeneralDef, OwnedGeneral, Slot, Unit } from '../types';
import { SLOTS } from '../types';

export type View = 'campaign' | 'formation' | 'recruit' | 'roster' | 'battle';

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

export interface ActiveBattle {
  stageId: string;
  result: BattleResult;
  reward: BattleReward;
}

interface SaveData {
  started: boolean;
  gold: number;
  roster: Record<string, OwnedGeneral>;
  formation: Unit[];
  cleared: Record<string, number>;
  totalPulls: number;
}

interface GameState extends SaveData {
  view: View;
  battle: ActiveBattle | null;
  /** 이번 접속에서 타이틀 화면을 지나왔는지 (저장 안 함) */
  entered: boolean;
  enter: () => void;
  newGame: () => void;
  setView: (v: View) => void;
  recruit: (count: 1 | 10) => RecruitResult[] | null;
  assign: (unit: number, slot: Slot, id: string | null) => void;
  clearUnit: (unit: number) => void;
  startBattle: (stageId: string) => boolean;
  closeBattle: () => void;
}

const STARTERS = ['liubei', 'zhangfei', 'lusu', 'xuchu', 'huaxiong', 'huanggai'];
const DUPLICATE_REFUND = { SSR: 300, SR: 120, R: 40 } as const;

const emptyUnit = (): Unit => ({ commander: null, vice: null, strategist: null });

function freshSave(): SaveData {
  const roster: Record<string, OwnedGeneral> = {};
  for (const id of STARTERS) roster[id] = { level: 1, exp: 0, stars: 0 };
  return {
    started: true,
    gold: 1000,
    roster,
    // 튜토리얼: 유비·장비(도원결의 2인)를 미리 배치해 시너지를 바로 보여 줌
    formation: [{ commander: 'liubei', vice: 'zhangfei', strategist: 'lusu' }, emptyUnit(), emptyUnit()],
    cleared: {},
    totalPulls: 0,
  };
}

/** 편성된 부대 → 전투 프로필 (주장 없는 부대는 제외) */
export function playerProfiles(formation: Unit[], roster: Record<string, OwnedGeneral>): UnitProfile[] {
  return formation
    .map((u) => unitProfile(u, roster))
    .filter((p): p is UnitProfile => !!p);
}

export function unitProfile(u: Unit, roster: Record<string, OwnedGeneral>): UnitProfile | null {
  return buildProfile(
    SLOTS.map((slot) => {
      const id = u[slot];
      const owned = id ? roster[id] : undefined;
      return id && owned && GENERAL_MAP[id] ? makeMember(getGeneral(id), owned.level, owned.stars) : null;
    }),
  );
}

export function enemyProfiles(stageId: string): UnitProfile[] {
  return STAGE_MAP[stageId].enemies.map(
    (e) =>
      buildProfile(
        [e.commander, e.vice, e.strategist].map((id) => (id ? makeMember(getGeneral(id), e.level, 0) : null)),
      )!,
  );
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
      view: 'campaign',
      battle: null,
      entered: false,

      enter: () => set({ entered: true, view: 'campaign' }),
      newGame: () => set({ ...freshSave(), view: 'campaign', battle: null, entered: true }),

      setView: (view) => set({ view }),

      recruit: (count) => {
        const cost = count === 10 ? PULL_COST.ten : PULL_COST.single;
        const { gold, roster } = get();
        if (gold < cost) return null;
        const next = { ...roster };
        let refundTotal = 0;
        const results = rollGenerals(count).map((def): RecruitResult => {
          const cur = next[def.id];
          if (!cur) {
            next[def.id] = { level: 1, exp: 0, stars: 0 };
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
        set({ gold: gold - cost + refundTotal, roster: next, totalPulls: get().totalPulls + count });
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

      startBattle: (stageId) => {
        const { formation, roster, cleared, gold } = get();
        const stage = STAGE_MAP[stageId];
        const mine = playerProfiles(formation, roster);
        if (!stage || mine.length === 0) return false;

        const result = simulateBattle(mine, enemyProfiles(stageId), randomSeed());

        // 보상은 전투 계산 즉시 확정 (새로고침으로 결과를 바꿀 수 없게)
        const firstClear = result.win && !cleared[stageId];
        const rewardGold = result.win
          ? stage.reward.gold + (firstClear ? stage.firstClearGold : 0)
          : Math.round(stage.reward.gold * 0.2);
        const rewardExp = result.win ? stage.reward.exp : Math.round(stage.reward.exp * 0.3);

        const nextRoster = { ...roster };
        const levelUps: BattleReward['levelUps'] = [];
        const deployed = new Set(formation.filter((u) => u.commander).flatMap((u) => SLOTS.map((s) => u[s])));
        for (const id of deployed) {
          if (!id || !nextRoster[id]) continue;
          let { level, exp } = nextRoster[id];
          const from = level;
          exp += rewardExp;
          while (level < MAX_LEVEL && exp >= expToNext(level)) {
            exp -= expToNext(level);
            level++;
          }
          if (level >= MAX_LEVEL) exp = 0;
          nextRoster[id] = { ...nextRoster[id], level, exp };
          if (level > from) levelUps.push({ id, from, to: level });
        }

        set({
          gold: gold + rewardGold,
          roster: nextRoster,
          cleared: result.win ? { ...cleared, [stageId]: (cleared[stageId] ?? 0) + 1 } : cleared,
          battle: { stageId, result, reward: { gold: rewardGold, exp: rewardExp, firstClear, levelUps } },
          view: 'battle',
        });
        return true;
      },

      closeBattle: () => set({ battle: null, view: 'campaign' }),
    }),
    {
      name: 'oath-banner-save',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s): SaveData => ({
        started: s.started,
        gold: s.gold,
        roster: s.roster,
        formation: s.formation,
        cleared: s.cleared,
        totalPulls: s.totalPulls,
      }),
    },
  ),
);
