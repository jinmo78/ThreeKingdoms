import { LogIn, LogOut, UserRound, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { keepCloudSave, keepLocalSave, signInGoogle, signInGuest, signOutCloud } from '../cloud/sync';
import { useCloud } from '../cloud/account';
import { saveSummary } from '../store/saveData';
import { Btn, cn, Hint, Modal } from './ui';

const TITLE_BTN = 'inline-flex w-56 items-center justify-center gap-1.5 rounded-xl px-6 py-3 text-base font-bold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';
const TITLE_COLOR = {
  red: 'bg-red-700 text-white hover:bg-red-600 shadow-[0_6px_20px_-8px_rgba(220,38,38,0.7)]',
  white: 'bg-white text-[#1c1612] hover:bg-stone-100 shadow-[0_6px_20px_-8px_rgba(255,255,255,0.45)]',
  sky: 'bg-sky-700 text-white hover:bg-sky-600 shadow-[0_6px_20px_-8px_rgba(3,105,161,0.8)]',
  stone: 'bg-stone-600 text-white hover:bg-stone-500 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.45)]',
  ink: 'bg-[#2c2622] text-stone-100 hover:bg-[#3d342e] shadow-[0_6px_20px_-8px_rgba(0,0,0,0.45)]',
} as const;

export function TitleButton({
  color, children, onClick, disabled, icon: Icon, className,
}: {
  color: keyof typeof TITLE_COLOR;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn(TITLE_BTN, TITLE_COLOR[color], className)}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
}

/** 첫 화면의 보조 동작. 긴 문장 대신 아이콘과 짧은 단어. */
export function TitleIcon({
  label, title, onClick, disabled, children,
}: {
  label: string;
  title?: string;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button type="button" title={title ?? label} aria-label={title ?? label} disabled={disabled} onClick={onClick}
      className="inline-flex h-14 min-w-14 flex-col items-center justify-center gap-0.5 rounded-xl border border-white/25 bg-black/50 px-2 text-[11px] font-bold text-white shadow-[0_6px_16px_-10px_rgba(0,0,0,0.8)] backdrop-blur-sm hover:bg-black/70 disabled:opacity-40">
      {children}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.7 7.2l6.3 5.3C37.4 38.3 44 33 44 24c0-1.3-.1-2.7-.4-3.5z" />
    </svg>
  );
}

function when(ts: number) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function ConflictBody() {
  const conflict = useCloud((s) => s.conflict);
  const busy = useCloud((s) => s.busy);
  if (!conflict) return null;
  const remoteWhen = when(conflict.remoteAt);
  return (
    <div className="mx-auto w-full max-w-md text-left">
      <p className="text-sm font-bold text-stone-100">이 기기와 클라우드의 진행이 다릅니다</p>
      <p className="mt-1 text-xs leading-relaxed text-stone-400">남길 쪽을 고르면 다른 쪽은 그 기록으로 바뀝니다.</p>
      <div className="mt-3 grid gap-2">
        <button type="button" disabled={busy} onClick={() => { void keepLocalSave(); }}
          className="rounded-xl border border-stone-700 bg-stone-950/80 px-3 py-3 text-left hover:border-red-500/60 disabled:opacity-40">
          <div className="text-xs font-bold text-red-200">이 기기</div>
          <div className="mt-1 text-sm text-stone-200">{saveSummary(conflict.local)}</div>
        </button>
        <button type="button" disabled={busy} onClick={() => { void keepCloudSave(); }}
          className="rounded-xl border border-stone-700 bg-stone-950/80 px-3 py-3 text-left hover:border-red-500/60 disabled:opacity-40">
          <div className="text-xs font-bold text-red-200">클라우드{remoteWhen ? ` · ${remoteWhen}` : ''}</div>
          <div className="mt-1 text-sm text-stone-200">{saveSummary(conflict.remote)}</div>
        </button>
      </div>
    </div>
  );
}

export function CloudPanel() {
  const configured = useCloud((s) => s.configured);
  const phase = useCloud((s) => s.phase);
  const user = useCloud((s) => s.user);
  const conflict = useCloud((s) => s.conflict);
  const busy = useCloud((s) => s.busy);

  if (!configured || phase === 'booting') return null;
  if (conflict) return <ConflictBody />;

  return (
    <>
      {!user && (
        <>
          <TitleIcon label="구글" title="구글 계정으로 로그인" disabled={busy} onClick={() => { void signInGoogle(); }}><GoogleMark /></TitleIcon>
          <TitleIcon label="익명" title="이 브라우저에만 저장" disabled={busy} onClick={() => { void signInGuest(); }}><UserRound size={16} /></TitleIcon>
        </>
      )}
      {user?.anonymous && (
        <TitleIcon label="연결" title="구글 계정에 연결" disabled={busy} onClick={() => { void signInGoogle(); }}><GoogleMark /></TitleIcon>
      )}
      {user && (
        <TitleIcon label="로그아웃" disabled={busy} onClick={() => { void signOutCloud(); }}><LogOut size={16} /></TitleIcon>
      )}
    </>
  );
}

export function AccountButton() {
  const configured = useCloud((s) => s.configured);
  const user = useCloud((s) => s.user);
  const notice = useCloud((s) => s.notice);
  const busy = useCloud((s) => s.busy);
  const [open, setOpen] = useState(false);
  if (!configured) return null;
  const label = user ? (user.anonymous ? '클라우드 계정' : (user.email ?? '구글 계정')) : '로그인';
  return (
    <>
      <button type="button" aria-label={label} title={label} onClick={() => setOpen(true)}
        className="min-h-11 min-w-11 rounded-full p-2 text-[#F3ECE0] hover:bg-[#C6A15B]/15">
        <UserRound size={16} />
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="flex items-center gap-1 font-serif text-lg font-black text-stone-100">
            계정
            <Hint text={user
              ? (user.anonymous ? '이 브라우저 기록. 구글을 연결하면 다른 기기와 이어집니다.' : `${user.email ?? user.name ?? '구글'} 기록으로 기기를 맞춥니다.`)
              : '구글은 기기 간 진행. 익명은 이 브라우저만.'} />
          </h3>
          {notice && <p className="mt-2 text-xs text-stone-400">{notice}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {!user && (
              <button type="button" disabled={busy} onClick={() => { void signInGoogle(); }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#1c1612] hover:bg-stone-100 disabled:opacity-40">
                <LogIn size={16} /> 구글
              </button>
            )}
            {!user && (
              <button type="button" disabled={busy} onClick={() => { void signInGuest(); }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-40">
                익명
              </button>
            )}
            {user?.anonymous && <Btn disabled={busy} onClick={() => { void signInGoogle(); }}>구글 계정에 연결</Btn>}
            {user && (
              <Btn variant="ghost" disabled={busy} onClick={() => { void signOutCloud(); }}>
                <LogOut size={16} /> 로그아웃
              </Btn>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export function GameConflict() {
  const conflict = useCloud((s) => s.conflict);
  if (!conflict) return null;
  return (
    <Modal onClose={() => {}}>
      <ConflictBody />
    </Modal>
  );
}
