import { describe, expect, it } from 'vitest';
import { GENERAL_MAP } from '../data/generals';
import { MAX_CHAIN, calcSynergy } from './synergy';

const g = (id: string) => GENERAL_MAP[id];
const slots = (...ids: string[]) => {
  const row = [null, null, null, null, null, null] as (ReturnType<typeof g> | null)[];
  ids.forEach((id, i) => {
    row[i] = g(id);
  });
  return row;
};

describe('calcSynergy', () => {
  it('같은 장수를 여러 칸에 넣어도 인연은 1명이고, 세력·병과는 칸 수다', () => {
    const three = [g('guanyu'), g('guanyu'), g('guanyu'), null, null, null];
    const five = Array.from({ length: 5 }, () => g('guanyu'));
    const six = Array.from({ length: 6 }, () => g('guanyu'));
    const a = calcSynergy(three);
    const b = calcSynergy([...five, null]);
    const c = calcSynergy(six);

    expect(a.list.filter((s) => s.kind === 'bond')).toEqual([]);
    expect(a.powerMult).toBeCloseTo(1.1);
    expect(a.chainRate).toBeCloseTo(0.19);

    // 5명은 4명 단계. 3명 보너스와 더하지 않는다.
    expect(b.powerMult).toBeCloseTo(1.19);
    expect(b.chainRate).toBeCloseTo(0.28);
    // 6명은 최고 단계 하나
    expect(c.powerMult).toBeCloseTo(1.33);
    expect(c.chainRate).toBeCloseTo(0.4);
    expect(c.list.some((s) => s.kind === 'sage')).toBe(false);
  });

  it('도원결의 2명과 3명은 단계가 바뀌고 다른 인연과 더해진다', () => {
    const two = calcSynergy(slots('liubei', 'zhangfei'));
    expect(two.list.map((s) => s.key)).toEqual(['bond-도원결의']);
    expect(two.powerMult).toBeCloseTo(1.1);
    expect(two.chainRate).toBeCloseTo(0.25);

    const three = calcSynergy(slots('liubei', 'zhangfei', 'guanyu'));
    expect(three.list.map((s) => s.key).sort()).toEqual(
      ['bond-도원결의', 'bond-반동탁 연합', 'bond-오호대장군', 'faction-shu'].sort(),
    );
    expect(three.powerMult).toBeCloseTo(1.42);
    expect(three.chainRate).toBeCloseTo(0.59);
  });

  it('명참모는 참모 칸의 태생 지력 90 이상만 본다', () => {
    const empty = [null, null, null, null, null, null] as (ReturnType<typeof g> | null)[];
    const at = (index: number, id: string) => {
      const row = [...empty];
      row[index] = g(id);
      return row;
    };
    const sage = calcSynergy(at(3, 'zhugeliang'));
    expect(sage.list.map((s) => s.key)).toEqual(['sage']);
    expect(sage.chainRate).toBeCloseTo(0.25);
    expect(sage.powerMult).toBe(1);
    // 노숙은 태생 지력 88. 참모여도 명참모가 아니다.
    expect(calcSynergy(at(3, 'lusu')).chainRate).toBeCloseTo(0.15);
    // 제갈량을 주장·보좌에 두면 명참모가 아니다.
    expect(calcSynergy(at(0, 'zhugeliang')).list.some((s) => s.kind === 'sage')).toBe(false);
    expect(calcSynergy(at(4, 'zhugeliang')).list.some((s) => s.kind === 'sage')).toBe(false);
  });

  it('연쇄 확률은 0.85를 넘지 않는다', () => {
    const capped = calcSynergy(slots('zhugeliang', 'pangtong', 'simayi', 'xunyu', 'jiaxu', 'zhouyu'));
    const chainSum = capped.list.reduce((s, x) => s + x.chain, 0);
    expect(chainSum).toBeGreaterThan(0.7);
    expect(capped.chainRate).toBe(MAX_CHAIN);
    expect(capped.powerMult).toBeCloseTo(1 + capped.list.reduce((s, x) => s + x.power, 0));
    expect(capped.list.some((s) => s.kind === 'sage')).toBe(true);
  });
});
