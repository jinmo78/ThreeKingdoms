import { describe, expect, it } from 'vitest';
import { GENERAL_MAP } from '../data/generals';
import { buildProfile, makeMember } from './unit';

const guanyu = GENERAL_MAP.guanyu;
const zhangfei = GENERAL_MAP.zhangfei;
const mizhu = GENERAL_MAP.mizhu;

describe('진형 buildProfile', () => {
  it('기본진은 주장만 있을 때 예전 가중치와 같다', () => {
    const p = buildProfile([makeMember(guanyu, 1, 0), null, null, null, null, null], 'basic');
    expect(p!.atk).toBe(97);
    expect(p!.formationName).toBe('기본진');
  });

  it('봉시진은 공격이 오르고 방어가 내린다', () => {
    const members = [makeMember(guanyu, 1, 0), makeMember(zhangfei, 1, 0), null, null, null, null];
    const basic = buildProfile(members, 'basic')!;
    const spear = buildProfile(members, 'fengshi')!;
    expect(spear.atk).toBeGreaterThan(basic.atk);
    expect(spear.def).toBeLessThan(basic.def);
    expect(spear.gaugeBonus).toBeGreaterThan(0);
  });

  it('안행진은 전법 위력 배율·일반 공격 배율이 다르다', () => {
    const p = buildProfile([makeMember(guanyu, 1, 0), null, null, null, null, null], 'yanxing')!;
    expect(p.skillPowerMul).toBeCloseTo(1.2);
    expect(p.attackMul).toBeCloseTo(0.9);
  });

  it('우결진은 인연이 있으면 연쇄 보너스가 붙는다', () => {
    // 도원결의: 유비·관우·장비
    const liubei = GENERAL_MAP.liubei;
    const members = [
      makeMember(liubei, 1, 0),
      makeMember(guanyu, 1, 0),
      makeMember(zhangfei, 1, 0),
      null,
      makeMember(mizhu, 1, 0),
      null,
    ];
    const p = buildProfile(members, 'youjie')!;
    expect(p.synergy.list.some((s) => s.kind === 'bond')).toBe(true);
    expect(p.chainBonus).toBeGreaterThan(0);
  });

  it('봉시진 병과통일 시 선공 게이지가 더 오른다', () => {
    const cav = [guanyu, GENERAL_MAP.zhaoyun, GENERAL_MAP.machao].map((d) => makeMember(d, 1, 0));
    const on = buildProfile([cav[0], cav[1], cav[2], null, null, null], 'fengshi')!;
    const off = buildProfile([cav[0], cav[1], makeMember(zhangfei, 1, 0), null, null, null], 'fengshi')!;
    expect(on.formationCondActive).toBe(true);
    expect(off.formationCondActive).toBe(false);
    expect(on.gaugeBonus).toBe(off.gaugeBonus + 16);
  });

  it('안행진은 주장 지력>무력일 때 전법 배율이 오른다', () => {
    const sage = makeMember(GENERAL_MAP.zhugeliang, 1, 0);
    const warlord = makeMember(guanyu, 1, 0);
    const on = buildProfile([sage, null, null, null, null, null], 'yanxing')!;
    const off = buildProfile([warlord, null, null, null, null, null], 'yanxing')!;
    expect(on.formationCondActive).toBe(true);
    expect(off.formationCondActive).toBe(false);
    expect(on.skillPowerMul).toBeGreaterThan(off.skillPowerMul);
  });
});
