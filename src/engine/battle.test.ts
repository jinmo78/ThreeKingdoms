import { describe, expect, it } from 'vitest';
import { GENERAL_MAP } from '../data/generals';
import { simulateBattle, type BattleResult } from './battle';
import { mulberry32 } from './rng';
import { buildProfile, makeMember, type UnitProfile } from './unit';

function squad(ids: (string | null)[], level = 1): UnitProfile {
  const profile = buildProfile(ids.map((id) => (id ? makeMember(GENERAL_MAP[id], level, 0) : null)));
  if (!profile) throw new Error('주장이 없습니다');
  return profile;
}

/** 스냅샷에 남길 전투 기록. 프로필 전문은 빼서 로그만 잠근다. */
function digest(result: BattleResult) {
  return {
    win: result.win,
    reason: result.reason,
    stats: result.stats,
    events: result.events.map((e) => ({
      kind: e.kind,
      text: e.text,
      chainStep: e.chainStep ?? null,
      hits: e.hits.map((h) => ({
        side: h.side,
        idx: h.idx,
        amount: h.amount,
        kind: h.kind,
        matchup: h.matchup ?? null,
      })),
      hp: e.hp,
    })),
  };
}

const SEED = 20261120;
const player = [squad(['guanyu', 'zhangfei', null, 'zhugeliang', 'liubei', null])];
const enemy = [squad(['lubu', null, null, 'chengong', null, null], 8)];

describe('simulateBattle', () => {
  it('mulberry32 첫 값은 시드에 고정이다', () => {
    expect(mulberry32(1)()).toBe(mulberry32(1)());
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });

  it('같은 시드·같은 입력이면 전투 기록이 같다', () => {
    const a = digest(simulateBattle(player, enemy, SEED));
    const b = digest(simulateBattle(player, enemy, SEED));
    expect(a).toEqual(b);
    expect(digest(simulateBattle(player, enemy, SEED + 1))).not.toEqual(a);
  });

  it('시드 20261120 전투 기록 스냅샷', () => {
    expect(digest(simulateBattle(player, enemy, SEED))).toMatchSnapshot();
  });

  it('시작 병력 비율과 기습 게이지가 결과에 반영되고 다시 돌려도 같다', () => {
    const wounded = digest(simulateBattle(player, enemy, SEED, [[0.5], [0.4]]));
    expect(wounded).toEqual(digest(simulateBattle(player, enemy, SEED, [[0.5], [0.4]])));
    expect(wounded.events[0].hp).toEqual([
      [Math.round(player[0].hp * 0.5)],
      [Math.round(enemy[0].hp * 0.4)],
    ]);
    expect(wounded).not.toEqual(digest(simulateBattle(player, enemy, SEED)));

    const note = '기습! 아군이 먼저 움직이고 지원군을 막았다';
    const ambush = simulateBattle(player, enemy, SEED, undefined, { gauge: [100, 0], note });
    const again = simulateBattle(player, enemy, SEED, undefined, { gauge: [100, 0], note });
    expect(digest(ambush)).toEqual(digest(again));
    expect(ambush.events[1].actor?.side).toBe(0);
    expect(ambush.events[0].text).toContain(note);
  });
});
