"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ALL_MODULES } from "@/lib/modules";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import {
  createClassroom,
  getClassrooms,
  getCurrentUser,
  joinClassroomByCode,
} from "@/lib/storage";
import { Classroom, ModuleData, UserProfile } from "@/lib/types";
import {
  ArrowRight,
  BookOpen,
  KeyRound,
  Plus,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [ready, setReady] = useState(false);

  const [activeStory, setActiveStory] = useState<ModuleData | null>(null);

  // Modal Buat Kelas (Guru)
  const [showCreate, setShowCreate] = useState(false);
  const [newNama, setNewNama] = useState("");
  const [newSub, setNewSub] = useState("");

  // Gabung Kelas (hanya jika murid belum punya kelas)
  const [joinCode, setJoinCode] = useState("");
  const [joinMsg, setJoinMsg] = useState("");

  function loadData() {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    const all = getClassrooms();
    if (u.role === "guru") {
      setClassrooms(all);
    } else {
      // 1 Akun Murid = Maksimal 1 Kelas saja
      const myClass = all.find((c) => c.studentIds.includes(u.id));
      setClassrooms(myClass ? [myClass] : []);
    }
    setReady(true);
  }

  useEffect(() => {
    loadData();
    window.addEventListener("snp-auth-changed", loadData);
    return () => window.removeEventListener("snp-auth-changed", loadData);
  }, []);

  if (!ready || !user) {
    return (
      <div className="py-20 text-center text-xs text-slate-500">
        Memuat beranda...
      </div>
    );
  }

  const allowedBabIds =
    user.role === "guru"
      ? ALL_MODULES.map((m) => m.id)
      : classrooms[0]?.visibility.enabledBabIds || ["bab-01"];
  const storyModules = ALL_MODULES.filter((m) => allowedBabIds.includes(m.id));

  function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !newNama.trim()) return;
    createClassroom({
      nama: newNama.trim(),
      subjudul: newSub.trim() || "PAI-BP Fase E",
      guruId: user.id,
      guruNama: user.nama,
    });
    setNewNama("");
    setNewSub("");
    setShowCreate(false);
    loadData();
  }

  function handleJoinSingleClass(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !joinCode.trim()) return;
    const joined = joinClassroomByCode(joinCode, user.id);
    if (!joined) {
      setJoinMsg("Kode kelas tidak ditemukan.");
      return;
    }
    setJoinCode("");
    setJoinMsg("");
    loadData();
  }

  return (
    <div className="space-y-6 overflow-x-hidden">
      {/* 1. Stories Bar Ringkas (Ala Instagram) */}
      {storyModules.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-3.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800">
              Sorotan Materi Aktif
            </span>
            <span className="text-[11px] text-slate-400">
              {storyModules.length} Bab
            </span>
          </div>
          <div className="no-scrollbar flex gap-3 overflow-x-auto pb-1">
            {storyModules.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveStory(m)}
                className="flex w-16 shrink-0 flex-col items-center gap-1 text-center transition-transform hover:scale-105"
              >
                <div className="ig-ring rounded-full p-[2px]">
                  <div className="flex h-12 w-12 flex-col items-center justify-center rounded-full border-2 border-white bg-white text-kemenag-800">
                    <span className="text-[8px] font-bold uppercase text-slate-400">
                      BAB
                    </span>
                    <span className="text-sm font-extrabold leading-none">
                      {m.bab}
                    </span>
                  </div>
                </div>
                <span className="line-clamp-1 w-full text-[10px] font-medium text-slate-600">
                  {m.judul.split(":")[0]}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 2. Header Tenang & Jelas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold text-slate-900 sm:text-xl">
            Assalamu&apos;alaikum, {user.nama}
          </h1>
          <p className="text-xs text-slate-500">
            {user.role === "guru"
              ? "Kelola kelas, progres bab, dan aktivitas belajar murid Anda."
              : "Akses kelas, materi bersama AIsyah, dan tugas PAI-BP Anda."}
          </p>
        </div>

        {user.role === "guru" && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-kemenag-700"
          >
            <Plus className="h-4 w-4" />
            <span>Buat Kelas</span>
          </button>
        )}
      </div>

      {/* 3. Konten Kelas — Murid Tanpa Kelas vs Sudah Punya Kelas vs Guru */}
      {user.role === "murid" && classrooms.length === 0 ? (
        <section className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-6 text-center">
          <KeyRound className="mx-auto h-8 w-8 text-kemenag-600" />
          <h2 className="mt-3 text-base font-bold text-slate-900">
            Belum Tergabung ke Kelas
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Masukkan kode kelas dari Guru PAI Anda (1 akun hanya mengikuti 1
            kelas).
          </p>
          <form onSubmit={handleJoinSingleClass} className="mt-4 space-y-2.5">
            <input
              type="text"
              required
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Kode Kelas (mis. PAIX1-26)"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-center text-xs font-bold uppercase"
            />
            {joinMsg && <p className="text-xs text-rose-600">{joinMsg}</p>}
            <button
              type="submit"
              className="w-full rounded-full bg-kemenag-600 py-2.5 text-xs font-bold text-white"
            >
              Gabung Kelas
            </button>
          </form>
        </section>
      ) : (
        <section
          className={`grid gap-5 ${
            classrooms.length === 1
              ? "grid-cols-1"
              : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {classrooms.map((cls) => (
            <SpotlightCard
              key={cls.id}
              color="#008A52"
              className="animate-pop-in flex flex-col rounded-3xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="bg-gradient-to-r from-[#005532] to-[#006B3F] p-5 text-white">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-kemenag-100">
                    {cls.guruNama}
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-bold">
                    {cls.kodeKelas}
                  </span>
                </div>
                <h2 className="mt-2.5 text-lg font-extrabold">{cls.nama}</h2>
                <p className="mt-0.5 text-xs text-kemenag-100">{cls.subjudul}</p>
              </div>

              <div className="flex flex-1 flex-col justify-between p-4">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-kemenag-600" />
                    {cls.visibility.enabledBabIds.length} Bab Aktif
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-kemenag-600" />
                    {cls.studentIds.length} Murid
                  </span>
                </div>

                <div className="mt-4 flex gap-2 border-t border-slate-100 pt-3">
                  <Link
                    href={`/kelas/${cls.id}`}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-kemenag-600 py-2.5 text-xs font-bold text-white transition hover:bg-kemenag-700"
                  >
                    <span>Masuk Kelas</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    href={`/belajar/${cls.visibility.enabledBabIds[cls.visibility.enabledBabIds.length - 1] || "bab-09"}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 hover:border-kemenag-400"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-kemenag-600" />
                    <span>AIsyah</span>
                  </Link>
                </div>
              </div>
            </SpotlightCard>
          ))}
        </section>
      )}

      {/* Modal Story Viewer */}
      {activeStory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-kemenag-800 p-5 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-kemenag-200">
                BAB {activeStory.bab} • {activeStory.elemen}
              </span>
              <button
                onClick={() => setActiveStory(null)}
                className="rounded-full bg-white/15 p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <h3 className="mt-3 text-base font-extrabold">{activeStory.judul}</h3>
            {activeStory.dalilTerverifikasi[0] ? (
              <div className="mt-3 rounded-2xl bg-white/10 p-3.5">
                <div className="flex items-center gap-1 text-[11px] font-bold text-gold-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>{activeStory.dalilTerverifikasi[0].sumber}</span>
                </div>
                <p className="mt-1.5 line-clamp-4 text-xs italic text-white/95">
                  &ldquo;{activeStory.dalilTerverifikasi[0].terjemahan}&rdquo;
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-2xl bg-white/10 p-3.5 text-xs text-white/90">
                {activeStory.cp}
              </p>
            )}
            <Link
              href={`/belajar/${activeStory.id}`}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-white py-2.5 text-xs font-bold text-kemenag-900"
            >
              <span>Buka Materi BAB {activeStory.bab}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Modal Buat Kelas (Guru) */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-bold text-slate-900">Buat Kelas Baru</h3>
            <form onSubmit={handleCreateClass} className="mt-4 space-y-3">
              <input
                type="text"
                required
                value={newNama}
                onChange={(e) => setNewNama(e.target.value)}
                placeholder="Nama Kelas (mis. PAI-BP Kelas X.3)"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
              />
              <input
                type="text"
                value={newSub}
                onChange={(e) => setNewSub(e.target.value)}
                placeholder="Keterangan Progres"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-full border px-4 py-2 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-kemenag-600 px-5 py-2 text-xs font-bold text-white"
                >
                  Buat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
