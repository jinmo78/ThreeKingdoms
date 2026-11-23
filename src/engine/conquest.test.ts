import { describe, expect, it } from 'vitest';
import { conquestFloor, ENEMY_LEVEL_CAP, imprintBonus, IMPRINT_CAP, UNIFY_FLOOR } from './conquest';

describe('conquestFloor', () => {
  it('적 레벨은 천장에서 잘린다', () => {
    expect(conquestFloor(UNIFY_FLOOR).level).toBeLessThanOrEqual(ENEMY_LEVEL_CAP);
    expect(conquestFloor(UNIFY_FLOOR + 20).level).toBe(conquestFloor(UNIFY_FLOOR + 1).level);
  });

  it('통일 이후는 정예 혼성·★5다', () => {
    const f = conquestFloor(UNIFY_FLOOR + 1);
    expect(f.theme).toBe('mixed');
    expect(f.stars).toBe(5);
    expect(f.unified).toBe(true);
  });

  it('각인은 층당 0.4% · 상한 20%', () => {
    expect(imprintBonus(0)).toBe(0);
    expect(imprintBonus(10)).toBeCloseTo(0.04);
    expect(imprintBonus(100)).toBe(IMPRINT_CAP);
  });
});
