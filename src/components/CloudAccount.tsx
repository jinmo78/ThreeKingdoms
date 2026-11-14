import { LogIn, LogOut, UserRound, type LucideIcon } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { keepCloudSave, keepLocalSave, signInGoogle, signInGuest, signOutCloud } from '../cloud/sync';
import { useCloud } from '../cloud/account';
import { saveSummary } from '../store/saveData';
import { Btn, cn, Modal } from './ui';

const TITLE_BTN = 'inline-flex w-56 items-center justify-center gap-1.5 rounded-xl px-6 py-3 text-base font-bold transition-colors active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none';
const TITLE_COLOR = {
  red: 'bg-red-700 text-white hover:bg-red-600 shadow-[0_6px_20px_-8px_rgba(220,38,38,0.7)]',
  white: 'bg-white text-[#1c1612] hover:bg-stone-100 shadow-[0_6px_20px_-8px_rgba(255,255,255,0.45)]',
  sky: 'bg-sky-700 text-white hover:bg-sky-600 shadow-[0_6px_20px_-8px_rgba(3,105,161,0.8)]',
  stone: 'bg-stone-600 text-white hover:bg-stone-500 shadow-[0_6px_20px_-8px_rgba(0,0,0,0.45)]',
  ink: 'bg-[#2c2622] text-stone-100 hover:bg-[#3d342e] shadow-[0_6px_20px_-8px_rgba(0,0,0,0.45)]',
} as const;

export function TitleButton({
  color, children, onClick, disabled, icon: Icon,
}: {
  color: keyof typeof TITLE_COLOR;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={cn(TITLE_BTN, TITLE_COLOR[color])}>
      {Icon && <Icon size={18} />}
      {children}
    </button>
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
    <div className="flex w-full max-w-md flex-col items-center gap-3">
      {!user && (
        <>
          <TitleButton color="white" icon={LogIn} disabled={busy} onClick={() => { void signInGoogle(); }}>구글 계정으로 로그인</TitleButton>
          <TitleButton color="sky" disabled={busy} onClick={() => { void signInGuest(); }}>익명으로 로그인</TitleButton>
        </>
      )}
      {user?.anonymous && (
        <TitleButton color="white" icon={LogIn} disabled={busy} onClick={() => { void signInGoogle(); }}>구글 계정에 연결</TitleButton>
      )}
      {user && (
        <TitleButton color="ink" icon={LogOut} disabled={busy} onClick={() => { void signOutCloud(); }}>로그아웃</TitleButton>
      )}
    </div>
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
        className="rounded-full p-2 text-stone-300 hover:bg-stone-800 hover:text-stone-100">
        <UserRound size={16} />
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)}>
          <h3 className="font-serif text-lg font-black text-stone-100">계정</h3>
          <p className="mt-2 text-sm leading-relaxed text-stone-300">
            {user
              ? (user.anonymous
                ? '이 브라우저의 클라우드 기록입니다. 구글을 연결하면 다른 기기에서도 이어집니다.'
                : `${user.email ?? user.name ?? '구글 계정'}의 기록으로 이 기기와 다른 기기를 맞춥니다.`)
              : '구글 계정으로 로그인하면 PC와 모바일에서 같은 진행을 이어갑니다.'}
          </p>
          {notice && <p className="mt-2 text-xs text-stone-400">{notice}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {!user && (
              <button type="button" disabled={busy} onClick={() => { void signInGoogle(); }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-bold text-[#1c1612] hover:bg-stone-100 disabled:opacity-40">
                <LogIn size={16} /> 구글 계정으로 로그인
              </button>
            )}
            {!user && (
              <button type="button" disabled={busy} onClick={() => { void signInGuest(); }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-600 disabled:opacity-40">
                익명으로 로그인
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
