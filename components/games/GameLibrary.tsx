"use client";

import { useState } from "react";
import Link from "next/link";
import { FastabiqulRunner } from "@/components/games/FastabiqulRunner";
import { SpaceDefenderPAI } from "@/components/games/SpaceDefenderPAI";
import { LabirinWaliSongo } from "@/components/games/LabirinWaliSongo";
import { Game2048PAI } from "@/components/games/Game2048PAI";
import { TugOfWarGame } from "@/components/games/TugOfWarGame";
import { BigScreenModerator } from "@/components/games/BigScreenModerator";
import { arcadeAudio } from "@/lib/arcadeAudio";
import {
  ArrowLeft,
  Compass,
  Gamepad2,
  Grid2X2,
  Monitor,
  Play,
  Rocket,
  Smartphone,
  Flag,
  Flame,
  Map,
  Shield,
  Swords,
  Tv,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

type GameCategory = "all" | "solo" | "hybrid" | "bigscreen";
type ActiveGameId =
  | null
  | "runner"
  | "defender"
  | "labirin"
  | "g2048"
  | "tug"
  | "race"
  | "tower"
  | "jeopardy"
  | "territory"
  | "bomb";

interface GameCardMeta {
  id: Exclude<ActiveGameId, null> | "kahoot";
  title: string;
  genre: string;
  subtitle: string;
  category: Exclude<GameCategory, "all">;
  badge: string;
  cover: string;
  icon: typeof Gamepad2;
  externalHref?: string;
}

const GAMES: GameCardMeta[] = [
  {
    id: "runner",
    title: "Fastabiqul Runner",
    genre: "Platformer Arcade 60fps",
    subtitle: "Lari, lompat ganda, hindari rintangan sifat tercela, dan terobos Gerbang Ilmu untuk Perisai Emas!",
    category: "solo",
    badge: "Gawai Sendiri",
    cover: "/images/games/runner.jpg",
    icon: Zap,
  },
  {
    id: "defender",
    title: "Penjaga Akal: Space Defender",
    genre: "Space Shooter 60fps",
    subtitle: "Tembak meteor sifat tercela dengan laser pesawatmu & tangkap kapsul akhlak mulia sebelum lolos!",
    category: "solo",
    badge: "Gawai Sendiri",
    cover: "/images/games/defender.jpg",
    icon: Rocket,
  },
  {
    id: "labirin",
    title: "Labirin Wali Songo",
    genre: "Maze Chase Arcade",
    subtitle: "Kumpulkan Pelita Ilmu di labirin sambil mengecoh pengejar Hasad, Riyā', dan Malas ala Pac-Man!",
    category: "solo",
    badge: "Gawai Sendiri",
    cover: "/images/games/labirin.jpg",
    icon: Compass,
  },
  {
    id: "g2048",
    title: "2048 Tangga Maqāṣid",
    genre: "Classic Strategy Puzzle",
    subtitle: "Gabungkan ubin nilai PAI dari Niat (2), Ilmu (4), hingga Hifzhud Dīn (2048) dengan kontrol swipe/panah!",
    category: "solo",
    badge: "Gawai Sendiri",
    cover: "/images/games/g2048.jpg",
    icon: Grid2X2,
  },
  {
    id: "tug",
    title: "Arena Tarik Tambang Nalar",
    genre: "Multiplayer HP + Proyektor",
    subtitle: "Tim Hijau vs Tim Emas! Murid menjawab cepat di HP masing-masing untuk menarik tali animasi 60fps di proyektor.",
    category: "hybrid",
    badge: "Gawai + Layar Lebar",
    cover: "/images/games/tug.jpg",
    icon: Swords,
  },
  {
    id: "kahoot",
    title: "Kuis Cepat Kahoot Live",
    genre: "Live Quiz Proyektor",
    subtitle: "Papan peringkat real-time di layar lebar dengan tombol cepat di HP murid dan efek suara kuis.",
    category: "hybrid",
    badge: "Gawai + Layar Lebar",
    cover: "/images/games/kahoot.jpg",
    icon: Tv,
    externalHref: "/tv",
  },
  {
    id: "race",
    title: "Balap Lintas Ilmu (4 Tim)",
    genre: "Rebutan Buzzer Satu Kelas",
    subtitle: "4 Tim berlomba di lintasan balap 60fps! Rebut tombol buzzer [A/F/J/L] untuk melesat ke garis finis.",
    category: "bigscreen",
    badge: "Khusus Layar Lebar",
    cover: "/images/games/race.jpg",
    icon: Flag,
  },
  {
    id: "tower",
    title: "Benteng Ilmu (Co-op Satu Kelas)",
    genre: "Tower Defense 5 Gelombang",
    subtitle: "Satu kelas bersatu mempertahankan benteng dari 5 gelombang musuh & Boss Riba lewat 4 Meriam Cahaya!",
    category: "bigscreen",
    badge: "Khusus Layar Lebar",
    cover: "/images/games/tower.jpg",
    icon: Shield,
  },
  {
    id: "jeopardy",
    title: "Papan Cerdas Cermat PAI",
    genre: "Game Show 4 Tim",
    subtitle: "Adu cepat antar 4 kelompok kelas memilih kategori dan tingkat poin 100–400 di papan proyektor.",
    category: "bigscreen",
    badge: "Khusus Layar Lebar",
    cover: "/images/games/jeopardy.jpg",
    icon: Grid2X2,
  },
  {
    id: "territory",
    title: "Penakluk Wilayah Nusantara",
    genre: "Strategi Peta 4 Kelompok",
    subtitle: "4 Kelompok bergiliran merebut 24 wilayah Nusantara & Wilayah Emas 2x Poin lewat tantangan PAI-BP!",
    category: "bigscreen",
    badge: "Khusus Layar Lebar",
    cover: "/images/games/territory.jpg",
    icon: Map,
  },
  {
    id: "bomb",
    title: "Bom Waktu Estafet PAI",
    genre: "Estafet Cepat 4 Kelompok",
    subtitle: "Jawab soal PAI secepat kilat untuk melempar bom waktu ke kelompok sebelah sebelum sumbunya meledak!",
    category: "bigscreen",
    badge: "Khusus Layar Lebar",
    cover: "/images/games/bomb.jpg",
    icon: Flame,
  },
];

const CATEGORY_TABS: { id: GameCategory; label: string; icon: typeof Gamepad2 }[] = [
  { id: "all", label: "Semua Game", icon: Gamepad2 },
  { id: "solo", label: "Di Gawai Sendiri", icon: Smartphone },
  { id: "hybrid", label: "Gawai + Layar Lebar", icon: Tv },
  { id: "bigscreen", label: "Khusus Layar Lebar", icon: Monitor },
];

export function GameLibrary({ isGuru = false }: { isGuru?: boolean }) {
  const [category, setCategory] = useState<GameCategory>("all");
  const [activeGame, setActiveGame] = useState<ActiveGameId>(null);
  const [muted, setMuted] = useState(false);

  const visibleGames =
    category === "all" ? GAMES : GAMES.filter((g) => g.category === category);

  const currentMeta = GAMES.find((g) => g.id === activeGame);

  if (activeGame && currentMeta) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <button
            onClick={() => setActiveGame(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:border-kemenag-400 hover:text-kemenag-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Perpustakaan Game</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = !muted;
                setMuted(next);
                arcadeAudio.muted = next;
              }}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-100"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5 text-kemenag-700" />}
              <span>{muted ? "Bisu" : "SFX"}</span>
            </button>
            <span className="rounded-full bg-kemenag-50 px-3 py-1 text-[11px] font-extrabold text-kemenag-800">
              {currentMeta.badge}
            </span>
            <span className="text-xs font-extrabold text-slate-900">
              {currentMeta.title}
            </span>
          </div>
        </div>

        {activeGame === "runner" && <FastabiqulRunner />}
        {activeGame === "defender" && <SpaceDefenderPAI />}
        {activeGame === "labirin" && <LabirinWaliSongo />}
        {activeGame === "g2048" && <Game2048PAI />}
        {activeGame === "tug" && <TugOfWarGame isGuru={isGuru} />}
        {(activeGame === "race" || activeGame === "tower" || activeGame === "jeopardy" || activeGame === "territory" || activeGame === "bomb") && (
          <BigScreenModerator gameType={activeGame} />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-gradient-to-r from-kemenag-700 via-kemenag-600 to-emerald-700 p-5 text-white shadow-sm">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-gold-400">
          <Gamepad2 className="h-3.5 w-3.5" />
          <span>Arcade & Perpustakaan Game PAI-BP</span>
        </div>
        <h2 className="mt-2 text-lg font-extrabold sm:text-xl">
          Mainkan Game Arcade Interaktif 60fps
        </h2>
        <p className="mt-1 text-xs text-kemenag-100">
          Pilih game sesuai mode main: arcade mandiri di HP/laptop, duel tim HP + proyektor, atau permainan fisika bersama di layar lebar kelas.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORY_TABS.map((t) => {
          const Icon = t.icon;
          const active = category === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setCategory(t.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition ${
                active
                  ? "bg-kemenag-600 text-white shadow-sm"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-kemenag-300 hover:text-kemenag-800"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleGames.map((g) => {
          const Icon = g.icon;
          return (
            <div
              key={g.id}
              className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
            >
              <div>
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-900">
                  <img
                    src={g.cover}
                    alt={g.title}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                  <div className="absolute left-3 top-3 flex items-center gap-1.5">
                    <span className="rounded-full bg-black/55 px-2.5 py-0.5 text-[10px] font-extrabold text-gold-300 backdrop-blur">
                      {g.badge}
                    </span>
                  </div>
                  <div className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-black/45 text-white backdrop-blur">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="text-base font-extrabold leading-tight drop-shadow">
                      {g.title}
                    </h3>
                    <div className="mt-0.5 text-[11px] font-semibold text-kemenag-200">
                      {g.genre}
                    </div>
                  </div>
                </div>
                <p className="p-4 text-xs leading-relaxed text-slate-600">
                  {g.subtitle}
                </p>
              </div>

              <div className="px-4 pb-4">
                {g.externalHref ? (
                  <Link
                    href={g.externalHref}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-kemenag-600 py-2.5 text-xs font-extrabold text-white transition hover:bg-kemenag-700"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Buka Mode Proyektor Live</span>
                  </Link>
                ) : (
                  <button
                    onClick={() => setActiveGame(g.id as ActiveGameId)}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-kemenag-600 py-2.5 text-xs font-extrabold text-white transition hover:bg-kemenag-700"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>Mainkan Sekarang</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
