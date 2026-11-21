"use client";

import { useEffect, useRef, useState } from "react";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { Play, RotateCcw, Trophy, Volume2, VolumeX } from "lucide-react";

interface Obstacle {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  aerial: boolean;
}

interface Coin {
  x: number;
  y: number;
  r: number;
  label: string;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

interface QuizGate {
  active: boolean;
  question: string;
  topLabel: string;
  bottomLabel: string;
  correctIsTop: boolean;
  x: number;
  resolved: boolean;
}

const GATE_QUESTIONS = [
  { q: "Prinsip menjaga akal dalam Maqāṣid Syarī'ah?", top: "Hifzhul 'Aql", bottom: "Hifzhul Māl", topOk: true },
  { q: "Arti Fastabiqul Khairāt (QS. Al-Māidah:48)?", top: "Menimbun Harta", bottom: "Lomba Kebaikan", topOk: false },
  { q: "Keberanian membela kebenaran disebut?", top: "Syajā'ah", bottom: "Riyā'", topOk: true },
  { q: "Akad bagi hasil di Bank Syariah?", top: "Riba", bottom: "Mudharabah", topOk: false },
  { q: "Wali Songo yang berdakwah lewat wayang?", top: "Sunan Kalijaga", bottom: "Sunan Gresik", topOk: true },
  { q: "Menahan diri saat marah disebut kendali?", top: "Ghaḍab", bottom: "Tawakal", topOk: true },
];

const BAD_LABELS = ["RIYĀ'", "HASAD", "GHAḌAB", "HOAKS", "RIBA", "MALAS"];
const GOOD_LABELS = ["IKHLAS", "SYAJĀ'AH", "JUJUR", "AMANAH", "ILMU", "SABAR"];

export function FastabiqulRunner() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [muted, setMuted] = useState(false);

  const stateRef = useRef({
    running: false,
    score: 0,
    speed: 6.2,
    frame: 0,
    shake: 0,
    shieldTimer: 0,
    player: { x: 95, y: 260, vy: 0, w: 34, h: 46, jumps: 0, ducking: false },
    obstacles: [] as Obstacle[],
    coins: [] as Coin[],
    particles: [] as Particle[],
    gate: { active: false, question: "", topLabel: "", bottomLabel: "", correctIsTop: true, x: 900, resolved: false } as QuizGate,
    nextGateScore: 300,
    floatingText: [] as { x: number; y: number; text: string; life: number; color: string }[],
  });

  useEffect(() => {
    const saved = Number(localStorage.getItem("snp_runner_best") || "0");
    if (saved) setBest(saved);
  }, []);

  function spawnParticles(x: number, y: number, color: string, count = 12) {
    for (let i = 0; i < count; i++) {
      stateRef.current.particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.8) * 7,
        life: 24 + Math.random() * 14,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }

  function doJump() {
    const st = stateRef.current;
    if (!st.running) return;
    if (st.player.jumps < 2) {
      st.player.vy = st.player.jumps === 0 ? -13.2 : -11.4;
      st.player.jumps += 1;
      st.player.ducking = false;
      arcadeAudio.jump();
      spawnParticles(st.player.x + 17, st.player.y + st.player.h, "#d1fae5", 7);
    }
  }

  function setDuck(val: boolean) {
    const st = stateRef.current;
    if (!st.running) return;
    st.player.ducking = val;
    if (val && st.player.y < 260) {
      st.player.vy = Math.max(st.player.vy, 9);
    }
  }

  function startGame() {
    const st = stateRef.current;
    st.running = true;
    st.score = 0;
    st.speed = 6.2;
    st.frame = 0;
    st.shake = 0;
    st.shieldTimer = 0;
    st.player = { x: 95, y: 260, vy: 0, w: 34, h: 46, jumps: 0, ducking: false };
    st.obstacles = [];
    st.coins = [];
    st.particles = [];
    st.floatingText = [];
    st.gate = { active: false, question: "", topLabel: "", bottomLabel: "", correctIsTop: true, x: 900, resolved: false };
    st.nextGateScore = 260;
    setScore(0);
    setPhase("playing");
    arcadeAudio.powerup();
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (!stateRef.current.running) startGame();
        else doJump();
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        e.preventDefault();
        setDuck(true);
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.code === "ArrowDown" || e.code === "KeyS") setDuck(false);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 360;
    const GROUND = 306;
    let animId = 0;
    const bgImg = new Image();
    bgImg.src = "/images/games/bg-runner.jpg";

    function loop() {
      if (!ctx) return;
      const st = stateRef.current;
      if (st.running) {
        st.frame += 1;
        st.score += 0.25;
        st.speed = Math.min(11.5, 6.2 + st.score / 420);
        if (st.shieldTimer > 0) st.shieldTimer -= 1;
        if (st.shake > 0) st.shake *= 0.85;

        // Player physics
        const targetH = st.player.ducking ? 26 : 46;
        st.player.h = targetH;
        st.player.vy += 0.72;
        st.player.y += st.player.vy;
        if (st.player.y + st.player.h >= GROUND) {
          st.player.y = GROUND - st.player.h;
          st.player.vy = 0;
          st.player.jumps = 0;
        }

        // Trigger Knowledge Gate
        if (!st.gate.active && st.score >= st.nextGateScore) {
          const gq = GATE_QUESTIONS[Math.floor(Math.random() * GATE_QUESTIONS.length)];
          st.gate = {
            active: true,
            question: gq.q,
            topLabel: gq.top,
            bottomLabel: gq.bottom,
            correctIsTop: gq.topOk,
            x: W + 160,
            resolved: false,
          };
          st.obstacles = st.obstacles.filter((o) => o.x < W - 120);
          st.nextGateScore += 360;
        }

        // Spawn obstacles (only when gate is not close)
        if (!st.gate.active && st.frame % Math.max(48, Math.floor(88 - st.speed * 3)) === 0) {
          const aerial = Math.random() > 0.68;
          st.obstacles.push({
            x: W + 40,
            y: aerial ? GROUND - 78 : GROUND - 42,
            w: aerial ? 58 : 44,
            h: aerial ? 32 : 42,
            label: BAD_LABELS[Math.floor(Math.random() * BAD_LABELS.length)],
            aerial,
          });
        }

        // Spawn coins
        if (st.frame % 42 === 0 && !st.gate.active) {
          st.coins.push({
            x: W + 30,
            y: GROUND - 35 - Math.floor(Math.random() * 115),
            r: 15,
            label: GOOD_LABELS[Math.floor(Math.random() * GOOD_LABELS.length)],
            collected: false,
          });
        }

        // Update gate
        if (st.gate.active) {
          st.gate.x -= st.speed * 0.78;
          if (!st.gate.resolved && st.gate.x <= st.player.x + st.player.w) {
            st.gate.resolved = true;
            const playerIsHigh = st.player.y + st.player.h / 2 < GROUND - 85;
            const ok = playerIsHigh === st.gate.correctIsTop;
            if (ok) {
              st.score += 180;
              st.shieldTimer = 180;
              st.shake = 7;
              arcadeAudio.powerup();
              spawnParticles(st.player.x + 20, st.player.y + 20, "#F0B232", 24);
              st.floatingText.push({ x: st.player.x, y: st.player.y - 20, text: "+180 PERISAI ILMU!", life: 55, color: "#F0B232" });
            } else {
              st.shake = 10;
              arcadeAudio.hit();
              st.floatingText.push({ x: st.player.x, y: st.player.y - 20, text: "KURANG TEPAT!", life: 50, color: "#fb7185" });
            }
          }
          if (st.gate.x < -140) st.gate.active = false;
        }

        // Update obstacles & collision
        for (const o of st.obstacles) {
          o.x -= st.speed;
          const hit =
            st.player.x + 6 < o.x + o.w - 4 &&
            st.player.x + st.player.w - 6 > o.x + 4 &&
            st.player.y + 4 < o.y + o.h - 4 &&
            st.player.y + st.player.h - 4 > o.y + 4;
          if (hit) {
            if (st.shieldTimer > 0) {
              o.x = -200;
              st.shake = 6;
              arcadeAudio.brickBreak();
              spawnParticles(st.player.x + 20, st.player.y + 20, "#34d399", 16);
            } else {
              st.running = false;
              st.shake = 14;
              arcadeAudio.gameOver();
              spawnParticles(st.player.x + 17, st.player.y + 20, "#f43f5e", 26);
              const finalScore = Math.floor(st.score);
              setScore(finalScore);
              setBest((prev) => {
                const next = Math.max(prev, finalScore);
                localStorage.setItem("snp_runner_best", String(next));
                return next;
              });
              setPhase("gameover");
            }
          }
        }
        st.obstacles = st.obstacles.filter((o) => o.x > -90);

        // Update coins
        for (const c of st.coins) {
          c.x -= st.speed;
          if (!c.collected) {
            const dx = st.player.x + st.player.w / 2 - c.x;
            const dy = st.player.y + st.player.h / 2 - c.y;
            if (Math.hypot(dx, dy) < c.r + 22) {
              c.collected = true;
              st.score += 35;
              arcadeAudio.coin();
              spawnParticles(c.x, c.y, "#F0B232", 10);
              st.floatingText.push({ x: c.x, y: c.y - 10, text: `+35 ${c.label}`, life: 36, color: "#fde047" });
            }
          }
        }
        st.coins = st.coins.filter((c) => !c.collected && c.x > -40);

        if (st.frame % 6 === 0) setScore(Math.floor(st.score));
      }

      // Particles & floating texts
      for (const p of st.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.25;
        p.life -= 1;
      }
      st.particles = st.particles.filter((p) => p.life > 0);
      for (const ft of st.floatingText) {
        ft.y -= 1.2;
        ft.life -= 1;
      }
      st.floatingText = st.floatingText.filter((ft) => ft.life > 0);

      // DRAW
      ctx.save();
      if (st.shake > 0.5) {
        ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      }

      // Illustrated Parallax Backdrop
      if (bgImg.complete && bgImg.naturalWidth > 0) {
        const scrollX = (st.frame * 1.4) % W;
        ctx.drawImage(bgImg, -scrollX, 0, W, GROUND);
        ctx.drawImage(bgImg, W - scrollX, 0, W, GROUND);
        ctx.fillStyle = "rgba(2, 30, 22, 0.35)";
        ctx.fillRect(0, 0, W, GROUND);
      } else {
        const grad = ctx.createLinearGradient(0, 0, 0, H);
        grad.addColorStop(0, "#022c22");
        grad.addColorStop(0.65, "#065f46");
        grad.addColorStop(1, "#064e3b");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // Stars & crescent moon
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      for (let i = 0; i < 24; i++) {
        const sx = ((i * 97 - st.frame * 0.3) % W + W) % W;
        const sy = 24 + (i * 31) % 130;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.fillStyle = "#F0B232";
      ctx.beginPath();
      ctx.arc(690, 62, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#03382b";
      ctx.beginPath();
      ctx.arc(700, 56, 19, 0, Math.PI * 2);
      ctx.fill();

      // Parallax Mosque Silhouette
      ctx.fillStyle = "rgba(2, 44, 34, 0.55)";
      for (let i = 0; i < 5; i++) {
        const bx = ((i * 220 - st.frame * 1.1) % (W + 220) + (W + 220)) % (W + 220) - 110;
        ctx.fillRect(bx, GROUND - 55, 80, 55);
        ctx.beginPath();
        ctx.arc(bx + 40, GROUND - 55, 34, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(bx + 86, GROUND - 95, 14, 95);
      }

      // Ground
      ctx.fillStyle = "#047857";
      ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(0, GROUND, W, 4);

      // Knowledge Gate (Top vs Bottom)
      if (st.gate.active) {
        ctx.fillStyle = "rgba(15,23,42,0.88)";
        ctx.fillRect(140, 14, 520, 44);
        ctx.strokeStyle = "#F0B232";
        ctx.lineWidth = 2;
        ctx.strokeRect(140, 14, 520, 44);
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(`GERBANG ILMU: ${st.gate.question}`, 400, 41);

        // Top choice (Jump)
        ctx.fillStyle = "rgba(16, 185, 129, 0.88)";
        ctx.fillRect(st.gate.x, GROUND - 175, 128, 66);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(st.gate.x, GROUND - 175, 128, 66);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText("⬆ LOMPAT", st.gate.x + 64, GROUND - 154);
        ctx.fillText(st.gate.topLabel, st.gate.x + 64, GROUND - 130);

        // Bottom choice (Run)
        ctx.fillStyle = "rgba(212, 175, 55, 0.92)";
        ctx.fillRect(st.gate.x, GROUND - 72, 128, 66);
        ctx.strokeStyle = "#fff";
        ctx.strokeRect(st.gate.x, GROUND - 72, 128, 66);
        ctx.fillStyle = "#0f172a";
        ctx.fillText("⬇ BAWAH", st.gate.x + 64, GROUND - 50);
        ctx.fillText(st.gate.bottomLabel, st.gate.x + 64, GROUND - 26);
      }

      // Coins
      for (const c of st.coins) {
        ctx.fillStyle = "#F0B232";
        ctx.beginPath();
        ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#fef08a";
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.fillStyle = "#064e3b";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("★", c.x, c.y + 4);
      }

      // Obstacles
      for (const o of st.obstacles) {
        ctx.fillStyle = o.aerial ? "#be123c" : "#e11d48";
        ctx.beginPath();
        ctx.roundRect(o.x, o.y, o.w, o.h, 8);
        ctx.fill();
        ctx.strokeStyle = "#fda4af";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(o.label, o.x + o.w / 2, o.y + o.h / 2 + 4);
      }

      // Player Character (Pelajar Runner)
      const p = st.player;
      if (st.shieldTimer > 0) {
        ctx.strokeStyle = "#34d399";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, 34, 0, Math.PI * 2);
        ctx.stroke();
      }
      // Body
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.roundRect(p.x, p.y + 12, p.w, p.h - 12, 8);
      ctx.fill();
      // Emerald vest
      ctx.fillStyle = "#006B3F";
      ctx.fillRect(p.x + 4, p.y + 18, p.w - 8, Math.max(8, p.h - 24));
      // Head + Peci
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + 8, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(p.x + 6, p.y - 4, p.w - 12, 7);

      // Particles
      for (const pt of st.particles) {
        ctx.globalAlpha = Math.max(0, pt.life / 35);
        ctx.fillStyle = pt.color;
        ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
      }
      ctx.globalAlpha = 1;

      // Floating text
      for (const ft of st.floatingText) {
        ctx.globalAlpha = Math.max(0, ft.life / 45);
        ctx.fillStyle = ft.color;
        ctx.font = "bold 13px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;

      ctx.restore();
      animId = requestAnimationFrame(loop);
    }

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold">
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-kemenag-50 px-3 py-1 text-kemenag-800">
            Skor: {score}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-amber-900">
            <Trophy className="h-3.5 w-3.5" /> Rekor: {best}
          </span>
        </div>
        <button
          onClick={() => {
            const next = !muted;
            setMuted(next);
            arcadeAudio.muted = next;
          }}
          className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-slate-600"
        >
          {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          <span>{muted ? "Suara Mati" : "Suara Aktif"}</span>
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border-2 border-kemenag-700/30 bg-slate-950 shadow-xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={360}
          onPointerDown={() => {
            if (phase !== "playing") startGame();
            else doJump();
          }}
          className="block w-full cursor-pointer select-none touch-none"
        />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/65 p-4 text-center text-white backdrop-blur-[2px]">
            <h3 className="text-xl font-black text-gold-400 sm:text-2xl">
              {phase === "ready" ? "FASTABIQUL RUNNER" : "PERMAINAN SELESAI!"}
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-200">
              {phase === "ready"
                ? "Lompati rintangan sifat tercela (Riyā', Hasad, Ghaḍab), kumpulkan bintang kebaikan, dan pilih jalur benar saat Gerbang Ilmu muncul!"
                : `Skor akhir kamu: ${score} poin (Rekor: ${best})`}
            </p>
            <button
              onClick={startGame}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-2.5 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-gold-400"
            >
              {phase === "ready" ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              <span>{phase === "ready" ? "MULAI LARI (SPASI / TAP)" : "MAIN LAGI"}</span>
            </button>
          </div>
        )}
      </div>

      {/* Kontrol sentuh mobile */}
      <div className="grid grid-cols-2 gap-2 sm:hidden">
        <button
          type="button"
          onTouchStart={(e) => { e.preventDefault(); doJump(); }}
          onClick={doJump}
          className="rounded-2xl bg-kemenag-600 py-3.5 text-xs font-extrabold text-white active:scale-95"
        >
          ⬆ LOMPAT / DOUBLE JUMP
        </button>
        <button
          type="button"
          onTouchStart={(e) => { e.preventDefault(); setDuck(true); }}
          onTouchEnd={() => setDuck(false)}
          onMouseDown={() => setDuck(true)}
          onMouseUp={() => setDuck(false)}
          className="rounded-2xl bg-slate-800 py-3.5 text-xs font-extrabold text-white active:scale-95"
        >
          ⬇ MERUNDUK
        </button>
      </div>
      <p className="hidden text-center text-[11px] text-slate-500 sm:block">
        Kontrol Keyboard: <strong>Spasi / ↑</strong> untuk Lompat (bisa 2x di udara), <strong>↓</strong> untuk Merunduk.
      </p>
    </div>
  );
}
