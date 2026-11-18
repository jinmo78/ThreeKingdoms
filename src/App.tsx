import { BookOpen, Coins, Flag, Swords, Target, Users, X, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BannerEmblem } from './components/BannerEmblem';
import { AccountButton, GameConflict } from './components/CloudAccount';
import { cn, Modal, ReloadButton, ThemeToggle, useLandscape } from './components/ui';
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
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
      <header className="sticky top-0 z-30 border-b border-[#C6A15B]/45 bg-[#171513]/95 text-[#F3ECE0] backdrop-blur">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button type="button" onClick={goTitle} title="첫 화면" aria-label="첫 화면으로" className="flex min-h-11 items-center gap-2">
            <BannerEmblem className="h-8 w-8" />
            <div className="text-left leading-tight">
              <div className="font-serif text-base font-bold tracking-wide text-[#C6A15B]">{GAME_TITLE}</div>
              <div className="hidden text-[10px] tracking-[0.3em] text-[#B8382E] sm:block">{GAME_SUBTITLE}</div>
            </div>
          </button>
          {!inBattle && (
            <nav className="ml-6 hidden gap-1 lg:flex">
              {TABS.map((t) => (
                <TabButton key={t.id} active={view === t.id} onClick={() => setView(t.id)} icon={t.icon} label={t.label} />
              ))}
            </nav>
          )}
          <div className="ml-auto flex items-center gap-2">
            <AccountButton />
            <ReloadButton />
            <ThemeToggle />
            <div className="flex min-h-9 items-center gap-1.5 rounded-full border border-[#C6A15B]/50 bg-[#C6A15B]/12 px-3 py-1 text-sm font-bold text-[#C6A15B]">
              <Coins size={15} />
              <span className="tabular">{gold.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={cn('scroll-sheet mx-3 mt-3 flex-1 rounded-2xl px-4 py-5', !inBattle && 'mb-20 lg:mb-4')}>
        {view === 'campaign' && <Campaign />}
        {view === 'formation' && <Formation />}
        {view === 'recruit' && <Recruit />}
        {view === 'roster' && <Roster />}
        {view === 'challenge' && <Challenge />}
        {view === 'battle' && <BattlePage />}
      </main>

      <GameConflict />

      {!inBattle && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#C6A15B]/45 bg-[#171513]/95 pb-[env(safe-area-inset-bottom)] text-[#F3ECE0] backdrop-blur lg:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setView(t.id)}
                className={cn('flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-[11px] font-bold', active ? 'text-[#B8382E]' : 'text-[#C6A15B]/80')}>
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
    <div className="fixed inset-0 flex flex-col bg-[#140e0c] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-[#C6A15B]/45 bg-[#171513] px-2 text-[#F3ECE0]">
        <button type="button" onClick={goTitle} aria-label="첫 화면으로" className="flex items-center gap-1.5">
          <BannerEmblem className="h-6 w-6" />
          <span className="font-serif text-sm font-bold text-[#C6A15B]">{GAME_TITLE}</span>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <AccountButton />
          <ReloadButton />
          <ThemeToggle />
          <div className="flex min-h-8 items-center gap-1 rounded-full border border-[#C6A15B]/50 bg-[#C6A15B]/12 px-2.5 text-sm font-bold text-[#C6A15B]">
            <Coins size={14} />
            <span className="tabular">{gold.toLocaleString()}</span>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {!inBattle && (
          <nav className="flex w-14 shrink-0 flex-col justify-center gap-1 bg-[#171513] py-1 text-[#F3ECE0]">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = view === t.id;
              return (
                <button key={t.id} type="button" onClick={() => setView(t.id)}
                  className={cn('flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-bold', active ? 'bg-[#B8382E]/25 text-[#B8382E]' : 'text-[#C6A15B]/80')}>
                  <Icon size={18} />
                  {t.label}
                </button>
              );
            })}
          </nav>
        )}
        <main className={cn('scroll-sheet m-1.5 min-h-0 min-w-0 flex-1 rounded-xl p-2', inBattle ? 'overflow-y-auto' : 'overflow-hidden')}>
          {inBattle ? <BattlePage /> : <Campaign />}
        </main>
      </div>

      {modalTab && (
        <Modal wide onClose={() => setView('campaign')}>
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-serif text-base font-black text-[#C6A15B]">
              <modalTab.icon size={16} /> {modalTab.label}
            </h2>
            <button type="button" aria-label="닫기" onClick={() => setView('campaign')}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-800/60 text-stone-300"><X size={16} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {view === 'formation' && <Formation />}
            {view === 'recruit' && <Recruit />}
            {view === 'roster' && <Roster />}
            {view === 'challenge' && <Challenge />}
          </div>
        </Modal>
      )}
      <GameConflict />
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 font-serif text-sm font-bold transition-colors',
        active ? 'bg-[#B8382E] text-[#F8E7D2]' : 'text-[#C6A15B] hover:bg-[#C6A15B]/15')}>
      <Icon size={15} />
      {label}
    </button>
  );
}
