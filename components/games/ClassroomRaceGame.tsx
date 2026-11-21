"use client";

import { useEffect, useRef, useState } from "react";
import { TUG_QUESTIONS } from "@/data/game-bank";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { Flag, Play, RotateCcw, Sparkles, Trophy, Zap } from "lucide-react";

interface Racer {
  id: number;
  name: string;
  keyLabel: string;
  keyCode: string;
  color: string;
  accent: string;
  pos: number; // 0..100
  boostFrames: number;
}

const INITIAL_RACERS: Racer[] = [
  { id: 0, name: "Tim Hijau", keyLabel: "A", keyCode: "KeyA", color: "#10b981", accent: "#6ee7b7", pos: 0, boostFrames: 0 },
  { id: 1, name: "Tim Emas", keyLabel: "F", keyCode: "KeyF", color: "#F0B232", accent: "#fef08a", pos: 0, boostFrames: 0 },
  { id: 2, name: "Tim Biru", keyLabel: "J", keyCode: "KeyJ", color: "#0ea5e9", accent: "#7dd3fc", pos: 0, boostFrames: 0 },
  { id: 3, name: "Tim Merah", keyLabel: "L", keyCode: "KeyL", color: "#f43f5e", accent: "#fda4af", pos: 0, boostFrames: 0 },
];

export function ClassroomRaceGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "buzz" | "answer" | "win">("ready");
  const [racers, setRacers] = useState<Racer[]>(INITIAL_RACERS);
  const [qIdx, setQIdx] = useState(0);
  const [buzzedTeam, setBuzzedTeam] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [winner, setWinner] = useState<Racer | null>(null);

  const animPosRef = useRef([0, 0, 0, 0]);
  const boostRef = useRef([0, 0, 0, 0]);
  const sparksRef = useRef<{ x: number; y: number; vx: number; vy: number; life: number; color: string }[]>([]);
  const racersRef = useRef(racers);
  racersRef.current = racers;

  const currentQ = TUG_QUESTIONS[qIdx % TUG_QUESTIONS.length];

  function burst(x: number, y: number, color: string, count = 20) {
    for (let i = 0; i < count; i++) {
      sparksRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 8,
        life: 28 + Math.random() * 18,
        color,
      });
    }
  }

  function startGame() {
    const fresh = INITIAL_RACERS.map((r) => ({ ...r, pos: 0, boostFrames: 0 }));
    setRacers(fresh);
    animPosRef.current = [0, 0, 0, 0];
    boostRef.current = [0, 0, 0, 0];
    setQIdx(Math.floor(Math.random() * TUG_QUESTIONS.length));
    setBuzzedTeam(null);
    setWinner(null);
    setFeedback("");
    setPhase("buzz");
    arcadeAudio.powerup();
  }

  function handleBuzz(teamIdx: number) {
    if (phase !== "buzz") return;
    setBuzzedTeam(teamIdx);
    setPhase("answer");
    arcadeAudio.bounce();
  }

  function handleAnswer(optIdx: number) {
    if (phase !== "answer" || buzzedTeam === null) return;
    const isRight = optIdx === currentQ.answerIndex;
    const team = racers[buzzedTeam];

    if (isRight) {
      arcadeAudio.coin();
      const bonus = Math.random() < 0.25 ? 25 : 20;
      boostRef.current[buzzedTeam] = 45;
      const updated = racers.map((r, i) =>
        i === buzzedTeam ? { ...r, pos: Math.min(100, r.pos + bonus) } : r
      );
      setRacers(updated);
      burst(100 + (updated[buzzedTeam].pos / 100) * 610, 56 + buzzedTeam * 58, team.color, 26);

      if (updated[buzzedTeam].pos >= 100) {
        setWinner(updated[buzzedTeam]);
        setPhase("win");
        arcadeAudio.win();
        for (let k = 0; k < 5; k++) {
          burst(160 + k * 120, 120, INITIAL_RACERS[k % 4].color, 22);
        }
        return;
      }

      setFeedback(`🔥 BENAR! ${team.name} melaju +${bonus}m ${bonus === 25 ? "(NITRO TURBO!)" : ""}`);
      setTimeout(() => {
        setFeedback("");
        setBuzzedTeam(null);
        setQIdx((i) => (i + 1) % TUG_QUESTIONS.length);
        setPhase("buzz");
      }, 1300);
    } else {
      arcadeAudio.hit();
      const updated = racers.map((r, i) =>
        i === buzzedTeam ? { ...r, pos: Math.max(0, r.pos - 5) } : r
      );
      setRacers(updated);
      setFeedback(`Kurang tepat! ${team.name} mundur sedikit — tim lain boleh merebut!`);
      setTimeout(() => {
        setFeedback("");
        setBuzzedTeam(null);
        setPhase("buzz");
      }, 1100);
    }
  }

  // Keyboard buzzer listener (A, F, J, L)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "buzz") return;
      const idx = INITIAL_RACERS.findIndex((r) => r.keyCode === e.code);
      if (idx !== -1) {
        e.preventDefault();
        handleBuzz(idx);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // 60FPS Race Track Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 260;
    let raf = 0;
    let tick = 0;

    function loop() {
      tick += 1;
      if (!ctx) return;

      // Asphalt track background
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, W, H);

      // 4 Lanes
      for (let i = 0; i < 4; i++) {
        const y = 24 + i * 58;
        ctx.fillStyle = i % 2 === 0 ? "#1e293b" : "#172033";
        ctx.fillRect(0, y, W, 52);

        // Dashed lane divider
        ctx.strokeStyle = "rgba(255,255,255,0.16)";
        ctx.setLineDash([14, 14]);
        ctx.lineDashOffset = -tick * 2;
        ctx.beginPath();
        ctx.moveTo(0, y + 52);
        ctx.lineTo(W, y + 52);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Checkered Finish Line
      const fx = 720;
      for (let r = 0; r < 14; r++) {
        ctx.fillStyle = r % 2 === 0 ? "#ffffff" : "#0f172a";
        ctx.fillRect(fx, 24 + r * 16.5, 10, 16.5);
        ctx.fillStyle = r % 2 === 1 ? "#ffffff" : "#0f172a";
        ctx.fillRect(fx + 10, 24 + r * 16.5, 10, 16.5);
      }

      // Draw Racers
      racersRef.current.forEach((r, i) => {
        animPosRef.current[i] += (r.pos - animPosRef.current[i]) * 0.12;
        if (boostRef.current[i] > 0) boostRef.current[i] -= 1;

        const rx = 54 + (animPosRef.current[i] / 100) * 635;
        const ry = 50 + i * 58 + Math.sin(tick * 0.3 + i) * 1.5;

        // Turbo flame
        if (boostRef.current[i] > 0) {
          ctx.fillStyle = tick % 2 === 0 ? "#F0B232" : "#fb7185";
          ctx.beginPath();
          ctx.moveTo(rx - 22, ry - 8);
          ctx.lineTo(rx - 44 - Math.random() * 14, ry);
          ctx.lineTo(rx - 22, ry + 8);
          ctx.closePath();
          ctx.fill();
        }

        // Car body
        ctx.fillStyle = r.color;
        ctx.beginPath();
        ctx.roundRect(rx - 24, ry - 14, 52, 28, 10);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Cockpit window
        ctx.fillStyle = "#0f172a";
        ctx.beginPath();
        ctx.roundRect(rx + 2, ry - 9, 16, 18, 5);
        ctx.fill();

        // Team badge
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 11px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(r.keyLabel, rx - 10, ry + 4);
      });

      // Sparks
      for (const sp of sparksRef.current) {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 1;
        ctx.globalAlpha = Math.max(0, sp.life / 40);
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x, sp.y, 5, 5);
      }
      ctx.globalAlpha = 1;
      sparksRef.current = sparksRef.current.filter((s) => s.life > 0);

      raf = requestAnimationFrame(loop);
    }

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="space-y-4 rounded-3xl bg-gradient-to-br from-slate-900 via-kemenag-950 to-slate-900 p-5 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-[11px] font-bold text-gold-400">
            <Flag className="h-3.5 w-3.5" /> BALAP LINTAS ILMU • 4 TIM SATU KELAS
          </span>
          <h3 className="mt-1 text-xl font-extrabold">
            Grand Prix PAI Kelas X (Rebutan Buzzer!)
          </h3>
        </div>
        <button
          onClick={startGame}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-5 py-2 text-xs font-extrabold text-slate-950 hover:bg-gold-400"
        >
          {phase === "ready" ? <Play className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
          <span>{phase === "ready" ? "Mulai Balapan!" : "Ulangi Balapan"}</span>
        </button>
      </div>

      {/* 60FPS Race Track */}
      <canvas
        ref={canvasRef}
        width={800}
        height={260}
        className="block w-full rounded-2xl border border-white/15 shadow-lg"
      />

      {phase === "ready" && (
        <div className="rounded-2xl bg-white/10 p-5 text-center text-xs text-slate-200">
          Bagi kelas menjadi <strong>4 Tim</strong> (Hijau, Emas, Biru, Merah). Saat soal muncul, perwakilan tim berlomba menekan tombol buzzer di keyboard (<strong>A</strong>, <strong>F</strong>, <strong>J</strong>, <strong>L</strong>) atau klik tombol tim di layar untuk merebut hak jawab dan melesat ke garis finis!
        </div>
      )}

      {(phase === "buzz" || phase === "answer") && (
        <div className="space-y-4 rounded-3xl bg-white p-5 text-slate-900 shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="rounded-full bg-kemenag-100 px-3 py-1 text-[11px] font-extrabold text-kemenag-800">
              {currentQ.bab} • SOAL REBUTAN
            </span>
            {buzzedTeam !== null ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-extrabold text-white"
                style={{ backgroundColor: racers[buzzedTeam].color }}
              >
                <Zap className="h-3.5 w-3.5" /> HAK JAWAB: {racers[buzzedTeam].name.toUpperCase()}!
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-700">
                ⚡ Rebut tombol buzzer (A / F / J / L) atau klik tim yang tercepat!
              </span>
            )}
          </div>

          <p className="text-lg font-extrabold leading-snug">{currentQ.question}</p>

          {phase === "buzz" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {racers.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => handleBuzz(i)}
                  className="flex flex-col items-center justify-center rounded-2xl py-4 text-white shadow-md transition hover:scale-[1.02] active:scale-95"
                  style={{ backgroundColor: r.color }}
                >
                  <span className="text-xs font-extrabold">{r.name}</span>
                  <span className="mt-1 rounded-full bg-black/25 px-3 py-0.5 text-[11px] font-black">
                    Tombol [ {r.keyLabel} ]
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-2">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  disabled={!!feedback}
                  onClick={() => handleAnswer(idx)}
                  className="flex items-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-extrabold text-slate-800 transition hover:border-kemenag-600 hover:bg-kemenag-50"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kemenag-600 text-[11px] text-white">
                    {["A", "B", "C", "D"][idx]}
                  </span>
                  <span>{opt}</span>
                </button>
              ))}
            </div>
          )}

          {feedback && (
            <div className="rounded-2xl bg-kemenag-50 p-3 text-center text-xs font-extrabold text-kemenag-900">
              {feedback}
            </div>
          )}
        </div>
      )}

      {phase === "win" && winner && (
        <div className="rounded-3xl bg-gold-500/20 p-6 text-center ring-2 ring-gold-400">
          <Trophy className="mx-auto h-12 w-12 text-gold-400" />
          <div className="mt-2 flex items-center justify-center gap-2 text-2xl font-black text-gold-300">
            <Sparkles className="h-6 w-6" />
            <span>JUARA GRAND PRIX: {winner.name.toUpperCase()}!</span>
          </div>
          <p className="mt-1 text-xs text-slate-200">
            Luar biasa! Seluruh kelas tampil kompak dan tangkas menjawab tantangan PAI-BP.
          </p>
        </div>
      )}
    </div>
  );
}
