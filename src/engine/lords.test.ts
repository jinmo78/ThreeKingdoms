import { describe, expect, it } from 'vitest';
import { ensureThreats, type LordThreat } from './lords';
import type { Castle } from './domain';

describe('ensureThreats', () => {
  it('내용이 같으면 같은 배열 참조를 유지한다', () => {
    const castles: Record<string, Castle> = {
      '1-1': { level: 1, garrison: null, since: 1 },
    };
    const threats: LordThreat[] = [{
      id: 't1', stageId: '1-1', lordId: 'caocao', eta: 9_999_999_999_999, level: 80,
    }];
    const a = ensureThreats({ '8-3': 1 }, castles, threats, Date.now(), Date.now());
    const b = ensureThreats({ '8-3': 1 }, castles, a.threats, Date.now(), a.lastThreatAt);
    expect(b.threats).toBe(a.threats);
  });
});
