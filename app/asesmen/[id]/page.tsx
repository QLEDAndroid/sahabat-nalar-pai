"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  addSubmission,
  getAssessmentById,
  getCurrentUser,
} from "@/lib/storage";
import { soundEngine } from "@/lib/soundEngine";
import { Assessment, UserProfile } from "@/lib/types";
import { NumberTicker } from "@/components/ui/NumberTicker";
import {
  ArrowLeft,
  Award,
  CheckCircle2,
  Clock,
  Flag,
  Flame,
  Headphones,
  Radio,
  ShieldCheck,
  Sparkles,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react";

const KAHOOT_BUTTONS = [
  { bg: "bg-[#DA373C] active:bg-[#B82D32]", shape: "▲" },
  { bg: "bg-[#2563EB] active:bg-[#1D4ED8]", shape: "◆" },
  { bg: "bg-[#D97706] active:bg-[#B45309]", shape: "●" },
  { bg: "bg-[#008A52] active:bg-[#006B3F]", shape: "■" },
];

const CHEER_BUTTONS = [
  { label: "Hype!", sound: "horn", icon: Zap },
  { label: "Tepuk Tangan", sound: "applause", icon: Award },
  { label: "MasyaAllah!", sound: "fanfare", icon: Sparkles },
  { label: "Semangat!", sound: "correct", icon: Flame },
];

export default function AssessmentRunnerPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const [asm, setAsm] = useState<Assessment | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});
  const [curIdx, setCurIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const [submitted, setSubmitted] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  // Khusus Kuis Interaktif (sinkron dengan Layar TV atau Mandiri)
  const [syncLive, setSyncLive] = useState(true);
  const [tvStatus, setTvStatus] = useState<"lobby" | "question" | "podium">("lobby");
  const [tvIdx, setTvIdx] = useState(0);
  const [answeredForIdx, setAnsweredForIdx] = useState<number | null>(null);
  const [kahootScore, setKahootScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [eliminated, setEliminated] = useState(false);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    pts: number;
    pembahasan: string;
  } | null>(null);

  useEffect(() => {
    const u = getCurrentUser();
    setUser(u);
    const applyFound = (found: Assessment | null) => {
      setAsm(found);
      if (found) {
        setSecondsLeft(found.durasiMenit * 60);
        if (found.jenis === "Kuis" && u) {
          fetch("/api/live", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pin: found.pinKuis || "9026",
              action: "join",
              id: u.id,
              nama: u.nama,
            }),
          }).catch(() => {});
        }
      }
    };
    fetch(`/api/assessments?id=${encodeURIComponent(id)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((serverAsm) => applyFound(serverAsm || getAssessmentById(id) || null))
      .catch(() => applyFound(getAssessmentById(id) || null));
  }, [id]);

  // Sinkronisasi real-time HP murid mengikuti Layar Besar TV saat mode Kuis Live
  useEffect(() => {
    if (!asm || asm.mode !== "kahoot" || !syncLive) return;
    const pin = asm.pinKuis || "9026";
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/live?pin=${encodeURIComponent(pin)}`, {
          cache: "no-store",
        });
        if (!res.ok || !active) return;
        const data = await res.json();
        setTvStatus(data.status);
        if (data.currentQuestionIdx !== tvIdx) {
          setTvIdx(data.currentQuestionIdx);
          setCurIdx(data.currentQuestionIdx);
          setFeedback(null);
          setAnsweredForIdx(null);
        }
        if (data.status === "podium" && !submitted) {
          finishExam();
        }
      } catch {
        // ignore
      }
    };
    poll();
    const timer = setInterval(poll, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [asm, syncLive, tvIdx, submitted]);

  // Timer global untuk Ulangan CBT / Google Form
  useEffect(() => {
    if (!asm || submitted || asm.mode === "kahoot") return;
    const t = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [asm, submitted]);

  if (!asm) {
    return (
      <div className="rounded-3xl border bg-white p-8 text-center text-xs">
        Asesmen tidak ditemukan.{" "}
        <Link href="/" className="font-bold text-kemenag-700 underline">
          Kembali
        </Link>
      </div>
    );
  }

  const mins = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const secs = String(secondsLeft % 60).padStart(2, "0");
  const answeredCount = Object.keys(answers).length;
  const progressPct = Math.round(
    (answeredCount / Math.max(1, asm.soal.length)) * 100
  );

  function finishExam() {
    if (!asm) return;
    let benar = 0;
    asm.soal.forEach((q) => {
      if (answers[q.id] === q.jawabanBenar) benar++;
    });
    const skor = Math.round((benar / Math.max(1, asm.soal.length)) * 100);
    if (user) {
      addSubmission({
        assessmentId: asm.id,
        assessmentJudul: asm.judul,
        classId: asm.classId,
        studentId: user.id,
        studentName: user.nama,
        mode: asm.mode,
        skor,
        benar,
        total: asm.soal.length,
      });
    }
    setConfirmModal(false);
    setSubmitted(true);
  }

  function sendCheer(label: string, sound: string) {
    if (!asm) return;
    soundEngine.playSfx(sound === "horn" || sound === "applause" || sound === "fanfare" ? sound : "correct");
    fetch("/api/live", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin: asm.pinKuis || "9026",
        action: "cheer",
        sender: user?.nama || "Spektator",
        label,
        sound,
      }),
    }).catch(() => {});
  }

  /* ================= LAYAR HASIL ================= */
  if (submitted) {
    let benar = 0;
    asm.soal.forEach((q) => {
      if (answers[q.id] === q.jawabanBenar) benar++;
    });
    const skor = Math.round((benar / Math.max(1, asm.soal.length)) * 100);

    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="animate-pop-in rounded-3xl bg-kemenag-700 p-6 text-center text-white">
          <Trophy className="mx-auto h-10 w-10 text-gold-400" />
          <h1 className="mt-2 text-base font-extrabold">{asm.judul}</h1>
          <div className="mt-2 text-5xl font-black text-gold-400">
            <NumberTicker value={skor} />
          </div>
          <p className="mt-1 text-xs text-kemenag-100">
            Benar {benar} dari {asm.soal.length} soal
          </p>
          <Link
            href={`/kelas/${asm.classId}`}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-xs font-bold text-kemenag-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Kelas</span>
          </Link>
        </div>

        <div className="space-y-2.5">
          {asm.soal.map((q, i) => {
            const ok = answers[q.id] === q.jawabanBenar;
            return (
              <div
                key={q.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 text-xs"
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Soal {i + 1}</span>
                  <span className={ok ? "text-kemenag-700" : "text-rose-600"}>
                    {ok ? "Benar" : "Belum tepat"}
                  </span>
                </div>
                <p className="mt-1 font-semibold text-slate-900">{q.pertanyaan}</p>
                <p className="mt-1 text-kemenag-800">
                  <strong>Kunci:</strong> {q.opsi[q.jawabanBenar]}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const currentQ = asm.soal[curIdx] || asm.soal[0];

  /* ================= MODE 1: KUIS INTERAKTIF FLUID (SINKRON LAYAR TV) ================= */
  if (asm.mode === "kahoot") {
    return (
      <div className="mx-auto max-w-xl overflow-hidden rounded-3xl bg-[#141619] p-4 text-white shadow-xl sm:p-6">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-bold text-[#23A55A]">
              <Radio className="h-3 w-3 animate-pulse" />
              {syncLive ? "Live TV" : "Mandiri"}
            </span>
            {streak >= 2 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-1 text-[10px] font-bold text-amber-400">
                <Flame className="h-3 w-3" /> {streak}x
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">

            <div className="rounded-full bg-[#F0B232]/20 px-3 py-1 text-xs font-black text-[#F0B232]">
              <NumberTicker value={kahootScore} />
            </div>
          </div>
        </div>

        {/* Jika sinkron Live TV dan TV masih di Lobby */}
        {syncLive && tvStatus === "lobby" ? (
          <div className="animate-pop-in my-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#008A52]/20 text-[#23A55A]">
              <Radio className="h-8 w-8 animate-pulse" />
            </div>
            <h2 className="mt-4 text-lg font-extrabold">
              Kamu Sudah Masuk ke Arena!
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Lihat namamu (<strong className="text-white">{user?.nama}</strong>)
              di Layar Besar proyektor. Soal akan muncul otomatis begitu guru
              menekan Mulai.
            </p>

          </div>
        ) : eliminated ? (
          /* MODE SPEKTATOR DI HP MURID (SOUNDBOARD VEKTOR) */
          <div className="animate-pop-in my-6 space-y-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#5865F2]/20 text-[#5865F2]">
              <Headphones className="h-7 w-7" />
            </div>
            <div>
              <span className="rounded-full bg-[#5865F2]/20 px-3 py-1 text-[10px] font-bold uppercase text-[#8EA1E1]">
                Mode Spektator Aktif
              </span>
              <h2 className="mt-2 text-lg font-extrabold">
                Soraki Temanmu ke Layar Besar!
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Ketuk tombol di bawah untuk mengirim efek suara & animasi sorakan
                langsung ke proyektor kelas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {CHEER_BUTTONS.map((cb) => {
                const Icon = cb.icon;
                return (
                  <button
                    key={cb.label}
                    onClick={() => sendCheer(cb.label, cb.sound)}
                    className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-[#1E2126] p-4 text-xs font-bold text-white transition active:scale-95 hover:border-[#F0B232]"
                  >
                    <Icon className="h-5 w-5 text-[#F0B232]" />
                    <span>{cb.label}</span>
                  </button>
                );
              })}
            </div>

            {!syncLive && (
              <button
                onClick={() => setEliminated(false)}
                className="rounded-full bg-white/10 px-4 py-2 text-xs font-semibold text-slate-300"
              >
                Lanjut Latihan Soal Berikutnya
              </button>
            )}
          </div>
        ) : feedback || (syncLive && answeredForIdx === curIdx) ? (
          /* LAYAR UMPAN BALIK INSTAN */
          <div className="animate-pop-in my-8 rounded-3xl bg-[#1E2126] p-6 text-center">
            {feedback?.correct ? (
              <CheckCircle2 className="mx-auto h-12 w-12 text-[#23A55A]" />
            ) : (
              <XCircle className="mx-auto h-12 w-12 text-rose-400" />
            )}
            <h2 className="mt-3 text-xl font-black">
              {feedback?.correct ? `Benar! +${feedback.pts}` : "Belum Tepat"}
            </h2>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              {feedback?.pembahasan}
            </p>
            {syncLive ? (
              <p className="mt-5 text-[11px] font-semibold text-[#23A55A]">
                Menunggu guru memindahkan ke soal berikutnya di Layar Besar...
              </p>
            ) : (
              <button
                onClick={() => {
                  setFeedback(null);
                  if (curIdx + 1 < asm.soal.length) {
                    setCurIdx(curIdx + 1);
                  } else {
                    finishExam();
                  }
                }}
                className="mt-5 rounded-full bg-[#F0B232] px-6 py-2.5 text-xs font-black text-[#141619]"
              >
                {curIdx + 1 < asm.soal.length ? "Soal Berikutnya →" : "Lihat Skor"}
              </button>
            )}
          </div>
        ) : (
          /* 4 TOMBOL BESAR ALA KAHOOT */
          <div key={currentQ.id} className="animate-pop-in mt-4 space-y-4">
            <div className="rounded-2xl bg-[#1E2126] p-5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Soal {curIdx + 1} dari {asm.soal.length}
              </span>
              <h2 className="mt-1.5 text-base font-extrabold leading-snug sm:text-lg">
                {currentQ.pertanyaan}
              </h2>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              {currentQ.opsi.map((opt, idx) => {
                const st = KAHOOT_BUTTONS[idx % 4];
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setAnswers({ ...answers, [currentQ.id]: idx });
                      setAnsweredForIdx(curIdx);
                      const ok = idx === currentQ.jawabanBenar;
                      const pts = ok ? 850 : 0;
                      soundEngine.playSfx(ok ? "correct" : "wrong");
                      setKahootScore((s) => s + pts);
                      setStreak((stVal) => (ok ? stVal + 1 : 0));
                      if (!ok && syncLive) setEliminated(true);

                      if (user && asm.jenis === "Kuis") {
                        fetch("/api/live", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            pin: asm.pinKuis || "9026",
                            action: "answer",
                            id: user.id,
                            nama: user.nama,
                            points: pts,
                            correct: ok,
                          }),
                        }).catch(() => {});
                      }
                      setFeedback({
                        correct: ok,
                        pts,
                        pembahasan: currentQ.pembahasan,
                      });
                    }}
                    className={`flex items-center gap-3 rounded-2xl p-4 text-left text-xs font-bold text-white shadow transition active:scale-95 sm:text-sm ${st.bg}`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-black/25 text-sm">
                      {st.shape}
                    </span>
                    <span className="leading-snug">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= MODE 2: GOOGLE FORM RAPI ================= */
  if (asm.mode === "gform") {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="h-2 bg-kemenag-600" />
          <div className="p-5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold text-kemenag-700">{asm.jenis}</span>
              <span>
                {answeredCount}/{asm.soal.length} ({progressPct}%)
              </span>
            </div>
            <h1 className="mt-1 text-lg font-extrabold text-slate-900">
              {asm.judul}
            </h1>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-kemenag-600 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {asm.soal.map((q, idx) => (
          <div key={q.id} className="rounded-3xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-900">
              {idx + 1}. {q.pertanyaan}
            </p>
            <div className="mt-3 space-y-2">
              {q.opsi.map((opt, oIdx) => (
                <label
                  key={oIdx}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-xs ${
                    answers[q.id] === oIdx
                      ? "border-kemenag-600 bg-kemenag-50 font-semibold text-kemenag-900"
                      : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === oIdx}
                    onChange={() => setAnswers({ ...answers, [q.id]: oIdx })}
                    className="accent-kemenag-600"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-between">
          <Link href={`/kelas/${asm.classId}`} className="rounded-full border bg-white px-5 py-2.5 text-xs font-semibold text-slate-600">
            Batal
          </Link>
          <button onClick={() => setConfirmModal(true)} className="rounded-full bg-kemenag-600 px-6 py-2.5 text-xs font-bold text-white">
            Kirim Jawaban
          </button>
        </div>

        {confirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">Kumpulkan Jawaban?</h3>
              <p className="mt-1 text-xs text-slate-500">
                Terjawab {answeredCount} dari {asm.soal.length} soal.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button onClick={() => setConfirmModal(false)} className="rounded-full border px-4 py-2 text-xs font-semibold">
                  Periksa Lagi
                </button>
                <button onClick={finishExam} className="rounded-full bg-kemenag-600 px-5 py-2 text-xs font-bold text-white">
                  Kumpulkan
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ================= MODE 3: CBT EXAM FORMAL ================= */
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-900 px-4 py-3.5 text-white sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-kemenag-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ujian Resmi CBT</span>
          </div>
          <h1 className="truncate text-sm font-bold">{asm.judul}</h1>
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gold-400">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {mins}:{secs}
          </span>
        </div>
      </div>

      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-kemenag-600 transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-8">
          <div className="flex items-center justify-between border-b pb-3 text-xs font-semibold text-slate-500">
            <span>
              Soal {curIdx + 1}/{asm.soal.length}
            </span>
            <button
              onClick={() =>
                setFlagged({ ...flagged, [currentQ.id]: !flagged[currentQ.id] })
              }
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold ${
                flagged[currentQ.id]
                  ? "bg-amber-400 text-slate-900"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <Flag className="h-3 w-3" />
              <span>Ragu</span>
            </button>
          </div>

          <p className="mt-4 text-sm font-bold leading-relaxed text-slate-900">
            {currentQ.pertanyaan}
          </p>

          <div className="mt-4 space-y-2">
            {currentQ.opsi.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => setAnswers({ ...answers, [currentQ.id]: idx })}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left text-xs transition ${
                  answers[currentQ.id] === idx
                    ? "border-kemenag-600 bg-kemenag-50 font-semibold text-kemenag-900"
                    : "border-slate-200"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                    answers[currentQ.id] === idx
                      ? "bg-kemenag-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-between border-t pt-4">
            <button
              disabled={curIdx === 0}
              onClick={() => setCurIdx(curIdx - 1)}
              className="rounded-full border px-4 py-2 text-xs font-semibold text-slate-600 disabled:opacity-40"
            >
              ← Sebelumnya
            </button>
            {curIdx + 1 < asm.soal.length ? (
              <button
                onClick={() => setCurIdx(curIdx + 1)}
                className="rounded-full bg-kemenag-600 px-5 py-2 text-xs font-bold text-white"
              >
                Selanjutnya →
              </button>
            ) : (
              <button
                onClick={() => setConfirmModal(true)}
                className="rounded-full bg-slate-900 px-5 py-2 text-xs font-bold text-white"
              >
                Selesai
              </button>
            )}
          </div>
        </div>

        <aside className="rounded-3xl border border-slate-200 bg-white p-5 lg:col-span-4">
          <h3 className="text-xs font-bold text-slate-800">Nomor Soal</h3>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {asm.soal.map((q, i) => (
              <button
                key={q.id}
                onClick={() => setCurIdx(i)}
                className={`h-9 rounded-xl text-xs font-bold ${
                  i === curIdx
                    ? "bg-kemenag-600 text-white ring-2 ring-slate-900"
                    : flagged[q.id]
                    ? "bg-amber-400 text-slate-900"
                    : answers[q.id] !== undefined
                    ? "bg-kemenag-100 text-kemenag-900"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            onClick={() => setConfirmModal(true)}
            className="mt-5 w-full rounded-full bg-slate-900 py-2.5 text-xs font-bold text-white"
          >
            Kumpulkan Ujian
          </button>
        </aside>
      </div>

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Akhiri Ujian?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Terjawab {answeredCount} dari {asm.soal.length} soal.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <button onClick={() => setConfirmModal(false)} className="rounded-full border px-4 py-2 text-xs font-semibold">
                Kembali
              </button>
              <button onClick={finishExam} className="rounded-full bg-kemenag-600 px-5 py-2 text-xs font-bold text-white">
                Ya, Kumpulkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
