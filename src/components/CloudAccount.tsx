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
          <Btn size="md" onClick={() => { void signInGoogle(); }} disabled={busy} className="w-56">
            <LogIn size={16} /> 구글로 이어하기
          </Btn>
          <button type="button" disabled={busy} onClick={() => { void signInGuest(); }}
            className="text-xs text-stone-400 hover:text-stone-200 disabled:opacity-40">
            구글 계정 없이 이 브라우저에 클라우드 저장
          </button>
          <p className="max-w-sm text-[11px] leading-relaxed text-stone-500">
            구글 계정으로 로그인하면 PC와 모바일에서 같은 진행을 이어갑니다. 계정 없이 남긴 기록은 이 브라우저에서만 이어지고, 나중에 구글을 연결할 수 있습니다.
          </p>
        </>
      )}
      {user && (
        <p className="text-center text-xs text-stone-300">
          {user.anonymous ? '구글에 연결하지 않은 클라우드 기록입니다.' : `${user.email ?? user.name ?? '구글 계정'}에 저장합니다.`}
        </p>
      )}
      {user?.anonymous && (
        <Btn size="sm" variant="outline" disabled={busy} onClick={() => { void signInGoogle(); }}>구글 계정에 연결</Btn>
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
            {!user && <Btn disabled={busy} onClick={() => { void signInGoogle(); }}><LogIn size={16} /> 구글로 로그인</Btn>}
            {!user && <Btn variant="outline" disabled={busy} onClick={() => { void signInGuest(); }}>계정 없이 저장</Btn>}
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
