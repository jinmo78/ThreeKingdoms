import { Howl, Howler } from 'howler';
import { useAudioSettings } from '../store/useAudioSettings';

export const BGM_FILES = {
  lobby: 'bgm_lobby.mp3',
  battle: 'bgm_battle.mp3',
} as const;

export type BgmKey = keyof typeof BGM_FILES;

/** 예전 wav 캐시를 피하기 위한 쿼리 */
const BGM_CACHE = 'v=suno2';

function bgmSrc(file: string) {
  return `${import.meta.env.BASE_URL}audio/${file}?${BGM_CACHE}`;
}

function clearMediaSession() {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
  } catch {
    /* ignore */
  }
}

class AudioManager {
  private howls = new Map<BgmKey, Howl>();
  private current: BgmKey | null = null;
  private desired: BgmKey | null = null;
  private unlocked = false;

  constructor() {
    useAudioSettings.subscribe((state, prev) => {
      if (state.bgmOn === prev.bgmOn && state.bgmVolume === prev.bgmVolume) return;
      this.applySettings();
    });
  }

  private settings() {
    return useAudioSettings.getState();
  }

  /** 사용자 제스처 안에서 호출 — Howl을 만들어 ctx를 연 뒤 재생 허용 */
  unlock() {
    this.unlocked = true;
    this.stopEverything();
    this.ensure('lobby');
    this.resumeCtx();
  }

  private resumeCtx() {
    try {
      Howler.mute(false);
      const ctx = Howler.ctx;
      if (ctx && ctx.state === 'suspended') void ctx.resume();
    } catch {
      /* ignore */
    }
  }

  /** Howler 전역 + 캐시된 트랙 전부 정지 */
  private stopEverything() {
    try {
      Howler.stop();
    } catch {
      /* ignore */
    }
    for (const howl of this.howls.values()) {
      try {
        howl.stop();
      } catch {
        /* ignore */
      }
    }
    clearMediaSession();
  }

  /**
   * 앱·탭을 떠날 때: 정지 + unload + 미디어 세션 해제.
   * Android가 HTML5/미디어 알림을 남기지 않게 한다.
   */
  release() {
    this.stopEverything();
    for (const howl of this.howls.values()) {
      try {
        howl.unload();
      } catch {
        /* ignore */
      }
    }
    this.howls.clear();
    this.current = null;
    clearMediaSession();
  }

  /** 다시 화면으로 돌아오면 듣던 곡 재개 */
  resumeAfterBackground() {
    if (!this.unlocked || !this.settings().bgmOn) return;
    const key = this.desired ?? 'lobby';
    this.playBgm(key);
  }

  private stopOthers(except: BgmKey) {
    for (const [key, howl] of this.howls) {
      if (key === except) continue;
      try {
        howl.stop();
      } catch {
        /* ignore */
      }
    }
  }

  private ensure(key: BgmKey): Howl {
    const cached = this.howls.get(key);
    if (cached) return cached;
    const src = bgmSrc(BGM_FILES[key]);
    const howl = new Howl({
      src: [src],
      format: ['mp3'],
      loop: true,
      // Web Audio: Android 미디어 알림(재생 위젯)이 덜 뜸
      html5: false,
      preload: true,
      volume: this.settings().bgmVolume,
      onloaderror: (_id, err) => {
        console.warn(`[audio] BGM load failed: ${key} (${src})`, err);
      },
      onplayerror: (_id, err) => {
        console.warn(`[audio] BGM play failed: ${key}`, err);
        howl.once('unlock', () => {
          try {
            howl.play();
          } catch (e) {
            console.warn(`[audio] BGM unlock retry failed: ${key}`, e);
          }
        });
      },
    });
    this.howls.set(key, howl);
    this.resumeCtx();
    return howl;
  }

  private whenLoaded(howl: Howl): Promise<Howl> {
    if (howl.state() === 'loaded') return Promise.resolve(howl);
    return new Promise((resolve) => {
      const done = () => resolve(howl);
      howl.once('load', done);
      howl.once('loaderror', done);
      const t = window.setTimeout(done, 8000);
      howl.once('load', () => window.clearTimeout(t));
      howl.once('loaderror', () => window.clearTimeout(t));
      if (howl.state() === 'unloaded') howl.load();
    });
  }

  private volume() {
    return this.settings().bgmVolume;
  }

  private startNow(key: BgmKey) {
    this.stopOthers(key);
    const howl = this.ensure(key);
    this.resumeCtx();
    const vol = Math.max(0.05, this.volume());
    howl.volume(vol);
    try {
      if (!howl.playing()) howl.play();
      this.current = key;
      clearMediaSession();
    } catch (err) {
      console.warn(`[audio] BGM start failed: ${key}`, err);
    }
  }

  private applySettings() {
    const { bgmOn, bgmVolume } = this.settings();
    if (!bgmOn) {
      this.stopEverything();
      return;
    }
    const key = this.desired ?? this.current;
    if (!key || !this.unlocked) return;
    const howl = this.ensure(key);
    howl.volume(bgmVolume);
    if (!howl.playing()) this.startNow(key);
  }

  playBgm(key: BgmKey) {
    this.desired = key;
    if (!this.settings().bgmOn || !this.unlocked) return;

    if (this.current === key) {
      this.stopOthers(key);
      const howl = this.ensure(key);
      howl.volume(this.volume());
      if (!howl.playing()) this.startNow(key);
      return;
    }

    this.stopEverything();
    this.current = null;
    const howl = this.ensure(key);
    if (howl.state() === 'loaded') {
      this.startNow(key);
      return;
    }
    void this.whenLoaded(howl).then(() => {
      if (this.desired === key && this.settings().bgmOn && this.unlocked) {
        this.startNow(key);
      }
    });
  }

  muteAll(mute: boolean) {
    Howler.mute(mute);
  }
}

export const audioManager = new AudioManager();
