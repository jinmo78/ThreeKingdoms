import { create } from 'zustand';
import type { SaveData } from '../store/saveData';

export interface CloudUser {
  uid: string;
  anonymous: boolean;
  email: string | null;
  name: string | null;
}

export interface SaveConflict {
  local: SaveData;
  remote: SaveData;
  remoteAt: number;
}

export type CloudPhase = 'off' | 'booting' | 'signed-out' | 'syncing' | 'ready' | 'error';

interface CloudAccount {
  configured: boolean;
  phase: CloudPhase;
  user: CloudUser | null;
  notice: string;
  conflict: SaveConflict | null;
  busy: boolean;
}

export const useCloud = create<CloudAccount>(() => ({
  configured: false,
  phase: 'off',
  user: null,
  notice: '',
  conflict: null,
  busy: false,
}));
