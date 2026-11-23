import { BookOpen, Coins, Flag, Swords, Target, Users, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BannerEmblem } from './components/BannerEmblem';
import { AccountButton, GameConflict } from './components/CloudAccount';
import { cn, ReloadButton, useLandscape } from './components/ui';
import BattlePage from './pages/Battle';
import Campaign from './pages/Campaign';
import Challenge from './pages/Challenge';
import Formation from './pages/Formation';
import Recruit from './pages/Recruit';
import Roster from './pages/Roster';
import TitleScreen from './pages/TitleScreen';
import { useGame, type View } from './store/gameStore';
import { GAME_SUBTITLE, GAME_TITLE } from './config';

const TABS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: 'campaign', label: '출진', icon: Swords },
  { id: 'formation', label: '편성', icon: Users },
  { id: 'challenge', label: '도전', icon: Target },
  { id: 'recruit', label: '등용', icon: Flag },
  { id: 'roster', label: '장수록', icon: BookOpen },
];

function useSaveHydrated() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const done = () => setReady(true);
    const unsub = useGame.persist.onFinishHydration(done);
    if (useGame.persist.hasHydrated()) done();
    return unsub;
  }, []);
  return ready;
}

export default function App() {
  const hydrated = useSaveHydrated();
  const land = useLandscape();
  const started = useGame((s) => s.started);
  const entered = useGame((s) => s.entered);
  const view = useGame((s) => s.view);
  const gold = useGame((s) => s.gold);
  const setView = useGame((s) => s.setView);
  const goTitle = useGame((s) => s.goTitle);
  const inBattle = view === 'battle';

  if (!hydrated) return <div className="min-h-dvh" />;
  if (!started || !entered) return <TitleScreen />;
  if (land) return <LandShell />;

  return (
    <div className={cn('mx-auto flex max-w-6xl flex-col', inBattle ? 'h-dvh max-h-dvh overflow-hidden' : 'min-h-screen')}>
      {!inBattle && (
        <header className="sticky top-0 z-30 border-b border-[#8C6D46]/50 bg-[#3D261C]/95 text-[#F3D078] backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <button type="button" onClick={goTitle} title="첫 화면" aria-label="첫 화면으로" className="flex min-h-11 items-center gap-2">
              <BannerEmblem className="h-8 w-8" />
              <div className="text-left leading-tight">
                <div className="font-serif text-base font-bold tracking-wide text-[#F3D078]">{GAME_TITLE}</div>
                <div className="hidden text-[10px] tracking-[0.3em] text-[#E8D4A8] sm:block">{GAME_SUBTITLE}</div>
              </div>
            </button>
            <nav className="ml-6 hidden gap-1 lg:flex">
              {TABS.map((t) => (
                <TabButton key={t.id} active={view === t.id} onClick={() => setView(t.id)} icon={t.icon} label={t.label} />
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-2">
              <AccountButton />
              <ReloadButton />
              <div className="flex min-h-9 items-center gap-1.5 rounded-full border border-[#D99B26]/60 bg-[#D99B26]/15 px-3 py-1 text-sm font-bold text-[#F3D078]">
                <Coins size={15} />
                <span className="tabular">{gold.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </header>
      )}

      <main className={cn(
        inBattle
          ? 'flex min-h-0 flex-1 flex-col overflow-hidden bg-[#EAE0D0] p-0'
          : 'scroll-sheet mx-3 mt-3 mb-20 flex-1 rounded-2xl px-4 py-5 lg:mb-4',
      )}>
        {view === 'campaign' && <Campaign />}
        {view === 'formation' && <Formation />}
        {view === 'recruit' && <Recruit />}
        {view === 'roster' && <Roster />}
        {view === 'challenge' && <Challenge />}
        {view === 'battle' && <BattlePage />}
      </main>

      <GameConflict />

      {!inBattle && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#8C6D46]/45 bg-[#3D261C]/95 pb-[env(safe-area-inset-bottom)] text-[#F3D078] backdrop-blur lg:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setView(t.id)}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold', active ? 'text-[#F3D078]' : 'text-[#C8B69E]')}>
                <Icon size={20} />
                {t.label}
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}

/** 폰 가로 화면: 고정 화면(스크롤 없음) · 원정 지도가 바탕 · 편성/도전/등용/장수록은 모달 */
function LandShell() {
  const view = useGame((s) => s.view);
  const gold = useGame((s) => s.gold);
  const setView = useGame((s) => s.setView);
  const goTitle = useGame((s) => s.goTitle);
  const inBattle = view === 'battle';
  const modalTab = TABS.find((t) => t.id === view && t.id !== 'campaign');
  return (
    <div className={cn('fixed inset-0', inBattle ? 'bg-[#EAE0D0]' : 'bg-[#EAE0D0]')}>
      {/* 바탕: 원정 지도 전체 화면. 전투 때만 전장 전체 */}
      {inBattle ? (
        <main className="absolute inset-0 overflow-hidden bg-[#EAE0D0]"><BattlePage /></main>
      ) : (
        <div className="absolute inset-0"><Campaign /></div>
      )}

      {/* HUD 위: 전투 중에는 숨겨 전장을 극대화 */}
      {!inBattle && (
        <header className="absolute inset-x-0 top-0 z-20 flex h-10 items-center gap-2 border-b border-[#8C6D46]/45 bg-[#3D261C]/90 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] text-[#F3D078] backdrop-blur">
          <button type="button" onClick={goTitle} aria-label="첫 화면으로" className="flex items-center gap-1.5">
            <BannerEmblem className="h-6 w-6" />
            <span className="font-serif text-sm font-bold text-[#F3D078]">{GAME_TITLE}</span>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <AccountButton />
            <ReloadButton />
            <div className="flex min-h-8 items-center gap-1 rounded-full border border-[#D99B26]/60 bg-[#D99B26]/15 px-2.5 text-sm font-bold text-[#F3D078]">
              <Coins size={14} />
              <span className="tabular">{gold.toLocaleString()}</span>
            </div>
          </div>
        </header>
      )}

      {/* HUD 오른쪽: 메뉴 버튼 열 (지도가 곧 출진 화면이라 출진 탭은 없다) */}
      {!inBattle && (
        <nav className="absolute right-[max(0.375rem,env(safe-area-inset-right))] top-12 z-20 flex flex-col gap-1.5">
          {TABS.filter((t) => t.id !== 'campaign' || modalTab).map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => setView(t.id)}
                className={cn('flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-xl border text-[10px] font-bold shadow-sm backdrop-blur active:bg-[#B8332A]/40',
                  t.id === view ? 'border-[#F3D078]/80 bg-[#B8332A] text-[#FAF6EE]' : 'border-[#8C6D46]/60 bg-[#3D261C]/90 text-[#F3D078]')}>
                <Icon size={18} />
                {t.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* 편성·도전·등용·장수록: 출진처럼 화면 전체를 채우는 페이지 (오른쪽 메뉴 열은 그대로) */}
      {modalTab && (
        <main className="scroll-sheet absolute bottom-1.5 left-[max(0.375rem,env(safe-area-inset-left))] right-[calc(3.75rem+env(safe-area-inset-right))] top-11 z-10 overflow-hidden rounded-xl p-2">
          <div className="h-full min-h-0 overflow-hidden">
            {view === 'formation' && <Formation />}
            {view === 'recruit' && <Recruit />}
            {view === 'roster' && <Roster />}
            {view === 'challenge' && <Challenge />}
          </div>
        </main>
      )}
      <GameConflict />
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-serif text-sm font-bold transition-colors',
        active ? 'bg-[#B8332A] text-[#FAF6EE]' : 'text-[#F3D078] hover:bg-[#D99B26]/20')}>
      <Icon size={15} />
      {label}
    </button>
  );
}
