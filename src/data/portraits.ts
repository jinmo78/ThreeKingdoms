// 장수 초상(SVG 상반신)용 외형 정의
// 기본값은 능력치·인연에서 유도하고, 이름난 장수만 개별 지정한다
import type { GeneralDef } from '../types';

export type Skin = 'light' | 'normal' | 'tan' | 'dark' | 'red';
export type Head =
  | 'helmet' // 투구
  | 'topknot' // 상투 + 비녀
  | 'scholar' // 윤건(綸巾)
  | 'crown' // 관(冠)
  | 'band' // 머리띠
  | 'hood' // 두건
  | 'bald' // 민머리
  | 'taoist' // 도관(道冠)
  | 'tribal' // 깃털 머리장식
  | 'female' // 쪽머리
  | 'female-war'; // 머리띠 묶은 긴 머리
export type Beard = 'none' | 'mustache' | 'goatee' | 'short' | 'full' | 'long' | 'wild';
export type Body = 'armor' | 'robe';
export type Brow = 'calm' | 'fierce' | 'thin';
export type Extra = 'eyepatch' | 'fan' | 'plumes' | 'scar' | 'earrings' | 'bells';

export interface Appearance {
  skin: Skin;
  head: Head;
  beard: Beard;
  body: Body;
  brow: Brow;
  /** 0 젊음 · 1 중년 · 2 노년(흰 머리·수염) */
  age: 0 | 1 | 2;
  /** 얼굴 폭 배율 (1 = 보통) */
  wide?: number;
  /** 투구·관·띠 색 (없으면 등급/세력에서 유도) */
  gear?: string;
  /** 수염·머리 색 덮어쓰기 */
  hair?: string;
  extras?: Extra[];
}

const OVERRIDES: Record<string, Partial<Appearance>> = {
  // 촉
  guanyu: { skin: 'red', head: 'hood', gear: '#166534', beard: 'long', brow: 'fierce', body: 'robe', age: 1 },
  zhangfei: { skin: 'tan', head: 'helmet', beard: 'wild', brow: 'fierce', wide: 1.12, age: 1 },
  liubei: { head: 'crown', beard: 'short', brow: 'calm', body: 'robe', age: 1 },
  zhugeliang: { head: 'scholar', beard: 'goatee', brow: 'calm', body: 'robe', extras: ['fan'], age: 1 },
  pangtong: { skin: 'tan', head: 'topknot', beard: 'short', brow: 'fierce', body: 'robe', wide: 1.08 },
  zhaoyun: { skin: 'light', head: 'helmet', gear: '#e5e7eb', beard: 'none', brow: 'calm', age: 0 },
  machao: { skin: 'light', head: 'helmet', gear: '#f1f5f9', beard: 'none', age: 0, extras: ['plumes'] },
  huangzhong: { head: 'helmet', beard: 'long', age: 2 },
  jiangwei: { head: 'helmet', beard: 'none', age: 0, brow: 'calm' },
  weiyan: { beard: 'full', brow: 'fierce', skin: 'tan' },
  huangyueying: { skin: 'light', head: 'female', body: 'robe', brow: 'thin', age: 0 },
  maliang: { hair: '#1c1917', brow: 'thin', beard: 'none', age: 0 },
  guanxing: { head: 'hood', gear: '#166534', beard: 'none', age: 0 },
  guanping: { beard: 'none', age: 0 },
  zhangbao_s: { beard: 'none', age: 0, brow: 'fierce' },
  madai: { beard: 'none', age: 0 },
  yanyan: { age: 2, beard: 'long' },
  // 위
  caocao: { head: 'crown', gear: '#7f1d1d', beard: 'goatee', brow: 'fierce', body: 'robe', age: 1 },
  xiahoudun: { head: 'helmet', beard: 'full', brow: 'fierce', extras: ['eyepatch'], age: 1 },
  simayi: { head: 'scholar', gear: '#1e1b4b', beard: 'long', brow: 'fierce', body: 'robe', age: 2 },
  guojia: { skin: 'light', head: 'topknot', beard: 'none', brow: 'thin', body: 'robe', age: 0 },
  xunyu: { head: 'scholar', beard: 'goatee', body: 'robe', brow: 'calm', age: 1 },
  jiaxu: { head: 'scholar', beard: 'long', body: 'robe', age: 2 },
  dianwei: { skin: 'dark', head: 'band', gear: '#57534e', beard: 'wild', brow: 'fierce', wide: 1.12, extras: ['scar'] },
  xuchu: { skin: 'tan', head: 'bald', beard: 'short', brow: 'fierce', wide: 1.2 },
  zhangliao: { head: 'helmet', beard: 'mustache', brow: 'fierce', age: 1 },
  caopi: { head: 'crown', gear: '#facc15', beard: 'mustache', body: 'robe', age: 0 },
  zhonghui: { skin: 'light', head: 'topknot', beard: 'none', brow: 'thin', age: 0 },
  dengai: { head: 'helmet', beard: 'goatee', age: 1 },
  pangde: { beard: 'full', brow: 'fierce' },
  // 오
  zhouyu: { skin: 'light', head: 'topknot', beard: 'none', brow: 'calm', body: 'robe', age: 0 },
  sunce: { skin: 'light', head: 'band', gear: '#b91c1c', beard: 'none', brow: 'fierce', age: 0 },
  luxun: { skin: 'light', head: 'scholar', beard: 'none', brow: 'calm', body: 'robe', age: 0 },
  sunquan: { head: 'crown', beard: 'full', hair: '#7c2d12', brow: 'calm', body: 'robe', wide: 1.08, age: 1 },
  sunjian: { head: 'band', gear: '#dc2626', beard: 'short', brow: 'fierce', age: 1 },
  ganning: { head: 'band', gear: '#ea580c', beard: 'mustache', brow: 'fierce', extras: ['bells', 'plumes'] },
  lumeng: { head: 'helmet', beard: 'short', age: 1 },
  zhoutai: { skin: 'tan', beard: 'short', extras: ['scar'] },
  sunshangxiang: { skin: 'light', head: 'female-war', gear: '#be123c', body: 'armor', brow: 'thin', age: 0 },
  daqiao: { skin: 'light', head: 'female', body: 'robe', brow: 'thin', age: 0, extras: ['earrings'] },
  xiaoqiao: { skin: 'light', head: 'female', body: 'robe', brow: 'thin', age: 0, extras: ['earrings'], gear: '#f472b6' },
  huanggai: { age: 2, beard: 'full' },
  chengpu: { age: 2, beard: 'long' },
  handang: { age: 2 },
  lusu: { head: 'scholar', beard: 'short', body: 'robe' },
  lingtong: { beard: 'none', age: 0 },
  zhangzhao: { head: 'scholar', beard: 'long', age: 2, body: 'robe' },
  // 군웅
  lubu: { skin: 'light', head: 'helmet', gear: '#fbbf24', beard: 'none', brow: 'fierce', age: 0, extras: ['plumes'] },
  diaochan: { skin: 'light', head: 'female', gear: '#c084fc', body: 'robe', brow: 'thin', age: 0, extras: ['earrings'] },
  huatuo: { head: 'topknot', beard: 'long', body: 'robe', age: 2, brow: 'calm' },
  zhangjiao: { head: 'band', gear: '#eab308', beard: 'long', body: 'robe', age: 1 },
  zhangbao: { head: 'band', gear: '#eab308', beard: 'goatee', body: 'robe' },
  zhangliang: { head: 'band', gear: '#eab308', beard: 'short' },
  zuoci: { head: 'taoist', beard: 'long', body: 'robe', age: 2, brow: 'calm' },
  yuji: { head: 'taoist', beard: 'long', body: 'robe', age: 2, brow: 'calm' },
  dongzhuo: { head: 'crown', gear: '#1c1917', beard: 'full', brow: 'fierce', wide: 1.25, body: 'robe', age: 1 },
  yuanshao: { head: 'helmet', gear: '#facc15', beard: 'short', brow: 'calm', age: 1 },
  yuanshu: { head: 'crown', gear: '#facc15', beard: 'mustache', body: 'robe', wide: 1.1 },
  menghuo: { skin: 'dark', head: 'tribal', beard: 'full', brow: 'fierce', wide: 1.15, extras: ['earrings'] },
  zhurong: { skin: 'tan', head: 'tribal', body: 'armor', brow: 'thin', age: 0, extras: ['earrings'] },
  gongsunzan: { head: 'helmet', gear: '#f8fafc', beard: 'short' },
  wangyun: { head: 'crown', gear: '#1c1917', beard: 'long', age: 2, body: 'robe' },
  chengong: { head: 'scholar', beard: 'goatee', body: 'robe' },
  // 적 전용
  yt_brute: { head: 'band', gear: '#eab308', beard: 'wild', skin: 'tan', brow: 'fierce' },
  yt_raider: { head: 'band', gear: '#eab308', beard: 'short', brow: 'fierce' },
  yt_mystic: { head: 'band', gear: '#eab308', beard: 'goatee', body: 'robe' },
};

const FEMALE_HEADS: Head[] = ['female', 'female-war'];
export const isFemaleHead = (h: Head) => FEMALE_HEADS.includes(h);

/** 문자열 → 0 이상 정수 (장수 id 기반 고정 변주) */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function appearanceOf(def: GeneralDef): Appearance {
  const h = hash(def.id);
  const { war, int } = def.stats;
  const scholar = int >= war + 20;
  const warrior = war >= int + 10;
  const veteran = def.bonds.includes('백전노장');

  const base: Appearance = {
    skin: (['normal', 'normal', 'light', 'tan'] as const)[h % 4],
    head: scholar ? ((h >> 3) % 2 ? 'scholar' : 'topknot') : warrior ? 'helmet' : ((h >> 3) % 2 ? 'topknot' : 'helmet'),
    beard: scholar
      ? (['goatee', 'mustache', 'long', 'none'] as const)[(h >> 5) % 4]
      : (['short', 'mustache', 'full', 'goatee', 'none'] as const)[(h >> 5) % 5],
    body: scholar ? 'robe' : 'armor',
    brow: war >= 88 ? 'fierce' : scholar ? 'calm' : (h >> 8) % 2 ? 'fierce' : 'calm',
    age: veteran ? 2 : 1,
  };
  return { ...base, ...OVERRIDES[def.id] };
}
