// 로그인된 계정의 세이브를 Firestore saves/{uid} 한 문서에 둔다.
// 이 브라우저 localStorage가 플레이 중의 원본이고, 클라우드에는 잠시 모았다가 올린다.
import { FirebaseError } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getRedirectResult,
  linkWithPopup,
  linkWithRedirect,
  onAuthStateChanged,
  setPersistence,
  signInAnonymously,
  signInWithCredential,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { cloudConfigured, firebaseAuth, firebaseDb } from './firebase';
import { decideSync } from './reconcile';
import { useCloud, type CloudUser } from './account';
import { applySaveState, useGame } from '../store/gameStore';
import { SAVE_VERSION, migrateSave, pickSave, sanitizeSave, saveSignature, type SaveData } from '../store/saveData';

const STAMP_KEY = 'oath-banner-saved-at';

let booted = false;
let hydrated = false;
let applying = false;
let canUpload = false;
let baseUpdatedAt = 0;
let pending = false;
let timer = 0;
let authGen = 0;

function stampOf(): number {
  const n = Number(localStorage.getItem(STAMP_KEY) || 0);
  return Number.isFinite(n) ? n : 0;
}

function setStamp(n: number) {
  localStorage.setItem(STAMP_KEY, String(n));
}

function cloudUser(user: User): CloudUser {
  return {
    uid: user.uid,
    anonymous: user.isAnonymous,
    email: user.email,
    name: user.displayName,
  };
}

function noticeFor(code: string): string {
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return '';
  if (code === 'auth/popup-blocked') return '로그인 창이 막혔습니다. 브라우저에서 팝업을 허용해 주세요.';
  if (code === 'auth/unauthorized-domain') return '이 주소는 Firebase 로그인 허용 목록에 없습니다.';
  if (code === 'auth/network-request-failed' || code === 'unavailable') return '클라우드에 닿지 못했습니다. 이 브라우저의 기록은 남아 있습니다.';
  return '클라우드 저장에 실패했습니다. 이 브라우저의 기록은 남아 있습니다.';
}

function fail(error: unknown) {
  const code = error instanceof FirebaseError ? error.code : '';
  const notice = code ? noticeFor(code) : '클라우드 저장에 실패했습니다. 이 브라우저의 기록은 남아 있습니다.';
  if (!notice) {
    useCloud.setState({ busy: false });
    return;
  }
  const signedIn = useCloud.getState().user != null;
  useCloud.setState({ phase: signedIn ? 'error' : 'signed-out', notice, busy: false });
}

async function readRemote(uid: string): Promise<{ save: SaveData; updatedAt: number } | null> {
  const snap = await getDoc(doc(firebaseDb(), 'saves', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const version = typeof data.version === 'number' ? data.version : 0;
  return { save: migrateSave(data.save, version), updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0 };
}

async function writeRemote(uid: string, save: SaveData, updatedAt: number, force: boolean) {
  const ref = doc(firebaseDb(), 'saves', uid);
  await runTransaction(firebaseDb(), async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    const remoteAt = data && typeof data.updatedAt === 'number' ? data.updatedAt : 0;
    if (!force && remoteAt > baseUpdatedAt && data) {
      const version = typeof data.version === 'number' ? data.version : 0;
      throw Object.assign(new Error('stale'), {
        code: 'stale',
        remote: migrateSave(data.save, version),
        remoteAt,
      });
    }
    tx.set(ref, { version: SAVE_VERSION, updatedAt, save });
  });
}

function rememberRemote(save: SaveData, updatedAt: number) {
  applying = true;
  try {
    applySaveState(save);
  } finally {
    applying = false;
  }
  baseUpdatedAt = updatedAt;
  setStamp(updatedAt);
}

async function uploadNow(force: boolean) {
  const user = useCloud.getState().user;
  if (!user || !canUpload) return;
  const save = sanitizeSave(pickSave(useGame.getState()));
  const updatedAt = Date.now();
  useCloud.setState({ phase: 'syncing' });
  try {
    await writeRemote(user.uid, save, updatedAt, force);
    baseUpdatedAt = updatedAt;
    setStamp(updatedAt);
    useCloud.setState({ phase: 'ready', notice: '클라우드에 저장했습니다.', conflict: null });
    if (saveSignature(useGame.getState()) !== saveSignature(save)) scheduleUpload();
  } catch (error) {
    const stale = error as { code?: string; remote?: SaveData; remoteAt?: number };
    if (stale.code === 'stale' && stale.remote) {
      canUpload = false;
      useCloud.setState({
        phase: 'ready',
        notice: '',
        conflict: { local: sanitizeSave(pickSave(useGame.getState())), remote: stale.remote, remoteAt: stale.remoteAt ?? 0 },
      });
      return;
    }
    useCloud.setState({ phase: 'error', notice: noticeFor(error instanceof FirebaseError ? error.code : 'unavailable') });
  }
}

function scheduleUpload() {
  if (!canUpload || applying) return;
  pending = true;
  window.clearTimeout(timer);
  timer = window.setTimeout(() => { void flush(); }, 800);
}

async function flush() {
  if (!pending) return;
  pending = false;
  window.clearTimeout(timer);
  await uploadNow(false);
}

async function reconcile(user: User, gen: number): Promise<boolean> {
  canUpload = false;
  if (gen !== authGen) return false;
  useCloud.setState({ phase: 'syncing', user: cloudUser(user), conflict: null });
  let remote: { save: SaveData; updatedAt: number } | null = null;
  try {
    remote = await readRemote(user.uid);
  } catch (error) {
    if (gen !== authGen) return false;
    fail(error);
    return false;
  }
  if (gen !== authGen) return false;
  const local = sanitizeSave(pickSave(useGame.getState()));
  const decision = decideSync(local, remote?.save ?? null);
  if (decision === 'download' && remote) {
    rememberRemote(remote.save, remote.updatedAt);
    useCloud.setState({ phase: 'ready', notice: '다른 기기의 진행을 불러왔습니다.' });
  } else if (decision === 'conflict' && remote) {
    useCloud.setState({
      phase: 'ready',
      notice: '',
      conflict: { local, remote: remote.save, remoteAt: remote.updatedAt },
    });
    return true;
  } else if (decision === 'upload') {
    canUpload = true;
    await uploadNow(true);
    if (gen !== authGen) return false;
    useCloud.setState({ notice: remote ? '클라우드에 저장했습니다.' : '이 진행을 클라우드에 올렸습니다.' });
    return true;
  } else if (remote) {
    baseUpdatedAt = remote.updatedAt;
    setStamp(remote.updatedAt);
    useCloud.setState({ phase: 'ready', notice: '클라우드 기록과 같습니다.' });
  }
  canUpload = true;
  return true;
}

async function adoptExistingGoogle(error: unknown) {
  if (!(error instanceof FirebaseError)) throw error;
  if (error.code !== 'auth/credential-already-in-use' && error.code !== 'auth/email-already-in-use') throw error;
  const credential = GoogleAuthProvider.credentialFromError(error);
  if (!credential) throw error;
  await signInWithCredential(firebaseAuth(), credential);
}

function wantsRedirect() {
  return window.matchMedia('(pointer: coarse)').matches;
}

async function google(auth: Auth) {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const redirect = wantsRedirect();
  const current = auth.currentUser;
  try {
    if (current?.isAnonymous) {
      if (redirect) await linkWithRedirect(current, provider);
      else await linkWithPopup(current, provider);
    } else if (redirect) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  } catch (error) {
    await adoptExistingGoogle(error);
  }
}

export function startCloudSync() {
  if (booted) return;
  booted = true;
  useCloud.setState({ configured: cloudConfigured, phase: cloudConfigured ? 'booting' : 'off' });
  if (!cloudConfigured) return;

  useGame.subscribe((state, prev) => {
    if (!hydrated || applying) return;
    if (saveSignature(state) === saveSignature(prev)) return;
    setStamp(Date.now());
    scheduleUpload();
  });

  const boot = () => {
    if (hydrated) return;
    hydrated = true;
    void (async () => {
      const auth = firebaseAuth();
      auth.languageCode = 'ko';
      await setPersistence(auth, browserLocalPersistence);
      try {
        await getRedirectResult(auth);
      } catch (error) {
        try {
          await adoptExistingGoogle(error);
        } catch (inner) {
          fail(inner);
        }
      }
      let activeUid: string | null = null;
      onAuthStateChanged(auth, (user) => {
        if (!user) {
          authGen += 1;
          activeUid = null;
          canUpload = false;
          baseUpdatedAt = 0;
          useCloud.setState({ phase: 'signed-out', user: null, conflict: null, busy: false });
          return;
        }
        // 토큰 갱신마다 기록을 다시 덮어쓰지 않는다. 계정이 바뀔 때만 맞춘다.
        if (user.uid === activeUid) return;
        const gen = ++authGen;
        activeUid = user.uid;
        void reconcile(user, gen).then((ok) => {
          if (!ok && gen === authGen) activeUid = null;
          if (gen === authGen) useCloud.setState({ busy: false });
        });
      });
    })().catch(fail);
  };

  useGame.persist.onFinishHydration(boot);
  if (useGame.persist.hasHydrated()) boot();

  window.addEventListener('pagehide', () => { void flush(); });
  window.addEventListener('online', () => { if (canUpload) scheduleUpload(); });
}

export async function signInGoogle() {
  if (!cloudConfigured) return;
  useCloud.setState({ busy: true, notice: '' });
  try {
    await google(firebaseAuth());
  } catch (error) {
    fail(error);
  } finally {
    useCloud.setState({ busy: false });
  }
}

export async function signInGuest() {
  if (!cloudConfigured || useCloud.getState().user) return;
  useCloud.setState({ busy: true, notice: '' });
  try {
    await signInAnonymously(firebaseAuth());
  } catch (error) {
    fail(error);
  } finally {
    useCloud.setState({ busy: false });
  }
}

export async function signOutCloud() {
  canUpload = false;
  pending = false;
  await signOut(firebaseAuth());
  useCloud.setState({
    phase: 'signed-out',
    user: null,
    conflict: null,
    notice: '이 브라우저의 진행은 남아 있습니다. 다른 기기에서는 로그인해야 이어집니다.',
  });
}

export async function keepLocalSave() {
  if (!useCloud.getState().conflict) return;
  canUpload = true;
  useCloud.setState({ busy: true });
  await uploadNow(true);
  useCloud.setState({ busy: false });
  if (!useCloud.getState().conflict) useCloud.setState({ notice: '이 기기의 진행을 클라우드에 남겼습니다.' });
}

export async function keepCloudSave() {
  const conflict = useCloud.getState().conflict;
  if (!conflict) return;
  rememberRemote(conflict.remote, conflict.remoteAt);
  canUpload = true;
  useCloud.setState({ conflict: null, phase: 'ready', notice: '클라우드 진행을 이 기기에 불러왔습니다.' });
}
