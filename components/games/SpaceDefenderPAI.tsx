"use client";

import { useEffect, useRef, useState } from "react";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { Heart, Play, RotateCcw, Trophy } from "lucide-react";

interface Bullet {
  x: number;
  y: number;
  vy: number;
}

interface FallingEntity {
  x: number;
  y: number;
  vy: number;
  r: number;
  label: string;
  isHazard: boolean;
  hp: number;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

const HAZARDS = ["RIYĀ'", "HASAD", "GHAḌAB", "RIBA", "HOAKS", "ZINA", "FITNAH", "TAKBUR"];
const BLESSINGS = ["IKHLAS", "SYAJĀ'AH", "TAWAKAL", "ILMU", "AMANAH", "JUJUR", "SABAR", "QANA'AH"];

export function SpaceDefenderPAI() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [best, setBest] = useState(0);

  const stRef = useRef({
    running: false,
    shipX: 400,
    targetX: 400,
    score: 0,
    lives: 3,
    combo: 0,
    frame: 0,
    shake: 0,
    keys: { left: false, right: false },
    bullets: [] as Bullet[],
    entities: [] as FallingEntity[],
    sparks: [] as Spark[],
    stars: Array.from({ length: 55 }, () => ({
      x: Math.random() * 800,
      y: Math.random() * 440,
      s: 0.6 + Math.random() * 2.2,
    })),
  });

  useEffect(() => {
    const saved = Number(localStorage.getItem("snp_defender_best") || "0");
    if (saved) setBest(saved);
  }, []);

  function explode(x: number, y: number, color: string, count = 14) {
    for (let i = 0; i < count; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 1.5 + Math.random() * 5;
      stRef.current.sparks.push({
        x,
        y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 24 + Math.random() * 14,
        color,
      });
    }
  }

  function startGame() {
    const st = stRef.current;
    st.running = true;
    st.shipX = 400;
    st.targetX = 400;
    st.score = 0;
    st.lives = 3;
    st.combo = 0;
    st.frame = 0;
    st.shake = 0;
    st.bullets = [];
    st.entities = [];
    st.sparks = [];
    setScore(0);
    setLives(3);
    setPhase("playing");
    arcadeAudio.powerup();
  }

  useEffect(() => {
    function kd(e: KeyboardEvent) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") stRef.current.keys.left = true;
      if (e.code === "ArrowRight" || e.code === "KeyD") stRef.current.keys.right = true;
    }
    function ku(e: KeyboardEvent) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") stRef.current.keys.left = false;
      if (e.code === "ArrowRight" || e.code === "KeyD") stRef.current.keys.right = false;
    }
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 440;
    const SHIP_Y = H - 46;
    let raf = 0;
    const bgImg = new Image();
    bgImg.src = "/images/games/bg-space.jpg";

    function loop() {
      if (!ctx) return;
      const st = stRef.current;
      if (st.running) {
        st.frame += 1;
        if (st.shake > 0.3) st.shake *= 0.85;

        // Move ship
        if (st.keys.left) st.targetX -= 8.5;
        if (st.keys.right) st.targetX += 8.5;
        st.targetX = Math.max(36, Math.min(W - 36, st.targetX));
        st.shipX += (st.targetX - st.shipX) * 0.28;

        // Auto-fire laser
        if (st.frame % 13 === 0) {
          st.bullets.push({ x: st.shipX, y: SHIP_Y - 22, vy: -11 });
          arcadeAudio.laser();
        }

        // Spawn waves
        const spawnEvery = Math.max(26, 54 - Math.floor(st.score / 220));
        if (st.frame % spawnEvery === 0) {
          const isHazard = Math.random() < 0.68;
          st.entities.push({
            x: 55 + Math.random() * (W - 110),
            y: -28,
            vy: 1.7 + Math.random() * 1.4 + Math.min(2.2, st.score / 900),
            r: isHazard ? 28 : 24,
            label: isHazard
              ? HAZARDS[Math.floor(Math.random() * HAZARDS.length)]
              : BLESSINGS[Math.floor(Math.random() * BLESSINGS.length)],
            isHazard,
            hp: 1,
          });
        }

        // Move bullets
        for (const b of st.bullets) b.y += b.vy;
        st.bullets = st.bullets.filter((b) => b.y > -20);

        // Move entities & collisions
        for (const en of st.entities) {
          en.y += en.vy;

          // Bullet collision
          for (const b of st.bullets) {
            if (Math.hypot(b.x - en.x, b.y - en.y) < en.r + 6) {
              b.y = -999;
              if (en.isHazard) {
                en.hp = 0;
                st.combo += 1;
                st.score += 50 + Math.min(50, st.combo * 5);
                st.shake = 5;
                arcadeAudio.explosion();
                explode(en.x, en.y, "#fb7185", 16);
              } else {
                // Shot a blessing accidentally!
                en.hp = 0;
                st.combo = 0;
                st.shake = 4;
                arcadeAudio.hit();
                explode(en.x, en.y, "#fde047", 10);
              }
            }
          }

          // Ship collision
          if (en.hp > 0 && Math.hypot(st.shipX - en.x, SHIP_Y - en.y) < en.r + 22) {
            en.hp = 0;
            if (!en.isHazard) {
              // Caught blessing!
              st.score += 100;
              st.combo += 1;
              arcadeAudio.coin();
              explode(en.x, en.y, "#34d399", 18);
            } else {
              // Hit by hazard!
              st.lives -= 1;
              st.combo = 0;
              st.shake = 12;
              arcadeAudio.explosion();
              explode(st.shipX, SHIP_Y, "#f43f5e", 24);
              setLives(st.lives);
            }
          }

          // Passed bottom
          if (en.hp > 0 && en.y > H + 30) {
            en.hp = 0;
            if (en.isHazard) {
              st.lives -= 1;
              st.combo = 0;
              st.shake = 8;
              arcadeAudio.hit();
              setLives(st.lives);
            }
          }
        }

        st.entities = st.entities.filter((e) => e.hp > 0);

        if (st.lives <= 0) {
          st.running = false;
          arcadeAudio.gameOver();
          setScore(st.score);
          setBest((prev) => {
            const next = Math.max(prev, st.score);
            localStorage.setItem("snp_defender_best", String(next));
            return next;
          });
          setPhase("gameover");
        } else if (st.frame % 5 === 0) {
          setScore(st.score);
        }
      }

      // Update stars & sparks
      for (const s of st.stars) {
        s.y += s.s;
        if (s.y > H) {
          s.y = 0;
          s.x = Math.random() * W;
        }
      }
      for (const sp of st.sparks) {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 1;
      }
      st.sparks = st.sparks.filter((sp) => sp.life > 0);

      // DRAW
      ctx.save();
      if (st.shake > 0.5) {
        ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      }

      if (bgImg.complete && bgImg.naturalWidth > 0) {
        const sy = (st.frame * 0.7) % H;
        ctx.drawImage(bgImg, 0, sy, W, H);
        ctx.drawImage(bgImg, 0, sy - H, W, H);
        ctx.fillStyle = "rgba(4, 13, 20, 0.42)";
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.fillStyle = "#040d14";
        ctx.fillRect(0, 0, W, H);
      }

      // Stars
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      for (const s of st.stars) {
        ctx.fillRect(s.x, s.y, s.s, s.s);
      }

      // Bullets
      ctx.fillStyle = "#34d399";
      for (const b of st.bullets) {
        ctx.fillRect(b.x - 2.5, b.y - 10, 5, 16);
      }

      // Entities
      for (const en of st.entities) {
        ctx.beginPath();
        ctx.arc(en.x, en.y, en.r, 0, Math.PI * 2);
        ctx.fillStyle = en.isHazard ? "#be123c" : "#059669";
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = en.isHazard ? "#fda4af" : "#F0B232";
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(en.label, en.x, en.y + 4);
      }

      // Player Ship
      const sx = st.shipX;
      ctx.fillStyle = "#006B3F";
      ctx.beginPath();
      ctx.moveTo(sx, SHIP_Y - 24);
      ctx.lineTo(sx + 24, SHIP_Y + 18);
      ctx.lineTo(sx, SHIP_Y + 10);
      ctx.lineTo(sx - 24, SHIP_Y + 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#F0B232";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Thruster flame
      ctx.fillStyle = st.frame % 4 < 2 ? "#F0B232" : "#34d399";
      ctx.beginPath();
      ctx.arc(sx, SHIP_Y + 18, 6, 0, Math.PI * 2);
      ctx.fill();

      // Sparks
      for (const sp of st.sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 35);
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x, sp.y, 4, 4);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!stRef.current.running) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 800;
    stRef.current.targetX = x;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold">
        <div className="flex items-center gap-1 text-rose-600">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart
              key={i}
              className={`h-4 w-4 ${i < lives ? "fill-rose-500 text-rose-500" : "text-slate-300"}`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-kemenag-50 px-3 py-1 text-kemenag-800">
            Skor: {score}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-amber-900">
            <Trophy className="h-3.5 w-3.5" /> Rekor: {best}
          </span>
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border-2 border-kemenag-700/30 bg-slate-950 shadow-xl">
        <canvas
          ref={canvasRef}
          width={800}
          height={440}
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          className="block w-full cursor-crosshair select-none touch-none"
        />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 p-4 text-center text-white backdrop-blur-[2px]">
            <h3 className="text-xl font-black text-gold-400 sm:text-2xl">
              {phase === "ready" ? "PENJAGA AKAL: SPACE DEFENDER" : "MISI SELESAI!"}
            </h3>
            <p className="mt-1 max-w-md text-xs text-slate-200">
              {phase === "ready"
                ? "Tembak meteor MERAH sifat tercela (Riyā', Hasad, Hoaks, Riba) sebelum jatuh! Tangkap kapsul HIJAU akhlak mulia (+100 poin) tanpa menembaknya!"
                : `Skor akhir kamu: ${score} poin (Rekor: ${best})`}
            </p>
            <button
              onClick={startGame}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-gold-400"
            >
              {phase === "ready" ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              <span>{phase === "ready" ? "MULAI TEMPUR" : "MAIN LAGI"}</span>
            </button>
          </div>
        )}
      </div>
      <p className="text-center text-[11px] text-slate-500">
        Geser jari / mouse di layar atau gunakan tombol <strong>← / →</strong> untuk mengendalikan pesawat.
      </p>
    </div>
  );
}
