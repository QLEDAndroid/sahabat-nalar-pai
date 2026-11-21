"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getCurrentUser,
  getEscalations,
  getReflections,
  getStudyLogs,
  resolveEscalation,
} from "@/lib/storage";
import {
  EscalationItem,
  ReflectionEntry,
  SoloLevel,
  StudyLog,
} from "@/lib/types";
import { NumberTicker } from "@/components/ui/NumberTicker";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  Download,
  Edit3,
  Heart,
  MessageSquareWarning,
  Send,
  Sparkles,
  Users,
} from "lucide-react";

type GuruTab = "analitik" | "eskalasi" | "jurnal";

const LEVEL_INFO: {
  lvl: SoloLevel;
  label: string;
  desc: string;
  color: string;
}[] = [
  {
    lvl: "Multistruktural",
    label: "Cukup Paham (Dasar)",
    desc: "Siswa sudah mengenal poin-poin utama materi.",
    color: "bg-slate-400",
  },
  {
    lvl: "Relasional",
    label: "Sangat Paham (Menghubungkan Konsep)",
    desc: "Siswa mampu mengaitkan dalil dengan contoh sehari-hari.",
    color: "bg-kemenag-500",
  },
  {
    lvl: "Extended Abstract",
    label: "Kritis & Mendalam (Penerapan Nyata)",
    desc: "Siswa mampu menganalisis kasus baru secara kritis dan bijak.",
    color: "bg-gold-500",
  },
];

export default function GuruDashboardPage() {
  const router = useRouter();
  const [tab, setTab] = useState<GuruTab>("eskalasi");
  const [escFilter, setEscFilter] = useState<
    "Semua" | "Menunggu Klarifikasi" | "Sudah Dibahas di Kelas"
  >("Semua");
  const [logs, setLogs] = useState<StudyLog[]>([]);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [reflections, setReflections] = useState<ReflectionEntry[]>([]);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [editingEscId, setEditingEscId] = useState<string | null>(null);

  function loadAll() {
    setLogs(getStudyLogs());
    setEscalations(getEscalations());
    fetch("/api/escalations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (Array.isArray(list)) setEscalations(list);
      })
      .catch(() => {});
    setReflections(getReflections());
  }

  useEffect(() => {
    const u = getCurrentUser();
    if (!u || u.role !== "guru") {
      router.replace("/");
      return;
    }
    loadAll();
  }, [router]);

  const soloCounts: Record<SoloLevel, number> = {
    Multistruktural: logs.filter((l) => l.soloLevel === "Multistruktural").length,
    Relasional: logs.filter((l) => l.soloLevel === "Relasional").length,
    "Extended Abstract": logs.filter((l) => l.soloLevel === "Extended Abstract")
      .length,
  };
  const totalLogs = Math.max(1, logs.length);

  const babCounts = logs.reduce<Record<string, number>>((acc, cur) => {
    const label = `${cur.babId.toUpperCase()} — ${cur.babJudul}`;
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  const topBabs = Object.entries(babCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const pendingCount = escalations.filter(
    (e) => e.status === "Menunggu Klarifikasi"
  ).length;

  const filteredEscalations = escalations.filter(
    (e) => escFilter === "Semua" || e.status === escFilter
  );

  function handleResolve(id: string) {
    const note =
      noteMap[id]?.trim() || "Sudah dijawab dan dijelaskan oleh Guru PAI.";
    setEscalations(resolveEscalation(id, note));
    setEditingEscId(null);
    fetch("/api/escalations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, catatanGuru: note }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (Array.isArray(list)) setEscalations(list);
      })
      .catch(() => {});
  }

  function exportReflectionsCSV() {
    const header = [
      "Waktu",
      "Nama Siswa",
      "Kelas",
      "Bab",
      "Nilai Karakter",
      "Pertanyaan Refleksi",
      "Jawaban Refleksi",
      "Komitmen Aksi Nyata",
    ];
    const rows = reflections.map((r) => [
      r.timestamp,
      r.namaSiswa,
      r.kelas,
      `${r.babId.toUpperCase()} - ${r.babJudul}`,
      r.dimensiCinta,
      r.pertanyaan,
      r.jawabanRefleksi,
      r.komitmenAksi,
    ]);
    const csv = [header, ...rows]
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rekap-refleksi-siswa-pai-x.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Tombol Kembali ke Daftar Kelas */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-kemenag-400 hover:text-kemenag-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Daftar Kelas</span>
        </Link>
      </div>

      {/* Header Laporan Guru */}
      <section className="rounded-3xl bg-gradient-to-r from-kemenag-700 via-kemenag-600 to-emerald-700 p-6 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-gold-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ruang Laporan Guru PAI</span>
            </div>
            <h1 className="text-xl font-extrabold sm:text-2xl">
              Laporan Belajar & Tanya Jawab Siswa
            </h1>
            <p className="text-xs text-kemenag-100">
              SMAN 1 Pangkalan Kerinci • Kelas X (TA 2026/2027)
            </p>
          </div>


        </div>

        {/* Ringkasan Angka */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] text-kemenag-100">
              <span>Total Sesi Belajar</span>
              <Users className="h-4 w-4 text-gold-400" />
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              <NumberTicker value={logs.length} />
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] text-kemenag-100">
              <span>Pemahaman Mendalam</span>
              <BarChart3 className="h-4 w-4 text-gold-400" />
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {soloCounts["Extended Abstract"]}
            </div>
          </div>

          <div className="rounded-2xl bg-gold-500/25 p-3.5 ring-1 ring-gold-400/50 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] text-gold-100">
              <span>Pertanyaan Belum Dijawab</span>
              <MessageSquareWarning className="h-4 w-4 text-gold-400" />
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              <NumberTicker value={pendingCount} />
            </div>
          </div>

          <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur">
            <div className="flex items-center justify-between text-[11px] text-kemenag-100">
              <span>Refleksi Siswa</span>
              <Heart className="h-4 w-4 text-gold-400" />
            </div>
            <div className="mt-1 text-2xl font-extrabold">
              {reflections.length}
            </div>
          </div>
        </div>
      </section>

      <SlidingTabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "eskalasi", label: `Pertanyaan Siswa (${pendingCount})` },
          { id: "analitik", label: "Tingkat Pemahaman" },
          { id: "jurnal", label: `Refleksi Siswa (${reflections.length})` },
        ]}
      />

      {/* TAB 1: PERTANYAAN SISWA UNTUK GURU */}
      {tab === "eskalasi" && (
        <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-kemenag-900">
                Daftar Pertanyaan Siswa untuk Guru PAI
              </h2>
              <p className="text-xs text-slate-500">
                Jawaban yang Anda kirim di sini akan langsung tampil di halaman Forum Kelas dan Ruang Belajar siswa.
              </p>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "Semua", label: "Semua" },
                  { id: "Menunggu Klarifikasi", label: "Belum Dijawab" },
                  { id: "Sudah Dibahas di Kelas", label: "Sudah Dijawab" },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  onClick={() => setEscFilter(st.id)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                    escFilter === st.id
                      ? "bg-kemenag-600 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredEscalations.length === 0 ? (
              <p className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500">
                Belum ada pertanyaan pada kategori ini.
              </p>
            ) : (
              filteredEscalations.map((item) => {
                const isPending = item.status === "Menunggu Klarifikasi";
                const isEditing = editingEscId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 ${
                      isPending
                        ? "border-gold-400/60 bg-gold-50/60"
                        : "border-slate-200 bg-[#F9FCFA]"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs font-extrabold text-slate-900">
                        {item.namaSiswa} ({item.kelas}) •{" "}
                        <span className="text-kemenag-700">
                          {item.babId.toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          isPending
                            ? "bg-gold-500 text-white"
                            : "bg-kemenag-100 text-kemenag-800"
                        }`}
                      >
                        {isPending ? "Belum Dijawab" : "Sudah Dijawab"}
                      </span>
                    </div>

                    <p className="mt-2 text-xs leading-relaxed text-slate-800">
                      &ldquo;{item.pertanyaan}&rdquo;
                    </p>

                    {isPending || isEditing ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <input
                          type="text"
                          value={noteMap[item.id] ?? item.catatanGuru ?? ""}
                          onChange={(e) =>
                            setNoteMap({ ...noteMap, [item.id]: e.target.value })
                          }
                          placeholder="Tulis jawaban untuk siswa di sini..."
                          className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-xs"
                        />
                        <button
                          onClick={() => handleResolve(item.id)}
                          className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-4 py-2 text-xs font-bold text-white hover:bg-kemenag-700"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Kirim Jawaban</span>
                        </button>
                        {isEditing && (
                          <button
                            onClick={() => setEditingEscId(null)}
                            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                          >
                            Batal
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3 text-xs text-kemenag-900 ring-1 ring-kemenag-100">
                        <div>
                          <span className="font-extrabold text-kemenag-700">
                            Jawaban Guru:{" "}
                          </span>
                          <span>{item.catatanGuru}</span>
                        </div>
                        <button
                          onClick={() => {
                            setNoteMap({
                              ...noteMap,
                              [item.id]: item.catatanGuru || "",
                            });
                            setEditingEscId(item.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200"
                        >
                          <Edit3 className="h-3 w-3" />
                          <span>Ubah</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* TAB 2: TINGKAT PEMAHAMAN SISWA */}
      {tab === "analitik" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-kemenag-900">
              Tingkat Pemahaman Siswa
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Rekap seberapa dalam siswa memahami materi saat belajar bersama AIsyah.
            </p>
            <div className="mt-5 space-y-4">
              {LEVEL_INFO.map(({ lvl, label, desc, color }) => {
                const count = soloCounts[lvl];
                const pct = Math.round((count / totalLogs) * 100);
                return (
                  <div key={lvl} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-slate-800">{label}</span>
                      <span className="text-kemenag-800">
                        {count} sesi ({pct}%)
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">{desc}</p>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-extrabold text-kemenag-900">
              Bab Paling Sering Dipelajari
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Daftar materi yang paling sering dibuka dan ditanyakan siswa.
            </p>
            <div className="mt-4 space-y-2.5">
              {topBabs.map(([label, count], idx) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 bg-[#F4F9F6] px-4 py-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-kemenag-600 text-[11px] font-extrabold text-white">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-slate-800">{label}</span>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-0.5 font-extrabold text-kemenag-700 ring-1 ring-kemenag-200">
                    {count}x
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: REFLEKSI SISWA */}
      {tab === "jurnal" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-extrabold text-kemenag-900">
                Catatan Refleksi & Komitmen Siswa
              </h2>
              <p className="text-xs text-slate-500">
                Rangkuman refleksi sikap dan aksi nyata yang ditulis siswa setelah belajar.
              </p>
            </div>
            <button
              onClick={exportReflectionsCSV}
              className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-4 py-2 text-xs font-bold text-white hover:bg-kemenag-700"
            >
              <Download className="h-4 w-4" />
              <span>Unduh CSV</span>
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reflections.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 bg-[#F9FCFA] p-4 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-extrabold text-slate-900">
                    {r.namaSiswa} ({r.kelas})
                  </span>
                  <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                    {r.dimensiCinta}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-semibold text-kemenag-700">
                  {r.babId.toUpperCase()} — {r.babJudul}
                </div>
                <p className="mt-2 text-slate-700">{r.komitmenAksi}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
