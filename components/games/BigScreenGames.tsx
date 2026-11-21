"use client";

import { useState } from "react";
import { JEOPARDY_BOARD, JeopardyTile } from "@/data/game-bank";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { CheckCircle2, Eye, RotateCcw, Trophy, X } from "lucide-react";

export function JeopardyGame() {
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [activeTile, setActiveTile] = useState<{
    cat: string;
    tile: JeopardyTile;
  } | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [teams, setTeams] = useState([
    { id: "a", name: "Tim A", score: 0 },
    { id: "b", name: "Tim B", score: 0 },
    { id: "c", name: "Tim C", score: 0 },
    { id: "d", name: "Tim D", score: 0 },
  ]);

  function openTile(cat: string, tile: JeopardyTile) {
    if (usedIds.includes(tile.id)) return;
    setActiveTile({ cat, tile });
    setShowAnswer(false);
    arcadeAudio.bounce();
  }

  function awardToTeam(teamId: string | null) {
    if (!activeTile) return;
    if (teamId) {
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, score: t.score + activeTile.tile.points } : t
        )
      );
      arcadeAudio.win();
    } else {
      arcadeAudio.hit();
    }
    setUsedIds((prev) => [...prev, activeTile.tile.id]);
    setActiveTile(null);
    setShowAnswer(false);
  }

  function resetBoard() {
    setUsedIds([]);
    setActiveTile(null);
    setTeams(teams.map((t) => ({ ...t, score: 0 })));
    arcadeAudio.powerup();
  }

  const totalTiles = JEOPARDY_BOARD.reduce((acc, c) => acc + c.tiles.length, 0);
  const allDone = usedIds.length >= totalTiles;
  const topTeam = [...teams].sort((a, b) => b.score - a.score)[0];

  return (
    <div className="space-y-5 rounded-3xl bg-gradient-to-br from-slate-900/90 via-kemenag-950/90 to-slate-900/90 p-6 text-white shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-gold-400">
            LAYAR LEBAR INTERAKTIF • CERDAS CERMAT PAI
          </span>
          <h3 className="mt-1 text-xl font-extrabold">
            Papan Cerdas Cermat PAI-BP Kelas X
          </h3>
        </div>
        <button
          onClick={resetBoard}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          <span>Ulangi Papan</span>
        </button>
      </div>

      {/* Papan Skor */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {teams.map((t) => (
          <div
            key={t.id}
            className="rounded-2xl bg-white/10 p-3 text-center ring-1 ring-white/15"
          >
            <div className="text-xs font-bold text-kemenag-100">{t.name}</div>
            <div className="text-2xl font-extrabold text-gold-400">{t.score}</div>
          </div>
        ))}
      </div>

      {allDone && (
        <div className="rounded-3xl bg-gold-500/20 p-5 text-center ring-1 ring-gold-400">
          <Trophy className="mx-auto h-10 w-10 text-gold-400" />
          <div className="mt-2 text-xl font-extrabold text-gold-300">
            Juara Cerdas Cermat: {topTeam.name} ({topTeam.score} Poin)!
          </div>
        </div>
      )}

      {/* Grid Kategori x Poin */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {JEOPARDY_BOARD.map((cat) => (
          <div key={cat.title} className="space-y-2.5">
            <div
              className={`rounded-2xl bg-gradient-to-br ${cat.color} p-3 text-center text-xs font-extrabold text-white shadow`}
            >
              {cat.title}
            </div>
            {cat.tiles.map((tile) => {
              const done = usedIds.includes(tile.id);
              return (
                <button
                  key={tile.id}
                  disabled={done}
                  onClick={() => openTile(cat.title, tile)}
                  className={`flex h-20 w-full items-center justify-center rounded-2xl text-2xl font-black transition ${
                    done
                      ? "bg-white/5 text-slate-600 line-through"
                      : "bg-white/15 text-gold-400 shadow hover:-translate-y-0.5 hover:bg-gold-500 hover:text-slate-950"
                  }`}
                >
                  {done ? "✓" : tile.points}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Modal Pertanyaan Terpilih */}
      {activeTile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-7 text-slate-900 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-kemenag-100 px-3.5 py-1 text-xs font-extrabold text-kemenag-800">
                {activeTile.cat} • {activeTile.tile.points} POIN
              </span>
              <button
                onClick={() => setActiveTile(null)}
                className="rounded-full bg-slate-100 p-1.5 text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-5 text-xl font-extrabold leading-relaxed text-slate-900">
              {activeTile.tile.question}
            </p>

            {!showAnswer ? (
              <button
                onClick={() => {
                  setShowAnswer(true);
                  arcadeAudio.powerup();
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-kemenag-600 px-6 py-3 text-xs font-extrabold text-white hover:bg-kemenag-700"
              >
                <Eye className="h-4 w-4" />
                <span>Buka Kunci Jawaban</span>
              </button>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-kemenag-200 bg-kemenag-50 p-4 text-sm font-semibold text-kemenag-950">
                  <span className="font-extrabold text-kemenag-700">Jawaban: </span>
                  {activeTile.tile.answer}
                </div>

                <div>
                  <p className="mb-2 text-xs font-bold text-slate-500">
                    Berikan +{activeTile.tile.points} poin kepada tim yang menjawab benar:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {teams.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => awardToTeam(t.id)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>{t.name}</span>
                      </button>
                    ))}
                    <button
                      onClick={() => awardToTeam(null)}
                      className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600"
                    >
                      Tidak Ada yang Benar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
