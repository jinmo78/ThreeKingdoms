import { Howl, Howler } from 'howler';
import { useAudioSettings } from '../store/useAudioSettings';

export const BGM_FILES = {
  lobby: 'bgm_lobby.wav',
  battle: 'bgm_battle.wav',
} as const;

export type BgmKey = keyof typeof BGM_FILES;

const FADE_MS = 600;

function bgmSrc(file: string) {
  return `${import.meta.env.BASE_URL}audio/${file}`;
}

class AudioManager {
  private howls = new Map<BgmKey, Howl>();
  private current: BgmKey | null = null;
  private desired: BgmKey | null = null;
  private fading = false;
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

  private ensure(key: BgmKey): Howl {
    const cached = this.howls.get(key);
    if (cached) return cached;
    const howl = new Howl({
      src: [bgmSrc(BGM_FILES[key])],
      loop: true,
      html5: false,
      preload: true,
      volume: this.settings().bgmVolume,
      onloaderror: (_id, err) => {
        console.warn(`[audio] BGM load failed: ${key} (${bgmSrc(BGM_FILES[key])})`, err);
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
    // Howl 생성 후에야 Howler.ctx가 생김 → 바로 resume
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
    const howl = this.ensure(key);
    this.resumeCtx();
    const vol = Math.max(0.05, this.volume());
    howl.volume(vol);
    try {
      if (!howl.playing()) howl.play();
      this.current = key;
    } catch (err) {
      console.warn(`[audio] BGM start failed: ${key}`, err);
    }
  }

  private applySettings() {
    const { bgmOn, bgmVolume } = this.settings();
    if (!bgmOn) {
      if (this.current) {
        const h = this.howls.get(this.current);
        if (h?.playing()) h.pause();
      }
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
      const howl = this.ensure(key);
      howl.volume(this.volume());
      if (!howl.playing()) this.startNow(key);
      return;
    }

    if (this.fading) return;

    // 첫 곡은 페이드 없이 바로 (볼륨 0에서 시작하면 안 들릴 수 있음)
    if (!this.current) {
      const howl = this.ensure(key);
      if (howl.state() === 'loaded') {
        this.startNow(key);
        return;
      }
      void this.whenLoaded(howl).then(() => {
        if (this.desired === key && this.settings().bgmOn && this.unlocked && !this.current) {
          this.startNow(key);
        }
      });
      return;
    }

    void this.crossfadeTo(key);
  }

  private async crossfadeTo(next: BgmKey) {
    this.fading = true;
    const prevKey = this.current;
    const prev = prevKey ? this.howls.get(prevKey) : undefined;

    try {
      const finalKey = this.desired ?? next;
      const nextHowl = await this.whenLoaded(this.ensure(finalKey));
      if (!this.settings().bgmOn || !this.unlocked) return;

      if (prev?.playing()) {
        prev.fade(prev.volume(), 0, FADE_MS);
        await sleep(FADE_MS);
        prev.stop();
      }

      if (this.desired !== finalKey) return;

      nextHowl.volume(0);
      nextHowl.play();
      nextHowl.fade(0, this.volume(), FADE_MS);
      this.current = finalKey;
      await sleep(FADE_MS);
      if (this.current === finalKey) nextHowl.volume(this.volume());
    } catch (err) {
      console.warn('[audio] crossfade failed', err);
      if (this.desired) this.startNow(this.desired);
    } finally {
      this.fading = false;
      if (this.desired && this.desired !== this.current && this.settings().bgmOn && this.unlocked) {
        void this.crossfadeTo(this.desired);
      }
    }
  }

  muteAll(mute: boolean) {
    Howler.mute(mute);
  }
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export const audioManager = new AudioManager();
