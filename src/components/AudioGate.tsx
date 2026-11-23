import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { audioManager } from '../audio/audioManager';
import { useAudioSettings } from '../store/useAudioSettings';
import { cn } from './ui';

/** 첫 터치로 오디오 잠금 해제 + 탭 숨김 시 전체 뮤트 */
export function AudioGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const onVis = () => {
      audioManager.muteAll(document.visibilityState === 'hidden');
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (!unlocked) {
    return (
      <button
        type="button"
        className="fixed inset-0 z-[100] flex h-dvh w-full flex-col items-center justify-center gap-3 bg-[#181310] px-6 text-center"
        onClick={() => {
          setUnlocked(true);
          audioManager.playBgm('lobby');
        }}
      >
        <span className="font-serif text-2xl font-black tracking-wide text-[#F5E6C8] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-3xl">
          터치하여 시작
        </span>
        <span className="text-sm text-[#E2B866]/90">배경음악이 재생됩니다</span>
      </button>
    );
  }

  return (
    <>
      {children}
      <AudioSettingsFab />
    </>
  );
}

/** 우측 상단 BGM 설정 패널 */
export function AudioSettingsFab() {
  const bgmOn = useAudioSettings((s) => s.bgmOn);
  const bgmVolume = useAudioSettings((s) => s.bgmVolume);
  const set = useAudioSettings((s) => s.set);
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-none fixed right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-[90] land:top-[max(2.75rem,calc(env(safe-area-inset-top)+2.25rem))]">
      <div className="pointer-events-auto flex flex-col items-end gap-2">
        <button
          type="button"
          aria-label={bgmOn ? 'BGM 설정' : 'BGM 꺼짐'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-full border border-[#C89D54]/50 bg-[#1C1613]/85 text-[#E2B866] shadow-sm backdrop-blur-sm',
            'hover:bg-[#241B15] active:scale-95',
          )}
        >
          {bgmOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
        {open && (
          <div className="w-56 rounded-xl border border-[#C89D54]/50 bg-[#1C1613]/90 p-3 text-[#F5E6C8] shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold">BGM</span>
              <button
                type="button"
                role="switch"
                aria-checked={bgmOn}
                onClick={() => set({ bgmOn: !bgmOn })}
                className={cn(
                  'relative h-8 w-14 rounded-full transition-colors',
                  bgmOn ? 'bg-[#B8332A]' : 'bg-[#3D2E24]',
                )}
              >
                <span
                  className={cn(
                    'absolute top-1 h-6 w-6 rounded-full bg-[#F5E6C8] transition-transform',
                    bgmOn ? 'left-7' : 'left-1',
                  )}
                />
              </button>
            </div>
            <label className="mt-3 block text-[11px] text-[#E2B866]">
              볼륨
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={bgmVolume}
                disabled={!bgmOn}
                onChange={(e) => set({ bgmVolume: Number(e.target.value) })}
                className="mt-1 h-8 w-full accent-[#E2B866] disabled:opacity-40"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
