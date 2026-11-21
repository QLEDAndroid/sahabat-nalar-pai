"use client";

import { useEffect, useRef, useState } from "react";
import { TUG_QUESTIONS } from "@/data/game-bank";
import { arcadeAudio } from "@/lib/arcadeAudio";
import { Heart, Play, RotateCcw, Shield, Trophy } from "lucide-react";

interface Enemy {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  label: string;
  isBoss: boolean;
}

interface Bolt {
  x: number;
  y: number;
  tx: number;
  ty: number;
  progress: number;
  color: string;
}

const WAVE_ENEMIES = [
  "PASUKAN HOAKS",
  "BAYANGAN RIYĀ'",
  "GOLEM GHAḌAB",
  "BADAI HASAD",
  "MEGA BOSS RIBA",
];

export function TowerDefenseClassGame() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [phase, setPhase] = useState<"ready" | "playing" | "win" | "gameover">("ready");
  const [wave, setWave] = useState(1);
  const [hp, setHp] = useState(100);
  const [score, setScore] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [feedback, setFeedback] = useState("");

  const stRef = useRef({
    running: false,
    wave: 1,
    fortressHp: 100,
    score: 0,
    shake: 0,
    enemies: [] as Enemy[],
    bolts: [] as Bolt[],
    sparks: [] as { x: number; y: number; vx: number; vy: number; life: number; color: string }[],
  });

  const currentQ = TUG_QUESTIONS[qIdx % TUG_QUESTIONS.length];

  function spawnWave(waveNum: number) {
    const isBoss = waveNum === 5;
    const count = isBoss ? 1 : 2 + waveNum;
    const list: Enemy[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        id: Date.now() + i,
        x: 740 + i * 52,
        y: isBoss ? 125 : 65 + (i % 3) * 58,
        hp: isBoss ? 2 : 1,
        maxHp: isBoss ? 2 : 1,
        speed: isBoss ? 0.35 : 0.42 + waveNum * 0.06,
        label: WAVE_ENEMIES[(waveNum - 1) % WAVE_ENEMIES.length],
        isBoss,
      });
    }
    stRef.current.enemies = list;
  }

  function explode(x: number, y: number, color: string, count = 20) {
    for (let i = 0; i < count; i++) {
      stRef.current.sparks.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 9,
        vy: (Math.random() - 0.5) * 8,
        life: 24 + Math.random() * 16,
        color,
      });
    }
  }

  function startGame() {
    const st = stRef.current;
    st.running = true;
    st.wave = 1;
    st.fortressHp = 100;
    st.score = 0;
    st.shake = 0;
    st.bolts = [];
    st.sparks = [];
    spawnWave(1);
    setWave(1);
    setHp(100);
    setScore(0);
    setQIdx(Math.floor(Math.random() * TUG_QUESTIONS.length));
    setFeedback("");
    setPhase("playing");
    arcadeAudio.powerup();
  }

  function fireCannon(optIdx: number) {
    if (phase !== "playing" || !stRef.current.running) return;
    const st = stRef.current;
    const ok = optIdx === currentQ.answerIndex;

    if (ok) {
      arcadeAudio.laser();
      st.shake = 7;
      // Fire glowing bolts from fortress to every active enemy
      st.enemies.forEach((en) => {
        st.bolts.push({
          x: 115,
          y: 125,
          tx: en.x,
          ty: en.y,
          progress: 0,
          color: "#34d399",
        });
        en.hp -= 1;
        if (en.hp <= 0) {
          explode(en.x, en.y, "#F0B232", 24);
        }
      });
      setTimeout(() => arcadeAudio.explosion(), 140);
      st.enemies = st.enemies.filter((en) => en.hp > 0);
      st.score += 150;
      setScore(st.score);

      if (st.enemies.length === 0) {
        if (st.wave >= 5) {
          st.running = false;
          arcadeAudio.win();
          setPhase("win");
          return;
        }
        st.wave += 1;
        setWave(st.wave);
        spawnWave(st.wave);
        arcadeAudio.powerup();
        setFeedback(`🔥 GELOMBANG ${st.wave - 1} HANCUR! Bersiap menghadapi Gelombang ${st.wave}!`);
      } else {
        setFeedback("⚡ TEMBAKAN TEPAT! Boss terkena damage — serang sekali lagi!");
      }
    } else {
      arcadeAudio.hit();
      st.shake = 9;
      // Enemies surge forward
      st.enemies.forEach((en) => {
        en.x -= 55;
      });
      setFeedback("Meriam meleset! Musuh maju mendekati benteng!");
    }

    setQIdx((i) => (i + 1) % TUG_QUESTIONS.length);
  }

  // Keyboard 1,2,3,4 shortcut for classroom speed
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "playing") return;
      if (e.key === "1") fireCannon(0);
      if (e.key === "2") fireCannon(1);
      if (e.key === "3") fireCannon(2);
      if (e.key === "4") fireCannon(3);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 800;
    const H = 250;
    let raf = 0;

    function loop() {
      if (!ctx) return;
      const st = stRef.current;
      if (st.running) {
        if (st.shake > 0.3) st.shake *= 0.85;

        for (const en of st.enemies) {
          en.x -= en.speed;
          if (en.x <= 125) {
            st.fortressHp = Math.max(0, st.fortressHp - (en.isBoss ? 35 : 20));
            setHp(st.fortressHp);
            st.shake = 12;
            arcadeAudio.hit();
            explode(125, en.y, "#f43f5e", 18);
            en.x = 680; // bounce back for another siege pass
            if (st.fortressHp <= 0) {
              st.running = false;
              arcadeAudio.gameOver();
              setPhase("gameover");
            }
          }
        }
      }

      for (const b of st.bolts) b.progress += 0.14;
      st.bolts = st.bolts.filter((b) => b.progress < 1);
      for (const sp of st.sparks) {
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.life -= 1;
      }
      st.sparks = st.sparks.filter((s) => s.life > 0);

      // DRAW
      if (!ctx) return;
      ctx.save();
      if (st.shake > 0.4) {
        ctx.translate((Math.random() - 0.5) * st.shake, (Math.random() - 0.5) * st.shake);
      }

      const grad = ctx.createLinearGradient(0, 0, W, H);
      grad.addColorStop(0, "#022c22");
      grad.addColorStop(1, "#0f172a");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // Ground path
      ctx.fillStyle = "rgba(255,255,255,0.06)";
      ctx.fillRect(110, 42, W - 110, 170);

      // Fortress Wall (Left)
      ctx.fillStyle = "#006B3F";
      ctx.fillRect(20, 32, 92, 186);
      ctx.strokeStyle = "#F0B232";
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 32, 92, 186);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("BENTENG", 66, 118);
      ctx.fillText("ILMU", 66, 136);

      // Enemies
      for (const en of st.enemies) {
        const r = en.isBoss ? 34 : 22;
        ctx.fillStyle = en.isBoss ? "#9f1239" : "#e11d48";
        ctx.beginPath();
        ctx.arc(en.x, en.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = en.isBoss ? "#fde047" : "#fda4af";
        ctx.lineWidth = 3;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = en.isBoss ? "bold 11px sans-serif" : "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(en.label, en.x, en.y + 4);
      }

      // Plasma Bolts
      for (const b of st.bolts) {
        const bx = b.x + (b.tx - b.x) * b.progress;
        const by = b.y + (b.ty - b.y) * b.progress;
        ctx.strokeStyle = b.color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(bx, by);
        ctx.stroke();
      }

      // Sparks
      for (const sp of st.sparks) {
        ctx.globalAlpha = Math.max(0, sp.life / 35);
        ctx.fillStyle = sp.color;
        ctx.fillRect(sp.x, sp.y, 5, 5);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

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
            <Shield className="h-3.5 w-3.5" /> CO-OP SATU KELAS • BENTENG ILMU
          </span>
          <h3 className="mt-1 text-xl font-extrabold">
            Pertahankan Benteng Bersama (Gelombang {wave}/5)
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold">
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/25 px-3 py-1.5 text-rose-200 ring-1 ring-rose-400/50">
            <Heart className="h-3.5 w-3.5 fill-rose-400 text-rose-400" /> Benteng: {hp}%
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-500/20 px-3 py-1.5 text-gold-300">
            <Trophy className="h-3.5 w-3.5" /> {score} pts
          </span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={800}
        height={250}
        className="block w-full rounded-2xl border border-white/15 shadow-lg"
      />

      {phase === "ready" && (
        <div className="rounded-2xl bg-white/10 p-5 text-center">
          <p className="text-xs text-slate-200">
            Satu kelas bekerja sama! Diskusikan jawaban yang benar lalu pilih <strong>Meriam 1 / 2 / 3 / 4</strong> sebelum musuh menabrak Benteng Ilmu. Kalahkan 5 gelombang termasuk <strong>Mega Boss Riba</strong>!
          </p>
          <button
            onClick={startGame}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-500 px-6 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-gold-400"
          >
            <Play className="h-4 w-4" />
            <span>MULAI PERTAHANAN KELAS</span>
          </button>
        </div>
      )}

      {phase === "playing" && (
        <div className="space-y-3 rounded-3xl bg-white p-5 text-slate-900 shadow-lg">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="rounded-full bg-kemenag-100 px-3 py-0.5 text-kemenag-800">
              {currentQ.bab} • TEMBAK MERIAM YANG BENAR!
            </span>
            <span className="text-slate-500">Shortcut Keyboard: [1] [2] [3] [4]</span>
          </div>
          <p className="text-base font-extrabold">{currentQ.question}</p>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {currentQ.options.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => fireCannon(idx)}
                className="flex items-center gap-2.5 rounded-2xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-extrabold text-slate-800 transition hover:border-kemenag-600 hover:bg-kemenag-50 active:scale-95"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-kemenag-600 text-xs font-black text-white">
                  {idx + 1}
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>
          {feedback && (
            <p className="text-center text-xs font-extrabold text-kemenag-700">{feedback}</p>
          )}
        </div>
      )}

      {(phase === "win" || phase === "gameover") && (
        <div className="rounded-3xl bg-gold-500/20 p-6 text-center ring-2 ring-gold-400">
          <Trophy className="mx-auto h-11 w-11 text-gold-400" />
          <div className="mt-2 text-2xl font-black text-gold-300">
            {phase === "win" ? "BENTENG SELAMAT! SATU KELAS MENANG!" : "BENTENG RUNTUH!"}
          </div>
          <p className="mt-1 text-xs text-slate-200">Total Skor Kelas: {score} poin</p>
          <button
            onClick={startGame}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-6 py-2.5 text-xs font-extrabold text-slate-950"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Main Lagi</span>
          </button>
        </div>
      )}
    </div>
  );
}
