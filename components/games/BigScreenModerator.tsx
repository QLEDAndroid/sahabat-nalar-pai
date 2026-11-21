"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/storage";
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  Radio,
  RotateCcw,
  Tv,
} from "lucide-react";

export type BigScreenGameType = "race" | "tower" | "jeopardy" | "territory" | "bomb";

interface BigScreenRoom {
  pin: string;
  gameType: BigScreenGameType;
  creatorName: string;
  tvConnected: boolean;
}

const GAME_TITLES: Record<BigScreenGameType, string> = {
  race: "Balap Lintas Ilmu (4 Tim)",
  tower: "Benteng Ilmu (Co-op Satu Kelas)",
  jeopardy: "Papan Cerdas Cermat PAI (4 Tim)",
  territory: "Penakluk Wilayah Nusantara (4 Kelompok)",
  bomb: "Bom Waktu Estafet PAI (4 Kelompok)",
};

export function BigScreenModerator({ gameType }: { gameType: BigScreenGameType }) {
  const [room, setRoom] = useState<BigScreenRoom | null>(null);
  const [copied, setCopied] = useState(false);
  const [creating, setCreating] = useState(true);

  function createRoom() {
    const u = getCurrentUser();
    setCreating(true);
    fetch("/api/bigscreen-game", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameType,
        creatorName: u?.nama || "Peserta Kelas",
        creatorRole: u?.role || "murid",
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.room) setRoom(d.room);
      })
      .finally(() => setCreating(false));
  }

  useEffect(() => {
    createRoom();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameType]);

  // Poll status koneksi Layar Lebar saja
  useEffect(() => {
    if (!room?.pin || room.tvConnected) return;
    const t = setInterval(() => {
      fetch(`/api/bigscreen-game?pin=${encodeURIComponent(room.pin)}`, {
        cache: "no-store",
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.room) setRoom(d.room);
        })
        .catch(() => {});
    }, 1200);
    return () => clearInterval(t);
  }, [room?.pin, room?.tvConnected]);

  function copyPin() {
    if (!room) return;
    navigator.clipboard?.writeText(room.pin).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (creating || !room) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-xs font-bold text-slate-500">
        Menyiapkan kode 4 digit untuk Layar Lebar...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-kemenag-200 bg-white p-6 text-center shadow-sm">
      <div className="relative mb-4 overflow-hidden rounded-2xl">
        <img
          src={`/images/games/${gameType}.jpg`}
          alt={GAME_TITLES[gameType]}
          className="h-44 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1 text-[10px] font-extrabold text-gold-300 backdrop-blur">
          <Tv className="h-3.5 w-3.5" />
          <span>KHUSUS LAYAR LEBAR</span>
        </div>
      </div>

      <h3 className="text-lg font-extrabold text-slate-900">
        {GAME_TITLES[gameType]}
      </h3>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
        Game ini dimainkan sepenuhnya secara interaktif di <strong>Layar Lebar (Proyektor/TV)</strong>. Buka halaman <strong>/tv</strong> di layar lebar lalu masukkan kode 4 digit di bawah ini untuk langsung memulai permainan!
      </p>

      <div className="mt-5 rounded-3xl bg-gradient-to-br from-kemenag-700 to-emerald-800 p-5 text-white shadow-inner">
        <div className="text-[11px] font-bold uppercase tracking-wider text-kemenag-100">
          Kode 4 Digit Layar Lebar
        </div>
        <div className="mt-1 text-5xl font-black tracking-[0.25em] text-gold-400">
          {room.pin}
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={copyPin}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold text-white hover:bg-white/25"
          >
            <Copy className="h-3.5 w-3.5" />
            <span>{copied ? "Kode Disalin!" : "Salin Kode"}</span>
          </button>
          <a
            href={`/tv?pin=${room.pin}`}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-full bg-gold-500 px-4 py-1.5 text-xs font-extrabold text-slate-950 hover:bg-gold-400 sm:inline-flex"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>Buka di Layar Lebar (/tv)</span>
          </a>
        </div>
      </div>

      {room.tvConnected ? (
        <div className="mt-4 space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 text-xs font-extrabold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            <span>Tersambung! Game sedang berjalan penuh di Layar Lebar.</span>
          </div>
          <div>
            <button
              onClick={createRoom}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Buat Kode Baru</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-[11px] font-bold text-slate-600">
          <Radio className="h-3.5 w-3.5 animate-pulse text-kemenag-600" />
          <span>Menunggu Layar Lebar memasukkan kode {room.pin}...</span>
        </div>
      )}
    </div>
  );
}
