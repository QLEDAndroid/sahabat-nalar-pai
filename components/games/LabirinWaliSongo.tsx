"use client";

import { useEffect, useRef, useState } from "react";
import { arcadeAudio } from "@/lib/arcadeAudio";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Play,
  RotateCcw,
  Trophy,
} from "lucide-react";

// 15x11 classic maze: 1=wall, 0=dot, 2=kitab powerup, 3=empty
const BASE_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,0,0,0,0,1,0,1,0,0,0,0,2,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,1,1,3,1,1,0,1,1,0,1],
  [1,0,0,0,0,1,3,3,3,1,0,0,0,0,1],
  [1,0,1,1,0,1,1,1,1,1,0,1,1,0,1],
  [1,0,0,0,0,0,0,3,0,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,0,1,0,1,1,1,0,1],
  [1,2,0,0,0,0,0,0,0,0,0,0,0,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const HIKMAH_LIST = [
  "Sunan Kalijaga berdakwah damai lewat seni wayang & tembang Jawa.",
  "Sunan Ampel mengajarkan falsafah Moh Limo (menolak 5 perbuatan tercela).",
  "Hifzhul 'Aql: Menjaga akal dengan ilmu dan menjauhi narkoba.",
  "Fastabiqul Khairāt: Berlomba dalam kebaikan secara ikhlas.",
];

export function LabirinWaliSongo() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "win" | "gameover">("ready");
  const [score, setScore] = useState(0);
  const [hikmah, setHikmah] = useState("");

  const stRef = useRef({
    running: false,
    grid: BASE_MAP.map((r) => [...r]),
    player: { x: 7, y: 7, dx: 0, dy: 0, nextDx: 0, nextDy: 0 },
    ghosts: [
      { x: 6, y: 5, dx: 1, dy: 0, color: "#f43f5e", name: "HASAD" },
      { x: 7, y: 5, dx: -1, dy: 0, color: "#a855f7", name: "RIYĀ'" },
      { x: 8, y: 5, dx: 0, dy: -1, color: "#f97316", name: "MALAS" },
    ],
    powerTimer: 0,
    score: 0,
    tick: 0,
  });

  function startGame() {
    const st = stRef.current;
    st.running = true;
    st.grid = BASE_MAP.map((r) => [...r]);
    st.player = { x: 7, y: 7, dx: 0, dy: 0, nextDx: 0, nextDy: 0 };
    st.ghosts = [
      { x: 6, y: 5, dx: 1, dy: 0, color: "#f43f5e", name: "HASAD" },
      { x: 7, y: 5, dx: -1, dy: 0, color: "#a855f7", name: "RIYĀ'" },
      { x: 8, y: 5, dx: 0, dy: -1, color: "#f97316", name: "MALAS" },
    ];
    st.powerTimer = 0;
    st.score = 0;
    st.tick = 0;
    setScore(0);
    setHikmah("");
    setPhase("playing");
    arcadeAudio.powerup();
  }

  function setDir(dx: number, dy: number) {
    stRef.current.player.nextDx = dx;
    stRef.current.player.nextDy = dy;
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); setDir(0, -1); }
      if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); setDir(0, 1); }
      if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); setDir(-1, 0); }
      if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); setDir(1, 0); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const TILE = 42;
    const COLS = 15;
    const ROWS = 11;
    let raf = 0;

    function canWalk(x: number, y: number) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
      return stRef.current.grid[y][x] !== 1;
    }

    function stepLogic() {
      const st = stRef.current;
      if (!st.running) return;
      st.tick += 1;
      if (st.powerTimer > 0) st.powerTimer -= 1;

      // Move player every 8 frames
      if (st.tick % 8 === 0) {
        const p = st.player;
        if (canWalk(p.x + p.nextDx, p.y + p.nextDy)) {
          p.dx = p.nextDx;
          p.dy = p.nextDy;
        }
        if (canWalk(p.x + p.dx, p.y + p.dy)) {
          p.x += p.dx;
          p.y += p.dy;
        }

        const cell = st.grid[p.y][p.x];
        if (cell === 0) {
          st.grid[p.y][p.x] = 3;
          st.score += 15;
          setScore(st.score);
          arcadeAudio.coin();
        } else if (cell === 2) {
          st.grid[p.y][p.x] = 3;
          st.score += 100;
          st.powerTimer = 320;
          setScore(st.score);
          setHikmah(HIKMAH_LIST[Math.floor(Math.random() * HIKMAH_LIST.length)]);
          arcadeAudio.powerup();
        }

        // Check win
        const remaining = st.grid.flat().filter((c) => c === 0 || c === 2).length;
        if (remaining === 0) {
          st.running = false;
          arcadeAudio.win();
          setPhase("win");
        }
      }

      // Move ghosts every 13 frames
      if (st.tick % 13 === 0) {
        for (const g of st.ghosts) {
          const dirs = [
            { dx: 1, dy: 0 },
            { dx: -1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: 0, dy: -1 },
          ].filter((d) => canWalk(g.x + d.dx, g.y + d.dy));

          // Prefer continuing or chasing player (or fleeing when powered)
          if (dirs.length > 0) {
            const scored = dirs.map((d) => {
              const nx = g.x + d.dx;
              const ny = g.y + d.dy;
              const dist = Math.hypot(nx - st.player.x, ny - st.player.y);
              return { d, score: st.powerTimer > 0 ? dist : -dist };
            });
            scored.sort((a, b) => b.score - a.score);
            const pick = Math.random() < 0.72 ? scored[0].d : dirs[Math.floor(Math.random() * dirs.length)];
            g.dx = pick.dx;
            g.dy = pick.dy;
            g.x += g.dx;
            g.y += g.dy;
          }
        }
      }

      // Check ghost collision
      for (const g of st.ghosts) {
        if (g.x === st.player.x && g.y === st.player.y) {
          if (st.powerTimer > 0) {
            st.score += 150;
            setScore(st.score);
            arcadeAudio.explosion();
            g.x = 7;
            g.y = 5;
          } else {
            st.running = false;
            arcadeAudio.gameOver();
            setPhase("gameover");
          }
        }
      }
    }

    function draw() {
      if (!ctx) return;
      stepLogic();
      const st = stRef.current;
      ctx.fillStyle = "#031b14";
      ctx.fillRect(0, 0, COLS * TILE, ROWS * TILE);

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const val = st.grid[r][c];
          const x = c * TILE;
          const y = r * TILE;
          if (val === 1) {
            ctx.fillStyle = "#065f46";
            ctx.beginPath();
            ctx.roundRect(x + 2, y + 2, TILE - 4, TILE - 4, 7);
            ctx.fill();
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 1.5;
            ctx.stroke();
          } else if (val === 0) {
            ctx.fillStyle = "#F0B232";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, 4.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (val === 2) {
            const pulse = 9 + Math.sin(st.tick * 0.15) * 2.5;
            ctx.fillStyle = "#34d399";
            ctx.beginPath();
            ctx.arc(x + TILE / 2, y + TILE / 2, pulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#022c22";
            ctx.font = "bold 11px sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("★", x + TILE / 2, y + TILE / 2 + 4);
          }
        }
      }

      // Draw Player (Pelita Hero)
      const px = st.player.x * TILE + TILE / 2;
      const py = st.player.y * TILE + TILE / 2;
      ctx.fillStyle = st.powerTimer > 0 ? "#34d399" : "#F0B232";
      ctx.beginPath();
      ctx.arc(px, py, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw Ghosts
      for (const g of st.ghosts) {
        const gx = g.x * TILE + TILE / 2;
        const gy = g.y * TILE + TILE / 2;
        ctx.fillStyle = st.powerTimer > 0 ? "#38bdf8" : g.color;
        ctx.beginPath();
        ctx.arc(gx, gy - 2, 13, Math.PI, 0);
        ctx.lineTo(gx + 13, gy + 12);
        ctx.lineTo(gx - 13, gy + 12);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(gx - 4, gy - 3, 2.5, 0, Math.PI * 2);
        ctx.arc(gx + 4, gy - 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-50 px-3 py-1 text-kemenag-800">
          <Trophy className="h-3.5 w-3.5 text-gold-500" /> Skor: {score}
        </span>
        {hikmah && (
          <span className="rounded-full bg-gold-100 px-3 py-1 text-[11px] text-amber-900">
            ✨ {hikmah}
          </span>
        )}
      </div>

      <div className="relative mx-auto max-w-[630px] overflow-hidden rounded-3xl border-2 border-kemenag-700/30 bg-slate-950 shadow-xl">
        <canvas
          ref={canvasRef}
          width={630}
          height={462}
          className="block w-full select-none"
        />

        {phase !== "playing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 p-4 text-center text-white backdrop-blur-[2px]">
            <h3 className="text-xl font-black text-gold-400">
              {phase === "ready"
                ? "LABIRIN WALI SONGO"
                : phase === "win"
                ? "LABIRIN TERSELESAIKAN!"
                : "TERTANGKAP BAYANGAN!"}
            </h3>
            <p className="mt-1 max-w-sm text-xs text-slate-200">
              {phase === "ready"
                ? "Kumpulkan seluruh Pelita Ilmu di labirin sambil menghindari pengejar Hasad, Riyā', dan Malas. Ambil Bintang Kitab di sudut untuk membalikkan keadaan!"
                : `Total Skor: ${score} poin`}
            </p>
            <button
              onClick={startGame}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-gold-400"
            >
              {phase === "ready" ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
              <span>{phase === "ready" ? "MASUK LABIRIN" : "MAIN LAGI"}</span>
            </button>
          </div>
        )}
      </div>

      {/* D-Pad sentuh untuk HP */}
      <div className="mx-auto grid w-44 grid-cols-3 gap-1.5 sm:hidden">
        <div />
        <button onClick={() => setDir(0, -1)} className="flex h-12 items-center justify-center rounded-xl bg-kemenag-600 text-white active:scale-95">
          <ArrowUp className="h-5 w-5" />
        </button>
        <div />
        <button onClick={() => setDir(-1, 0)} className="flex h-12 items-center justify-center rounded-xl bg-kemenag-600 text-white active:scale-95">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button onClick={() => setDir(0, 1)} className="flex h-12 items-center justify-center rounded-xl bg-kemenag-600 text-white active:scale-95">
          <ArrowDown className="h-5 w-5" />
        </button>
        <button onClick={() => setDir(1, 0)} className="flex h-12 items-center justify-center rounded-xl bg-kemenag-600 text-white active:scale-95">
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>
      <p className="hidden text-center text-[11px] text-slate-500 sm:block">
        Gunakan tombol <strong>W A S D</strong> atau <strong>Panah</strong> untuk bergerak.
      </p>
    </div>
  );
}
