// 일일 무료 등용 · 연속 출석 보상

/** 매일 자동으로 받는 무료 등용 횟수 */
export const FREE_DAILY_PULLS = 10;

/** 연속 출석 N일차(1~7 순환)에 받는 추가 무료 등용 */
export const ATTEND_REWARDS = [1, 1, 2, 2, 3, 3, 5] as const;

export function todayKey(now = new Date()) {
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${m}-${d}`;
}

export function yesterdayKey(now = new Date()) {
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return todayKey(y);
}

export function attendReward(streak: number) {
  const n = Math.max(1, Math.floor(streak));
  return ATTEND_REWARDS[(n - 1) % ATTEND_REWARDS.length];
}

/** 날짜가 바뀌었으면 무료 등용 10회를 지급한 상태를 만든다 */
export function withDailyFreeGrant(state: {
  freePulls: number;
  freeGrantDay: string;
}, now = new Date()) {
  const today = todayKey(now);
  if (state.freeGrantDay === today) return { ...state, changed: false as const };
  return {
    freePulls: state.freePulls + FREE_DAILY_PULLS,
    freeGrantDay: today,
    changed: true as const,
  };
}

/** 출석 가능 여부 · 연속 일수 · 받을 보상 */
export function attendancePreview(attendDay: string, attendStreak: number, now = new Date()) {
  const today = todayKey(now);
  if (attendDay === today) {
    return { canClaim: false as const, nextStreak: attendStreak, reward: 0, claimedToday: true as const };
  }
  const nextStreak = attendDay === yesterdayKey(now) ? attendStreak + 1 : 1;
  return {
    canClaim: true as const,
    nextStreak,
    reward: attendReward(nextStreak),
    claimedToday: false as const,
  };
}

/** 등용 비용. 무료 횟수를 먼저 쓰고, 나머지는 금화 */
export function recruitCost(count: 1 | 10, freePulls: number) {
  const freeUsed = Math.min(count, Math.max(0, freePulls));
  const paid = count - freeUsed;
  let gold = 0;
  if (paid > 0) {
    // 10연을 전부 금화로 살 때만 900 할인가
    gold = count === 10 && freeUsed === 0 ? 900 : paid * 100;
  }
  return { freeUsed, paid, gold };
}
