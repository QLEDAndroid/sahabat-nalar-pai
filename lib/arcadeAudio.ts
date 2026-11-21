"use client";

type ArcadeSfxKey =
  | "jump"
  | "coin"
  | "laser"
  | "explosion"
  | "bounce"
  | "brick"
  | "hit"
  | "powerup"
  | "win"
  | "gameover";

const SFX_MAP: Record<ArcadeSfxKey, { primary: string; fallback: string; volume: number }> = {
  jump: { primary: "/sounds/sfx-jump.mp3", fallback: "/sounds/correct.mp3", volume: 0.65 },
  coin: { primary: "/sounds/sfx-coin.mp3", fallback: "/sounds/correct.mp3", volume: 0.6 },
  laser: { primary: "/sounds/sfx-laser.mp3", fallback: "/sounds/horn.mp3", volume: 0.35 },
  explosion: { primary: "/sounds/sfx-explosion.mp3", fallback: "/sounds/wrong.mp3", volume: 0.95 },
  bounce: { primary: "/sounds/sfx-bounce.mp3", fallback: "/sounds/correct.mp3", volume: 0.5 },
  brick: { primary: "/sounds/sfx-brick.mp3", fallback: "/sounds/correct.mp3", volume: 0.55 },
  hit: { primary: "/sounds/sfx-hit.mp3", fallback: "/sounds/wrong.mp3", volume: 0.65 },
  powerup: { primary: "/sounds/sfx-powerup.mp3", fallback: "/sounds/fanfare.mp3", volume: 0.7 },
  win: { primary: "/sounds/sfx-win.mp3", fallback: "/sounds/fanfare.mp3", volume: 0.8 },
  gameover: { primary: "/sounds/sfx-gameover.mp3", fallback: "/sounds/wrong.mp3", volume: 0.75 },
};

class RealSfxEngine {
  public muted = false;
  private lastPlayed: Record<string, number> = {};

  private play(key: ArcadeSfxKey, minGapMs = 45) {
    if (this.muted || typeof window === "undefined") return;
    const now = performance.now();
    if (now - (this.lastPlayed[key] || 0) < minGapMs) return;
    this.lastPlayed[key] = now;

    const cfg = SFX_MAP[key];
    const trySrc = (src: string, fallback?: string) => {
      const audio = new Audio(src);
      audio.volume = cfg.volume;
      audio.onerror = () => {
        if (fallback) trySrc(fallback);
      };
      audio.play().catch(() => {
        if (fallback) trySrc(fallback);
      });
    };
    trySrc(cfg.primary, cfg.fallback);
  }

  jump() {
    this.play("jump", 80);
  }
  coin() {
    this.play("coin", 60);
  }
  laser() {
    this.play("laser", 110);
  }
  explosion() {
    this.play("explosion", 90);
  }
  bounce() {
    this.play("bounce", 60);
  }
  brickBreak() {
    this.play("brick", 60);
  }
  hit() {
    this.play("hit", 120);
  }
  powerup() {
    this.play("powerup", 150);
  }
  win() {
    this.play("win", 200);
  }
  gameOver() {
    this.play("gameover", 200);
  }
}

export const arcadeAudio = new RealSfxEngine();
