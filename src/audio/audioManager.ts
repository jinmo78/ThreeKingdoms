import { Howl, Howler } from 'howler';
import { useAudioSettings } from '../store/useAudioSettings';

export const BGM_FILES = {
  lobby: 'bgm_lobby.mp3',
  battle: 'bgm_battle.mp3',
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
  private unsub: (() => void) | null = null;

  constructor() {
    this.unsub = useAudioSettings.subscribe((state, prev) => {
      if (state.bgmOn === prev.bgmOn && state.bgmVolume === prev.bgmVolume) return;
      this.applySettings();
    });
  }

  private settings() {
    return useAudioSettings.getState();
  }

  private ensure(key: BgmKey): Howl {
    const cached = this.howls.get(key);
    if (cached) return cached;
    const howl = new Howl({
      src: [bgmSrc(BGM_FILES[key])],
      loop: true,
      html5: true,
      volume: 0,
      onloaderror: (_id, err) => {
        console.warn(`[audio] BGM load failed: ${key}`, err);
      },
      onplayerror: (_id, err) => {
        console.warn(`[audio] BGM play failed: ${key}`, err);
      },
    });
    this.howls.set(key, howl);
    return howl;
  }

  private volume() {
    return this.settings().bgmVolume;
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
    if (!key) return;
    const howl = this.ensure(key);
    howl.volume(bgmVolume);
    if (!howl.playing()) {
      try {
        howl.play();
        this.current = key;
      } catch (err) {
        console.warn(`[audio] BGM resume failed: ${key}`, err);
      }
    }
  }

  playBgm(key: BgmKey) {
    this.desired = key;
    const { bgmOn, bgmVolume } = this.settings();
    if (!bgmOn) return;
    if (this.current === key) {
      const howl = this.ensure(key);
      howl.volume(bgmVolume);
      if (!howl.playing()) {
        try {
          howl.play();
        } catch (err) {
          console.warn(`[audio] BGM play failed: ${key}`, err);
        }
      }
      return;
    }
    if (this.fading) {
      // 페이드 중에도 목표만 갱신. 끝나면 desired로 맞춤
      return;
    }
    void this.crossfadeTo(key);
  }

  private async crossfadeTo(next: BgmKey) {
    this.fading = true;
    const prevKey = this.current;
    const prev = prevKey ? this.howls.get(prevKey) : undefined;
    const nextHowl = this.ensure(next);
    const targetVol = this.volume();

    try {
      if (prev?.playing()) {
        prev.fade(prev.volume(), 0, FADE_MS);
        await sleep(FADE_MS);
        prev.stop();
      }

      // 페이드 중 desired가 바뀌었으면 최종 목표로
      const finalKey = this.desired ?? next;
      const finalHowl = finalKey === next ? nextHowl : this.ensure(finalKey);
      if (!this.settings().bgmOn) {
        this.current = null;
        return;
      }
      finalHowl.volume(0);
      try {
        finalHowl.play();
      } catch (err) {
        console.warn(`[audio] BGM play failed: ${finalKey}`, err);
        return;
      }
      finalHowl.fade(0, this.volume() || targetVol, FADE_MS);
      this.current = finalKey;
      await sleep(FADE_MS);
    } finally {
      this.fading = false;
      // 페이드 끝난 뒤 desired가 다르면 한 번 더
      if (this.desired && this.desired !== this.current && this.settings().bgmOn) {
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
