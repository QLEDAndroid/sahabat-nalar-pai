"use client";

export type SfxName = "correct" | "wrong" | "fanfare" | "applause" | "horn";
export type BgmName = "lobby" | "quiz" | "none";

const SFX_BASE: Record<SfxName, string> = {
  correct: "/sounds/correct",
  wrong: "/sounds/wrong",
  fanfare: "/sounds/fanfare",
  applause: "/sounds/applause",
  horn: "/sounds/horn",
};

const BGM_BASE: Record<Exclude<BgmName, "none">, string> = {
  lobby: "/sounds/lobby-bgm",
  quiz: "/sounds/quiz-bgm",
};

class SoundEngine {
  private bgmEl: HTMLAudioElement | null = null;
  private currentBgm: BgmName = "none";
  private muted = false;
  private blockedListeners: Array<(blocked: boolean) => void> = [];
  private isBlocked = false;

  onBlockedChange(cb: (blocked: boolean) => void) {
    this.blockedListeners.push(cb);
    cb(this.isBlocked);
    return () => {
      this.blockedListeners = this.blockedListeners.filter((x) => x !== cb);
    };
  }

  private setBlocked(val: boolean) {
    this.isBlocked = val;
    this.blockedListeners.forEach((cb) => cb(val));
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.bgmEl) this.bgmEl.muted = m;
  }

  isMuted() {
    return this.muted;
  }

  /** Panggil saat user klik tombol di halaman TV agar Chrome mengizinkan audio */
  unlock() {
    this.setBlocked(false);
    if (this.bgmEl && this.bgmEl.paused && !this.muted) {
      this.bgmEl.play().catch(() => {});
    } else if (this.currentBgm !== "none" && !this.bgmEl) {
      const track = this.currentBgm;
      this.currentBgm = "none";
      this.playBgm(track);
    }
  }

  playSfx(name: SfxName) {
    if (this.muted || typeof window === "undefined") return;
    const base = SFX_BASE[name];
    const tryPlay = (src: string, fallbackSrc?: string) => {
      const audio = new Audio(src);
      audio.volume = 0.8;
      audio.onerror = () => {
        console.warn("[SoundEngine] Gagal memuat:", src, "-> fallback ke", fallbackSrc);
        if (fallbackSrc) tryPlay(fallbackSrc);
      };
      audio.play().catch((err) => {
        if (err?.name === "NotAllowedError") {
          this.setBlocked(true);
        } else if (fallbackSrc) {
          tryPlay(fallbackSrc);
        }
      });
    };
    tryPlay(`${base}.mp3`, `${base}.wav`);
  }

  playBgm(track: BgmName) {
    if (typeof window === "undefined") return;
    if (track === this.currentBgm && this.bgmEl && !this.bgmEl.paused) return;

    if (this.bgmEl) {
      this.bgmEl.pause();
      this.bgmEl.currentTime = 0;
      this.bgmEl = null;
    }
    this.currentBgm = track;
    if (track === "none") return;

    const base = BGM_BASE[track];
    const startTrack = (src: string, fallbackSrc?: string) => {
      if (this.currentBgm !== track) return;
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = 0.42;
      audio.muted = this.muted;
      audio.onerror = () => {
        console.warn("[SoundEngine] Gagal memuat BGM:", src, "-> fallback ke", fallbackSrc);
        if (fallbackSrc) startTrack(fallbackSrc);
      };
      this.bgmEl = audio;
      audio
        .play()
        .then(() => this.setBlocked(false))
        .catch((err) => {
          if (err?.name === "NotAllowedError") {
            this.setBlocked(true);
          } else if (fallbackSrc) {
            startTrack(fallbackSrc);
          }
        });
    };
    startTrack(`${base}.mp3`, `${base}.wav`);
  }


  /** Bunyi detak tegang pada 5 detik terakhir (5-4-3-2-1) */
  playTick(secLeft: number) {
    if (this.muted || typeof window === "undefined") return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(secLeft <= 1 ? 1180 : 880 + (5 - secLeft) * 60, now);
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(g).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.13);
    } catch {
      // ignore
    }
  }

  stopBgm() {
    this.playBgm("none");
  }
}

export const soundEngine = new SoundEngine();
