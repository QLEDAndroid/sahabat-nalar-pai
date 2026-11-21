"use client";

import { useState } from "react";
import { TUG_QUESTIONS } from "@/data/game-bank";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { Flag, Map, RotateCcw, Sparkles, Trophy, X } from "lucide-react";

const TEAMS = [
  { id: 0, name: "Kelompok Hijau", color: "#059669", bg: "bg-emerald-600", ring: "ring-emerald-400" },
  { id: 1, name: "Kelompok Emas", color: "#D97706", bg: "bg-amber-500", ring: "ring-amber-300" },
  { id: 2, name: "Kelompok Biru", color: "#0284C7", bg: "bg-sky-600", ring: "ring-sky-400" },
  { id: 3, name: "Kelompok Merah", color: "#E11D48", bg: "bg-rose-600", ring: "ring-rose-400" },
];

const REGIONS = [
  "Aceh", "Medan", "Pekanbaru", "Pangkalan Kerinci", "Padang", "Palembang",
  "Banten", "Cirebon", "Demak", "Kudus", "Gresik", "Surabaya",
  "Pontianak", "Banjarmasin", "Samarinda", "Makassar", "Manado", "Ternate",
  "Lombok", "Bali", "Kupang", "Ambon", "Sorong", "Jayapura",
];

interface RegionTile {
  idx: number;
  name: string;
  owner: number | null;
  bonus: boolean;
}

export function TerritoryCaptureGame() {
  const [tiles, setTiles] = useState<RegionTile[]>(() =>
    REGIONS.map((name, idx) => ({
      idx,
      name,
      owner: null,
      bonus: idx === 3 || idx === 8 || idx === 10 || idx === 15,
    }))
  );
  const [turn, setTurn] = useState(0);
  const [activeTile, setActiveTile] = useState<RegionTile | null>(null);
  const [qIdx, setQIdx] = useState(0);
  const [feedback, setFeedback] = useState("");

  const currentTeam = TEAMS[turn];
  const currentQ = TUG_QUESTIONS[qIdx % TUG_QUESTIONS.length];

  const scores = TEAMS.map((t) =>
    tiles.reduce((acc, tile) => acc + (tile.owner === t.id ? (tile.bonus ? 2 : 1) : 0), 0)
  );
  const allClaimed = tiles.every((t) => t.owner !== null);
  const winnerIdx = scores.indexOf(Math.max(...scores));

  function openTile(tile: RegionTile) {
    if (tile.owner !== null || activeTile) return;
    setActiveTile(tile);
    setQIdx(Math.floor(Math.random() * TUG_QUESTIONS.length));
    setFeedback("");
    arcadeAudio.bounce();
  }

  function handleAnswer(optIdx: number) {
    if (!activeTile || feedback) return;
    const ok = optIdx === currentQ.answerIndex;
    if (ok) {
      arcadeAudio.powerup();
      const next = tiles.map((t) =>
        t.idx === activeTile.idx ? { ...t, owner: turn } : t
      );
      setTiles(next);
      setFeedback(
        `🔥 BERHASIL! ${currentTeam.name} menguasai ${activeTile.name}${activeTile.bonus ? " (Wilayah Emas 2 Poin!)" : ""}!`
      );
      if (next.every((t) => t.owner !== null)) {
        setTimeout(() => arcadeAudio.win(), 500);
      }
    } else {
      arcadeAudio.hit();
      setFeedback(`Belum tepat! ${activeTile.name} masih bebas — giliran pindah!`);
    }

    setTimeout(() => {
      setActiveTile(null);
      setFeedback("");
      setTurn((t) => (t + 1) % TEAMS.length);
    }, 1250);
  }

  function resetGame() {
    setTiles(
      REGIONS.map((name, idx) => ({
        idx,
        name,
        owner: null,
        bonus: idx === 3 || idx === 8 || idx === 10 || idx === 15,
      }))
    );
    setTurn(0);
    setActiveTile(null);
    setFeedback("");
    arcadeAudio.powerup();
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-slate-900 p-5 text-white shadow-2xl">
      <img
        src="/images/games/territory.jpg"
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/60 to-slate-950/85" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-gold-400">
              <Map className="h-3.5 w-3.5" /> STRATEGI 4 KELOMPOK • PENAKLUK WILAYAH NUSANTARA
            </span>
            <h2 className="mt-1 text-2xl font-black">
              Kuasai Peta Ilmu Nusantara!
            </h2>
          </div>
          <button
            onClick={resetGame}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-2 text-xs font-bold hover:bg-white/25"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Ulangi Peta</span>
          </button>
        </div>

        {/* Skor 4 Kelompok + Penanda Giliran */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {TEAMS.map((t, i) => {
            const isTurn = !allClaimed && turn === i;
            return (
              <div
                key={t.id}
                className={`rounded-2xl p-3 text-center transition ${
                  isTurn
                    ? `${t.bg} ring-4 ${t.ring} scale-[1.03] shadow-lg`
                    : "bg-white/10 ring-1 ring-white/15"
                }`}
              >
                <div className="text-xs font-extrabold">{t.name}</div>
                <div className="text-2xl font-black">{scores[i]} Poin</div>
                {isTurn && (
                  <span className="mt-1 inline-block rounded-full bg-black/30 px-2.5 py-0.5 text-[10px] font-extrabold">
                    ★ GILIRAN MEMILIH
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {allClaimed && (
          <div className="rounded-3xl bg-gold-500/25 p-5 text-center ring-2 ring-gold-400">
            <Trophy className="mx-auto h-11 w-11 text-gold-400" />
            <div className="mt-1 text-2xl font-black text-gold-300">
              JUARA NUSANTARA: {TEAMS[winnerIdx].name.toUpperCase()} ({scores[winnerIdx]} POIN)!
            </div>
          </div>
        )}

        {/* Peta Grid 24 Wilayah */}
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6">
          {tiles.map((tile) => {
            const ownerTeam = tile.owner !== null ? TEAMS[tile.owner] : null;
            return (
              <button
                key={tile.idx}
                disabled={tile.owner !== null}
                onClick={() => openTile(tile)}
                className={`flex min-h-[76px] flex-col items-center justify-center rounded-2xl border p-2.5 text-center transition ${
                  ownerTeam
                    ? `${ownerTeam.bg} border-white/40 text-white shadow-md`
                    : tile.bonus
                    ? "border-gold-400 bg-gold-500/20 text-gold-200 hover:scale-105 hover:bg-gold-500/35"
                    : "border-white/20 bg-slate-900/75 text-white hover:scale-105 hover:border-kemenag-400 hover:bg-kemenag-800/70"
                }`}
              >
                {ownerTeam ? (
                  <Flag className="mb-1 h-4 w-4 text-white" />
                ) : tile.bonus ? (
                  <Sparkles className="mb-1 h-4 w-4 text-gold-300" />
                ) : null}
                <span className="text-xs font-extrabold leading-tight">
                  {tile.name}
                </span>
                {tile.bonus && !ownerTeam && (
                  <span className="mt-0.5 rounded-full bg-gold-500 px-1.5 py-0.5 text-[9px] font-black text-slate-950">
                    2x POIN
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Tantangan Wilayah */}
        {activeTile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-7 text-slate-900 shadow-2xl">
              <div className="flex items-center justify-between">
                <span
                  className={`rounded-full px-3.5 py-1 text-xs font-extrabold text-white ${currentTeam.bg}`}
                >
                  {currentTeam.name} • Rebut {activeTile.name}
                </span>
                <button
                  onClick={() => setActiveTile(null)}
                  className="rounded-full bg-slate-100 p-1.5 text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-4 text-xl font-black leading-snug">
                {currentQ.question}
              </p>

              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    disabled={!!feedback}
                    onClick={() => handleAnswer(i)}
                    className="flex items-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-left text-sm font-extrabold text-slate-800 transition hover:border-kemenag-600 hover:bg-kemenag-50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-kemenag-600 text-xs text-white">
                      {["A", "B", "C", "D"][i]}
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>

              {feedback && (
                <div className="mt-4 rounded-2xl bg-kemenag-50 p-3 text-center text-sm font-extrabold text-kemenag-900">
                  {feedback}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
