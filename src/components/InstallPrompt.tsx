import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TitleIcon } from './CloudAccount';

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
    <span className="relative">
      <TitleIcon
        label="설치"
        title={deferred ? '홈 화면에 설치' : 'Safari 공유 → 홈 화면에 추가'}
        onClick={() => { if (deferred) void install(); }}
      >
        <Download size={16} />
      </TitleIcon>
      <button type="button" aria-label="닫기" onClick={dismiss}
        className="absolute -right-1 -top-1 rounded-full bg-black/80 p-0.5 text-white/80">
        <X size={12} />
      </button>
    </span>
  );
}
