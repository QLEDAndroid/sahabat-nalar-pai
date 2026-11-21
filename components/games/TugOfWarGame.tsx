"use client";

import { useEffect, useRef, useState } from "react";
import { TUG_QUESTIONS } from "@/data/game-bank";
import { getCurrentUser } from "@/lib/storage";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { soundEngine } from "@/lib/soundEngine";
import {
  Monitor,
  Play,
  RotateCcw,
  Smartphone,
  Trophy,
  Users,
} from "lucide-react";

type TugTeam = "hijau" | "emas";

interface TugPlayer {
  id: string;
  name: string;
  team: TugTeam;
  score: number;
}

interface TugRoom {
  pin: string;
  status: "lobby" | "playing" | "finished";
  ropePosition: number;
  hijauScore: number;
  emasScore: number;
  winner?: TugTeam;
  lastPullBy?: string;
  lastPullTeam?: TugTeam;
  players: TugPlayer[];
}

function TugArenaCanvas({ room }: { room: TugRoom }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animPosRef = useRef(0);
  const prevPosRef = useRef(0);
  const shakeRef = useRef(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);

  useEffect(() => {
    if (room.ropePosition !== prevPosRef.current) {
      shakeRef.current = 8;
      const cx = 400 + (room.ropePosition / 100) * 210;
      const col = room.ropePosition < prevPosRef.current ? "#34d399" : "#F0B232";
      for (let i = 0; i < 18; i++) {
        particlesRef.current.push({
          x: cx,
          y: 165,
          vx: (Math.random() - 0.5) * 8,
          vy: (Math.random() - 0.8) * 7,
          life: 28 + Math.random() * 14,
          color: col,
        });
      }
      prevPosRef.current = room.ropePosition;
    }
  }, [room.ropePosition]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let tick = 0;

    function drawRunner(x: number, y: number, color: string, facingRight: boolean, lean: number) {
      if (!ctx) return;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(lean);
      // Legs
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(facingRight ? -10 : 10, 24);
      ctx.moveTo(0, 0);
      ctx.lineTo(facingRight ? 10 : -10, 24);
      ctx.stroke();
      // Torso
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(-10, -28, 20, 30, 6);
      ctx.fill();
      // Head
      ctx.fillStyle = "#fde68a";
      ctx.beginPath();
      ctx.arc(0, -38, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function loop() {
      if (!ctx) return;
      tick += 1;
      animPosRef.current += (room.ropePosition - animPosRef.current) * 0.14;
      if (shakeRef.current > 0.3) shakeRef.current *= 0.85;

      const W = 800;
      const H = 260;
      if (!ctx) return;
      ctx.save();
      if (shakeRef.current > 0.4) {
        ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
      }

      // Arena sky & turf
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#022c22");
      grad.addColorStop(0.7, "#064e3b");
      grad.addColorStop(1, "#065f46");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Ground
      ctx.fillStyle = "#047857";
      ctx.fillRect(0, 195, W, 65);

      // Win zones
      ctx.fillStyle = "rgba(16, 185, 129, 0.25)";
      ctx.fillRect(0, 195, 190, 65);
      ctx.fillStyle = "rgba(240, 178, 50, 0.25)";
      ctx.fillRect(610, 195, 190, 65);

      // Center line
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.setLineDash([6, 6]);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(400, 40);
      ctx.lineTo(400, 260);
      ctx.stroke();
      ctx.setLineDash([]);

      const shift = (animPosRef.current / 100) * 210;
      const centerX = 400 + shift;
      const wave = Math.sin(tick * 0.22) * (room.status === "playing" ? 3.5 : 0.8);

      // Rope
      ctx.strokeStyle = "#fde68a";
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(110 + shift * 0.65, 165);
      ctx.quadraticCurveTo(centerX, 165 + wave, 690 + shift * 0.65, 165);
      ctx.stroke();

      // Center red ribbon flag
      ctx.fillStyle = "#f43f5e";
      ctx.beginPath();
      ctx.moveTo(centerX, 165);
      ctx.lineTo(centerX - 12, 192);
      ctx.lineTo(centerX + 12, 192);
      ctx.closePath();
      ctx.fill();

      // Left Squad (Tim Hijau)
      const pullLean = Math.sin(tick * 0.25) * 0.1;
      for (let i = 0; i < 3; i++) {
        drawRunner(140 + i * 48 + shift * 0.65, 175, "#10b981", false, -0.22 + pullLean);
      }
      // Right Squad (Tim Emas)
      for (let i = 0; i < 3; i++) {
        drawRunner(565 + i * 48 + shift * 0.65, 175, "#F0B232", true, 0.22 - pullLean);
      }

      // Particles
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.22;
        p.life -= 1;
        ctx.globalAlpha = Math.max(0, p.life / 35);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, 5, 5);
      }
      ctx.globalAlpha = 1;
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0);

      // Labels
      ctx.fillStyle = "#6ee7b7";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`TIM HIJAU: ${room.hijauScore} pts`, 20, 32);

      ctx.fillStyle = "#fde047";
      ctx.textAlign = "right";
      ctx.fillText(`TIM EMAS: ${room.emasScore} pts`, W - 20, 32);

      ctx.restore();
      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [room]);

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={260}
      className="block w-full rounded-2xl border border-white/15 shadow-lg"
    />
  );
}

export function TugOfWarGame({ isGuru = false }: { isGuru?: boolean }) {
  const [roleView, setRoleView] = useState<"choose" | "host" | "player">("choose");
  const [pin, setPin] = useState("");
  const [room, setRoom] = useState<TugRoom | null>(null);
  const [error, setError] = useState("");

  const [playerName, setPlayerName] = useState("");
  const [playerTeam, setPlayerTeam] = useState<TugTeam>("hijau");
  const [playerId, setPlayerId] = useState("");
  const [joined, setJoined] = useState(false);
  const [qIdx, setQIdx] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [lastMsg, setLastMsg] = useState("");

  useEffect(() => {
    const u = getCurrentUser();
    if (u?.nama) setPlayerName(u.nama);
  }, []);

  useEffect(() => {
    if (!room?.pin) return;
    const t = setInterval(() => {
      fetch(`/api/game-room?pin=${encodeURIComponent(room.pin)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d?.room) {
            if (room.status !== "finished" && d.room.status === "finished") {
              soundEngine.playSfx("fanfare");
              arcadeAudio.win();
            }
            setRoom(d.room);
          }
        })
        .catch(() => {});
    }, 1000);
    return () => clearInterval(t);
  }, [room?.pin, room?.status]);

  async function handleCreateHostRoom() {
    setError("");
    const res = await fetch("/api/game-room", { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
      setPin(data.room.pin);
      setRoleView("host");
      arcadeAudio.powerup();
    } else {
      setError("Gagal membuat ruangan.");
    }
  }

  async function handleStartMatch() {
    if (!room) return;
    const res = await fetch("/api/game-room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: room.pin, action: "start" }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
      soundEngine.playSfx("horn");
    }
  }

  async function handleFinishMatch() {
    if (!room) return;
    const res = await fetch("/api/game-room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: room.pin, action: "finish" }),
    });
    if (res.ok) {
      const data = await res.json();
      setRoom(data.room);
      arcadeAudio.win();
    }
  }

  async function handleJoinRoom(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/game-room", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin: pin.trim(),
        action: "join",
        name: playerName.trim() || "Siswa",
        team: playerTeam,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "PIN tidak ditemukan.");
      return;
    }
    setRoom(data.room);
    setPlayerId(data.playerId);
    setJoined(true);
    setQIdx(Math.floor(Math.random() * TUG_QUESTIONS.length));
  }

  async function handlePlayerAnswer(optIdx: number) {
    if (!room || cooldown || room.status !== "playing") return;
    const q = TUG_QUESTIONS[qIdx % TUG_QUESTIONS.length];
    if (optIdx === q.answerIndex) {
      arcadeAudio.coin();
      setLastMsg("⚡ Benar! Tali tertarik ke timmu!");
      await fetch("/api/game-room", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pin: room.pin,
          action: "pull",
          playerId,
          team: playerTeam,
          name: playerName || "Siswa",
        }),
      });
      setQIdx((i) => (i + 1) % TUG_QUESTIONS.length);
    } else {
      arcadeAudio.hit();
      setLastMsg("Kurang tepat! Tunggu 1 detik...");
      setCooldown(true);
      setTimeout(() => {
        setCooldown(false);
        setQIdx((i) => (i + 1) % TUG_QUESTIONS.length);
      }, 1000);
    }
  }

  if (roleView === "choose") {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-kemenag-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-kemenag-100 text-kemenag-700">
            <Monitor className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-extrabold text-slate-900">
            Buka Arena Proyektor (Layar Lebar)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Tampilkan animasi Tarik Tambang 60fps di proyektor kelas dan bagikan PIN 4 digit ke gawai murid.
          </p>
          <button
            onClick={handleCreateHostRoom}
            className="mt-4 w-full rounded-full bg-kemenag-600 py-2.5 text-xs font-extrabold text-white hover:bg-kemenag-700"
          >
            {isGuru ? "Buat Ruangan Proyektor" : "Buka Layar Proyektor"}
          </button>
        </div>

        <div className="rounded-3xl border border-gold-300 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-100 text-amber-800">
            <Smartphone className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-base font-extrabold text-slate-900">
            Gabung dari Gawai (Kontroler Murid)
          </h3>
          <p className="mt-1 text-xs text-slate-600">
            Masukkan PIN dari proyektor, pilih Tim Hijau atau Tim Emas, lalu jawab cepat untuk menarik tali di layar besar!
          </p>
          <button
            onClick={() => setRoleView("player")}
            className="mt-4 w-full rounded-full bg-gold-500 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-gold-400"
          >
            Masuk dengan PIN
          </button>
        </div>
      </div>
    );
  }

  if (roleView === "host" && room) {
    const hijauPlayers = room.players.filter((p) => p.team === "hijau");
    const emasPlayers = room.players.filter((p) => p.team === "emas");

    return (
      <div className="space-y-4 rounded-3xl bg-gradient-to-br from-slate-900 via-kemenag-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-gold-400">
              ARENA PROYEKTOR 60FPS • TARIK TAMBANG NALAR
            </span>
            <h3 className="mt-1.5 text-2xl font-extrabold">
              PIN Ruangan: <span className="tracking-widest text-gold-400">{room.pin}</span>
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {room.status === "lobby" && (
              <button
                onClick={handleStartMatch}
                className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-5 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-gold-400"
              >
                <Play className="h-4 w-4" />
                <span>Mulai Tarik Tambang!</span>
              </button>
            )}
            {room.status === "playing" && (
              <button
                onClick={handleFinishMatch}
                className="rounded-full bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700"
              >
                Akhiri & Umumkan Pemenang
              </button>
            )}
            {room.status === "finished" && (
              <button
                onClick={handleStartMatch}
                className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-5 py-2.5 text-xs font-extrabold text-slate-950"
              >
                <RotateCcw className="h-4 w-4" />
                <span>Main Babak Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* 60FPS Canvas Arena */}
        <TugArenaCanvas room={room} />

        {room.lastPullBy && room.status === "playing" && (
          <p className="text-center text-xs font-bold text-gold-300">
            ⚡ {room.lastPullBy} menarik tali untuk{" "}
            {room.lastPullTeam === "hijau" ? "TIM HIJAU" : "TIM EMAS"}!
          </p>
        )}

        {room.status === "finished" && (
          <div className="rounded-2xl bg-gold-500/20 p-4 text-center ring-1 ring-gold-400">
            <Trophy className="mx-auto h-9 w-9 text-gold-400" />
            <div className="mt-1 text-xl font-extrabold text-gold-300">
              PEMENANG: {room.winner === "hijau" ? "TIM HIJAU (AL-FALAH)" : "TIM EMAS (AN-NUR)"}!
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-950/60 p-4 ring-1 ring-emerald-500/40">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
              <Users className="h-4 w-4" /> Tim Hijau ({hijauPlayers.length} siswa)
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hijauPlayers.length === 0 ? (
                <span className="text-[11px] text-slate-400">Menunggu siswa bergabung...</span>
              ) : (
                hijauPlayers.map((p) => (
                  <span key={p.id} className="rounded-full bg-emerald-600/40 px-2.5 py-1 text-[11px] font-bold">
                    {p.name} ({p.score})
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-amber-950/60 p-4 ring-1 ring-gold-500/40">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-gold-300">
              <Users className="h-4 w-4" /> Tim Emas ({emasPlayers.length} siswa)
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {emasPlayers.length === 0 ? (
                <span className="text-[11px] text-slate-400">Menunggu siswa bergabung...</span>
              ) : (
                emasPlayers.map((p) => (
                  <span key={p.id} className="rounded-full bg-gold-500/30 px-2.5 py-1 text-[11px] font-bold">
                    {p.name} ({p.score})
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <form
        onSubmit={handleJoinRoom}
        className="mx-auto max-w-md space-y-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h3 className="text-base font-extrabold text-slate-900">
          Gabung Tarik Tambang Nalar
        </h3>
        <input
          required
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="Masukkan 4 Digit PIN Ruangan"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center text-sm font-extrabold tracking-widest"
        />
        <input
          required
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Nama Kamu"
          className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setPlayerTeam("hijau")}
            className={`rounded-xl border py-2.5 text-xs font-extrabold ${
              playerTeam === "hijau"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            Tim Hijau
          </button>
          <button
            type="button"
            onClick={() => setPlayerTeam("emas")}
            className={`rounded-xl border py-2.5 text-xs font-extrabold ${
              playerTeam === "emas"
                ? "border-gold-500 bg-gold-500 text-slate-950"
                : "border-slate-200 bg-slate-50 text-slate-700"
            }`}
          >
            Tim Emas
          </button>
        </div>
        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        <button
          type="submit"
          className="w-full rounded-full bg-kemenag-600 py-2.5 text-xs font-extrabold text-white"
        >
          Masuk Arena
        </button>
      </form>
    );
  }

  const currentQ = TUG_QUESTIONS[qIdx % TUG_QUESTIONS.length];

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-xs font-extrabold">
        <span
          className={`rounded-full px-3 py-1 ${
            playerTeam === "hijau"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-gold-100 text-amber-900"
          }`}
        >
          {playerTeam === "hijau" ? "Tim Hijau" : "Tim Emas"} • {playerName}
        </span>
        <span className="text-slate-500">PIN {room?.pin}</span>
      </div>

      {room?.status === "lobby" && (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-600">
          Kamu sudah masuk! Menunggu guru menekan <strong>Mulai Tarik Tambang</strong> di proyektor...
        </div>
      )}

      {room?.status === "playing" && (
        <div className="space-y-3">
          <span className="rounded-full bg-kemenag-50 px-2.5 py-0.5 text-[10px] font-bold text-kemenag-700">
            {currentQ.bab}
          </span>
          <p className="text-sm font-extrabold text-slate-900">{currentQ.question}</p>
          <div className="grid gap-2">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                disabled={cooldown}
                onClick={() => handlePlayerAnswer(idx)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-bold text-slate-800 transition hover:border-kemenag-500 hover:bg-kemenag-50 disabled:opacity-50"
              >
                {opt}
              </button>
            ))}
          </div>
          {lastMsg && (
            <p className="text-center text-xs font-bold text-kemenag-700">{lastMsg}</p>
          )}
        </div>
      )}

      {room?.status === "finished" && (
        <div className="rounded-2xl bg-kemenag-50 p-6 text-center">
          <Trophy className="mx-auto h-10 w-10 text-gold-500" />
          <p className="mt-2 text-sm font-extrabold text-kemenag-900">
            {room.winner === playerTeam ? "Selamat! Timmu Menang!" : "Pertandingan Selesai!"}
          </p>
        </div>
      )}
    </div>
  );
}
