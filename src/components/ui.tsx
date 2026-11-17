import { Moon, RefreshCw, Sun } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
    <section className={cn('rounded-2xl border border-[#C6A15B]/55 bg-stone-900/80 shadow-[inset_0_1px_0_rgba(255,248,235,0.35)]', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-[#C6A15B]/35 px-4 py-3">
          <h3 className="flex items-center gap-2 font-serif text-sm font-bold tracking-wide text-stone-200">
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
    primary: 'bg-[#B8382E] text-[#F8E7D2] hover:bg-[#9C2E26] shadow-[0_6px_20px_-8px_rgba(184,56,46,0.75)]',
    gold: 'bg-[#C6A15B] text-[#171513] hover:bg-[#D4B36E] shadow-[0_6px_20px_-8px_rgba(198,161,91,0.7)]',
    ghost: 'bg-stone-800 text-stone-200 hover:bg-stone-700',
    outline: 'border border-[#C6A15B]/70 text-stone-200 hover:border-[#B8382E] hover:text-red-300',
  };
  const s = { sm: 'min-h-9 px-3 py-1.5 text-xs', md: 'min-h-11 px-4 py-2.5 text-sm', lg: 'min-h-12 px-6 py-3 text-base' }[size];
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

/** 설치한 앱에는 브라우저 새로고침이 없어서, 화면 안에서 다시 불러온다. */
export function ReloadButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="새로고침"
      title="새로고침"
      onClick={() => window.location.reload()}
      className={cn('min-h-11 min-w-11 rounded-lg p-2 text-[#F3ECE0] hover:bg-[#C6A15B]/15 hover:text-[#C6A15B]', className)}
    >
      <RefreshCw size={16} />
    </button>
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
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#C6A15B]/50 bg-transparent text-[#F3ECE0]',
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

export function NameSearch({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-h-11 w-full min-w-[8rem] flex-1 rounded-lg border border-[#C6A15B]/45 bg-stone-950 px-3 py-2 text-sm text-stone-100 placeholder:text-stone-500"
    />
  );
}

export function Modal({ children, onClose, wide, ink }: { children: ReactNode; onClose: () => void; wide?: boolean; ink?: boolean }) {
  useEffect(() => {
    lockPageScroll();
    return unlockPageScroll;
  }, []);
  // sticky·overflow 조상 안에서는 fixed가 뷰포트에 안 붙고 레이아웃이 깨지므로 body로 포털한다
  return createPortal(
    <div className={cn('fixed inset-0 z-50 flex items-end justify-center overscroll-none p-0 sm:items-center sm:p-4', ink ? 'bg-[#171513]/80' : 'bg-black/75')} onClick={onClose}>
      <div
        className={cn(
          'animate-slide-in flex max-h-[92dvh] w-full flex-col overscroll-contain rounded-t-2xl border border-[#C6A15B]/70 bg-stone-950 p-5 leading-relaxed sm:rounded-2xl',
          ink && 'border-2 border-[#C6A15B] bg-[#F3ECE0] text-[#1C1612] dark:bg-[#221E1A] dark:text-[#F3ECE0]',
          wide ? 'h-[92dvh] max-w-4xl overflow-hidden' : 'max-w-lg overflow-y-auto',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
