import type { Chapter, EnemyUnit, Stage } from '../types';

export const CHAPTERS: Chapter[] = [
  { id: 1, title: '황건적의 난', year: '184년', desc: '누런 두건의 반란군이 천하를 뒤덮었다. 의병을 일으켜라.' },
  { id: 2, title: '반동탁 연합', year: '190년', desc: '낙양을 장악한 폭군을 토벌하기 위해 제후들이 모였다.' },
  { id: 3, title: '관도대전', year: '200년', desc: '하북의 대군이 남하한다. 소수로 대군을 꺾어라.' },
  { id: 4, title: '적벽대전', year: '208년', desc: '장강을 뒤덮은 대선단. 바람과 불이 승부를 가른다.' },
];

const u = (commander: string, vice: string | null, strategist: string | null, level: number): EnemyUnit => ({
  commander, vice, strategist, level,
});

export const STAGES: Stage[] = [
  // 1장 황건적의 난
  { id: '1-1', chapter: 1, title: '탁현의 의병', desc: '마을을 약탈하는 황건 잔당을 몰아내라.',
    enemies: [u('yt_brute', 'yt_raider', 'yt_mystic', 1)],
    reward: { gold: 120, exp: 80 }, firstClearGold: 300 },
  { id: '1-2', chapter: 1, title: '광종 전투', desc: '장량이 이끄는 황건 주력과의 첫 격돌.',
    enemies: [u('zhangliang', 'yt_brute', 'yt_mystic', 3), u('yt_raider', 'yt_brute', 'yt_mystic', 3)],
    reward: { gold: 150, exp: 120 }, firstClearGold: 300 },
  { id: '1-3', chapter: 1, title: '황건 본진', desc: '대현양사 장각과 두 아우가 모인 본진. 황천당립의 결속을 깨뜨려라.',
    enemies: [u('zhangjiao', 'zhangbao', 'zhangliang', 3), u('yt_raider', 'yt_brute', 'yt_mystic', 3), u('yt_brute', 'yt_raider', 'yt_mystic', 3)],
    reward: { gold: 200, exp: 160 }, firstClearGold: 500 },

  // 2장 반동탁 연합
  { id: '2-1', chapter: 2, title: '사수관', desc: '관문을 지키는 화웅을 베어라.',
    enemies: [u('huaxiong', 'xl_guard', 'yt_mystic', 8), u('xl_guard', 'xl_guard', null, 8)],
    reward: { gold: 220, exp: 200 }, firstClearGold: 400 },
  { id: '2-2', chapter: 2, title: '호뢰관', desc: '천하무쌍 여포가 길을 막아섰다.',
    enemies: [u('lubu', 'xl_guard', 'yt_mystic', 10), u('huaxiong', 'xl_guard', null, 10)],
    reward: { gold: 250, exp: 240 }, firstClearGold: 500 },
  { id: '2-3', chapter: 2, title: '낙양 진입', desc: '연환계로 묶인 동탁·여포·초선. 셋을 함께 상대해야 한다.',
    enemies: [u('dongzhuo', 'lubu', 'diaochan', 8), u('huaxiong', 'xl_guard', 'xl_guard', 7), u('xl_guard', 'xl_guard', 'yt_mystic', 7)],
    reward: { gold: 300, exp: 280 }, firstClearGold: 800 },

  // 3장 관도대전
  { id: '3-1', chapter: 3, title: '백마 전투', desc: '하북의 선봉대를 저지하라.',
    enemies: [u('hb_officer', 'hb_officer', 'hb_advisor', 13), u('hb_archer', 'hb_officer', 'hb_advisor', 13)],
    reward: { gold: 320, exp: 320 }, firstClearGold: 600 },
  { id: '3-2', chapter: 3, title: '오소 습격', desc: '군량고를 불태워 대군의 발을 묶어라.',
    enemies: [u('hb_archer', 'hb_archer', 'hb_advisor', 13), u('hb_officer', 'hb_officer', 'hb_advisor', 13), u('hb_officer', 'hb_archer', null, 13)],
    reward: { gold: 350, exp: 360 }, firstClearGold: 700 },
  { id: '3-3', chapter: 3, title: '관도 결전', desc: '원소 본대와의 최후 결전.',
    enemies: [u('yuanshao', 'hb_officer', 'hb_advisor', 12), u('hb_officer', 'hb_archer', 'hb_advisor', 11), u('hb_archer', 'hb_officer', 'hb_advisor', 11)],
    reward: { gold: 420, exp: 400 }, firstClearGold: 1000 },

  // 4장 적벽대전
  { id: '4-1', chapter: 4, title: '장판파', desc: '추격해 오는 위의 정예 기병을 막아라.',
    enemies: [u('xiahoudun', 'wei_elite', 'guojia', 18), u('wei_elite', 'xuchu', null, 18)],
    reward: { gold: 450, exp: 440 }, firstClearGold: 800 },
  { id: '4-2', chapter: 4, title: '삼강구 수전', desc: '장강 위에서 위의 수군과 맞선다.',
    enemies: [u('zhangliao', 'xuchu', 'wei_navy', 17), u('wei_navy', 'wei_elite', 'guojia', 17), u('wei_elite', 'wei_elite', 'wei_navy', 17)],
    reward: { gold: 500, exp: 480 }, firstClearGold: 900 },
  { id: '4-3', chapter: 4, title: '적벽', desc: '조조 본진. 위나라의 기둥들이 총출동했다.',
    enemies: [u('caocao', 'zhangliao', 'simayi', 16), u('xiahoudun', 'xuchu', 'guojia', 15), u('wei_elite', 'wei_navy', 'wei_elite', 15)],
    reward: { gold: 600, exp: 540 }, firstClearGold: 2000 },
];

export const STAGE_MAP: Record<string, Stage> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export function stageIndex(id: string) {
  return STAGES.findIndex((s) => s.id === id);
}
export function nextStage(id: string): Stage | null {
  return STAGES[stageIndex(id) + 1] ?? null;
}
/** 직전 스테이지를 클리어해야 열림 */
export function isUnlocked(id: string, cleared: Record<string, number>) {
  const i = stageIndex(id);
  return i <= 0 || (cleared[STAGES[i - 1].id] ?? 0) > 0;
}
