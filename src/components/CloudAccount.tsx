import { LogIn, LogOut, UserRound } from 'lucide-react';
import { useState } from 'react';
import { keepCloudSave, keepLocalSave, signInGoogle, signInGuest, signOutCloud } from '../cloud/sync';
import { useCloud } from '../cloud/account';
import { saveSummary } from '../store/saveData';
import { Btn, Modal } from './ui';

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
  const notice = useCloud((s) => s.notice);
  const conflict = useCloud((s) => s.conflict);
  const busy = useCloud((s) => s.busy);

  if (!configured) {
    if (!import.meta.env.DEV) return null;
    return (
      <p className="mt-3 max-w-sm text-[11px] leading-relaxed text-stone-400">
        클라우드 저장을 쓰려면 .env.local에 Firebase 설정을 넣으세요. 지금은 이 브라우저에만 저장됩니다.
      </p>
    );
  }
  if (conflict) return <div className="mt-4"><ConflictBody /></div>;
  if (phase === 'booting') return null;

  return (
    <div className="mt-4 flex w-full max-w-md flex-col items-center gap-2">
      {!user && (
        <>
          <button type="button" disabled={busy} onClick={() => { void signInGoogle(); }}
            className="inline-flex w-56 items-center justify-center gap-1.5 rounded-xl bg-white px-6 py-3 text-base font-bold text-[#1c1612] shadow-[0_6px_20px_-8px_rgba(255,255,255,0.8)] hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-40">
            <LogIn size={18} /> 구글 계정으로 로그인
          </button>
          <p className="max-w-sm text-[11px] leading-relaxed text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">PC와 휴대폰에서 같은 진행을 이어갑니다.</p>
          <button type="button" disabled={busy} onClick={() => { void signInGuest(); }}
            className="inline-flex w-56 items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-6 py-3 text-base font-bold text-white shadow-[0_6px_20px_-8px_rgba(3,105,161,0.8)] hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40">
            익명으로 로그인
          </button>
          <p className="max-w-sm text-[11px] leading-relaxed text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">구글 계정 없이 이 브라우저에만 클라우드로 남깁니다.</p>
        </>
      )}
      {user && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-sm font-bold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            {user.anonymous ? '익명으로 로그인되어 있습니다.' : `${user.email ?? user.name ?? '구글 계정'} 로 로그인되어 있습니다.`}
          </p>
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-white/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]">
            위의 이어하기로 이 기록을 엽니다. 다른 브라우저의 로그인과는 따로입니다.
          </p>
          {user.anonymous && (
            <Btn size="sm" variant="outline" disabled={busy} onClick={() => { void signInGoogle(); }}>구글 계정에 연결</Btn>
          )}
          <button type="button" disabled={busy} onClick={() => { void signOutCloud(); }}
            className="text-xs text-white/70 underline decoration-white/40 underline-offset-2 hover:text-white disabled:opacity-40">
            로그아웃
          </button>
        </div>
      )}
      {notice && <p className="text-center text-[11px] text-stone-400">{notice}</p>}
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
