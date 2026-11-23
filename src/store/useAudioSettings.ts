import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AudioSettings = {
  bgmOn: boolean;
  bgmVolume: number;
  set: (partial: Partial<Pick<AudioSettings, 'bgmOn' | 'bgmVolume'>>) => void;
};

function clampVolume(v: number) {
  if (!Number.isFinite(v)) return 0.4;
  return Math.max(0, Math.min(1, v));
}

export const useAudioSettings = create<AudioSettings>()(
  persist(
    (set) => ({
      bgmOn: true,
      bgmVolume: 0.4,
      set: (partial) => set((s) => ({
        bgmOn: partial.bgmOn ?? s.bgmOn,
        bgmVolume: partial.bgmVolume !== undefined ? clampVolume(partial.bgmVolume) : s.bgmVolume,
      })),
    }),
    { name: 'audio-settings' },
  ),
);
