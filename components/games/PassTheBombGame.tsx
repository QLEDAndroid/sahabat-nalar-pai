"use client";

import { useEffect, useState } from "react";
import { TUG_QUESTIONS } from "@/data/game-bank";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { Flame, Heart, Play, RotateCcw, Trophy } from "lucide-react";

const INITIAL_TEAMS = [
  { id: 0, name: "Kelompok Hijau", bg: "bg-emerald-600", lives: 3 },
  { id: 1, name: "Kelompok Emas", bg: "bg-amber-500", lives: 3 },
  { id: 2, name: "Kelompok Biru", bg: "bg-sky-600", lives: 3 },
  { id: 3, name: "Kelompok Merah", bg: "bg-rose-600", lives: 3 },
];

export function PassTheBombGame() {
  const [teams, setTeams] = useState(INITIAL_TEAMS);
  const [phase, setPhase] = useState<"ready" | "playing" | "boom" | "win">("ready");
  const [holder, setHolder] = useState(0);
  const [fuse, setFuse] = useState(14);
  const [qIdx, setQIdx] = useState(0);
  const [feedback, setFeedback] = useState("");

  const currentQ = TUG_QUESTIONS[qIdx % TUG_QUESTIONS.length];
  const aliveTeams = teams.filter((t) => t.lives > 0);

  function nextAlive(fromIdx: number, list = teams): number {
    for (let step = 1; step <= list.length; step++) {
      const idx = (fromIdx + step) % list.length;
      if (list[idx].lives > 0) return idx;
    }
    return fromIdx;
  }

  function startGame() {
    setTeams(INITIAL_TEAMS.map((t) => ({ ...t })));
    setHolder(0);
    setFuse(12 + Math.floor(Math.random() * 8));
    setQIdx(Math.floor(Math.random() * TUG_QUESTIONS.length));
    setFeedback("");
    setPhase("playing");
    arcadeAudio.powerup();
  }

  // Bomb countdown
  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      setFuse((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          arcadeAudio.explosion();
          setTeams((cur) => {
            const next = cur.map((tm, i) =>
              i === holder ? { ...tm, lives: Math.max(0, tm.lives - 1) } : tm
            );
            const survivors = next.filter((tm) => tm.lives > 0);
            if (survivors.length <= 1) {
              setPhase("win");
              setTimeout(() => arcadeAudio.win(), 450);
            } else {
              setPhase("boom");
              setFeedback(`💥 DUAR!! Bom meledak di ${cur[holder].name} (-1 Nyawa)!`);
              setTimeout(() => {
                setHolder(nextAlive(holder, next));
                setFuse(12 + Math.floor(Math.random() * 7));
                setQIdx((q) => (q + 1) % TUG_QUESTIONS.length);
                setFeedback("");
                setPhase("playing");
              }, 2000);
            }
            return next;
          });
          return 0;
        }
        if (prev <= 5) arcadeAudio.bounce();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, holder]);

  function handleAnswer(optIdx: number) {
    if (phase !== "playing") return;
    if (optIdx === currentQ.answerIndex) {
      arcadeAudio.coin();
      const nextH = nextAlive(holder);
      setFeedback(`⚡ AMAN! Bom dilempar estafet ke ${teams[nextH].name}!`);
      setHolder(nextH);
      setFuse((f) => Math.min(18, f + 3));
      setQIdx((q) => (q + 1) % TUG_QUESTIONS.length);
    } else {
      arcadeAudio.hit();
      setFuse((f) => Math.max(1, f - 3));
      setFeedback("Salah! Sumbu bom memendek -3 detik! Cepat jawab lagi!");
    }
  }

  const winner = aliveTeams[0];

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-2xl">
      <img
        src="/images/games/bomb.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/65 to-slate-950/90" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/25 px-3 py-1 text-[11px] font-extrabold text-rose-200 ring-1 ring-rose-400/50">
              <Flame className="h-3.5 w-3.5" /> ESTAFET 4 KELOMPOK • BOM WAKTU PAI
            </span>
            <h2 className="mt-1 text-2xl font-black">
              Jawab Cepat & Lempar Bom Sebelum Meledak!
            </h2>
          </div>
          <button
            onClick={startGame}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-5 py-2 text-xs font-extrabold text-slate-950 hover:bg-gold-400"
          >
            {phase === "ready" ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            <span>{phase === "ready" ? "Mulai Estafet!" : "Ulangi Game"}</span>
          </button>
        </div>

        {/* 4 Podium Kelompok */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {teams.map((t, i) => {
            const hasBomb = phase === "playing" && holder === i;
            const dead = t.lives <= 0;
            return (
              <div
                key={t.id}
                className={`rounded-2xl p-4 text-center transition ${
                  dead
                    ? "bg-white/5 opacity-40"
                    : hasBomb
                    ? `${t.bg} ring-4 ring-gold-400 scale-[1.04] shadow-xl`
                    : "bg-white/10 ring-1 ring-white/15"
                }`}
              >
                <div className="text-sm font-black">{t.name}</div>
                <div className="mt-2 flex justify-center gap-1">
                  {Array.from({ length: 3 }).map((_, h) => (
                    <Heart
                      key={h}
                      className={`h-4 w-4 ${
                        h < t.lives ? "fill-rose-400 text-rose-400" : "text-slate-600"
                      }`}
                    />
                  ))}
                </div>
                {hasBomb && (
                  <div className="mt-2 animate-bounce rounded-full bg-black/40 px-3 py-1 text-xs font-black text-gold-300">
                    💣 BOM DI SINI! ({fuse}d)
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {phase === "ready" && (
          <div className="rounded-3xl bg-white/10 p-6 text-center text-sm text-slate-200 backdrop-blur">
            4 Kelompok duduk melingkar. Kelompok yang memegang bom harus cepat menjawab soal PAI agar bom terlempar ke kelompok berikutnya! Jawaban salah memendekkan sumbu -3 detik!
          </div>
        )}

        {phase === "boom" && (
          <div className="animate-pulse rounded-3xl bg-rose-600/80 p-8 text-center text-2xl font-black text-white shadow-2xl">
            {feedback}
          </div>
        )}

        {phase === "playing" && (
          <div className="rounded-3xl bg-white p-6 text-slate-900 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={`rounded-full px-3.5 py-1 text-xs font-extrabold text-white ${teams[holder].bg}`}>
                GILIRAN: {teams[holder].name.toUpperCase()}
              </span>
              <span className={`rounded-full px-4 py-1 text-sm font-black ${fuse <= 4 ? "animate-pulse bg-rose-600 text-white" : "bg-amber-100 text-amber-900"}`}>
                💣 Sisa Sumbu: {fuse} detik
              </span>
            </div>

            <p className="mt-4 text-xl font-black leading-snug">{currentQ.question}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="flex items-center gap-3 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-sm font-extrabold text-slate-800 transition hover:border-kemenag-600 hover:bg-kemenag-50 active:scale-95"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kemenag-600 text-xs text-white">
                    {["A", "B", "C", "D"][idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>

            {feedback && (
              <p className="mt-3 text-center text-xs font-extrabold text-kemenag-700">
                {feedback}
              </p>
            )}
          </div>
        )}

        {phase === "win" && winner && (
          <div className="rounded-3xl bg-gold-500/25 p-8 text-center ring-2 ring-gold-400">
            <Trophy className="mx-auto h-14 w-14 text-gold-400" />
            <div className="mt-2 text-3xl font-black text-gold-300">
              PEMENANG TERAKHIR: {winner.name.toUpperCase()}!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
