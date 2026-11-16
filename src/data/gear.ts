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
];

export const GEAR_MAP: Record<string, GearDef> = Object.fromEntries(GEAR.map((g) => [g.id, g]));

const SLOTS: GearSlot[] = ['weapon', 'armor', 'tome'];

/** 장 1~3은 R, 4~6은 SR, 7~8은 SSR. 장 안에서는 무기·갑주·서책 순. */
export function stageGearId(chapter: number, indexInOrder: number): string | null {
  if (chapter < 1) return null;
  const slot = SLOTS[indexInOrder % 3];
  const rarity: Rarity = chapter <= 3 ? 'R' : chapter <= 6 ? 'SR' : 'SSR';
  return GEAR.find((g) => g.slot === slot && g.rarity === rarity)?.id ?? null;
}

/** 토벌전. 9층부터 SR, 21층부터 SSR. */
export function conquestGearId(floor: number): string {
  const slot = SLOTS[floor % 3];
  const rarity: Rarity = floor >= 21 ? 'SSR' : floor >= 9 ? 'SR' : 'R';
  return GEAR.find((g) => g.slot === slot && g.rarity === rarity)!.id;
}
