// ============================================================
// 전술 — 지형 · 날씨 · 수공 · 화공 · 기습 · 지원군
// ------------------------------------------------------------
// · 성마다 지형이 정해져 있고, 날씨는 30분마다 바뀐다 (시각으로 계산 — 저장·서버 불필요)
// · 수공/화공: 전투 시작 전에 수비대 전체에 피해(최대 병력 비율)
// · 기습: 아군이 먼저 움직이고 지원군을 막는다
// · 지원군: 일부 성은 전투 중 인근 성의 부대가 합류 (기습으로 차단)
// 순수 함수: 저장소와 무관
// ============================================================

export type Tactic = 'none' | 'flood' | 'fire' | 'ambush';
export type Terrain = 'plain' | 'river' | 'forest' | 'pass';
export type Weather = 'clear' | 'wind' | 'rain' | 'fog';

export const TACTIC_LIST: Tactic[] = ['none', 'flood', 'fire', 'ambush'];

export const TACTICS: Record<Tactic, { name: string; emoji: string; cost: number; desc: string }> = {
  none: { name: '정면', emoji: '⚔️', cost: 0, desc: '계략 없이 맞붙는다' },
  flood: { name: '수공', emoji: '🌊', cost: 40, desc: '강가에서 수비대 전체에 큰 피해' },
  fire: { name: '화공', emoji: '🔥', cost: 40, desc: '숲·바람에 강하고 비에 약하다' },
  ambush: { name: '기습', emoji: '🥷', cost: 30, desc: '선공을 잡고 지원군을 막는다' },
};

export const TERRAINS: Record<Terrain, { name: string; emoji: string }> = {
  plain: { name: '평지', emoji: '🌾' },
  river: { name: '강·나루', emoji: '🌊' },
  forest: { name: '숲', emoji: '🌲' },
  pass: { name: '관문·산길', emoji: '⛰️' },
};

export const WEATHERS: Record<Weather, { name: string; emoji: string }> = {
  clear: { name: '맑음', emoji: '☀️' },
  wind: { name: '강풍', emoji: '🌬️' },
  rain: { name: '비', emoji: '🌧️' },
  fog: { name: '안개', emoji: '🌫️' },
};

/** 스테이지 id → 지형 (적벽·합비는 강, 이릉은 숲, 사수관·검각은 관문 …) */
const STAGE_TERRAIN: Record<string, Terrain> = {
  '1-1': 'plain', '1-2': 'plain', '1-3': 'plain',
  '2-1': 'pass', '2-2': 'pass', '2-3': 'plain',
  '3-1': 'river', '3-2': 'forest', '3-3': 'river',
  '4-1': 'plain', '4-2': 'river', '4-3': 'river',
  '5-1': 'river', '5-2': 'river', '5-3': 'river',
  '6-1': 'pass', '6-2': 'river', '6-3': 'river',
  '7-1': 'forest', '7-2': 'forest', '7-3': 'forest',
  '8-1': 'pass', '8-2': 'pass', '8-3': 'pass',
};
export const terrainOf = (stageId: string): Terrain => STAGE_TERRAIN[stageId] ?? 'plain';

const WEATHER_MS = 30 * 60_000;
const WEATHER_ORDER: Weather[] = ['clear', 'wind', 'rain', 'fog', 'clear', 'rain', 'wind', 'clear'];
/** 30분 단위로 바뀌는 날씨 */
export function weatherAt(ms: number): Weather {
  const block = Math.floor(ms / WEATHER_MS);
  const h = Math.imul(block ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  return WEATHER_ORDER[(h >>> 13) % WEATHER_ORDER.length];
}

export interface TacticEffect {
  /** 수비대 전체에 주는 피해 (최대 병력 비율) */
  dmg: number;
  /** 아군 시작 행동 게이지 보너스 */
  gauge: number;
  noReinforce: boolean;
  fit: 'good' | 'ok' | 'bad';
  note: string;
}

const NONE: TacticEffect = { dmg: 0, gauge: 0, noReinforce: false, fit: 'ok', note: '' };

export function tacticEffect(tactic: Tactic, terrain: Terrain, weather: Weather): TacticEffect {
  if (tactic === 'flood') {
    const dmg = Math.min(0.3, (terrain === 'river' ? 0.22 : 0.05) * (weather === 'rain' ? 1.4 : 1));
    return { ...NONE, dmg, fit: dmg >= 0.2 ? 'good' : 'bad', note: `수공! 수비대 전체 병력 -${Math.round(dmg * 100)}%` };
  }
  if (tactic === 'fire') {
    const base = { forest: 0.2, plain: 0.12, pass: 0.1, river: 0.06 }[terrain];
    const mult = weather === 'wind' ? 1.5 : weather === 'rain' ? 0.4 : 1;
    const dmg = Math.min(0.3, base * mult);
    return { ...NONE, dmg, fit: dmg >= 0.18 ? 'good' : dmg >= 0.1 ? 'ok' : 'bad', note: `화공! 수비대 전체 병력 -${Math.round(dmg * 100)}%` };
  }
  if (tactic === 'ambush') {
    const base = { pass: 70, forest: 55, plain: 40, river: 40 }[terrain];
    const gauge = Math.min(100, Math.round(base * (weather === 'fog' ? 1.4 : 1)));
    return { ...NONE, gauge, noReinforce: true, fit: gauge >= 70 ? 'good' : gauge >= 50 ? 'ok' : 'bad', note: '기습! 아군이 먼저 움직이고 지원군을 막았다' };
  }
  return NONE;
}

/** 인근 성에서 지원군이 올 확률 — 뒤쪽 성일수록 높다 */
export const reinforceChance = (stageIndex: number) => Math.min(0.5, 0.2 + stageIndex * 0.012);

/** 문자열 → 0~1 값 (행군 하나당 지원군 여부를 고정하기 위해) */
export function unitRoll(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return ((h >>> 0) % 10000) / 10000;
}
