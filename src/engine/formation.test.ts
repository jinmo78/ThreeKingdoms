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
});
