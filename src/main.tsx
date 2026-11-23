import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { startCloudSync } from './cloud/sync';
import App from './App';
import { lockTheme } from './theme';
import './index.css';

lockTheme();
registerSW({ immediate: true });
startCloudSync();

class ScreenGuard extends Component<{ children: ReactNode }, { failed: boolean; detail: string }> {
  state = { failed: false, detail: '' };

  static getDerivedStateFromError(error: Error) {
    return { failed: true, detail: error?.message ? String(error.message).slice(0, 160) : '' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center text-stone-100">
          <div className="w-full rounded-2xl border border-stone-700 bg-stone-900 px-6 py-8">
            <p className="font-serif text-xl font-black">화면을 불러오지 못했습니다</p>
            <p className="mt-2 text-sm text-stone-400">진행 상황은 이 브라우저에 저장되어 있습니다.</p>
            {this.state.detail && (
              <p className="mt-3 break-all rounded-lg bg-black/40 px-2 py-1.5 text-left text-[10px] text-stone-500">{this.state.detail}</p>
            )}
            <button
              type="button"
              className="mt-5 rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white"
              onClick={() => window.location.reload()}
            >
              다시 열기
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScreenGuard>
      <App />
    </ScreenGuard>
  </StrictMode>,
);
