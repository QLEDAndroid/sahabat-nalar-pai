"use client";

import { ClassroomRaceGame } from "@/components/games/ClassroomRaceGame";
import { TowerDefenseClassGame } from "@/components/games/TowerDefenseClassGame";
import { JeopardyGame } from "@/components/games/BigScreenGames";
import { TerritoryCaptureGame } from "@/components/games/TerritoryCaptureGame";
import { PassTheBombGame } from "@/components/games/PassTheBombGame";
import { useState } from "react";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { ArrowLeft, Maximize2, Volume2, VolumeX } from "lucide-react";

interface BigScreenRoom {
  pin: string;
  gameType: "race" | "tower" | "jeopardy" | "territory" | "bomb";
  creatorName: string;
}

export function BigScreenDisplay({
  pin,
  initialRoom,
  onExit,
}: {
  pin: string;
  initialRoom: BigScreenRoom;
  onExit: () => void;
}) {
  const [muted, setMuted] = useState(false);

  function toggleFullscreen() {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 p-4 text-white sm:p-6">
      {/* Latar ilustrasi sampul game */}
      <img
        src={`/images/games/${initialRoom.gameType}.jpg`}
        alt=""
        className="pointer-events-none fixed inset-0 h-full w-full object-cover opacity-20 blur-[3px]"
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-950/75 via-kemenag-950/80 to-slate-950/95" />

      <div className="relative z-10 mx-auto max-w-6xl space-y-4">
        {/* Top Bar Layar Lebar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onExit}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Keluar</span>
            </button>
            <span className="rounded-full bg-gold-500/20 px-4 py-1.5 text-xs font-extrabold text-gold-300 ring-1 ring-gold-400/40">
              PIN: {pin} • Dibuka oleh {initialRoom.creatorName}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                arcadeAudio.muted = next;
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-gold-400" />}
              <span>{muted ? "Suara Mati" : "SFX Aktif"}</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold hover:bg-white/20"
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>Layar Penuh</span>
            </button>
          </div>
        </div>

        {/* Game Berjalan 100% Langsung & Interaktif di Layar Lebar */}
        {initialRoom.gameType === "race" && <ClassroomRaceGame />}
        {initialRoom.gameType === "tower" && <TowerDefenseClassGame />}
        {initialRoom.gameType === "jeopardy" && <JeopardyGame />}
        {initialRoom.gameType === "territory" && <TerritoryCaptureGame />}
        {initialRoom.gameType === "bomb" && <PassTheBombGame />}
      </div>
    </div>
  );
}
