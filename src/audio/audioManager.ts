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

  /** Howler 전역 + 캐시된 트랙 전부 정지 (이중 재생·옛 캐시 방지) */
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
      html5: true,
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
      if (howl.playing()) {
        // 이미 같은 곡이면 볼륨만
      } else {
        howl.play();
      }
      this.current = key;
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

    // 겹침 없이 전환 (옛 wav·이전 곡이 같이 재생되는 문제 방지)
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
