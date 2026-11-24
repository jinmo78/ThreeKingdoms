import { Volume2, VolumeX } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { audioManager } from '../audio/audioManager';
import { useAudioSettings } from '../store/useAudioSettings';
import { cn } from './ui';

/** 별도 시작 화면 없이 앱을 바로 보여 주고, BGM은 켜짐이 기본·첫 입력에서 재생 */
export function AudioGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    audioManager.unlock();
    audioManager.playBgm('lobby');

    const tryStart = () => {
      audioManager.unlock();
      audioManager.playBgm('lobby');
    };
    // 브라우저 자동재생 차단 시, 첫 터치/클릭/키로 재생
    document.addEventListener('pointerdown', tryStart, { once: true, capture: true });
    document.addEventListener('keydown', tryStart, { once: true, capture: true });

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
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
      document.removeEventListener('pointerdown', tryStart, true);
      document.removeEventListener('keydown', tryStart, true);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
    };
  }, []);

  return children;
}

/** 헤더·타이틀에 넣는 인라인 BGM 버튼 */
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
