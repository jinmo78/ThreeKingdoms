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
      if (document.visibilityState === 'hidden') {
        // 백그라운드·앱 전환 시 재생 세션을 끊어 Android 미디어 알림이 안 남게 함
        audioManager.release();
      } else {
        audioManager.resumeAfterBackground();
      }
    };
    const onLeave = () => {
      audioManager.release();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, []);

  if (!unlocked) {
    return (
      <button
        type="button"
        className="fixed inset-0 z-[100] flex h-dvh w-full flex-col items-center justify-center gap-3 bg-[#181310] px-6 text-center"
        onClick={() => {
          audioManager.unlock();
          audioManager.playBgm('lobby');
          setUnlocked(true);
        }}
      >
        <span className="font-serif text-2xl font-black tracking-wide text-[#F5E6C8] drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)] sm:text-3xl">
          터치하여 시작
        </span>
        <span className="text-sm text-[#E2B866]/90">배경음악이 재생됩니다</span>
      </button>
    );
  }

  return children;
}

/** 헤더·타이틀에 넣는 인라인 BGM 버튼 (플로팅 오버레이 아님) */
export function AudioSettingsButton({ className }: { className?: string }) {
  const bgmOn = useAudioSettings((s) => s.bgmOn);
  const bgmVolume = useAudioSettings((s) => s.bgmVolume);
  const set = useAudioSettings((s) => s.set);
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        aria-label={bgmOn ? 'BGM 설정' : 'BGM 꺼짐'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex h-11 min-w-11 items-center justify-center rounded-full border border-[#C89D54]/50 bg-[#1C1613]/85 p-2 text-[#E2B866]',
          'hover:bg-[#241B15] active:scale-95',
        )}
      >
        {bgmOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-52 rounded-xl border border-[#C89D54]/50 bg-[#1C1613]/95 p-3 text-[#F5E6C8] shadow-lg backdrop-blur-sm">
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
  );
}
