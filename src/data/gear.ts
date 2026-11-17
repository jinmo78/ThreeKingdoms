// 장비 도감. 칸마다 무력·통솔·지력 중 하나만 올린다.
import type { GearSlot, Rarity, StatKey } from '../types';

export interface GearDef {
  id: string;
  name: string;
  slot: GearSlot;
  stat: StatKey;
  /** 처음 얻을 때의 등급. 여기서 R→SR→SSR로 올린다. */
  rarity: Rarity;
  desc: string;
  /** 그림 파일. 없으면 id와 같다. */
  art?: string;
  /** skill이면 능력치는 낮고 전법 보너스가 크다. */
  focus?: 'stat' | 'skill';
}

export const GEAR_SLOT_LABEL: Record<GearSlot, string> = {
  weapon: '무기',
  armor: '갑주',
  tome: '서책',
};

export const GEAR: GearDef[] = [
  { id: 'sword_r', name: '환수검', slot: 'weapon', stat: 'war', rarity: 'R', desc: '날을 갈아 무력을 보탠다.' },
  { id: 'spear_sr', name: '파진창', slot: 'weapon', stat: 'war', rarity: 'SR', desc: '진을 가르는 긴 창.' },
  { id: 'blade_ssr', name: '용아검', slot: 'weapon', stat: 'war', rarity: 'SSR', desc: '이름난 명검.' },
  { id: 'hide_r', name: '혁갑', slot: 'armor', stat: 'lead', rarity: 'R', desc: '가벼운 가죽 갑주.' },
  { id: 'scale_sr', name: '찰갑', slot: 'armor', stat: 'lead', rarity: 'SR', desc: '비늘을 이은 갑주.' },
  { id: 'iron_ssr', name: '현철갑', slot: 'armor', stat: 'lead', rarity: 'SSR', desc: '검은 철로 두른 갑주.' },
  { id: 'manual_r', name: '진법서', slot: 'tome', stat: 'int', rarity: 'R', desc: '진을 짜는 기초 서책.' },
  { id: 'treatise_sr', name: '병요', slot: 'tome', stat: 'int', rarity: 'SR', desc: '싸움의 요체를 적은 책.' },
  { id: 'secret_ssr', name: '비책', slot: 'tome', stat: 'int', rarity: 'SSR', desc: '남에게 보이지 않는 계책.' },
  { id: 'dagger_r', name: '비수', slot: 'weapon', stat: 'war', rarity: 'R', art: 'sword_r', focus: 'skill', desc: '짧은 칼. 전법 위력을 높인다.' },
  { id: 'pike_sr', name: '장창', slot: 'weapon', stat: 'war', rarity: 'SR', art: 'spear_sr', focus: 'skill', desc: '긴 창. 전법 위력을 높인다.' },
  { id: 'glaive_ssr', name: '환도', slot: 'weapon', stat: 'war', rarity: 'SSR', art: 'blade_ssr', focus: 'skill', desc: '넓은 칼. 전법 위력을 높인다.' },
  { id: 'vest_r', name: '피갑', slot: 'armor', stat: 'lead', rarity: 'R', art: 'hide_r', focus: 'skill', desc: '얇은 갑주. 전법 위력을 조금 높인다.' },
  { id: 'mail_sr', name: '어갑', slot: 'armor', stat: 'lead', rarity: 'SR', art: 'scale_sr', focus: 'skill', desc: '비늘 갑주. 전법 위력을 조금 높인다.' },
  { id: 'plate_ssr', name: '명광개', slot: 'armor', stat: 'lead', rarity: 'SSR', art: 'iron_ssr', focus: 'skill', desc: '빛나는 갑주. 전법 위력을 조금 높인다.' },
  { id: 'book_r', name: '병서', slot: 'tome', stat: 'int', rarity: 'R', art: 'manual_r', focus: 'skill', desc: '병법 책. 전법 발동을 높인다.' },
  { id: 'scroll_sr', name: '육도', slot: 'tome', stat: 'int', rarity: 'SR', art: 'treatise_sr', focus: 'skill', desc: '옛 병서. 전법 발동을 높인다.' },
  { id: 'seal_ssr', name: '비결', slot: 'tome', stat: 'int', rarity: 'SSR', art: 'secret_ssr', focus: 'skill', desc: '감춘 비결. 전법 발동을 높인다.' },
];

export const GEAR_MAP: Record<string, GearDef> = Object.fromEntries(GEAR.map((g) => [g.id, g]));

const SLOTS: GearSlot[] = ['weapon', 'armor', 'tome'];

function gearInPool(slot: GearSlot, rarity: Rarity, variant: number) {
  const pool = GEAR.filter((g) => g.slot === slot && g.rarity === rarity);
  return pool[Math.abs(variant) % pool.length]?.id ?? null;
}

/** 장 1~3은 R, 4~6은 SR, 7~8은 SSR. 장 안에서는 무기·갑주·서책 순. 홀수·짝수 장은 다른 종류. */
export function stageGearId(chapter: number, indexInOrder: number): string | null {
  if (chapter < 1) return null;
  const slot = SLOTS[indexInOrder % 3];
  const rarity: Rarity = chapter <= 3 ? 'R' : chapter <= 6 ? 'SR' : 'SSR';
  return gearInPool(slot, rarity, chapter);
}

/** 토벌전. 9층부터 SR, 21층부터 SSR. 층마다 종류가 번갈아 나온다. */
export function conquestGearId(floor: number): string {
  const slot = SLOTS[floor % 3];
  const rarity: Rarity = floor >= 21 ? 'SSR' : floor >= 9 ? 'SR' : 'R';
  return gearInPool(slot, rarity, Math.floor(floor / 3))!;
}
