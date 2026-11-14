import { BookOpen, Coins, Flag, Swords, Target, Users, type LucideIcon } from 'lucide-react';
import { BannerEmblem } from './components/BannerEmblem';
import { AccountButton, GameConflict } from './components/CloudAccount';
import { cn, ThemeToggle } from './components/ui';
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

export default function App() {
  const started = useGame((s) => s.started);
  const entered = useGame((s) => s.entered);
  const view = useGame((s) => s.view);
  const gold = useGame((s) => s.gold);
  const setView = useGame((s) => s.setView);
  const goTitle = useGame((s) => s.goTitle);
  const inBattle = view === 'battle';

  if (!started || !entered) return <TitleScreen />;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col">
      <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-stone-950">
        <div className="flex items-center gap-3 px-4 py-2.5">
          <button type="button" onClick={goTitle} title="첫 화면" aria-label="첫 화면으로" className="flex items-center gap-2">
            <BannerEmblem className="h-8 w-8" />
            <div className="text-left leading-tight">
              <div className="font-serif text-base font-black tracking-wide text-stone-100">{GAME_TITLE}</div>
              <div className="text-[10px] tracking-[0.3em] text-red-300/80">{GAME_SUBTITLE}</div>
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
            <ThemeToggle />
            <div className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-sm font-bold text-amber-300">
              <Coins size={15} />
              <span className="tabular">{gold.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </header>

      <main className={cn('flex-1 px-4 py-5', !inBattle && 'pb-24 lg:pb-8')}>
        {view === 'campaign' && <Campaign />}
        {view === 'formation' && <Formation />}
        {view === 'recruit' && <Recruit />}
        {view === 'roster' && <Roster />}
        {view === 'challenge' && <Challenge />}
        {view === 'battle' && <BattlePage />}
      </main>

      <GameConflict />

      {!inBattle && (
        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-800 bg-stone-950 pb-[env(safe-area-inset-bottom)] lg:hidden">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button key={t.id} type="button" onClick={() => setView(t.id)}
                className={cn('flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold', active ? 'text-red-300' : 'text-stone-500')}>
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

function TabButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: LucideIcon; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={cn('flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
        active ? 'bg-red-900/40 text-red-200' : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200')}>
      <Icon size={15} />
      {label}
    </button>
  );
}
