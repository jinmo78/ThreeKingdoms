import type { Chapter, EnemyUnit, Stage } from '../types';

export const CHAPTERS: Chapter[] = [
  { id: 1, title: '황건적의 난', year: '184년', desc: '누런 두건의 반란군이 천하를 뒤덮었다. 의병을 일으켜라.' },
  { id: 2, title: '반동탁 연합', year: '190년', desc: '낙양을 장악한 폭군을 토벌하기 위해 제후들이 모였다.' },
  { id: 3, title: '관도대전', year: '200년', desc: '하북의 대군이 남하한다. 소수로 대군을 꺾어라.' },
  { id: 4, title: '적벽대전', year: '208년', desc: '장강을 뒤덮은 대선단. 바람과 불이 승부를 가른다.' },
  { id: 5, title: '합비 공방전', year: '215년', desc: '소수 정예가 대군을 막아선 강가의 성.' },
  { id: 6, title: '한중·번성', year: '219년', desc: '한중을 넘고, 번성의 수비를 무너뜨려라.' },
  { id: 7, title: '이릉대전', year: '222년', desc: '숲에 숨은 화공이 대군의 진영을 노린다.' },
  { id: 8, title: '북벌과 검각', year: '263년', desc: '중원의 책사와 촉을 무너뜨린 마지막 원정군.' },
];

/** 순서: 주장, 부장, 부장, 참모, 보좌, 보좌 (_ = 빈 칸) */
const _ = null;
const u = (level: number, ...members: (string | null)[]): EnemyUnit => ({ members, level });

export const STAGES: Stage[] = [
  // 1장 황건적의 난
  { id: '1-1', chapter: 1, title: '탁현의 의병', desc: '마을을 약탈하는 황건 잔당을 몰아내라.',
    enemies: [u(1, 'yt_brute', 'yt_raider', _, 'yt_mystic')],
    reward: { gold: 25, exp: 80 }, firstClearGold: 60 },
  { id: '1-2', chapter: 1, title: '광종 전투', desc: '장량이 이끄는 황건 주력과의 첫 격돌.',
    enemies: [u(4, 'zhangliang', 'yt_brute', 'yt_raider', 'yt_mystic'), u(4, 'yt_raider', 'yt_brute', _, 'yt_mystic')],
    reward: { gold: 30, exp: 120 }, firstClearGold: 60 },
  { id: '1-3', chapter: 1, title: '황건 본진', desc: '대현양사 장각과 두 아우가 모인 본진. 황천당립의 결속을 깨뜨려라.',
    enemies: [u(8, 'zhangjiao', 'zhangbao', 'zhangliang', 'yt_mystic', 'yt_brute', 'yt_brute'), u(7, 'yt_raider', 'yt_brute', 'yt_brute', 'yt_mystic', 'yt_raider'), u(7, 'yt_brute', 'yt_raider', 'yt_raider', 'yt_mystic')],
    reward: { gold: 40, exp: 160 }, firstClearGold: 100 },

  // 2장 반동탁 연합
  { id: '2-1', chapter: 2, title: '사수관', desc: '관문을 지키는 화웅을 베어라.',
    enemies: [u(11, 'huaxiong', 'xl_guard', 'xl_guard', 'yt_mystic', 'xl_guard'), u(10, 'xl_guard', 'xl_guard', _, 'yt_mystic'), u(10, 'xl_guard', 'xl_guard', 'xl_guard', 'yt_mystic', 'yt_brute')],
    reward: { gold: 45, exp: 200 }, firstClearGold: 80 },
  { id: '2-2', chapter: 2, title: '호뢰관', desc: '천하무쌍 여포가 길을 막아섰다.',
    enemies: [u(12, 'lubu', 'gaoshun', 'xl_guard', 'chengong', 'xl_guard'), u(11, 'huaxiong', 'xl_guard', 'xl_guard', 'yt_mystic')],
    reward: { gold: 50, exp: 240 }, firstClearGold: 100 },
  { id: '2-3', chapter: 2, title: '낙양 진입', desc: '연환계로 묶인 동탁·여포·초선·왕윤. 넷을 함께 상대해야 한다.',
    enemies: [u(12, 'dongzhuo', 'lubu', 'huaxiong', 'diaochan', 'wangyun', 'xl_guard'), u(11, 'gaoshun', 'xl_guard', 'xl_guard', 'chengong', 'xl_guard'), u(11, 'xl_guard', 'xl_guard', 'xl_guard', 'yt_mystic')],
    reward: { gold: 60, exp: 280 }, firstClearGold: 160 },

  // 3장 관도대전
  { id: '3-1', chapter: 3, title: '백마 전투', desc: '하북의 선봉대를 저지하라.',
    enemies: [u(18, 'yanliang', 'hb_officer', 'hb_officer', 'hb_advisor', 'hb_archer'), u(17, 'hb_archer', 'hb_officer', _, 'hb_advisor', 'hb_archer'), u(17, 'hb_officer', 'hb_officer', 'hb_archer', 'hb_advisor', 'hb_archer', 'hb_officer')],
    reward: { gold: 65, exp: 320 }, firstClearGold: 120 },
  { id: '3-2', chapter: 3, title: '오소 습격', desc: '군량고를 불태워 대군의 발을 묶어라.',
    enemies: [u(18, 'wenchou', 'hb_officer', 'hb_archer', 'hb_advisor', 'hb_officer'), u(18, 'zhanghe', 'hb_officer', 'hb_archer', 'jushou', 'hb_archer'), u(17, 'hb_officer', 'hb_archer', _, 'hb_advisor')],
    reward: { gold: 70, exp: 360 }, firstClearGold: 140 },
  { id: '3-3', chapter: 3, title: '관도 결전', desc: '원소 본대와의 최후 결전.',
    enemies: [u(18, 'yuanshao', 'yanliang', 'wenchou', 'tianfeng', 'jushou', 'hb_officer'), u(17, 'zhanghe', 'hb_officer', 'hb_officer', 'hb_advisor', 'hb_archer', 'hb_archer'), u(17, 'hb_archer', 'hb_officer', 'hb_officer', 'hb_advisor', 'hb_archer')],
    reward: { gold: 85, exp: 400 }, firstClearGold: 200 },

  // 4장 적벽대전
  { id: '4-1', chapter: 4, title: '장판파', desc: '추격해 오는 위의 정예 기병을 막아라.',
    enemies: [u(22, 'xiahoudun', 'caohong', 'wei_elite', 'chengyu', 'wei_elite'), u(22, 'caoren', 'xuchu', 'wei_elite', 'wei_navy'), u(22, 'wei_elite', 'wei_elite', 'caohong', 'wei_navy', 'wei_elite', 'wei_navy')],
    reward: { gold: 90, exp: 440 }, firstClearGold: 160 },
  { id: '4-2', chapter: 4, title: '삼강구 수전', desc: '장강 위에서 위의 수군과 맞선다.',
    enemies: [u(21, 'zhangliao', 'yuejin', 'yujin', 'xunyou', 'wei_navy', 'wei_elite'), u(21, 'wei_navy', 'wei_elite', 'wei_elite', 'chengyu', 'wei_navy'), u(21, 'xuhuang', 'wei_elite', 'wei_elite', 'wei_navy')],
    reward: { gold: 100, exp: 480 }, firstClearGold: 180 },
  { id: '4-3', chapter: 4, title: '적벽', desc: '조조 본진. 종친과 오자양장, 왕좌의 재사들이 총출동했다.',
    enemies: [u(22, 'caocao', 'xuchu', 'zhangliao', 'xunyu', 'caoren', 'caohong'), u(21, 'xiahoudun', 'xiahouyuan', 'xuhuang', 'chengyu', 'wei_elite', 'wei_elite'), u(21, 'zhanghe', 'yujin', 'yuejin', 'xunyou', 'wei_navy', 'wei_navy')],
    reward: { gold: 120, exp: 540 }, firstClearGold: 400 },

  // 5장 합비 공방전
  { id: '5-1', chapter: 5, title: '소요진', desc: '장료가 정예 기병으로 진영을 급습한다.',
    enemies: [u(24, 'zhangliao', 'yuejin', 'lidian', 'chengyu', 'wei_elite'), u(23, 'wei_elite', 'caohong', 'wei_elite', 'xunyou')],
    reward: { gold: 110, exp: 580 }, firstClearGold: 140 },
  { id: '5-2', chapter: 5, title: '유수구', desc: '강가에 늘어선 위의 수군과 보병을 돌파하라.',
    enemies: [u(25, 'xuhuang', 'yujin', 'wei_elite', 'xunyou', 'wei_navy'), u(24, 'wei_navy', 'wei_elite', 'wei_elite', 'chengyu', 'wei_navy'), u(24, 'caohong', 'wei_elite', 'lidian', _)],
    reward: { gold: 115, exp: 620 }, firstClearGold: 160 },
  { id: '5-3', chapter: 5, title: '합비', desc: '오자양장이 모인 합비 본대. 장료의 급습을 버텨라.',
    enemies: [u(26, 'zhangliao', 'xuhuang', 'yuejin', 'xunyou', 'yujin', 'wei_elite'), u(25, 'caoren', 'lidian', 'wei_elite', 'chengyu', 'wei_elite', 'wei_navy'), u(25, 'wei_elite', 'caohong', 'wei_navy', 'guojia', 'wei_elite', 'wei_navy')],
    reward: { gold: 130, exp: 680 }, firstClearGold: 200 },

  // 6장 한중·번성
  { id: '6-1', chapter: 6, title: '정군산', desc: '하후연의 기병이 산길을 지킨다.',
    enemies: [u(28, 'xiahouyuan', 'zhanghe', 'wei_elite', 'chengyu', 'wei_elite'), u(27, 'wei_elite', 'caohong', 'wei_elite', 'xunyou')],
    reward: { gold: 125, exp: 720 }, firstClearGold: 170 },
  { id: '6-2', chapter: 6, title: '한수', desc: '조조가 직접 한중으로 내려왔다.',
    enemies: [u(30, 'caocao', 'xiahouyuan', 'xuhuang', 'xunyu', 'caohong', 'wei_elite'), u(29, 'zhanghe', 'wei_elite', 'wei_elite', 'chengyu', 'wei_elite'), u(28, 'wei_elite', 'yuejin', 'wei_elite', 'xunyou', 'wei_navy')],
    reward: { gold: 130, exp: 760 }, firstClearGold: 190 },
  { id: '6-3', chapter: 6, title: '번성', desc: '조인·방덕·서황이 성을 겹겹이 지킨다.',
    enemies: [u(32, 'caoren', 'pangde', 'yujin', 'xuhuang', 'wei_elite', 'wei_elite'), u(31, 'zhanghe', 'wei_elite', 'yuejin', 'xunyou', 'wei_elite', 'wei_navy'), u(30, 'caohong', 'wei_elite', 'wei_elite', 'chengyu', 'wei_elite')],
    reward: { gold: 145, exp: 820 }, firstClearGold: 240 },

  // 7장 이릉대전
  { id: '7-1', chapter: 7, title: '효정', desc: '강동의 선봉이 숲길에서 길을 막는다.',
    enemies: [u(34, 'lingtong', 'handang', 'dingfeng', 'zhugejin', 'xusheng'), u(33, 'chengpu', 'huanggai', 'zhoutai', 'lusu')],
    reward: { gold: 140, exp: 860 }, firstClearGold: 200 },
  { id: '7-2', chapter: 7, title: '마안산', desc: '감녕의 야습과 노장들의 진영을 헤쳐라.',
    enemies: [u(35, 'ganning', 'lingtong', 'handang', 'lusu', 'xusheng', 'dingfeng'), u(34, 'chengpu', 'zhoutai', 'huanggai', 'zhangzhao', 'taishici'), u(34, 'sunshangxiang', 'xiaoqiao', 'daqiao', 'zhugejin')],
    reward: { gold: 145, exp: 900 }, firstClearGold: 220 },
  { id: '7-3', chapter: 7, title: '이릉', desc: '육손의 화공. 사대도독과 강동 호걸이 한꺼번에 나온다.',
    enemies: [u(36, 'luxun', 'lumeng', 'ganning', 'lusu', 'chengpu', 'handang'), u(35, 'sunquan', 'zhoutai', 'lingtong', 'zhangzhao', 'taishici', 'xusheng'), u(35, 'dingfeng', 'huanggai', 'sunshangxiang', 'zhugejin', 'xiaoqiao', 'daqiao')],
    reward: { gold: 160, exp: 960 }, firstClearGold: 260 },

  // 8장 북벌과 검각
  { id: '8-1', chapter: 8, title: '가정', desc: '사마의가 때를 기다리며 산길을 틀어막았다.',
    enemies: [u(37, 'simayi', 'zhanghe', 'wei_elite', 'xunyou', 'wei_elite'), u(36, 'xuhuang', 'yuejin', 'wei_elite', 'chengyu', 'wei_elite')],
    reward: { gold: 155, exp: 1000 }, firstClearGold: 220 },
  { id: '8-2', chapter: 8, title: '음평', desc: '등애가 아무도 없는 산길을 넘어 뒤를 친다.',
    enemies: [u(38, 'dengai', 'zhonghui', 'wei_elite', 'xunyou', 'wei_elite', 'wei_navy'), u(37, 'wei_elite', 'zhanghe', 'wei_elite', 'chengyu', 'wei_elite'), u(37, 'xuhuang', 'caohong', 'yuejin', 'caopi')],
    reward: { gold: 165, exp: 1080 }, firstClearGold: 260 },
  { id: '8-3', chapter: 8, title: '검각', desc: '등애·종회·사마의가 모인 마지막 관문.',
    enemies: [u(40, 'dengai', 'zhonghui', 'zhanghe', 'simayi', 'xuhuang', 'wei_elite'), u(39, 'caopi', 'yuejin', 'wei_elite', 'xunyu', 'wei_elite', 'wei_navy'), u(39, 'caohong', 'wei_elite', 'lidian', 'xunyou', 'wei_elite', 'wei_navy')],
    reward: { gold: 190, exp: 1200 }, firstClearGold: 400 },
];

export const STAGE_MAP: Record<string, Stage> = Object.fromEntries(STAGES.map((s) => [s.id, s]));

export function stageIndex(id: string) {
  return STAGES.findIndex((s) => s.id === id);
}
export function nextStage(id: string): Stage | null {
  return STAGES[stageIndex(id) + 1] ?? null;
}
/** 직전 스테이지를 클리어해야 열림. 스테이지가 아닌 id(모의전·토벌전 등)는 잠김. */
export function isUnlocked(id: string, cleared: Record<string, number>) {
  const i = stageIndex(id);
  if (i < 0) return false;
  return i === 0 || (cleared[STAGES[i - 1].id] ?? 0) > 0;
}
