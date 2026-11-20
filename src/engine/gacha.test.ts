import { describe, expect, it } from 'vitest';
import { RECRUITABLE } from '../data/generals';
import { PULL_COST, RATES, rollGenerals } from './gacha';
import { mulberry32 } from './rng';

function scripted(values: number[]) {
  let i = 0;
  const rng = () => {
    if (i >= values.length) throw new Error(`등용 난수를 더 썼습니다 (${i})`);
    return values[i++];
  };
  return { rng, used: () => i };
}

describe('rollGenerals', () => {
  it('확률 합과 가격이 명세와 같다', () => {
    expect(RATES).toEqual({ SSR: 0.05, SR: 0.25, R: 0.7 });
    expect(PULL_COST).toEqual({ single: 100, ten: 900 });
  });

  it('같은 시드면 같은 장수가 나온다', () => {
    const a = rollGenerals(10, mulberry32(42)).map((g) => g.id);
    const b = rollGenerals(10, mulberry32(42)).map((g) => g.id);
    expect(a).toEqual(b);
    expect(rollGenerals(10, mulberry32(43)).map((g) => g.id)).not.toEqual(a);
  });

  it('등용 풀 밖의 적 전용 장수는 나오지 않는다', () => {
    const ids = new Set(RECRUITABLE.map((g) => g.id));
    for (const g of rollGenerals(200, mulberry32(7))) expect(ids.has(g.id)).toBe(true);
  });

  it('1회는 천장을 적용하지 않는다', () => {
    const draw = scripted([0.99, 0]);
    const [only] = rollGenerals(1, draw.rng);
    expect(only.rarity).toBe('R');
    expect(only.id).toBe(RECRUITABLE.filter((g) => g.rarity === 'R')[0].id);
    expect(draw.used()).toBe(2);
  });

  it('10장이 모두 R일 때만 마지막을 SR 이상으로 바꾼다', () => {
    const allR = Array.from({ length: 10 }, () => [0.99, 0]).flat();
    const toSsr = scripted([...allR, 0, 0]);
    const ssr = rollGenerals(10, toSsr.rng);
    expect(ssr.slice(0, 9).every((g) => g.rarity === 'R')).toBe(true);
    expect(ssr[9].rarity).toBe('SSR');
    expect(ssr[9].id).toBe(RECRUITABLE.filter((g) => g.rarity === 'SSR')[0].id);
    expect(toSsr.used()).toBe(22);

    const toSr = scripted([...allR, 0.5, 0]);
    const sr = rollGenerals(10, toSr.rng);
    expect(sr[9].rarity).toBe('SR');
    expect(toSr.used()).toBe(22);

    // 앞에 SR이 하나라도 있으면 마지막 R을 다시 뽑지 않는다.
    const mixed = scripted([0.1, 0, ...Array.from({ length: 9 }, () => [0.99, 0]).flat()]);
    const kept = rollGenerals(10, mixed.rng);
    expect(kept[0].rarity).toBe('SR');
    expect(kept[9].rarity).toBe('R');
    expect(mixed.used()).toBe(20);
  });
});
