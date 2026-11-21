"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getAssessments } from "@/lib/storage";
import { soundEngine, SfxName } from "@/lib/soundEngine";
import { Assessment } from "@/lib/types";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { BigScreenDisplay } from "@/components/games/BigScreenDisplay";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Crown,
  Flame,
  Headphones,
  Maximize2,
  Music,
  Play,
  Radio,
  RotateCcw,
  SkipForward,
  Sparkles,
  Trophy,
  Tv,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";

interface LivePlayer {
  id: string;
  nama: string;
  skor: number;
  streak: number;
  benar: number;
  eliminated: boolean;
}

interface LiveCheerEvent {
  id: number;
  sender: string;
  emoji: string;
  label: string;
  sound: string;
  createdAt: number;
}

interface LiveRoom {
  pin: string;
  status: "lobby" | "question" | "podium";
  currentQuestionIdx: number;
  players: LivePlayer[];
  cheers: LiveCheerEvent[];
}

interface FloatingVfx {
  uid: string;
  type: string;
  label: string;
  sender: string;
  leftPct: number;
}

const OPT_STYLES = [
  { bg: "bg-[#DA373C]", shape: "▲" },
  { bg: "bg-[#2563EB]", shape: "◆" },
  { bg: "bg-[#D97706]", shape: "●" },
  { bg: "bg-[#008A52]", shape: "■" },
];

function VfxIcon({ type }: { type: string }) {
  if (type === "horn") return <Zap className="h-5 w-5 text-[#F0B232]" />;
  if (type === "applause") return <Award className="h-5 w-5 text-[#23A55A]" />;
  if (type === "fanfare") return <Sparkles className="h-5 w-5 text-[#F0B232]" />;
  return <Flame className="h-5 w-5 text-orange-400" />;
}

/** 60fps Canvas Confetti Engine (Zero external dependencies) */
function useConfettiCanvas(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const particlesRef = useRef<
    Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;
      rot: number;
      vrot: number;
      life: number;
    }>
  >([]);
  const rafRef = useRef<number>(0);

  const burst = (amount = 85) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const colors = ["#F0B232", "#23A55A", "#FFFFFF", "#3B82F6", "#F43F5E", "#FACC15"];
    for (let i = 0; i < amount; i++) {
      const fromLeft = i % 2 === 0;
      particlesRef.current.push({
        x: fromLeft ? canvas.width * 0.15 : canvas.width * 0.85,
        y: canvas.height * 0.65,
        vx: (fromLeft ? 1 : -1) * (3 + Math.random() * 9) + (Math.random() - 0.5) * 4,
        vy: -(8 + Math.random() * 12),
        size: 6 + Math.random() * 7,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * 360,
        vrot: (Math.random() - 0.5) * 14,
        life: 1,
      });
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const next = [];
      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32; // gravity
        p.vx *= 0.99;
        p.rot += p.vrot;
        p.life -= 0.008;
        if (p.life > 0 && p.y < canvas.height + 40) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rot * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          next.push(p);
        }
      }
      particlesRef.current = next;
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(rafRef.current);
    };
  }, [canvasRef]);

  return { burst };
}

function TvDisplayInner() {
  const searchParams = useSearchParams();
  const initialPin = searchParams?.get("pin") || "";
  const initialView = searchParams?.get("view") === "moderator" ? "moderator" : "projector";

  const [pinInput, setPinInput] = useState(initialPin);
  const [pinError, setPinError] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [asm, setAsm] = useState<Assessment | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [bigScreenGame, setBigScreenGame] = useState<any | null>(null);
  const [room, setRoom] = useState<LiveRoom | null>(null);
  const [muted, setMuted] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [qTimeLeft, setQTimeLeft] = useState<number>(15);
  const [revealing, setRevealing] = useState(false);
  const [vfxList, setVfxList] = useState<FloatingVfx[]>([]);
  const [isMobileScreen, setIsMobileScreen] = useState(false);
  const [viewMode, setViewMode] = useState<"projector" | "moderator">(initialView);
  const lastCheerIdRef = useRef<number>(0);

  const confettiRef = useRef<HTMLCanvasElement | null>(null);
  const { burst } = useConfettiCanvas(confettiRef);

  async function openByPin(pin: string) {
    const clean = pin.replace(/\s+/g, "").trim().toUpperCase();
    if (!clean) return;
    setConnecting(true);
    setPinError("");
    // 1. Cek terlebih dahulu apakah PIN milik Game Khusus Layar Lebar
    try {
      const gRes = await fetch(`/api/bigscreen-game?pin=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData?.room) {
          let connected = gData.room;
          try {
            const cRes = await fetch("/api/bigscreen-game", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ pin: clean, action: "tv_connect" }),
            });
            if (cRes.ok) {
              const cJson = await cRes.json();
              if (cJson?.room) connected = cJson.room;
            }
          } catch {}
          soundEngine.stopBgm();
          setAsm(null);
          setRoom(null);
          setBigScreenGame(connected);
          setConnecting(false);
          return;
        }
      }
    } catch {}
    try {
      const res = await fetch(`/api/assessments?pin=${encodeURIComponent(clean)}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const serverAsm = (await res.json()) as Assessment;
        if (serverAsm.jenis === "Kuis") {
          setPinError("");
          setAsm(serverAsm);
          soundEngine.playBgm("lobby");
          setConnecting(false);
          return;
        }
      }
    } catch {}
    const all = getAssessments().filter((a) => a.jenis === "Kuis");
    const found =
      all.find((a) => a.pinKuis?.toUpperCase() === clean) ||
      (clean === "9026" ? all[0] : undefined);
    if (!found) {
      setPinError("PIN kuis atau game layar lebar tidak ditemukan.");
      setConnecting(false);
      return;
    }
    setPinError("");
    setAsm(found);
    soundEngine.playBgm("lobby");
    setConnecting(false);
  }

  useEffect(() => {
    if (initialPin) openByPin(initialPin);
    return () => soundEngine.stopBgm();
  }, [initialPin]);

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    return soundEngine.onBlockedChange(setAudioBlocked);
  }, []);

  useEffect(() => {
    const check = () => {
      const mob = window.innerWidth < 768;
      setIsMobileScreen(mob);
      if (mob) setViewMode("moderator");
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Backsound & Confetti otomatis per fase
  useEffect(() => {
    if (!room) return;
    if (room.status === "lobby") {
      soundEngine.playBgm("lobby");
    } else if (room.status === "question") {
      soundEngine.playBgm("quiz");
    } else if (room.status === "podium") {
      soundEngine.stopBgm();
      soundEngine.playSfx("fanfare");
      burst(140);
      setTimeout(() => {
        soundEngine.playSfx("applause");
        burst(110);
      }, 650);
    }
  }, [room?.status]);

  async function sendHostAction(payload: Record<string, unknown>) {
    if (!asm) return;
    const pin = asm.pinKuis || "9026";
    const res = await fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, ...payload }),
    });
    if (res.ok) setRoom(await res.json());
  }

  // Timer per soal + SFX 5-4-3-2-1 + Auto-Reveal 3 detik + Auto-Advance ke soal berikutnya!
  useEffect(() => {
    if (!asm || room?.status !== "question") return;
    const perSoal = asm.waktuPerSoalDetik || 15;
    setRevealing(false);
    setQTimeLeft(perSoal);

    const interval = setInterval(() => {
      setQTimeLeft((prev) => {
        const next = prev - 1;
        if (next >= 1 && next <= 5) {
          soundEngine.playTick(next);
        }
        if (next <= 0) {
          clearInterval(interval);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [asm?.id, asm?.waktuPerSoalDetik, room?.status, room?.currentQuestionIdx]);

  // Saat qTimeLeft menyentuh 0 -> bunyikan SFX, tampilkan jawaban benar 3 detik, lalu AUTO-NEXT!
  useEffect(() => {
    if (!asm || !room || room.status !== "question" || qTimeLeft !== 0 || revealing) {
      return;
    }
    setRevealing(true);
    soundEngine.playSfx("wrong");
    burst(45);

    const advanceTimer = setTimeout(() => {
      if (room.currentQuestionIdx + 1 < asm.soal.length) {
        soundEngine.playSfx("correct");
        sendHostAction({
          action: "host_update",
          currentQuestionIdx: room.currentQuestionIdx + 1,
        });
      } else {
        sendHostAction({
          action: "host_update",
          status: "podium",
        });
      }
    }, 3000);

    return () => clearTimeout(advanceTimer);
  }, [qTimeLeft, revealing, room?.status, room?.currentQuestionIdx, asm]);

  // Polling real-time dari /api/live
  useEffect(() => {
    if (!asm) return;
    const pin = asm.pinKuis || "9026";
    let active = true;

    const poll = async () => {
      try {
        const res = await fetch(`/api/live?pin=${encodeURIComponent(pin)}`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as LiveRoom;
        if (!active) return;
        setRoom(data);

        if (data.cheers.length > 0) {
          const newest = data.cheers[0];
          if (newest.id > lastCheerIdRef.current) {
            if (lastCheerIdRef.current !== 0) {
              const sfx: SfxName =
                newest.sound === "horn" ||
                newest.sound === "applause" ||
                newest.sound === "fanfare"
                  ? (newest.sound as SfxName)
                  : "correct";
              soundEngine.playSfx(sfx);
              if (sfx === "fanfare" || sfx === "applause") burst(55);
              const uid = `${newest.id}-${Date.now()}`;
              setVfxList((prev) => [
                ...prev.slice(-10),
                {
                  uid,
                  type: newest.sound,
                  label: newest.label,
                  sender: newest.sender,
                  leftPct: 16 + Math.floor(Math.random() * 68),
                },
              ]);
              setTimeout(() => {
                setVfxList((prev) => prev.filter((x) => x.uid !== uid));
              }, 2200);
            }
            lastCheerIdRef.current = newest.id;
          }
        }
      } catch {}
    };

    poll();
    const timer = setInterval(poll, 900);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [asm]);

  function startWithCountdown() {
    setCountdown(3);
    soundEngine.playTick(3);
    setTimeout(() => {
      setCountdown(2);
      soundEngine.playTick(2);
    }, 750);
    setTimeout(() => {
      setCountdown(1);
      soundEngine.playTick(1);
    }, 1500);
    setTimeout(() => {
      setCountdown(null);
      burst(60);
      sendHostAction({
        action: "host_update",
        status: "question",
        currentQuestionIdx: 0,
      });
    }, 2250);
  }

  function toggleFullscreen() {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  /* ================= 1. LAYAR INPUT PIN ================= */
  if (bigScreenGame) {
    return (
      <BigScreenDisplay
        pin={bigScreenGame.pin}
        initialRoom={bigScreenGame}
        onExit={() => setBigScreenGame(null)}
      />
    );
  }

  if (!asm || !room) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#121518] p-6 text-white">
        <div className="animate-orb-slow pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#008A52]/20 blur-3xl" />
        <div className="animate-orb-slower pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#F0B232]/15 blur-3xl" />

        <div className="animate-pop-in relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-[#1C2026]/90 p-8 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#008A52]/20 px-3 py-1 text-[11px] font-bold text-[#23A55A]">
              <Tv className="h-3.5 w-3.5" />
              <span>LAYAR PROYEKTOR</span>
            </span>
            <Link href="/login" className="text-xs font-semibold text-slate-400 hover:text-white">
              ← Kembali
            </Link>
          </div>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight">
            Hubungkan ke Layar Lebar
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            Masukkan <strong className="text-white">PIN Kuis</strong> untuk
            menampilkan arena interaktif penuh efek visual & backsound.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              openByPin(pinInput);
            }}
            className="mt-6 space-y-3"
          >
            <input
              type="text"
              required
              maxLength={6}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              placeholder="PIN 4 Digit (Kuis / Game)"
              className="w-full rounded-2xl border border-white/10 bg-[#121518] px-4 py-4 text-center text-3xl font-black tracking-[0.35em] text-[#F0B232] placeholder:text-sm placeholder:tracking-normal placeholder:text-slate-500 focus:border-[#23A55A] focus:outline-none"
            />
            {pinError && <p className="text-center text-xs text-rose-400">{pinError}</p>}
            <button
              type="submit"
              disabled={connecting}
              className="w-full rounded-2xl bg-[#008A52] py-3.5 text-sm font-bold text-white transition hover:bg-[#006B3F] disabled:opacity-60"
            >
              {connecting ? "Menghubungkan..." : "Tampilkan di Layar Besar"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const activePlayers = room.players.filter((p) => !p.eliminated);
  const spectators = room.players.filter((p) => p.eliminated);
  const sorted = [...room.players].sort((a, b) => b.skor - a.skor);
  const curQ = asm.soal[room.currentQuestionIdx];
  const totalSec = asm.waktuPerSoalDetik || 15;
  const timeBarPct = Math.round((qTimeLeft / totalSec) * 100);
  const isTension = room.status === "question" && qTimeLeft > 0 && qTimeLeft <= 5;

  return (
    <div
      onClick={() => soundEngine.unlock()}
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#121518] text-[#F2F3F5] transition-shadow ${
        isTension ? "animate-tension" : ""
      }`}
    >
      {/* Ambient Moving Orbs Background */}
      <div className="animate-orb-slow pointer-events-none fixed -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-[#008A52]/18 blur-3xl" />
      <div className="animate-orb-slower pointer-events-none fixed -right-32 bottom-1/4 h-[420px] w-[420px] rounded-full bg-[#F0B232]/14 blur-3xl" />

      {/* 60fps Confetti Canvas */}
      <canvas
        ref={confettiRef}
        className="pointer-events-none fixed inset-0 z-50"
      />

      {/* Countdown 3-2-1 */}
      {countdown !== null && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#121518]/95 backdrop-blur-md">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#23A55A]">
            BERSIAP DI HP KALIAN
          </span>
          <div
            key={countdown}
            className="animate-pop-in mt-3 text-[130px] font-black leading-none text-[#F0B232]"
          >
            {countdown}
          </div>
        </div>
      )}

      {/* Floating Vector VFX Pills dari HP Spektator */}
      <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
        {vfxList.map((v) => (
          <div
            key={v.uid}
            style={{ left: `${v.leftPct}%`, bottom: "48px" }}
            className="animate-float-vfx absolute flex items-center gap-2 rounded-full border border-white/20 bg-[#1C2026]/95 px-4 py-2 shadow-2xl backdrop-blur"
          >
            <VfxIcon type={v.type} />
            <div className="text-xs font-bold text-white">
              <span>{v.sender}</span>
              <span className="ml-1.5 text-[#F0B232]">{v.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#1C2026]/90 px-6 py-3.5 backdrop-blur">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => {
              soundEngine.stopBgm();
              setAsm(null);
            }}
            className="rounded-xl bg-white/5 p-2 text-slate-300 hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold tracking-wider text-[#23A55A]">
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>LIVE DISPLAY • SAHABAT NALAR PAI</span>
            </div>
            <h1 className="text-base font-extrabold sm:text-xl">{asm.judul}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 rounded-xl bg-[#121518] px-4 py-1.5 ring-1 ring-white/10">
            <span className="text-[10px] font-bold uppercase text-slate-400">PIN</span>
            <span className="text-xl font-black tracking-widest text-[#F0B232]">
              {asm.pinKuis || "9026"}
            </span>
          </div>
          <button
            onClick={() => setMuted(!muted)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
          >
            {muted ? (
              <VolumeX className="h-4 w-4 text-rose-400" />
            ) : (
              <>
                <Music className="h-3.5 w-3.5 text-[#23A55A]" />
                <Volume2 className="h-4 w-4 text-[#23A55A]" />
              </>
            )}
          </button>
          {!isMobileScreen && (
            <button
              onClick={() => setViewMode(viewMode === "projector" ? "moderator" : "projector")}
              className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white hover:bg-white/20"
            >
              {viewMode === "projector" ? "Mode Moderator" : "Mode Layar Besar"}
            </button>
          )}
          <button onClick={toggleFullscreen} className="rounded-xl bg-white/5 p-2.5 text-slate-300 hover:bg-white/10">
            <Maximize2 className="h-4 w-4" />
          </button>
          <button onClick={() => sendHostAction({ action: "reset" })} className="rounded-xl bg-white/5 p-2.5 text-slate-300 hover:bg-white/10">
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </header>

      {audioBlocked && !muted && (
        <div className="relative z-20 flex shrink-0 items-center justify-center gap-3 bg-[#F0B232] px-4 py-2 text-xs font-extrabold text-[#121518]">
          <span>Browser menahan audio otomatis.</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              soundEngine.unlock();
              soundEngine.playSfx("correct");
            }}
            className="rounded-full bg-[#121518] px-3.5 py-1 text-white"
          >
            Klik untuk Aktifkan Suara Proyektor
          </button>
        </div>
      )}

      {/* Main Stage */}
      <div className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6">
        {viewMode === "moderator" ? (
          <div className="mx-auto max-w-lg space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#1C2026] p-5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#5865F2]/20 px-3 py-1 text-[11px] font-bold text-[#8EA1E1]">
                  <Headphones className="h-3.5 w-3.5" />
                  Mode Moderator / Admin {isMobileScreen ? "(Smartphone)" : ""}
                </span>
                <span className="text-xs font-bold text-[#F0B232]">
                  {room.status === "lobby" ? "Lobby" : room.status === "podium" ? "Selesai" : `Soal ${room.currentQuestionIdx + 1}/${asm.soal.length}`}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {isMobileScreen
                  ? "Mode Layar Besar hanya tersedia di Desktop/Proyektor. Di smartphone Anda mengendalikan jalannya kuis dan memantau skor sebagai Moderator."
                  : "Anda sedang dalam Mode Moderator ringkas. Klik tombol Mode Layar Besar di atas untuk menampilkan layar proyektor."}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {room.status === "lobby" && (
                  <button
                    onClick={startWithCountdown}
                    className="flex-1 rounded-xl bg-[#008A52] py-2.5 text-xs font-bold text-white"
                  >
                    Mulai Kuis
                  </button>
                )}
                {room.status === "question" && (
                  <button
                    onClick={() => {
                      if (room.currentQuestionIdx + 1 < asm.soal.length) {
                        sendHostAction({ action: "host_update", currentQuestionIdx: room.currentQuestionIdx + 1 });
                      } else {
                        sendHostAction({ action: "host_update", status: "podium" });
                      }
                    }}
                    className="flex-1 rounded-xl bg-[#F0B232] py-2.5 text-xs font-black text-[#121518]"
                  >
                    {room.currentQuestionIdx + 1 < asm.soal.length ? "Soal Berikutnya →" : "Podium Akhir"}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#1C2026] p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#F0B232]">
                Papan Skor Live ({sorted.length} Peserta)
              </h3>
              <div className="mt-3 space-y-2">
                {sorted.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-500">Belum ada peserta masuk.</p>
                ) : (
                  sorted.map((p, rank) => (
                    <div key={p.id} className="flex items-center justify-between rounded-xl bg-[#2B2F36] px-3.5 py-2.5 text-xs">
                      <span className="font-bold">#{rank + 1} {p.nama}</span>
                      <span className="font-black text-[#F0B232]"><NumberTicker value={p.skor} /></span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
        <>
        {room.status === "lobby" && (
          <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center text-center">
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
              MASUKKAN PIN KUIS DI HP MURID
            </div>
            <div className="mt-2 text-7xl font-black tracking-[0.22em] text-[#F0B232] drop-shadow-lg sm:text-8xl">
              {asm.pinKuis || "9026"}
            </div>
            <div className="mt-8 w-full rounded-3xl border border-white/10 bg-[#1C2026]/85 p-6 backdrop-blur">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#23A55A]" />
                  Peserta Bergabung ({room.players.length})
                </span>
                <span className="text-[#23A55A]">{totalSec} detik / soal</span>
              </div>
              {room.players.length === 0 ? (
                <p className="py-8 text-sm text-slate-500">
                  Menunggu murid memasukkan kode di perangkat mereka...
                </p>
              ) : (
                <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                  {room.players.map((p) => (
                    <span
                      key={p.id}
                      className="animate-pop-in rounded-full bg-[#2B2F36] px-4 py-2 text-sm font-bold text-white ring-1 ring-white/10"
                    >
                      {p.nama}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={startWithCountdown}
              className="mt-7 inline-flex items-center gap-2.5 rounded-2xl bg-[#008A52] px-9 py-4 text-base font-extrabold text-white shadow-xl transition hover:scale-105 hover:bg-[#23A55A]"
            >
              <Play className="h-5 w-5 fill-white" />
              <span>Mulai Kuis Sekarang</span>
            </button>
          </div>
        )}

        {room.status === "question" && curQ && (
          <div className="mx-auto grid h-full max-w-7xl gap-6 lg:grid-cols-12">
            <div key={curQ.id} className="animate-pop-in flex flex-col justify-between space-y-5 lg:col-span-8">
              <div className="space-y-4">
                {/* Baris Info + Timer Countdown */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="rounded-full bg-[#1C2026] px-4 py-1.5 text-xs font-extrabold text-[#F0B232] ring-1 ring-white/10">
                      SOAL {room.currentQuestionIdx + 1} DARI {asm.soal.length}
                    </span>
                    <span
                      className={`rounded-full px-4 py-1.5 text-sm font-black transition ${
                        revealing
                          ? "bg-[#F0B232] text-[#121518]"
                          : qTimeLeft <= 5
                          ? "animate-pulse bg-rose-600 text-white"
                          : "bg-[#008A52] text-white"
                      }`}
                    >
                      {revealing ? "WAKTU HABIS • LANJUT OTOMATIS..." : `${qTimeLeft} detik`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-semibold text-slate-400">
                    <span>{activePlayers.length} Bertanding</span>
                    <span>•</span>
                    <span>{spectators.length} Spektator</span>
                  </div>
                </div>

                {/* Progress Bar Waktu Mulus */}
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full transition-all duration-1000 ease-linear ${
                      qTimeLeft <= 5
                        ? "bg-rose-500"
                        : qTimeLeft <= totalSec * 0.45
                        ? "bg-[#F0B232]"
                        : "bg-[#23A55A]"
                    }`}
                    style={{ width: `${timeBarPct}%` }}
                  />
                </div>

                <div className="rounded-3xl border border-white/10 bg-[#1C2026]/90 p-7 backdrop-blur">
                  <h2 className="text-2xl font-extrabold leading-snug text-white sm:text-3xl">
                    {curQ.pertanyaan}
                  </h2>
                </div>

                <div className="grid gap-3.5 sm:grid-cols-2">
                  {curQ.opsi.map((opt, idx) => {
                    const st = OPT_STYLES[idx % 4];
                    const isCorrectOpt = idx === curQ.jawabanBenar;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between gap-3 rounded-2xl p-5 text-base font-bold text-white shadow-lg transition-all duration-500 ${st.bg} ${
                          revealing
                            ? isCorrectOpt
                              ? "scale-[1.03] ring-4 ring-[#F0B232]"
                              : "opacity-25 scale-95"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black/25 text-lg">
                            {st.shape}
                          </span>
                          <span>{opt}</span>
                        </div>
                        {revealing && isCorrectOpt && (
                          <CheckCircle2 className="h-7 w-7 shrink-0 text-[#F0B232]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (room.currentQuestionIdx + 1 < asm.soal.length) {
                      soundEngine.playSfx("correct");
                      sendHostAction({
                        action: "host_update",
                        currentQuestionIdx: room.currentQuestionIdx + 1,
                      });
                    } else {
                      sendHostAction({ action: "host_update", status: "podium" });
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl bg-white/10 px-5 py-2.5 text-xs font-bold text-slate-200 hover:bg-white/20"
                >
                  <span>Lewati Sekarang</span>
                  <SkipForward className="h-4 w-4" />
                </button>
              </div>
            </div>

            <aside className="flex flex-col gap-5 lg:col-span-4">
              <div className="flex-1 rounded-3xl border border-white/10 bg-[#1C2026]/90 p-5 backdrop-blur">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-[#F0B232]">
                    <Trophy className="h-4 w-4" />
                    <span>Papan Skor Live</span>
                  </h3>
                  <span className="text-[10px] font-bold text-[#23A55A]">REAL-TIME</span>
                </div>
                {sorted.length === 0 ? (
                  <p className="py-10 text-center text-xs text-slate-500">
                    Menunggu jawaban dari HP murid...
                  </p>
                ) : (
                  <div className="mt-4 space-y-2.5">
                    {sorted.slice(0, 6).map((p, rank) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3 transition-all duration-500 ${
                          rank === 0
                            ? "bg-[#F0B232] text-[#121518] shadow-lg"
                            : "bg-[#2B2F36] text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-sm font-black">#{rank + 1}</span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold">{p.nama}</div>
                            <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                              {p.streak >= 2 && (
                                <span className="inline-flex items-center font-bold">
                                  <Flame className="h-3 w-3" /> {p.streak}x
                                </span>
                              )}
                              <span>{p.eliminated ? "Spektator" : `${p.benar} benar`}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-base font-black">
                          <NumberTicker value={p.skor} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-white/10 bg-[#1C2026]/90 p-5 backdrop-blur">
                <h3 className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-300">
                  <Headphones className="h-4 w-4 text-[#5865F2]" />
                  <span>Sorakan Spektator ({spectators.length})</span>
                </h3>
                <div className="mt-3 space-y-2">
                  {room.cheers.length === 0 ? (
                    <p className="text-xs text-slate-500">
                      Sorakan & efek dari HP spektator tampil otomatis di sini.
                    </p>
                  ) : (
                    room.cheers.slice(0, 3).map((c) => (
                      <div
                        key={c.id}
                        className="animate-pop-in flex items-center gap-2 rounded-xl bg-[#121518] px-3 py-2 text-xs text-slate-300"
                      >
                        <VfxIcon type={c.sound} />
                        <span className="truncate">
                          <strong className="text-white">{c.sender}</strong>: {c.label}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {room.status === "podium" && (
          <div className="mx-auto flex h-full max-w-4xl flex-col items-center justify-center text-center">
            <Crown className="h-16 w-16 animate-bounce text-[#F0B232]" />
            <h2 className="mt-2 text-4xl font-black tracking-tight">
              Podium Juara Kuis
            </h2>
            <p className="mt-1 text-sm text-slate-400">{asm.judul}</p>
            {sorted.length === 0 ? (
              <p className="mt-8 text-sm text-slate-500">Belum ada skor peserta.</p>
            ) : (
              <div className="mt-12 grid w-full max-w-2xl items-end gap-5 sm:grid-cols-3">
                {sorted[1] && (
                  <div className="animate-pop-in order-2 rounded-3xl border border-white/10 bg-[#1C2026] p-6 sm:order-1">
                    <div className="text-2xl font-black text-slate-300">#2</div>
                    <div className="mt-2 text-base font-extrabold">{sorted[1].nama}</div>
                    <div className="mt-1 text-2xl font-black text-[#23A55A]">
                      <NumberTicker value={sorted[1].skor} />
                    </div>
                  </div>
                )}
                {sorted[0] && (
                  <div className="animate-pop-in order-1 rounded-3xl bg-[#F0B232] p-8 text-[#121518] shadow-2xl sm:order-2 sm:scale-110">
                    <div className="text-3xl font-black">#1 JUARA</div>
                    <div className="mt-2 text-xl font-black">{sorted[0].nama}</div>
                    <div className="mt-1 text-3xl font-black">
                      <NumberTicker value={sorted[0].skor} />
                    </div>
                  </div>
                )}
                {sorted[2] && (
                  <div className="animate-pop-in order-3 rounded-3xl border border-white/10 bg-[#1C2026] p-5">
                    <div className="text-2xl font-black text-amber-400">#3</div>
                    <div className="mt-2 text-base font-extrabold">{sorted[2].nama}</div>
                    <div className="mt-1 text-xl font-black text-[#23A55A]">
                      <NumberTicker value={sorted[2].skor} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  );
}

export default function TvPage() {
  return (
    <Suspense fallback={<div className="fixed inset-0 bg-[#121518]" />}>
      <TvDisplayInner />
    </Suspense>
  );
}
