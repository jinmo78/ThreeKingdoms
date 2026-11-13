import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { useGame } from './store/gameStore';
import './index.css';

class ScreenGuard extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="font-serif text-xl font-black">화면을 불러오지 못했습니다</p>
          <p className="text-sm text-stone-400">진행 상황은 이 브라우저에 저장되어 있습니다.</p>
          <button
            type="button"
            className="rounded-xl bg-red-700 px-5 py-3 text-sm font-bold text-white"
            onClick={() => {
              useGame.setState({ view: 'campaign', battle: null });
              this.setState({ failed: false });
            }}
          >
            다시 열기
          </button>
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
