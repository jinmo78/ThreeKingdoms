import { describe, expect, it } from 'vitest';
import { GENERAL_MAP } from '../data/generals';
import { buildProfile, effectiveStats, expToNext, makeMember, promoteTarget, shownRarity } from './unit';

const guanyu = GENERAL_MAP.guanyu;
const zhuge = GENERAL_MAP.zhugeliang;

describe('effectiveStats', () => {
  it('레벨 1 · 돌파 0은 태생 능력 그대로다', () => {
    expect(effectiveStats(guanyu, 1, 0)).toEqual({ war: 97, int: 75, lead: 95 });
  });

  it('레벨·돌파·품계 배율을 곱한 뒤 능력마다 반올림한다', () => {
    // 레벨 2 = ×1.04
    expect(effectiveStats(guanyu, 2, 0).war).toBe(Math.round(97 * 1.04));
    // ★5 = ×1.20
    expect(effectiveStats(guanyu, 1, 5).war).toBe(Math.round(97 * 1.2));
    // 품계 = ×1.10. 만렙·만성은 ×2.56 ×1.20 ×1.10
    const max = (1 + 39 * 0.04) * (1 + 5 * 0.04) * 1.1;
    expect(effectiveStats(guanyu, 40, 5, 1)).toEqual({
      war: Math.round(97 * max),
      int: Math.round(75 * max),
      lead: Math.round(95 * max),
    });
  });

  it('다음 레벨 경험치는 30 + 레벨×20이다', () => {
    expect(expToNext(1)).toBe(50);
    expect(expToNext(40)).toBe(830);
  });

  it('품계는 R→SR, SR→SSR 한 단계이고 SSR은 없다', () => {
    expect(promoteTarget('R')).toBe('SR');
    expect(promoteTarget('SR')).toBe('SSR');
    expect(promoteTarget('SSR')).toBeNull();
    expect(shownRarity('R', 0)).toBe('R');
    expect(shownRarity('R', 1)).toBe('SR');
    expect(shownRarity('SR', 1)).toBe('SSR');
    expect(shownRarity('SSR', 1)).toBe('SSR');
  });
});

describe('buildProfile', () => {
  it('주장이 없으면 부대가 없다', () => {
    const aide = makeMember(guanyu, 1, 0);
    expect(buildProfile([null, aide, null, null, null, null])).toBeNull();
  });

  it('주장 관우 1명의 슬롯 가중치·속도·전투력', () => {
    const p = buildProfile([makeMember(guanyu, 1, 0), null, null, null, null, null]);
    expect(p).not.toBeNull();
    // atk 97×1, intel 75×0.4, def 95×1, hp 300+95×16
    expect(p!.atk).toBe(97);
    expect(p!.intel).toBe(30);
    expect(p!.def).toBe(95);
    expect(p!.hp).toBe(1820);
    expect(p!.speed).toBe(12.6);
    expect(p!.skillRate).toBeCloseTo(0.32);
    expect(p!.power).toBe(758);
    expect(p!.troop).toBe('cavalry');
    expect(p!.name).toBe('관우 부대');
    expect(p!.synergy.chainRate).toBeCloseTo(0.15);
    expect(p!.synergy.powerMult).toBe(1);
  });

  it('발동률은 참모 유효 지력만 더하고 0.7에서 잘린다', () => {
    const cmd = makeMember(guanyu, 1, 0);
    const sage = makeMember(zhuge, 1, 0);
    const asAide = buildProfile([cmd, null, null, null, sage, null]);
    const asStrat = buildProfile([cmd, null, null, sage, null, null]);
    expect(asAide!.skillRate).toBeCloseTo(0.32);
    expect(asStrat!.skillRate).toBeCloseTo(0.42);
    expect(asStrat!.synergy.list.some((s) => s.kind === 'sage')).toBe(true);
    expect(asAide!.synergy.list.some((s) => s.kind === 'sage')).toBe(false);

    const capped = makeMember(guanyu, 1, 0);
    capped.skillRateAdd = 1;
    expect(buildProfile([capped, null, null, null, null, null])!.skillRate).toBe(0.7);
  });

  it('부대원 전원의 장비 발동률을 주장 발동률에 더한다', () => {
    const cmd = makeMember(guanyu, 1, 0);
    const aide = makeMember(GENERAL_MAP.lusu, 1, 0);
    aide.skillRateAdd = 0.05;
    expect(buildProfile([cmd, null, null, null, aide, null])!.skillRate).toBeCloseTo(0.37);
  });
});
