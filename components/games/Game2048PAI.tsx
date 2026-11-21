"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { RotateCcw, Trophy } from "lucide-react";

const TILE_META: Record<number, { label: string; bg: string; fg: string }> = {
  2: { label: "Niat", bg: "bg-emerald-50", fg: "text-emerald-900" },
  4: { label: "Ilmu", bg: "bg-emerald-100", fg: "text-emerald-950" },
  8: { label: "Amal", bg: "bg-teal-200", fg: "text-teal-950" },
  16: { label: "Ikhlas", bg: "bg-emerald-400", fg: "text-white" },
  32: { label: "Syajā'ah", bg: "bg-emerald-600", fg: "text-white" },
  64: { label: "Tawakal", bg: "bg-kemenag-700", fg: "text-white" },
  128: { label: "Hifzhul Māl", bg: "bg-amber-400", fg: "text-slate-950" },
  256: { label: "Hifzhun Nasl", bg: "bg-amber-500", fg: "text-slate-950" },
  512: { label: "Hifzhul 'Aql", bg: "bg-orange-500", fg: "text-white" },
  1024: { label: "Hifzhun Nafs", bg: "bg-rose-600", fg: "text-white" },
  2048: { label: "Hifzhud Dīn", bg: "bg-gradient-to-br from-gold-400 to-amber-600", fg: "text-slate-950" },
};

function createEmpty(): number[][] {
  return Array.from({ length: 4 }, () => [0, 0, 0, 0]);
}

function addRandom(board: number[][]): number[][] {
  const empty: [number, number][] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) empty.push([r, c]);
    }
  }
  if (empty.length === 0) return board;
  const [r, c] = empty[Math.floor(Math.random() * empty.length)];
  const next = board.map((row) => [...row]);
  next[r][c] = Math.random() < 0.9 ? 2 : 4;
  return next;
}

function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const nonZero = row.filter((v) => v !== 0);
  const out: number[] = [];
  let gained = 0;
  let i = 0;
  while (i < nonZero.length) {
    if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
      const merged = nonZero[i] * 2;
      out.push(merged);
      gained += merged;
      i += 2;
    } else {
      out.push(nonZero[i]);
      i += 1;
    }
  }
  while (out.length < 4) out.push(0);
  return { row: out, gained };
}

function rotateCW(board: number[][]): number[][] {
  const res = createEmpty();
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      res[c][3 - r] = board[r][c];
    }
  }
  return res;
}

function canMove(board: number[][]): boolean {
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (board[r][c] === 0) return true;
      if (c < 3 && board[r][c] === board[r][c + 1]) return true;
      if (r < 3 && board[r][c] === board[r + 1][c]) return true;
    }
  }
  return false;
}

export function Game2048PAI() {
  const [board, setBoard] = useState<number[][]>(() => addRandom(addRandom(createEmpty())));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const saved = Number(localStorage.getItem("snp_2048_best") || "0");
    if (saved) setBest(saved);
  }, []);

  function resetGame() {
    setBoard(addRandom(addRandom(createEmpty())));
    setScore(0);
    setGameOver(false);
    arcadeAudio.powerup();
  }

  const move = useCallback(
    (dir: "left" | "right" | "up" | "down") => {
      if (gameOver) return;
      const rotations = dir === "left" ? 0 : dir === "down" ? 1 : dir === "right" ? 2 : 3;
      let cur = board.map((r) => [...r]);
      for (let i = 0; i < rotations; i++) cur = rotateCW(cur);

      let gained = 0;
      const slid = cur.map((row) => {
        const res = slideRowLeft(row);
        gained += res.gained;
        return res.row;
      });

      let back = slid;
      for (let i = 0; i < (4 - rotations) % 4; i++) back = rotateCW(back);

      const changed = back.some((r, ri) => r.some((v, ci) => v !== board[ri][ci]));
      if (!changed) return;

      const withNew = addRandom(back);
      setBoard(withNew);

      if (gained > 0) {
        if (gained >= 128) arcadeAudio.powerup();
        else arcadeAudio.coin();
      } else {
        arcadeAudio.bounce();
      }

      const nextScore = score + gained;
      setScore(nextScore);
      setBest((prev) => {
        const b = Math.max(prev, nextScore);
        localStorage.setItem("snp_2048_best", String(b));
        return b;
      });

      if (!canMove(withNew)) {
        setGameOver(true);
        arcadeAudio.gameOver();
      }
    },
    [board, gameOver, score]
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); move("left"); }
      if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); move("right"); }
      if (e.code === "ArrowUp" || e.code === "KeyW") { e.preventDefault(); move("up"); }
      if (e.code === "ArrowDown" || e.code === "KeyS") { e.preventDefault(); move("down"); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-kemenag-50 px-3 py-1 text-kemenag-800">
            Skor: {score}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-100 px-3 py-1 text-amber-900">
            <Trophy className="h-3.5 w-3.5" /> Rekor: {best}
          </span>
        </div>
        <button
          onClick={resetGame}
          className="inline-flex items-center gap-1 rounded-full bg-kemenag-600 px-3.5 py-1.5 text-white hover:bg-kemenag-700"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Ulang</span>
        </button>
      </div>

      <div
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStart.current) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - touchStart.current.x;
          const dy = t.clientY - touchStart.current.y;
          touchStart.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
          if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
          else move(dy > 0 ? "down" : "up");
        }}
        className="relative select-none touch-none rounded-3xl bg-kemenag-900 p-3 shadow-xl"
      >
        <div className="grid grid-cols-4 gap-2.5">
          {board.flat().map((val, idx) => {
            const meta = TILE_META[val];
            return (
              <div
                key={idx}
                className={`flex aspect-square flex-col items-center justify-center rounded-2xl p-1 text-center transition-all duration-150 ${
                  val === 0
                    ? "bg-kemenag-800/60"
                    : `${meta?.bg || "bg-gold-500"} ${meta?.fg || "text-slate-950"} shadow-sm`
                }`}
              >
                {val > 0 && (
                  <>
                    <span className="text-base font-black leading-none sm:text-lg">
                      {val}
                    </span>
                    <span className="mt-1 text-[9px] font-extrabold leading-tight sm:text-[10px]">
                      {meta?.label || "Maqāṣid"}
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-slate-950/75 p-4 text-center text-white backdrop-blur-sm">
            <h3 className="text-xl font-black text-gold-400">Langkah Habis!</h3>
            <p className="mt-1 text-xs text-slate-200">Skor Akhir: {score}</p>
            <button
              onClick={resetGame}
              className="mt-4 rounded-full bg-gold-500 px-6 py-2 text-xs font-extrabold text-slate-950"
            >
              Main Lagi
            </button>
          </div>
        )}
      </div>

      <p className="text-center text-[11px] text-slate-500">
        Geser (swipe) di HP atau tekan <strong>Panah / WASD</strong> untuk menggabungkan tingkatan nilai dari <strong>Niat (2)</strong> hingga <strong>Hifzhud Dīn (2048)</strong>.
      </p>
    </div>
  );
}
