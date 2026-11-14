import { Moon, Sun } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { applyTheme, currentTheme, type Theme } from '../theme';

export function cn(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(' ');
}

export function Panel({
  title, icon, action, children, className,
}: {
  title?: ReactNode; icon?: ReactNode; action?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-stone-800 bg-stone-900/70', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-stone-800 px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold tracking-wide text-stone-200">
            {icon && <span className="text-red-300">{icon}</span>}
            {title}
          </h3>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

type BtnVariant = 'primary' | 'gold' | 'ghost' | 'outline';
export function Btn({
  children, onClick, variant = 'primary', size = 'md', disabled, className, title,
}: {
  children: ReactNode; onClick?: () => void; variant?: BtnVariant; size?: 'sm' | 'md' | 'lg';
  disabled?: boolean; className?: string; title?: string;
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-red-700 text-white hover:bg-red-600 shadow-[0_6px_20px_-8px_rgba(220,38,38,0.7)]',
    gold: 'bg-amber-400 text-[#1c1612] hover:bg-amber-500 shadow-[0_6px_20px_-8px_rgba(251,191,36,0.7)]',
    ghost: 'bg-stone-800 text-stone-200 hover:bg-stone-700',
    outline: 'border border-stone-700 text-stone-200 hover:border-red-500/60 hover:text-red-200',
  };
  const s = { sm: 'px-2.5 py-1 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' }[size];
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors active:scale-[0.98]',
        'disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none',
        v[variant], s, className,
      )}
    >
      {children}
    </button>
  );
}

export function Bar({ value, max, className, color = 'bg-red-500' }: { value: number; max: number; className?: string; color?: string }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-stone-800', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-500 ease-out', color)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** 밝은 화면이 기본. 어두운 화면은 이 버튼으로 바꾼다. */
export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? '밝은 화면으로 전환' : '어두운 화면으로 전환'}
      title={dark ? '밝은 화면' : '어두운 화면'}
      onClick={() => {
        const next: Theme = dark ? 'light' : 'dark';
        applyTheme(next);
        setTheme(next);
      }}
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-stone-700 bg-stone-900 text-stone-200',
        className,
      )}
    >
      {dark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

let scrollLocks = 0;
let lockedScrollY = 0;

function lockPageScroll() {
  if (scrollLocks === 0) {
    lockedScrollY = window.scrollY;
    const body = document.body;
    body.style.position = 'fixed';
    body.style.top = `-${lockedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }
  scrollLocks += 1;
}

function unlockPageScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks > 0) return;
  const body = document.body;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflow = '';
  window.scrollTo(0, lockedScrollY);
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    lockPageScroll();
    return unlockPageScroll;
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overscroll-none bg-black/75 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="animate-slide-in max-h-[90vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-2xl border border-stone-700 bg-stone-900 p-5 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
