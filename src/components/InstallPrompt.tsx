import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TitleButton } from './CloudAccount';
import { Hint } from './ui';

const DISMISS_KEY = 'oath-banner-pwa-dismiss';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || ('standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/** 홈 화면 설치 안내 — Chromium은 beforeinstallprompt, iOS는 공유 메뉴 안내 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIos, setShowIos] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY) === '1') return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    if (isIos()) setShowIos(true);

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDeferred(null);
    setShowIos(false);
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (!deferred && !showIos) return null;

  return (
    <div className="mx-auto w-full max-w-md rounded-xl border border-white/15 bg-black/55 px-3 py-3 text-left backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-bold text-stone-100">
            설치
            <Hint text={deferred ? '앱처럼 바로 열고, 오프라인에서도 이어집니다.' : 'Safari 공유 → 홈 화면에 추가'} />
          </p>
        </div>
        <button type="button" aria-label="닫기" onClick={dismiss} className="rounded-lg p-1 text-stone-400 hover:bg-white/10 hover:text-stone-200">
          <X size={16} />
        </button>
      </div>
      {deferred && (
        <div className="mt-3 flex justify-center">
          <TitleButton color="white" icon={Download} onClick={() => { void install(); }}>설치</TitleButton>
        </div>
      )}
    </div>
  );
}
