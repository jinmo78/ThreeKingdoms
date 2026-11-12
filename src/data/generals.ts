import raw from './generals.json';
import type { GeneralDef } from '../types';

export const GENERALS = raw as unknown as GeneralDef[];

export const GENERAL_MAP: Record<string, GeneralDef> = Object.fromEntries(GENERALS.map((g) => [g.id, g]));

/** 등용(가챠)으로 얻을 수 있는 장수 */
export const RECRUITABLE = GENERALS.filter((g) => g.recruitable !== false);

export function getGeneral(id: string): GeneralDef {
  const g = GENERAL_MAP[id];
  if (!g) throw new Error(`알 수 없는 장수 id: ${id}`);
  return g;
}
