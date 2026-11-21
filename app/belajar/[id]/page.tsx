"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ALL_MODULES, getModuleById } from "@/lib/modules";
import {
  addEscalation,
  addReflection,
  addStudyLog,
  getCurrentUser,
  getReflections,
} from "@/lib/storage";
import { DimensiCinta, EscalationItem, ReflectionEntry, SoloLevel } from "@/lib/types";
import { FormattedText } from "@/components/FormattedText";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import {
  ArrowLeft,
  AtSign,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  Compass,
  Heart,
  HelpCircle,
  Lightbulb,
  MessageSquareQuote,
  Printer,
  ScrollText,
  Send,
  Sparkles,
  X,
} from "lucide-react";

type StageTab = "memahami" | "mengaplikasi" | "merefleksi";

interface ChatMsg {
  role: "user" | "model";
  text: string;
  escalate?: boolean;
  babTag?: number;
}

const MODES = [
  {
    id: "Analogi Pelajar",
    label: "Analogi Pelajar",
    sub: "Santai • Contoh keseharian SMA",
    icon: Lightbulb,
  },
  {
    id: "Alur Logika & Konsep",
    label: "Alur Logika",
    sub: "Terstruktur • Definisi & syarat",
    icon: Compass,
  },
  {
    id: "Kisah & Konteks",
    label: "Kisah & Konteks",
    sub: "Narasi • Dokumenter islami",
    icon: ScrollText,
  },
  {
    id: "Bedah Dalil & Istilah",
    label: "Bedah Dalil",
    sub: "Mendalam • Ayat, hadis & glosarium",
    icon: BookOpen,
  },
];

const DIMENSI_CINTA_LIST: DimensiCinta[] = [
  "Cinta Allah dan Rasul-Nya",
  "Cinta Ilmu",
  "Cinta Diri dan Sesama",
  "Cinta Tanah Air",
];

export default function BelajarBabPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "bab-09";
  const mod = getModuleById(id);

  const [activeTab, setActiveTab] = useState<StageTab>("memahami");
  const [selectedMode, setSelectedMode] = useState<string>("Analogi Pelajar");
  const [showModeMenu, setShowModeMenu] = useState(false);

  // Connectors @Bab picker
  const [showMentionMenu, setShowMentionMenu] = useState(false);

  const [memahamiMsgs, setMemahamiMsgs] = useState<ChatMsg[]>([]);
  const [memahamiInput, setMemahamiInput] = useState("");
  const [loadingMemahami, setLoadingMemahami] = useState(false);

  // Drawer Dalil & Glosarium untuk layar mobile
  const [showRefDrawer, setShowRefDrawer] = useState(false);
  const [refTab, setRefTab] = useState<"dalil" | "glosarium">("dalil");

  // Tab 2: Mengaplikasi (SOLO Socratic)
  const [selectedKasusIdx, setSelectedKasusIdx] = useState(0);
  const [soloLevel, setSoloLevel] = useState<SoloLevel>("Multistruktural");
  const [aplikasiMsgs, setAplikasiMsgs] = useState<ChatMsg[]>([]);
  const [aplikasiInput, setAplikasiInput] = useState("");
  const [loadingAplikasi, setLoadingAplikasi] = useState(false);

  // Modal Eskalasi Guru
  const [showEscalateModal, setShowEscalateModal] = useState(false);
  const [escNama, setEscNama] = useState("");
  const [escKelas, setEscKelas] = useState("X.1");
  const [escPertanyaan, setEscPertanyaan] = useState("");
  const [escSuccess, setEscSuccess] = useState(false);
  const [myEscalations, setMyEscalations] = useState<EscalationItem[]>([]);

  // Tab 3: Merefleksi
  const [namaSiswa, setNamaSiswa] = useState("");
  const [kelasSiswa, setKelasSiswa] = useState("X.1");
  const [selectedRefIdx, setSelectedRefIdx] = useState(0);
  const [jawabanRefleksi, setJawabanRefleksi] = useState("");
  const [komitmenAksi, setKomitmenAksi] = useState("");
  const [dimensiCinta, setDimensiCinta] = useState<DimensiCinta>("Cinta Ilmu");
  const [savedReflections, setSavedReflections] = useState<ReflectionEntry[]>([]);
  const [refSuccess, setRefSuccess] = useState(false);

  useEffect(() => {
    setSavedReflections(getReflections().filter((r) => r.babId === id));
    const u = getCurrentUser();
    if (u) {
      setNamaSiswa(u.nama);
      setEscNama(u.nama);
      if (u.kelasUtama) {
        setKelasSiswa(u.kelasUtama);
        setEscKelas(u.kelasUtama);
      }
    }
  }, [id]);

  if (!mod) {
    return (
      <div className="rounded-2xl border bg-white p-8 text-center">
        <p className="text-sm font-semibold text-slate-700">Modul tidak ditemukan.</p>
        <Link href="/" className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-kemenag-700">
          <ArrowLeft className="h-4 w-4" /> Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const activeKasus = mod.studiKasus[selectedKasusIdx];
  const currentModeObj = MODES.find((m) => m.id === selectedMode) || MODES[0];

  function handleMemahamiInputChange(val: string) {
    setMemahamiInput(val);
    if (val.endsWith("@")) {
      setShowMentionMenu(true);
    } else if (!val.includes("@")) {
      setShowMentionMenu(false);
    }
  }

  function insertBabConnector(babNum: number) {
    const cleaned = memahamiInput.endsWith("@")
      ? memahamiInput.slice(0, -1)
      : memahamiInput;
    const prefix = cleaned && !cleaned.endsWith(" ") ? `${cleaned} ` : cleaned;
    setMemahamiInput(`${prefix}@Bab ${babNum} `);
    setShowMentionMenu(false);
  }

  async function sendMemahami(promptText: string, modeOverride?: string) {
    if (!mod || !promptText.trim() || loadingMemahami) return;
    const modeToUse = modeOverride || selectedMode;
    const nextHistory: ChatMsg[] = [...memahamiMsgs, { role: "user", text: promptText }];
    setMemahamiMsgs(nextHistory);
    setMemahamiInput("");
    setShowMentionMenu(false);
    setLoadingMemahami(true);

    addStudyLog({
      babId: mod.id,
      babJudul: mod.judul,
      tahap: "Memahami",
      mode: modeToUse,
      soloLevel: "Multistruktural",
      topik: promptText.slice(0, 80),
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babId: mod.id,
          stage: "memahami",
          mode: modeToUse,
          message: promptText,
          history: memahamiMsgs.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      setMemahamiMsgs([
        ...nextHistory,
        {
          role: "model",
          text: res.ok
            ? data.reply
            : `Catatan Server: ${data.error || "Gagal menghubungi API."}`,
          escalate: data.shouldEscalateToTeacher,
          babTag: data.activeBab,
        },
      ]);
    } catch {
      setMemahamiMsgs([
        ...nextHistory,
        { role: "model", text: "Koneksi ke server AIsyah terputus. Cek server lokalmu ya." },
      ]);
    } finally {
      setLoadingMemahami(false);
    }
  }

  async function sendAplikasi(promptText: string) {
    if (!mod || !promptText.trim() || loadingAplikasi) return;
    const nextHistory: ChatMsg[] = [...aplikasiMsgs, { role: "user", text: promptText }];
    setAplikasiMsgs(nextHistory);
    setAplikasiInput("");
    setLoadingAplikasi(true);

    const turnCount = nextHistory.filter((m) => m.role === "user").length;
    const nextSolo: SoloLevel =
      turnCount >= 3 ? "Extended Abstract" : turnCount === 2 ? "Relasional" : "Multistruktural";
    setSoloLevel(nextSolo);

    addStudyLog({
      babId: mod.id,
      babJudul: mod.judul,
      tahap: "Mengaplikasi",
      soloLevel: nextSolo,
      topik: activeKasus ? activeKasus.judul : promptText.slice(0, 80),
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babId: mod.id,
          stage: "mengaplikasi",
          kasusJudul: activeKasus?.judul,
          message: promptText,
          history: aplikasiMsgs.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      setAplikasiMsgs([
        ...nextHistory,
        {
          role: "model",
          text: res.ok
            ? data.reply
            : `Catatan Server: ${data.error || "Gagal menghubungi API."}`,
          escalate: data.shouldEscalateToTeacher,
        },
      ]);
    } catch {
      setAplikasiMsgs([
        ...nextHistory,
        { role: "model", text: "Koneksi ke server AIsyah terputus." },
      ]);
    } finally {
      setLoadingAplikasi(false);
    }
  }

  function loadMyEscalations(studentName?: string) {
    fetch("/api/escalations", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => {
        if (!Array.isArray(list)) return;
        const target = (studentName || escNama || getCurrentUser()?.nama || "").trim().toLowerCase();
        const mine = target
          ? list.filter((it: EscalationItem) => it.namaSiswa.trim().toLowerCase() === target)
          : list;
        setMyEscalations(mine);
      })
      .catch(() => {});
  }

  useEffect(() => {
    const u = getCurrentUser();
    loadMyEscalations(u?.nama);
  }, []);

  function handleSaveEscalation(e: React.FormEvent) {
    e.preventDefault();
    if (!mod || !escPertanyaan.trim()) return;
    const payload = {
      namaSiswa: escNama.trim() || "Siswa Kelas X",
      kelas: escKelas,
      babId: mod.id,
      babJudul: mod.judul,
      pertanyaan: escPertanyaan.trim(),
      konteks: `Eskalasi dari BAB ${mod.bab} (${activeTab})`,
    };
    addEscalation(payload);
    fetch("/api/escalations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(() => loadMyEscalations(payload.namaSiswa))
      .catch(() => {});
    setEscSuccess(true);
    setEscPertanyaan("");
    setTimeout(() => {
      setShowEscalateModal(false);
      setEscSuccess(false);
    }, 1000);
  }

  function handleSaveReflection(e: React.FormEvent) {
    e.preventDefault();
    if (!mod || !jawabanRefleksi.trim() || !komitmenAksi.trim()) return;
    const pertanyaan =
      mod.pertanyaanRefleksi[selectedRefIdx] ||
      "Apa komitmen nyata yang akan saya lakukan setelah mempelajari bab ini?";
    const updated = addReflection({
      namaSiswa: namaSiswa.trim() || "Siswa Kelas X",
      kelas: kelasSiswa,
      babId: mod.id,
      babJudul: mod.judul,
      pertanyaan,
      jawabanRefleksi: jawabanRefleksi.trim(),
      komitmenAksi: komitmenAksi.trim(),
      dimensiCinta,
    });
    setSavedReflections(updated.filter((r) => r.babId === mod.id));
    setJawabanRefleksi("");
    setKomitmenAksi("");
    setRefSuccess(true);
    setTimeout(() => setRefSuccess(false), 2000);
  }

  const ReferencePanelContent = (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
        <button
          onClick={() => setRefTab("dalil")}
          className={`rounded-full py-1.5 text-xs font-bold transition ${
            refTab === "dalil" ? "bg-kemenag-600 text-white" : "text-slate-600"
          }`}
        >
          Dalil ({mod.dalilTerverifikasi.length})
        </button>
        <button
          onClick={() => setRefTab("glosarium")}
          className={`rounded-full py-1.5 text-xs font-bold transition ${
            refTab === "glosarium" ? "bg-kemenag-600 text-white" : "text-slate-600"
          }`}
        >
          Glosarium ({mod.glosarium.length})
        </button>
      </div>

      {refTab === "dalil" ? (
        <div className="max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
          {mod.dalilTerverifikasi.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
              Bab ini berfokus pada narasi sejarah/kontekstual pada Bagian F modul.
            </p>
          ) : (
            mod.dalilTerverifikasi.map((d, i) => (
              <div
                key={i}
                className="rounded-2xl border border-kemenag-100 bg-kemenag-50/60 p-3.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-kemenag-800">
                    {d.sumber}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-kemenag-700">
                    {d.jenis}
                  </span>
                </div>
                <p className="mt-1.5 text-xs italic leading-relaxed text-slate-700">
                  &ldquo;{d.terjemahan}&rdquo;
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
          {mod.glosarium.map((g, i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <span className="font-bold text-kemenag-800">{g.istilah}: </span>
              <span className="text-slate-700">{g.penjelasan}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-kemenag-800 shadow-sm ring-1 ring-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Beranda</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRefDrawer(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 lg:hidden"
          >
            <BookOpen className="h-3.5 w-3.5 text-kemenag-600" />
            <span>Dalil & Glosarium</span>
          </button>
          <button
            onClick={() => setShowEscalateModal(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-gold-100 px-3.5 py-1.5 text-xs font-bold text-amber-900"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Tanya Guru</span>
          </button>
        </div>
      </div>

      {/* Header Bab + Sliding Tabs 3 Tahap */}
      <section className="no-print rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-[11px] font-bold">
          <span className="rounded-full bg-kemenag-600 px-2.5 py-0.5 text-white">
            BAB {mod.bab}
          </span>
          <span className="text-kemenag-700">{mod.elemen}</span>
        </div>
        <h1 className="mt-1.5 text-lg font-extrabold text-slate-900 sm:text-xl">
          {mod.judul}
        </h1>
        <SlidingTabs
          className="mt-3.5"
          value={activeTab}
          onChange={setActiveTab}
          items={[
            { id: "memahami", label: "Memahami", icon: BookOpen },
            { id: "mengaplikasi", label: "Mengaplikasi", icon: BrainCircuit },
            { id: "merefleksi", label: "Merefleksi", icon: Heart },
          ]}
        />
      </section>

      {/* TAB 1: CHATBOX AISYAH MODERN (MODEL PICKER DROPDOWN + @BAB CONNECTORS) */}
      {activeTab === "memahami" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
            {/* Header Chatbox ala Gemini / ChatGPT Model Selector */}
            <div className="relative flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="inline-flex items-center gap-2 rounded-2xl px-2.5 py-1.5 text-left transition hover:bg-slate-100"
                >
                  <img
                    src="/images/avatar-aisyah.jpg"
                    alt="AIsyah"
                    className="h-8 w-8 rounded-full border border-kemenag-200 object-cover"
                  />
                  <div>
                    <div className="flex items-center gap-1 text-sm font-extrabold text-slate-900">
                      <span>AIsyah</span>
                      <span className="text-xs font-semibold text-kemenag-700">
                        • {currentModeObj.label}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      {currentModeObj.sub}
                    </p>
                  </div>
                </button>

                {/* Dropdown Model/Mode Picker ala Gemini */}
                {showModeMenu && (
                  <div className="animate-pop-in absolute left-0 top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl">
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Pilih Gaya Penjelasan AIsyah
                    </div>
                    {MODES.map((m) => {
                      const active = selectedMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setSelectedMode(m.id);
                            setShowModeMenu(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition ${
                            active ? "bg-kemenag-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <div className="text-xs font-bold text-slate-900">
                              {m.label}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {m.sub}
                            </div>
                          </div>
                          {active && <Check className="h-4 w-4 text-kemenag-600" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <span className="rounded-full bg-kemenag-50 px-2.5 py-1 text-[10px] font-bold text-kemenag-800">
                BAB {mod.bab}
              </span>
            </div>

            {/* Area Percakapan */}
            <div
              className="flex-1 space-y-3 overflow-y-auto p-4"
              style={{ minHeight: 330, maxHeight: 450 }}
              onClick={() => {
                setShowModeMenu(false);
                setShowMentionMenu(false);
              }}
            >
              {memahamiMsgs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <img
                    src="/images/avatar-aisyah.jpg"
                    alt="AIsyah"
                    className="h-14 w-14 rounded-full border-2 border-kemenag-200 object-cover"
                  />
                  <p className="mt-3 text-sm font-extrabold text-slate-900">
                    Ada yang ingin dibahas hari ini?
                  </p>
                  <p className="mt-1 max-w-xs text-xs text-slate-500">
                    Ketik pertanyaanmu atau gunakan{" "}
                    <strong className="text-kemenag-700">@Bab</strong> untuk
                    menghubungkan materi antar bab.
                  </p>

                  {/* 2 Prompt Pemantik Singkat */}
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    <button
                      onClick={() =>
                        sendMemahami(
                          `Jelaskan inti BAB ${mod.bab} (${mod.judul}) secara singkat.`
                        )
                      }
                      className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-kemenag-400"
                    >
                      Ringkas inti BAB {mod.bab}
                    </button>
                    <button
                      onClick={() =>
                        sendMemahami(
                          `@Bab 6 jelaskan hubungannya dengan materi BAB ${mod.bab}`
                        )
                      }
                      className="rounded-full border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:border-kemenag-400"
                    >
                      @Bab 6 hubungannya apa?
                    </button>
                  </div>
                </div>
              ) : (
                memahamiMsgs.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`animate-msg-rise flex items-end gap-2 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "model" && (
                      <img
                        src="/images/avatar-aisyah.jpg"
                        alt="AIsyah"
                        className="h-7 w-7 shrink-0 rounded-full border border-kemenag-200 object-cover"
                      />
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "rounded-br-sm bg-kemenag-600 text-xs leading-relaxed text-white"
                          : "rounded-bl-sm border border-slate-200 bg-[#F4F9F6] text-slate-800"
                      }`}
                    >
                      {msg.babTag && msg.role === "model" && (
                        <span className="mb-1.5 inline-block rounded-full bg-kemenag-100 px-2 py-0.5 text-[10px] font-bold text-kemenag-800">
                          Sumber: Modul BAB {msg.babTag}
                        </span>
                      )}
                      {msg.role === "user" ? (
                        <p>{msg.text}</p>
                      ) : (
                        <FormattedText text={msg.text} />
                      )}
                      {msg.escalate && (
                        <div className="mt-2.5 border-t border-gold-400/40 pt-2">
                          <button
                            onClick={() => setShowEscalateModal(true)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3 py-1.5 text-[11px] font-bold text-white"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                            Kirim ke Guru PAI
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {loadingMemahami && (
                <div className="flex items-center gap-2">
                  <img
                    src="/images/avatar-aisyah.jpg"
                    alt="AIsyah"
                    className="h-7 w-7 rounded-full border border-kemenag-200 object-cover"
                  />
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm bg-[#F4F9F6] px-4 py-3 text-xs font-medium text-slate-500">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-kemenag-600" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-kemenag-600" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-kemenag-600" />
                  </div>
                </div>
              )}
            </div>

            {/* Popover Connectors @Bab */}
            {showMentionMenu && (
              <div className="animate-pop-in mx-3 mb-1 max-h-52 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lg">
                <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Hubungkan Modul (@Bab Connector)
                </div>
                {ALL_MODULES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => insertBabConnector(m.bab)}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs hover:bg-kemenag-50"
                  >
                    <span className="truncate font-bold text-slate-800">
                      @Bab {m.bab}{" "}
                      <span className="font-normal text-slate-500">
                        — {m.judul}
                      </span>
                    </span>
                    <span className="ml-2 shrink-0 text-[10px] font-semibold text-kemenag-700">
                      {m.elemen.split(" ")[0]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Chatbox Input Modern ala Gemini/ChatGPT */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMemahami(memahamiInput);
              }}
              className="border-t border-slate-100 bg-white p-3"
            >
              <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-1.5 focus-within:border-kemenag-600 focus-within:bg-white">
                <button
                  type="button"
                  onClick={() => setShowMentionMenu(!showMentionMenu)}
                  title="Hubungkan @Bab"
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition ${
                    showMentionMenu
                      ? "bg-kemenag-600 text-white"
                      : "text-slate-500 hover:bg-slate-200/70 hover:text-kemenag-800"
                  }`}
                >
                  <AtSign className="h-4 w-4" />
                </button>
                <input
                  type="text"
                  value={memahamiInput}
                  onChange={(e) => handleMemahamiInputChange(e.target.value)}
                  placeholder="Tanya AIsyah... (ketik @ untuk pilih bab)"
                  className="min-w-0 flex-1 bg-transparent px-1.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={loadingMemahami}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-kemenag-600 text-white transition hover:bg-kemenag-700 disabled:opacity-40"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>
          </div>

          {/* Panel Referensi Statis Desktop */}
          <aside className="hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5 lg:block">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-extrabold text-kemenag-900">
                <MessageSquareQuote className="h-4 w-4 text-kemenag-600" />
                <span>Rujukan Resmi Modul</span>
              </h3>
              <span className="rounded-full bg-kemenag-50 px-2.5 py-0.5 text-[10px] font-bold text-kemenag-700">
                Terverifikasi
              </span>
            </div>
            {ReferencePanelContent}
          </aside>
        </div>
      )}

      {/* TAB 2: MENGAPLIKASI (DIALOG SOKRATIK SOLO) */}
      {activeTab === "mengaplikasi" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <div className="space-y-2.5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
            <h2 className="text-sm font-extrabold text-slate-900">
              Studi Kasus Aktual (Bagian J)
            </h2>
            {mod.studiKasus.map((k, idx) => (
              <button
                key={k.id}
                onClick={() => {
                  setSelectedKasusIdx(idx);
                  setAplikasiMsgs([]);
                  setSoloLevel("Multistruktural");
                }}
                className={`w-full rounded-2xl border p-3.5 text-left transition ${
                  selectedKasusIdx === idx
                    ? "border-kemenag-600 bg-kemenag-50"
                    : "border-slate-200 hover:border-kemenag-400"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{k.judul}</span>
                  <span className="shrink-0 rounded-full bg-gold-100 px-2 py-0.5 text-[10px] font-bold text-amber-900">
                    {k.levelSolo}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] text-slate-600">
                  {k.deskripsi}
                </p>
              </button>
            ))}
          </div>

          <div className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:col-span-7">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="text-xs font-extrabold text-slate-900">
                Dialog Sokratik •{" "}
                <span className="text-kemenag-700">{soloLevel}</span>
              </div>
              <Sparkles className="h-4 w-4 text-kemenag-600" />
            </div>

            {activeKasus && (
              <div className="border-b bg-[#F9FCFA] px-4 py-3 text-xs text-slate-700">
                <strong className="text-kemenag-800">Kasus:</strong>{" "}
                {activeKasus.deskripsi}
              </div>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto p-4" style={{ minHeight: 260, maxHeight: 380 }}>
              {aplikasiMsgs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-slate-500">
                    AIsyah akan memandu kamu bernalar bertahap tanpa menyuapi jawaban.
                  </p>
                  <button
                    onClick={() =>
                      sendAplikasi(
                        `Beri aku 1 pertanyaan pemantik Sokratik awal untuk kasus "${activeKasus?.judul || mod.judul}".`
                      )
                    }
                    className="mt-3 rounded-full bg-kemenag-600 px-5 py-2.5 text-xs font-bold text-white"
                  >
                    Mulai Diskusi Kasus
                  </button>
                </div>
              ) : (
                aplikasiMsgs.map((msg, i) => (
                  <div
                    key={i}
                    className={`animate-msg-rise flex items-end gap-2 ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {msg.role === "model" && (
                      <img
                        src="/images/avatar-aisyah.jpg"
                        alt="AIsyah"
                        className="h-7 w-7 shrink-0 rounded-full border object-cover"
                      />
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "rounded-br-sm bg-kemenag-600 text-xs text-white"
                          : "rounded-bl-sm border bg-[#F4F9F6] text-slate-800"
                      }`}
                    >
                      {msg.role === "user" ? <p>{msg.text}</p> : <FormattedText text={msg.text} />}
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendAplikasi(aplikasiInput);
              }}
              className="flex items-center gap-2 border-t p-3"
            >
              <input
                type="text"
                value={aplikasiInput}
                onChange={(e) => setAplikasiInput(e.target.value)}
                placeholder="Tulis analisis atau pendapatmu..."
                className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs focus:border-kemenag-600 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={loadingAplikasi}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-kemenag-600 text-white"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 3: MEREFLEKSI */}
      {activeTab === "merefleksi" && (
        <div className="grid gap-5 lg:grid-cols-12">
          <form
            onSubmit={handleSaveReflection}
            className="no-print space-y-3.5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-6"
          >
            <h2 className="text-sm font-extrabold text-slate-900">
              Jurnal Refleksi & Komitmen Dimensi Cinta
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                required
                value={namaSiswa}
                onChange={(e) => setNamaSiswa(e.target.value)}
                placeholder="Nama Lengkap"
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              />
              <select
                value={kelasSiswa}
                onChange={(e) => setKelasSiswa(e.target.value)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              >
                {["X.1", "X.2", "X.3", "X.4"].map((k) => (
                  <option key={k} value={k}>
                    Kelas {k}
                  </option>
                ))}
              </select>
            </div>
            <select
              value={selectedRefIdx}
              onChange={(e) => setSelectedRefIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            >
              {mod.pertanyaanRefleksi.map((q, idx) => (
                <option key={idx} value={idx}>
                  {q}
                </option>
              ))}
            </select>
            <textarea
              required
              rows={3}
              value={jawabanRefleksi}
              onChange={(e) => setJawabanRefleksi(e.target.value)}
              placeholder="Tuliskan refleksi pribadimu..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            />
            <textarea
              required
              rows={2}
              value={komitmenAksi}
              onChange={(e) => setKomitmenAksi(e.target.value)}
              placeholder="Komitmen aksi nyata mulai hari ini..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
            />
            <div className="grid grid-cols-2 gap-2">
              {DIMENSI_CINTA_LIST.map((dc) => (
                <button
                  type="button"
                  key={dc}
                  onClick={() => setDimensiCinta(dc)}
                  className={`rounded-xl border px-3 py-2 text-left text-[11px] font-bold ${
                    dimensiCinta === dc
                      ? "border-kemenag-600 bg-kemenag-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  {dc}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-5 py-2.5 text-xs font-bold text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Simpan</span>
              </button>
              {refSuccess && (
                <span className="text-xs font-bold text-kemenag-700">Tersimpan!</span>
              )}
            </div>
          </form>

          <div className="space-y-3 lg:col-span-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Kartu Komitmen Siswa
              </h3>
              <button
                onClick={() => window.print()}
                className="no-print inline-flex items-center gap-1.5 rounded-full border bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Cetak</span>
              </button>
            </div>
            {savedReflections.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-white p-4 text-xs">
                <div className="flex items-center justify-between font-bold">
                  <span>
                    {r.namaSiswa} ({r.kelas})
                  </span>
                  <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[10px] text-amber-900">
                    {r.dimensiCinta}
                  </span>
                </div>
                <p className="mt-2 text-slate-700">{r.jawabanRefleksi}</p>
                <div className="mt-2 rounded-xl bg-kemenag-50 p-2.5 font-semibold text-kemenag-900">
                  Komitmen: {r.komitmenAksi}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drawer Mobile Dalil & Glosarium */}
      {showRefDrawer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 sm:items-center sm:p-4"
          onClick={() => setShowRefDrawer(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900">
                Rujukan Resmi BAB {mod.bab}
              </h3>
              <button
                onClick={() => setShowRefDrawer(false)}
                className="rounded-full bg-slate-100 p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {ReferencePanelContent}
          </div>
        </div>
      )}

      {/* Modal Eskalasi Guru */}
      {showEscalateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">
              Tanyakan ke Guru PAI
            </h3>
            <form onSubmit={handleSaveEscalation} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={escNama}
                  onChange={(e) => setEscNama(e.target.value)}
                  placeholder="Nama Lengkap"
                  className="rounded-xl border px-3 py-2 text-xs"
                />
                <input
                  required
                  value={escKelas}
                  onChange={(e) => setEscKelas(e.target.value)}
                  placeholder="Kelas"
                  className="rounded-xl border px-3 py-2 text-xs"
                />
              </div>
              <textarea
                required
                rows={4}
                value={escPertanyaan}
                onChange={(e) => setEscPertanyaan(e.target.value)}
                placeholder="Tuliskan pertanyaan untuk dibahas bersama guru..."
                className="w-full rounded-xl border px-3 py-2 text-xs"
              />
              {escSuccess && (
                <p className="text-xs font-bold text-kemenag-700">
                  Pertanyaan terkirim ke Guru PAI!
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowEscalateModal(false)}
                  className="rounded-full border px-4 py-2 text-xs font-semibold"
                >
                  Tutup
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-kemenag-600 px-5 py-2 text-xs font-bold text-white"
                >
                  Kirim Pertanyaan
                </button>
              </div>
            </form>

            {myEscalations.length > 0 && (
              <div className="mt-5 max-h-56 space-y-2.5 overflow-y-auto border-t border-slate-100 pt-4">
                <h4 className="text-xs font-extrabold text-kemenag-900">
                  Riwayat Pertanyaan & Jawaban Guru PAI
                </h4>
                {myEscalations.map((item) => {
                  const answered = item.status === "Sudah Dibahas di Kelas";
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-kemenag-700">
                          {item.babId.toUpperCase()}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            answered
                              ? "bg-kemenag-100 text-kemenag-800"
                              : "bg-gold-100 text-amber-900"
                          }`}
                        >
                          {answered ? "Sudah Dijawab Guru" : "Menunggu Jawaban"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-slate-800">&ldquo;{item.pertanyaan}&rdquo;</p>
                      {answered && item.catatanGuru && (
                        <div className="mt-2 rounded-xl bg-kemenag-50 p-2.5 text-kemenag-900">
                          <span className="font-extrabold">Jawaban Guru: </span>
                          {item.catatanGuru}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}