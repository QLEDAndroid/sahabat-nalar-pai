"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ALL_MODULES } from "@/lib/modules";
import { SlidingTabs } from "@/components/ui/SlidingTabs";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { GameLibrary } from "@/components/games/GameLibrary";
import {
  buildGradeMatrix,
  exportGradesCSV,
  exportGradesDOCX,
  exportGradesPDF,
  exportGradesXLSX,
} from "@/lib/exportGrades";
import {
  addForumComment,
  addForumPost,
  addStudentAccountToClass,
  createAssessment,
  deleteAssessment,
  deleteForumPost,
  getAssessments,
  getClassroomById,
  getClassrooms,
  getCurrentUser,
  getForumPosts,
  getSubmissions,
  getUsers,
  updateAssessment,
  updateAssessmentMode,
  removeStudentFromClass,
  updateClassVisibility,
  updateUserProfile,
} from "@/lib/storage";
import {
  Assessment,
  AssessmentMode,
  AssessmentSubmission,
  AssessmentType,
  Classroom,
  EscalationItem,
  ForumAttachment,
  ForumPost,
  QuizQuestion,
  UserProfile,
} from "@/lib/types";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Gamepad2,
  GraduationCap,
  LayoutList,
  Link2,
  MessageSquare,
  MonitorCheck,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  Tv,
  Upload,
  UserPlus,
  Users,
  X,
  Youtube,
} from "lucide-react";

type ClassTab = "forum" | "tugas" | "game" | "anggota" | "nilai";

const MODE_LABEL: Record<AssessmentMode, { label: string; color: string }> = {
  cbt: { label: "CBT Resmi", color: "bg-slate-800 text-white" },
  kahoot: { label: "Kahoot Live", color: "bg-purple-600 text-white" },
  gform: { label: "Google Form", color: "bg-kemenag-600 text-white" },
};

export default function ClassroomDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = typeof params?.classId === "string" ? params.classId : "kelas-x1";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [cls, setCls] = useState<Classroom | null>(null);
  const [tab, setTab] = useState<ClassTab>("tugas");
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [studentEscalations, setStudentEscalations] = useState<EscalationItem[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [submissions, setSubmissions] = useState<AssessmentSubmission[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  // Filter kategori untuk Guru
  const [typeFilter, setTypeFilter] = useState<"Semua" | AssessmentType>("Semua");

  const [newPost, setNewPost] = useState("");
  const [postAttachments, setPostAttachments] = useState<ForumAttachment[]>([]);
  const [attachMode, setAttachMode] = useState<"none" | "link" | "youtube">("none");
  const [attachTitle, setAttachTitle] = useState("");
  const [attachUrl, setAttachUrl] = useState("");
  const [studentQuery, setStudentQuery] = useState("");
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [commentMap, setCommentMap] = useState<Record<string, string>>({});
  const [showCustomize, setShowCustomize] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  // Murid masuk Kuis / Ulangan via 1 Kode Terpadu
  const [joinQuizPin, setJoinQuizPin] = useState("");
  const [joinQuizErr, setJoinQuizErr] = useState("");

  // Tambah murid manual oleh guru
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [stNama, setStNama] = useState("");
  const [stNisn, setStNisn] = useState("");
  const [stPass, setStPass] = useState("123456");

  // Modal Share Asesmen
  const [shareTarget, setShareTarget] = useState<Assessment | null>(null);

  // Modal Create / Edit Asesmen (Multi-Soal!)
  const [showEditor, setShowEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quizJudul, setQuizJudul] = useState("");
  const [quizJenis, setQuizJenis] = useState<AssessmentType>("Kuis");
  const [quizMode, setQuizMode] = useState<AssessmentMode>("kahoot");
  const [quizBabId, setQuizBabId] = useState("bab-09");
  const [quizDurasi, setQuizDurasi] = useState(10);
  const [quizDetikPerSoal, setQuizDetikPerSoal] = useState(15);

  // Fitur Buat Soal dengan AIsyah
  const [showAiGen, setShowAiGen] = useState(false);
  const [aiSourceType, setAiSourceType] = useState<"prompt" | "materi" | "bank_soal">("prompt");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiDocText, setAiDocText] = useState("");
  const [aiCount, setAiCount] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [quizPin, setQuizPin] = useState("");
  const [soalList, setSoalList] = useState<QuizQuestion[]>([]);

  // Form tambah 1 soal di dalam Editor
  const [qText, setQText] = useState("");
  const [qA, setQA] = useState("");
  const [qB, setQB] = useState("");
  const [qC, setQC] = useState("");
  const [qD, setQD] = useState("");
  const [qAns, setQAns] = useState(0);
  const [qBahasan, setQBahasan] = useState("");

  function notify(msg: string) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2400);
  }

  function loadAll() {
    const u = getCurrentUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    const found = getClassroomById(classId);
    if (found) setCls(found);
    setPosts(getForumPosts(classId));
    fetch(`/api/classrooms?classId=${encodeURIComponent(classId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.classroom) {
          const all = getClassrooms().filter((c) => c.id !== d.classroom.id);
          all.push(d.classroom);
          window.localStorage.setItem("snp_classrooms_v1", JSON.stringify(all));
          setCls(d.classroom);
          if (Array.isArray(d.posts)) setPosts(d.posts);
          if (Array.isArray(d.submissions)) setSubmissions(d.submissions);
          if (Array.isArray(d.users) && d.users.length > 0) {
            setAllUsers((prev) => {
              const map = new Map(prev.map((x) => [x.id, x]));
              d.users.forEach((x: UserProfile) => map.set(x.id, x));
              return Array.from(map.values());
            });
          }
        } else if (!found) {
          router.replace("/");
        }
      })
      .catch(() => {
        if (!found) router.replace("/");
      });
    if (u.role === "murid") {
      fetch("/api/escalations", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((list) => {
          if (!Array.isArray(list)) return;
          const mine = list.filter(
            (it: EscalationItem) =>
              it.namaSiswa.trim().toLowerCase() === u.nama.trim().toLowerCase()
          );
          setStudentEscalations(mine);
        })
        .catch(() => {});
    }
    setAssessments(getAssessments(classId));
    fetch(`/api/assessments?classId=${encodeURIComponent(classId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((list) => { if (Array.isArray(list)) setAssessments(list); })
      .catch(() => {});
    setSubmissions(getSubmissions(classId));
    setAllUsers(getUsers());
  }

  useEffect(() => {
    loadAll();
  }, [classId]);

  if (!user || !cls) {
    return <div className="py-16 text-center text-xs text-slate-500">Memuat kelas...</div>;
  }

  const isGuru = user.role === "guru";
  const guruProfile = allUsers.find((u) => u.id === cls.guruId);
  const studentProfiles = allUsers.filter((u) => cls.studentIds.includes(u.id));
  const visibleModules = ALL_MODULES.filter((m) =>
    cls.visibility.enabledBabIds.includes(m.id)
  );

  function copyText(txt: string, label = "Disalin!") {
    navigator.clipboard?.writeText(txt).catch(() => {});
    notify(label);
  }

  function openCreateEditor() {
    setEditingId(null);
    setQuizJudul("");
    setQuizJenis("Kuis");
    setQuizMode("kahoot");
    setQuizBabId("bab-09");
    setQuizDurasi(10);
    setQuizDetikPerSoal(15);
    setShowAiGen(false);
    setQuizPin(String(Math.floor(1000 + Math.random() * 9000)));
    setSoalList([]);
    setQText("");
    setQA("");
    setQB("");
    setQC("");
    setQD("");
    setQAns(0);
    setQBahasan("");
    setShowEditor(true);
  }

  function openEditEditor(asm: Assessment) {
    setEditingId(asm.id);
    setQuizJudul(asm.judul);
    setQuizJenis(asm.jenis);
    setQuizMode(asm.mode);
    setQuizBabId(asm.babId);
    setQuizDurasi(asm.durasiMenit);
    setQuizDetikPerSoal(asm.waktuPerSoalDetik || 15);
    setShowAiGen(false);
    setQuizPin(asm.pinKuis || "");
    setSoalList([...asm.soal]);
    setQText("");
    setQA("");
    setQB("");
    setQC("");
    setQD("");
    setQAns(0);
    setQBahasan("");
    setShowEditor(true);
  }

  function handleAddQuestionToList() {
    if (!qText.trim()) return;
    const item: QuizQuestion = {
      id: `q-${Date.now()}`,
      pertanyaan: qText.trim(),
      opsi: [
        qA.trim() || "Pilihan A",
        qB.trim() || "Pilihan B",
        qC.trim() || "Pilihan C",
        qD.trim() || "Pilihan D",
      ],
      jawabanBenar: qAns,
      pembahasan: qBahasan.trim() || "Merujuk materi resmi modul PAI-BP.",
    };
    setSoalList((prev) => [...prev, item]);
    setQText("");
    setQA("");
    setQB("");
    setQC("");
    setQD("");
    setQAns(0);
    setQBahasan("");
  }

  function handleAiDocFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAiDocText(reader.result);
        notify(`File "${file.name}" dimuat.`);
      }
    };
    reader.readAsText(file);
  }

  async function handleGenerateWithAisyah() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          babId: quizBabId,
          sourceType: aiSourceType,
          prompt: aiPrompt,
          documentText: aiDocText,
          count: aiCount,
        }),
      });
      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions)) {
        notify(data.error || "Gagal membuat soal dengan AIsyah.");
      } else {
        setSoalList((prev) => [...prev, ...data.questions]);
        notify(`${data.questions.length} soal berhasil dibuat oleh AIsyah!`);
        setShowAiGen(false);
        setAiPrompt("");
        setAiDocText("");
      }
    } catch {
      notify("Koneksi ke AIsyah gagal.");
    } finally {
      setAiLoading(false);
    }
  }

  function handleSaveEditor(e: React.FormEvent) {
    e.preventDefault();
    if (!quizJudul.trim()) return;
    const mod = ALL_MODULES.find((m) => m.id === quizBabId);
    const finalMode: AssessmentMode =
      quizJenis !== "Kuis" && quizMode === "kahoot" ? "cbt" : quizMode;

    // Jika guru mengisi soal di form tapi lupa klik "+ Tambah Soal", ikut sertakan otomatis
    let finalSoal = [...soalList];
    if (qText.trim()) {
      finalSoal.push({
        id: `q-${Date.now()}`,
        pertanyaan: qText.trim(),
        opsi: [qA || "Pilihan A", qB || "Pilihan B", qC || "Pilihan C", qD || "Pilihan D"],
        jawabanBenar: qAns,
        pembahasan: qBahasan || `Sesuai materi ${mod?.judul || "Modul PAI-BP"}.`,
      });
    }
    if (finalSoal.length === 0) {
      finalSoal = [
        {
          id: `auto-${Date.now()}`,
          pertanyaan: `Apa inti konsep utama pada BAB ${mod?.bab} (${mod?.judul})?`,
          opsi: [
            mod?.glosarium[0]?.penjelasan.slice(0, 75) || "Memahami prinsip utama modul",
            "Menghafal tanpa memahami konteks",
            "Mengabaikan dalil resmi",
            "Tidak relevan dengan kehidupan pelajar",
          ],
          jawabanBenar: 0,
          pembahasan: `Merujuk Bagian F & Glosarium BAB ${mod?.bab}.`,
        },
      ];
    }

    const codeVal =
      quizJenis === "Latihan Soal"
        ? undefined
        : quizPin.trim().toUpperCase() || String(Math.floor(1000 + Math.random() * 9000));

    const payload = {
      classId,
      babId: quizBabId,
      judul: quizJudul.trim(),
      jenis: quizJenis,
      mode: finalMode,
      durasiMenit: quizDurasi,
      waktuPerSoalDetik: finalMode === "kahoot" ? quizDetikPerSoal : undefined,
      pinKuis: codeVal,
      published: true,
      soal: finalSoal,
    };
    if (editingId) {
      updateAssessment(editingId, payload);
      fetch("/api/assessments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...payload }),
      }).then(() => loadAll()).catch(() => {});
      notify("Perubahan berhasil disimpan & disinkronkan.");
    } else {
      createAssessment(payload);
      fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then(() => loadAll()).catch(() => {});
      notify(`${quizJenis} baru diterbitkan ke seluruh perangkat.`);
    }

    setShowEditor(false);
    loadAll();
  }

  function handleShareToForum(asm: Assessment) {
    if (!user) return;
    const msg =
      asm.jenis === "Latihan Soal"
        ? `Latihan Soal baru telah tersedia di tab Tugas: "${asm.judul}" (${asm.soal.length} soal). Silakan dikerjakan untuk melatih pemahaman.`
        : `${asm.jenis} telah dibuka: "${asm.judul}" (${asm.soal.length} soal). Masuk menggunakan Kode Akses: ${asm.pinKuis || "-"} di tab Tugas.`;
    setPosts(
      addForumPost({
        classId,
        authorName: user.nama,
        authorRole: "guru",
        content: msg,
      })
    );
    setShareTarget(null);
    notify("Berhasil dibagikan ke Forum Kelas!");
  }

  async function handleStudentJoinByCode(e: React.FormEvent) {
    e.preventDefault();
    const clean = joinQuizPin.trim().toUpperCase();
    try {
      const res = await fetch(`/api/assessments?pin=${encodeURIComponent(clean)}`, { cache: "no-store" });
      if (res.ok) {
        const match = await res.json();
        if (match?.published) {
          setJoinQuizErr("");
          router.push(`/asesmen/${match.id}?pin=${encodeURIComponent(clean)}`);
          return;
        }
      }
    } catch {}
    const localMatch = assessments.find(
      (a) =>
        a.published &&
        (a.jenis === "Kuis" || a.jenis === "Ulangan Harian") &&
        a.pinKuis?.toUpperCase() === clean
    );
    if (!localMatch) {
      setJoinQuizErr("Kode tidak ditemukan atau belum diaktifkan guru.");
      return;
    }
    setJoinQuizErr("");
    router.push(`/asesmen/${localMatch.id}?pin=${encodeURIComponent(clean)}`);
  }

  function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!stNama.trim()) return;
    addStudentAccountToClass(classId, stNama, stNisn, stPass);
    setStNama("");
    setStNisn("");
    setShowAddStudent(false);
    loadAll();
    notify("Akun murid berhasil ditambahkan.");
  }

  function getYoutubeEmbed(url: string): string | null {
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
    return m ? `https://www.youtube.com/embed/${m[1]}` : null;
  }

  function handleForumFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPostAttachments((prev) => [
          ...prev,
          { id: `att-${Date.now()}`, type: "file", title: file.name, url: reader.result as string },
        ]);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleAddLinkAttachment() {
    if (!attachUrl.trim()) return;
    const url = attachUrl.trim().startsWith("http") ? attachUrl.trim() : `https://${attachUrl.trim()}`;
    setPostAttachments((prev) => [
      ...prev,
      {
        id: `att-${Date.now()}`,
        type: attachMode === "youtube" ? "youtube" : "link",
        title: attachTitle.trim() || (attachMode === "youtube" ? "Video YouTube" : url),
        url,
      },
    ]);
    setAttachTitle("");
    setAttachUrl("");
    setAttachMode("none");
  }

  function handlePostForum(e: React.FormEvent) {
    e.preventDefault();
    if (!user || (!newPost.trim() && postAttachments.length === 0)) return;
    setPosts(
      addForumPost({
        classId,
        authorName: user.nama,
        authorRole: user.role,
        content: newPost.trim() || "Lampiran materi kelas:",
        attachments: postAttachments,
      })
    );
    setNewPost("");
    setPostAttachments([]);
  }

  function handleComment(postId: string) {
    if (!user) return;
    const text = commentMap[postId]?.trim();
    if (!text) return;
    setPosts(addForumComment(postId, classId, user.nama, user.role, text));
    setCommentMap({ ...commentMap, [postId]: "" });
  }

  function toggleBabVisibility(babId: string) {
    if (!cls) return;
    const exists = cls.visibility.enabledBabIds.includes(babId);
    const nextBabs = exists
      ? cls.visibility.enabledBabIds.filter((x) => x !== babId)
      : [...cls.visibility.enabledBabIds, babId];
    updateClassVisibility(cls.id, { ...cls.visibility, enabledBabIds: nextBabs });
    loadAll();
  }

  const displayedAssessments = assessments.filter((a) => {
    if (!isGuru) return a.published && a.jenis === "Latihan Soal";
    return typeFilter === "Semua" || a.jenis === typeFilter;
  });

  return (
    <div className="space-y-4 overflow-x-hidden">
      {/* Toast Notifikasi */}
      {toastMsg && (
        <div className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-lg sm:bottom-6">
          {toastMsg}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-kemenag-800 shadow-sm ring-1 ring-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Beranda</span>
        </Link>
        {isGuru && (
          <div className="flex items-center gap-2">
            <Link
              href="/guru"
              className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-kemenag-800 shadow-sm ring-1 ring-slate-200 hover:bg-kemenag-50"
            >
              <MessageSquare className="h-3.5 w-3.5 text-kemenag-600" />
              <span>Pertanyaan Siswa</span>
            </Link>
            <button
              onClick={() => setShowCustomize(!showCustomize)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gold-500 px-3.5 py-1.5 text-xs font-extrabold text-kemenag-900 shadow-sm"
            >
              <Settings2 className="h-3.5 w-3.5" />
              <span>Atur Progres</span>
            </button>
          </div>
        )}
      </div>

      {/* Banner Kelas */}
      <section className="rounded-3xl bg-gradient-to-r from-[#005532] to-[#006B3F] p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={() => {
              copyText(cls.kodeKelas, `Kode kelas ${cls.kodeKelas} disalin!`);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-bold hover:bg-white/30"
          >
            <span>Kode Kelas: {cls.kodeKelas}</span>
            <Copy className="h-3 w-3" />
            {copied && <span className="text-gold-400">OK</span>}
          </button>
          <span className="text-[11px] text-kemenag-100">
            {studentProfiles.length} murid terdaftar
          </span>
        </div>
        <h1 className="mt-2.5 text-xl font-extrabold sm:text-2xl">{cls.nama}</h1>
        <p className="mt-0.5 text-xs text-kemenag-100">{cls.subjudul}</p>
      </section>

      {/* Panel Kontrol Progres Bab */}
      {isGuru && showCustomize && (
        <section className="rounded-3xl border-2 border-gold-400 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-kemenag-900 sm:text-sm">
              Pilih Bab Aktif untuk Murid ({cls.nama})
            </h2>
            <button onClick={() => setShowCustomize(false)} className="rounded-full bg-slate-100 p-1">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {ALL_MODULES.map((m) => {
              const active = cls.visibility.enabledBabIds.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleBabVisibility(m.id)}
                  className={`rounded-xl border px-2.5 py-2 text-left text-xs font-bold ${
                    active
                      ? "border-kemenag-600 bg-kemenag-600 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-600"
                  }`}
                >
                  BAB {m.bab}
                  <span className="block truncate text-[10px] font-normal opacity-90">
                    {m.judul}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* 4 Tab Sliding */}
      <SlidingTabs
        value={tab}
        onChange={setTab}
        items={[
          { id: "tugas", label: "Tugas", icon: ClipboardList },
          { id: "forum", label: "Forum", icon: MessageSquare },
          { id: "game", label: "Game", icon: Gamepad2 },
          { id: "anggota", label: "Anggota", icon: Users },
          { id: "nilai", label: isGuru ? "Nilai" : "Skor", icon: CheckCircle2 },
        ]}
      />

      {/* TAB TUGAS KELAS */}
      {tab === "tugas" && (
        <div className="space-y-6">
          <section className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-extrabold text-kemenag-900">
                {isGuru ? "Kelola Kuis, Ulangan & Latihan Soal" : "Latihan Soal"}
              </h2>
              {isGuru && (
                <button
                  onClick={openCreateEditor}
                  className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-kemenag-700"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Buat Kuis / Ulangan / Latihan</span>
                </button>
              )}
            </div>

            {/* Filter Kategori Khusus Guru */}
            {isGuru && (
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-1">
                {(["Semua", "Kuis", "Ulangan Harian", "Latihan Soal"] as const).map(
                  (ft) => (
                    <button
                      key={ft}
                      onClick={() => setTypeFilter(ft)}
                      className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                        typeFilter === ft
                          ? "bg-kemenag-600 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-kemenag-400"
                      }`}
                    >
                      {ft}
                    </button>
                  )
                )}
              </div>
            )}

            {/* Kotak 1 Kode Terpadu Khusus Murid */}
            {!isGuru && (
              <form
                onSubmit={handleStudentJoinByCode}
                className="rounded-3xl border border-kemenag-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-kemenag-900">
                      <Tv className="h-4 w-4 text-kemenag-600" />
                      <span>Masuk Kuis / Ulangan dengan Kode</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Satu pintu untuk Kuis Interaktif maupun Ulangan Harian —
                      sistem otomatis mengenali jenisnya.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={joinQuizPin}
                      onChange={(e) => setJoinQuizPin(e.target.value)}
                      placeholder="Kode (9026 / 8026)"
                      className="w-36 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-xs font-black uppercase tracking-widest focus:border-kemenag-600 focus:bg-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-kemenag-600 px-4 py-2 text-xs font-bold text-white hover:bg-kemenag-700"
                    >
                      Masuk
                    </button>
                  </div>
                </div>
                {joinQuizErr && (
                  <p className="mt-2 text-xs font-semibold text-rose-600">
                    {joinQuizErr}
                  </p>
                )}
              </form>
            )}

            {/* Grid Kartu Simetris & Rapi */}
            <div className="grid gap-4 sm:grid-cols-2">
              {displayedAssessments.map((asm) => {
                const isInteractiveQuiz = asm.jenis === "Kuis";
                const modeOptions = (
                  [
                    { m: "cbt" as const, txt: "CBT", icon: MonitorCheck },
                    { m: "kahoot" as const, txt: "Kahoot", icon: Gamepad2 },
                    { m: "gform" as const, txt: "G-Form", icon: LayoutList },
                  ]
                ).filter((x) => isInteractiveQuiz || x.m !== "kahoot");

                return (
                  <SpotlightCard
                    key={asm.id}
                    color="#008A52"
                    className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm ${
                      asm.published
                        ? "border-slate-200"
                        : "border-dashed border-slate-300 opacity-75"
                    }`}
                  >
                    <div>
                      {/* Baris Meta + Ikon Manage Guru */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-gold-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                            {asm.jenis}
                          </span>
                          <span className="text-[11px] font-semibold text-slate-500">
                            {asm.soal.length} Soal • {asm.mode === "kahoot" ? `${asm.waktuPerSoalDetik || 15} dtk/soal` : `${asm.durasiMenit} mnt`}
                          </span>
                          {!asm.published && (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                              Draft
                            </span>
                          )}
                        </div>

                        {isGuru ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setShareTarget(asm)}
                              title="Bagikan Kode / ke Forum"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-kemenag-50 hover:text-kemenag-700"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => openEditEditor(asm)}
                              title="Edit Judul & Soal"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-kemenag-50 hover:text-kemenag-700"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                updateAssessment(asm.id, { published: !asm.published });
                                fetch("/api/assessments", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: asm.id, published: !asm.published }),
                                }).then(() => loadAll()).catch(() => {});
                                notify(
                                  asm.published
                                    ? "Disembunyikan (Draft)."
                                    : "Diaktifkan kembali."
                                );
                              }}
                              title={asm.published ? "Sembunyikan (Draft)" : "Aktifkan"}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                            >
                              {asm.published ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                deleteAssessment(asm.id);
                                fetch(`/api/assessments?id=${encodeURIComponent(asm.id)}`, { method: "DELETE" })
                                  .then(() => loadAll()).catch(() => {});
                                notify("Item dihapus.");
                              }}
                              title="Hapus"
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              MODE_LABEL[asm.mode].color
                            }`}
                          >
                            {MODE_LABEL[asm.mode].label}
                          </span>
                        )}
                      </div>

                      <h3 className="mt-2.5 text-sm font-extrabold text-slate-900">
                        {asm.judul}
                      </h3>

                      {/* Kode Akses untuk Guru (Kuis & Ulangan) */}
                      {isGuru && asm.pinKuis && (
                        <div className="mt-2 flex items-center justify-between rounded-xl bg-kemenag-50 px-3 py-1.5 text-xs">
                          <span className="font-semibold text-kemenag-900">
                            Kode Akses:{" "}
                            <strong className="tracking-wider">
                              {asm.pinKuis}
                            </strong>
                          </span>
                          <button
                            onClick={() =>
                              copyText(
                                asm.pinKuis || "",
                                `Kode ${asm.pinKuis} disalin!`
                              )
                            }
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-kemenag-700 hover:underline"
                          >
                            <Copy className="h-3 w-3" /> Salin
                          </button>
                        </div>
                      )}

                      {/* Selector Mode Simetris (2 kolom untuk Ulangan/Latihan, 3 kolom untuk Kuis) */}
                      {isGuru && (
                        <div
                          className={`mt-3 grid gap-1 rounded-xl bg-slate-50 p-1 ${
                            modeOptions.length === 3 ? "grid-cols-3" : "grid-cols-2"
                          }`}
                        >
                          {modeOptions.map(({ m, txt, icon: Icon }) => (
                            <button
                              key={m}
                              onClick={() => {
                                updateAssessmentMode(asm.id, m);
                                fetch("/api/assessments", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ id: asm.id, mode: m }),
                                }).then(() => loadAll()).catch(() => {});
                              }}
                              className={`flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-bold transition ${
                                asm.mode === m
                                  ? "bg-kemenag-600 text-white shadow-sm"
                                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:text-kemenag-800"
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                              <span>{txt}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Tombol Aksi Bawah yang Konsisten */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isGuru && asm.mode === "kahoot" && (
                        <>
                          <Link
                            href={`/tv?pin=${asm.pinKuis || "9026"}`}
                            className="hidden flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-3 py-2.5 text-xs font-extrabold text-kemenag-900 hover:bg-gold-400 md:flex"
                          >
                            <Tv className="h-3.5 w-3.5" />
                            <span>Proyektor Live</span>
                          </Link>
                          <Link
                            href={`/tv?pin=${asm.pinKuis || "9026"}&view=moderator`}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-gold-500 px-3 py-2.5 text-xs font-extrabold text-kemenag-900 md:hidden"
                          >
                            <Tv className="h-3.5 w-3.5" />
                            <span>Mode Moderator</span>
                          </Link>
                        </>
                      )}
                      <Link
                        href={`/asesmen/${asm.id}`}
                        className="flex flex-1 items-center justify-center rounded-xl bg-kemenag-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-kemenag-700"
                      >
                        {isGuru ? "Pratinjau" : "Kerjakan"}
                      </Link>
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          </section>

          {/* Modul Aktif */}
          <section className="space-y-3">
            <h2 className="text-sm font-extrabold text-kemenag-900">
              Modul PAI-BP Aktif & AIsyah ({visibleModules.length} Bab)
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {visibleModules.map((mod) => (
                <Link
                  key={mod.id}
                  href={`/belajar/${mod.id}`}
                  className="relative z-10 flex w-full min-w-0 items-center justify-between gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition active:scale-[0.98] hover:border-kemenag-500"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-kemenag-50 text-sm font-extrabold text-kemenag-800">
                      {mod.bab}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10px] font-bold uppercase text-kemenag-700">
                        {mod.elemen}
                      </div>
                      <div className="line-clamp-2 text-xs font-extrabold leading-snug text-slate-900">
                        {mod.judul}
                      </div>
                    </div>
                  </div>
                  <BookOpen className="h-4 w-4 shrink-0 text-kemenag-600" />
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* TAB FORUM ALA GOOGLE CLASSROOM (File, Link, YouTube) */}
      {tab === "forum" && (
        <div className="space-y-4">
          {isGuru && (
            <form onSubmit={handlePostForum} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <textarea
                rows={3}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="Umumkan sesuatu, bagikan materi, tautan, atau video YouTube ke kelas..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs focus:border-kemenag-600 focus:bg-white focus:outline-none"
              />

              {/* Daftar Lampiran yang Akan Diposting */}
              {postAttachments.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {postAttachments.map((att) => (
                    <span
                      key={att.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-50 px-3 py-1 text-[11px] font-semibold text-kemenag-900"
                    >
                      {att.type === "youtube" ? <Youtube className="h-3.5 w-3.5 text-rose-600" /> : att.type === "link" ? <Link2 className="h-3.5 w-3.5 text-blue-600" /> : <FileText className="h-3.5 w-3.5 text-kemenag-700" />}
                      <span className="max-w-[160px] truncate">{att.title}</span>
                      <button type="button" onClick={() => setPostAttachments(postAttachments.filter((x) => x.id !== att.id))}>
                        <X className="h-3 w-3 text-slate-500" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Input Tambah Link / YouTube */}
              {attachMode !== "none" && (
                <div className="mt-2.5 flex flex-wrap gap-2 rounded-2xl bg-slate-50 p-2.5 text-xs">
                  <input
                    value={attachTitle}
                    onChange={(e) => setAttachTitle(e.target.value)}
                    placeholder={attachMode === "youtube" ? "Judul Video (opsional)" : "Judul Tautan (opsional)"}
                    className="min-w-[140px] flex-1 rounded-xl border bg-white px-3 py-1.5"
                  />
                  <input
                    value={attachUrl}
                    onChange={(e) => setAttachUrl(e.target.value)}
                    placeholder={attachMode === "youtube" ? "https://youtube.com/watch?v=..." : "https://..."}
                    className="min-w-[180px] flex-1 rounded-xl border bg-white px-3 py-1.5"
                  />
                  <button type="button" onClick={handleAddLinkAttachment} className="rounded-xl bg-kemenag-600 px-3.5 py-1.5 font-bold text-white">
                    Lampirkan
                  </button>
                  <button type="button" onClick={() => setAttachMode("none")} className="rounded-xl border bg-white px-2.5 py-1.5 text-slate-500">
                    Batal
                  </button>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100">
                    <Paperclip className="h-3.5 w-3.5 text-kemenag-700" />
                    <span>File</span>
                    <input type="file" onChange={handleForumFileUpload} className="hidden" />
                  </label>
                  <button
                    type="button"
                    onClick={() => setAttachMode("link")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Link2 className="h-3.5 w-3.5 text-blue-600" />
                    <span>Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachMode("youtube")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100"
                  >
                    <Youtube className="h-3.5 w-3.5 text-rose-600" />
                    <span>YouTube</span>
                  </button>
                </div>

                <button type="submit" className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-4 py-2 text-xs font-bold text-white hover:bg-kemenag-700">
                  <Send className="h-3.5 w-3.5" />
                  <span>Posting</span>
                </button>
              </div>
            </form>
          )}

          {!isGuru && studentEscalations.length > 0 && (
            <div className="rounded-3xl border border-kemenag-200 bg-kemenag-50/50 p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-extrabold text-kemenag-900">
                    Pertanyaan Saya & Jawaban Guru PAI
                  </h3>
                  <p className="text-[11px] text-slate-600">
                    Jawaban dari guru untuk pertanyaan yang kamu kirim di Ruang Belajar.
                  </p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-0.5 text-[10px] font-extrabold text-kemenag-700 ring-1 ring-kemenag-200">
                  {studentEscalations.filter((e) => e.status === "Sudah Dibahas di Kelas").length} Dijawab
                </span>
              </div>
              <div className="space-y-2.5">
                {studentEscalations.map((item) => {
                  const answered = item.status === "Sudah Dibahas di Kelas";
                  return (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 text-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-kemenag-700">
                          {item.babId.toUpperCase()} — {item.babJudul}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            answered
                              ? "bg-kemenag-100 text-kemenag-800"
                              : "bg-gold-100 text-amber-900"
                          }`}
                        >
                          {answered ? "Sudah Dijawab Guru" : "Menunggu Jawaban"}
                        </span>
                      </div>
                      <p className="mt-1.5 text-slate-800">
                        <span className="font-semibold text-slate-500">Pertanyaanmu: </span>
                        &ldquo;{item.pertanyaan}&rdquo;
                      </p>
                      {answered && item.catatanGuru && (
                        <div className="mt-2 rounded-xl bg-kemenag-50 p-2.5 text-kemenag-900">
                          <span className="font-extrabold">Jawaban Guru PAI: </span>
                          {item.catatanGuru}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {posts.map((p) => (
            <div key={p.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs font-extrabold text-slate-900">
                  {p.authorName}{" "}
                  <span className="ml-1 rounded-full bg-kemenag-50 px-2 py-0.5 text-[10px] text-kemenag-700">
                    {p.authorRole === "guru" ? "Guru" : "Murid"}
                  </span>
                </div>
                {isGuru && (
                  <button
                    onClick={() => {
                      setPosts(deleteForumPost(p.id, classId));
                      fetch("/api/classrooms", {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "delete_post", postId: p.id }),
                      }).catch(() => {});
                    }}
                    title="Hapus postingan"
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-700">{p.content}</p>

              {/* Render Lampiran File, Link, & YouTube Embed */}
              {p.attachments && p.attachments.length > 0 && (
                <div className="mt-3 space-y-2.5">
                  {p.attachments.map((att) => {
                    const ytEmbed = att.type === "youtube" ? getYoutubeEmbed(att.url) : null;
                    if (ytEmbed) {
                      return (
                        <div key={att.id} className="overflow-hidden rounded-2xl border border-slate-200">
                          <div className="aspect-video w-full">
                            <iframe
                              src={ytEmbed}
                              title={att.title}
                              className="h-full w-full"
                              allowFullScreen
                            />
                          </div>
                          <div className="bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                            {att.title}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <a
                        key={att.id}
                        href={att.url}
                        target={att.type === "link" ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        download={att.type === "file" ? att.title : undefined}
                        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs hover:border-kemenag-500"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {att.type === "file" ? (
                            <FileText className="h-4 w-4 shrink-0 text-kemenag-700" />
                          ) : (
                            <ExternalLink className="h-4 w-4 shrink-0 text-blue-600" />
                          )}
                          <span className="truncate font-bold text-slate-800">{att.title}</span>
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-kemenag-700">
                          {att.type === "file" ? "Unduh" : "Buka"}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 space-y-2 border-t pt-3">
                {p.comments.map((c) => (
                  <div key={c.id} className="rounded-xl bg-[#F4F9F6] px-3 py-2 text-xs">
                    <strong className="text-kemenag-900">{c.authorName}: </strong>
                    {c.text}
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={commentMap[p.id] || ""}
                    onChange={(e) => setCommentMap({ ...commentMap, [p.id]: e.target.value })}
                    placeholder="Komentari..."
                    className="min-w-0 flex-1 rounded-full border bg-slate-50 px-3 py-1.5 text-xs"
                  />
                  <button
                    onClick={() => handleComment(p.id)}
                    className="shrink-0 rounded-full bg-kemenag-50 px-3.5 py-1.5 text-xs font-bold text-kemenag-800"
                  >
                    Kirim
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB ANGGOTA */}
            {tab === "game" && <GameLibrary isGuru={isGuru} />}

{tab === "anggota" && (
        <div className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm">
          <div>
            <h2 className="border-b pb-2 text-sm font-extrabold text-kemenag-900">
              Guru Pengampu
            </h2>
            <div className="mt-3 flex items-center gap-3">
              <img
                src={guruProfile?.avatarDataUrl || "/images/avatar-aisyah.jpg"}
                alt={cls.guruNama}
                className="h-10 w-10 rounded-full border object-cover"
              />
              <div className="min-w-0">
                <div className="truncate text-xs font-extrabold">{cls.guruNama}</div>
                <div className="truncate text-[11px] text-slate-500">{guruProfile?.nomorInduk}</div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
              <h2 className="text-sm font-extrabold text-kemenag-900">
                Daftar Murid ({studentProfiles.length})
              </h2>
              {isGuru && (
                <button
                  onClick={() => setShowAddStudent(true)}
                  className="inline-flex items-center gap-1 rounded-full bg-kemenag-600 px-3.5 py-1.5 text-[11px] font-bold text-white"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>Tambah Akun Murid</span>
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <input
                value={studentQuery}
                onChange={(e) => setStudentQuery(e.target.value)}
                placeholder="Cari nama atau NISN murid..."
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
            <div className="mt-2 divide-y">
              {studentProfiles
                .filter(
                  (s) =>
                    !studentQuery.trim() ||
                    s.nama.toLowerCase().includes(studentQuery.toLowerCase()) ||
                    s.nomorInduk.includes(studentQuery)
                )
                .map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-2 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-bold text-slate-900">{s.nama}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        NISN: {s.nomorInduk} • {s.email}
                        {isGuru && ` • Sandi: ${s.password}`}
                      </div>
                    </div>
                    {isGuru ? (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          onClick={() => setEditingStudent(s)}
                          title="Edit Murid"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-kemenag-50 hover:text-kemenag-700"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            removeStudentFromClass(classId, s.id);
                            loadAll();
                            notify(`${s.nama} dikeluarkan dari kelas.`);
                          }}
                          title="Keluarkan dari Kelas"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <GraduationCap className="h-4 w-4 shrink-0 text-kemenag-600" />
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB NILAI TERSTRUKTUR + EKSPOR CSV / XLSX / DOCX / PDF */}
      {tab === "nilai" && (() => {
        const targetStudents = isGuru ? studentProfiles : [user];
        const matrix = buildGradeMatrix(targetStudents, assessments, submissions);
        const avgAll =
          matrix.length > 0
            ? Math.round(matrix.reduce((acc, r) => acc + r.rataRata, 0) / matrix.length)
            : 0;
        return (
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-extrabold text-kemenag-900">
                  {isGuru ? `Buku Nilai Terstruktur — ${cls.nama}` : "Rekap Nilai Saya"}
                </h2>
                <p className="text-[11px] text-slate-500">
                  {targetStudents.length} murid • {assessments.length} asesmen • Rata-rata kelas: <strong>{avgAll}</strong>
                </p>
              </div>

              {isGuru && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => exportGradesCSV(cls, assessments, matrix)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-700 hover:border-kemenag-500"
                  >
                    <Download className="h-3 w-3" /> .CSV
                  </button>
                  <button
                    onClick={() => exportGradesXLSX(cls, assessments, matrix)}
                    className="inline-flex items-center gap-1 rounded-full border border-kemenag-200 bg-kemenag-50 px-3 py-1.5 text-[11px] font-bold text-kemenag-800 hover:bg-kemenag-100"
                  >
                    <Download className="h-3 w-3" /> .XLSX
                  </button>
                  <button
                    onClick={() => exportGradesDOCX(cls, assessments, matrix)}
                    className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-bold text-blue-800 hover:bg-blue-100"
                  >
                    <Download className="h-3 w-3" /> .DOCX
                  </button>
                  <button
                    onClick={() => exportGradesPDF(cls, assessments, matrix)}
                    className="inline-flex items-center gap-1 rounded-full bg-kemenag-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-kemenag-700"
                  >
                    <Download className="h-3 w-3" /> .PDF
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-[#F4F9F6] text-slate-700">
                    <th className="p-3 font-bold">Nama Murid</th>
                    <th className="p-3 font-bold">NISN</th>
                    {assessments.map((a) => (
                      <th key={a.id} className="p-3 text-center font-bold">
                        <span className="block max-w-[120px] truncate">{a.judul}</span>
                        <span className="text-[10px] font-normal text-slate-500">{a.jenis}</span>
                      </th>
                    ))}
                    <th className="p-3 text-center font-extrabold text-kemenag-900">Rata-Rata</th>
                    <th className="p-3 font-bold">Predikat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {matrix.map((row) => (
                    <tr key={row.nisn} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">{row.nama}</td>
                      <td className="p-3 text-slate-500">{row.nisn}</td>
                      {assessments.map((a) => (
                        <td key={a.id} className="p-3 text-center font-semibold">
                          {row.scores[a.id] !== null ? (
                            <span className="rounded-full bg-kemenag-50 px-2.5 py-0.5 text-kemenag-800">
                              {row.scores[a.id]}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                      <td className="p-3 text-center font-black text-kemenag-800">
                        {row.rataRata}
                      </td>
                      <td className="p-3 text-[11px] font-semibold text-slate-600">
                        {row.predikat}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* MODAL SHARE ASESMEN */}
      {shareTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setShareTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Bagikan {shareTarget.jenis}
              </h3>
              <button onClick={() => setShareTarget(null)} className="rounded-full bg-slate-100 p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-700">
              {shareTarget.judul}
            </p>

            {shareTarget.pinKuis && (
              <div className="mt-4 rounded-2xl bg-kemenag-50 p-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-kemenag-700">
                  Kode Akses Murid
                </span>
                <div className="mt-1 text-3xl font-black tracking-[0.25em] text-kemenag-900">
                  {shareTarget.pinKuis}
                </div>
                <button
                  onClick={() =>
                    copyText(
                      `Masuk ${shareTarget.jenis} "${shareTarget.judul}" dengan Kode: ${shareTarget.pinKuis}`,
                      "Pesan & kode disalin!"
                    )
                  }
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-kemenag-800 ring-1 ring-kemenag-200"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Salin Kode & Instruksi</span>
                </button>
              </div>
            )}

            <div className="mt-4 space-y-2">
              <button
                onClick={() => handleShareToForum(shareTarget)}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-kemenag-600 py-2.5 text-xs font-bold text-white hover:bg-kemenag-700"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Umumkan Langsung ke Forum Kelas</span>
              </button>
              {shareTarget.mode === "kahoot" && (
                <Link
                  href={`/tv?pin=${shareTarget.pinKuis || "9026"}`}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-gold-500 py-2.5 text-xs font-extrabold text-kemenag-900"
                >
                  <Tv className="h-4 w-4" />
                  <span>Buka Layar Proyektor (TV)</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITOR LENGKAP CREATE / EDIT MULTI-SOAL */}
      {showEditor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setShowEditor(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-kemenag-900">
                {editingId ? "Edit Asesmen & Kelola Soal" : "Buat Kuis / Ulangan / Latihan Baru"}
              </h3>
              <button onClick={() => setShowEditor(false)} className="rounded-full bg-slate-100 p-1.5">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditor} className="mt-4 space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="font-bold text-slate-700">Judul</label>
                  <input
                    required
                    value={quizJudul}
                    onChange={(e) => setQuizJudul(e.target.value)}
                    placeholder="Contoh: Ulangan Harian BAB 9"
                    className="mt-1 w-full rounded-xl border px-3.5 py-2.5"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700">Jenis</label>
                  <select
                    value={quizJenis}
                    onChange={(e) => {
                      const val = e.target.value as AssessmentType;
                      setQuizJenis(val);
                      if (val !== "Kuis" && quizMode === "kahoot") setQuizMode("cbt");
                    }}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  >
                    <option>Kuis</option>
                    <option>Ulangan Harian</option>
                    <option>Latihan Soal</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Mode Tampilan Murid</label>
                  <select
                    value={quizMode}
                    onChange={(e) => setQuizMode(e.target.value as AssessmentMode)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  >
                    {quizJenis === "Kuis" && <option value="kahoot">Kahoot Live</option>}
                    <option value="cbt">CBT Resmi</option>
                    <option value="gform">Google Form</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-slate-700">Bab Modul</label>
                  <select
                    value={quizBabId}
                    onChange={(e) => setQuizBabId(e.target.value)}
                    className="mt-1 w-full rounded-xl border px-3 py-2"
                  >
                    {ALL_MODULES.map((m) => (
                      <option key={m.id} value={m.id}>
                        BAB {m.bab}: {m.judul}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quizMode === "kahoot" ? (
                    <div>
                      <label className="font-bold text-kemenag-800">Waktu/Soal (detik)</label>
                      <select
                        value={quizDetikPerSoal}
                        onChange={(e) => setQuizDetikPerSoal(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border border-kemenag-300 bg-kemenag-50 px-3 py-2 font-bold text-kemenag-900"
                      >
                        {[10, 15, 20, 30, 45, 60].map((sec) => (
                          <option key={sec} value={sec}>{sec} detik</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="font-bold text-slate-700">Durasi (mnt)</label>
                      <input
                        type="number"
                        min={1}
                        max={120}
                        value={quizDurasi}
                        onChange={(e) => setQuizDurasi(Number(e.target.value))}
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                      />
                    </div>
                  )}
                  {quizJenis !== "Latihan Soal" && (
                    <div>
                      <label className="font-bold text-slate-700">Kode Akses</label>
                      <input
                        value={quizPin}
                        onChange={(e) => setQuizPin(e.target.value)}
                        placeholder="9026"
                        className="mt-1 w-full rounded-xl border px-3 py-2 font-bold uppercase"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Daftar Soal yang Sudah Ditambahkan */}
              <div className="rounded-2xl border border-slate-200 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-kemenag-900">
                    Daftar Soal ({soalList.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAiGen(!showAiGen)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-3.5 py-1.5 text-[11px] font-bold text-white shadow-sm hover:bg-kemenag-700"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                    <span>Buat Soal dengan AIsyah</span>
                  </button>
                </div>

                {showAiGen && (
                  <div className="mt-3 space-y-2.5 rounded-2xl border border-kemenag-200 bg-kemenag-50/70 p-3.5">
                    <div className="grid grid-cols-3 gap-1 rounded-xl bg-white p-1">
                      {[
                        { id: "prompt" as const, label: "Dari Prompt" },
                        { id: "materi" as const, label: "Dokumen Materi" },
                        { id: "bank_soal" as const, label: "Bank Soal Jadi" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setAiSourceType(t.id)}
                          className={`rounded-lg py-1.5 text-[11px] font-bold transition ${
                            aiSourceType === t.id
                              ? "bg-kemenag-600 text-white"
                              : "text-slate-600"
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>

                    {aiSourceType !== "prompt" && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-kemenag-900">
                            {aiSourceType === "bank_soal"
                              ? "Tempel atau unggah dokumen bank soal jadi:"
                              : "Tempel atau unggah dokumen materi ajar:"}
                          </span>
                          <label className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-kemenag-800 ring-1 ring-kemenag-200 hover:bg-kemenag-100">
                            <Upload className="h-3 w-3" />
                            <span>Unggah File (.txt/.md)</span>
                            <input
                              type="file"
                              accept=".txt,.md,.csv,.json"
                              onChange={handleAiDocFile}
                              className="hidden"
                            />
                          </label>
                        </div>
                        <textarea
                          rows={3}
                          value={aiDocText}
                          onChange={(e) => setAiDocText(e.target.value)}
                          placeholder={
                            aiSourceType === "bank_soal"
                              ? "Tempel daftar soal & pilihan A-D dari Word/dokumen di sini..."
                              : "Tempel ringkasan materi atau kutipan modul di sini..."
                          }
                          className="w-full rounded-xl border bg-white p-2.5 text-xs"
                        />
                      </div>
                    )}

                    <input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder={
                        aiSourceType === "prompt"
                          ? "Contoh: Buatkan 5 soal studi kasus Al-Kulliyāt Al-Khamsah di era medsos..."
                          : "Instruksi tambahan untuk AIsyah (opsional)..."
                      }
                      className="w-full rounded-xl border bg-white px-3 py-2 text-xs"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={aiCount}
                        onChange={(e) => setAiCount(Number(e.target.value))}
                        className="rounded-xl border bg-white px-3 py-1.5 text-xs font-bold"
                      >
                        <option value={3}>3 Soal</option>
                        <option value={5}>5 Soal</option>
                        <option value={10}>10 Soal</option>
                      </select>
                      <button
                        type="button"
                        disabled={aiLoading}
                        onClick={handleGenerateWithAisyah}
                        className="inline-flex items-center gap-1.5 rounded-full bg-kemenag-600 px-4 py-2 text-xs font-bold text-white hover:bg-kemenag-700 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-gold-400" />
                        <span>{aiLoading ? "AIsyah menyusun soal..." : "Generate Sekarang"}</span>
                      </button>
                    </div>
                  </div>
                )}
                {soalList.length > 0 && (
                  <div className="mt-2 max-h-40 space-y-1.5 overflow-y-auto">
                    {soalList.map((sq, idx) => (
                      <div
                        key={sq.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2"
                      >
                        <span className="truncate font-semibold text-slate-800">
                          {idx + 1}. {sq.pertanyaan}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setSoalList(soalList.filter((x) => x.id !== sq.id))
                          }
                          className="shrink-0 text-rose-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Form Tambah Soal Baru */}
                <div className="mt-3 space-y-2 border-t pt-3">
                  <input
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    placeholder="Tulis teks pertanyaan baru..."
                    className="w-full rounded-xl border bg-slate-50 px-3 py-2"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={qA} onChange={(e) => setQA(e.target.value)} placeholder="Opsi A" className="rounded-xl border bg-slate-50 px-3 py-1.5" />
                    <input value={qB} onChange={(e) => setQB(e.target.value)} placeholder="Opsi B" className="rounded-xl border bg-slate-50 px-3 py-1.5" />
                    <input value={qC} onChange={(e) => setQC(e.target.value)} placeholder="Opsi C" className="rounded-xl border bg-slate-50 px-3 py-1.5" />
                    <input value={qD} onChange={(e) => setQD(e.target.value)} placeholder="Opsi D" className="rounded-xl border bg-slate-50 px-3 py-1.5" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={qAns}
                      onChange={(e) => setQAns(Number(e.target.value))}
                      className="rounded-xl border bg-slate-50 px-3 py-1.5 font-semibold"
                    >
                      <option value={0}>Kunci: A</option>
                      <option value={1}>Kunci: B</option>
                      <option value={2}>Kunci: C</option>
                      <option value={3}>Kunci: D</option>
                    </select>
                    <input
                      value={qBahasan}
                      onChange={(e) => setQBahasan(e.target.value)}
                      placeholder="Pembahasan singkat (opsional)"
                      className="min-w-0 flex-1 rounded-xl border bg-slate-50 px-3 py-1.5"
                    />
                    <button
                      type="button"
                      onClick={handleAddQuestionToList}
                      className="rounded-xl bg-kemenag-50 px-3.5 py-1.5 font-bold text-kemenag-800 ring-1 ring-kemenag-200 hover:bg-kemenag-100"
                    >
                      + Tambah Soal
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditor(false)}
                  className="rounded-full border px-4 py-2 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-kemenag-600 px-6 py-2 font-bold text-white hover:bg-kemenag-700"
                >
                  {editingId ? "Simpan Perubahan" : "Terbitkan ke Kelas"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Tambah Akun Murid */}
      {showAddStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setShowAddStudent(false)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-kemenag-900">Buat Akun Murid untuk {cls.nama}</h3>
            <form onSubmit={handleAddStudent} className="mt-4 space-y-3 text-xs">
              <input required value={stNama} onChange={(e) => setStNama(e.target.value)} placeholder="Nama Lengkap Murid" className="w-full rounded-xl border px-3.5 py-2.5" />
              <div className="grid grid-cols-2 gap-2">
                <input required value={stNisn} onChange={(e) => setStNisn(e.target.value)} placeholder="NISN" className="rounded-xl border px-3.5 py-2.5" />
                <input required value={stPass} onChange={(e) => setStPass(e.target.value)} placeholder="Kata Sandi Awal" className="rounded-xl border px-3.5 py-2.5" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddStudent(false)} className="rounded-full border px-4 py-2 font-semibold">Batal</button>
                <button type="submit" className="rounded-full bg-kemenag-600 px-5 py-2 font-bold text-white">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal Edit Akun Murid */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => setEditingStudent(null)}>
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-extrabold text-kemenag-900">Edit Data Murid</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateUserProfile(editingStudent.id, {
                  nama: editingStudent.nama,
                  nomorInduk: editingStudent.nomorInduk,
                  password: editingStudent.password,
                });
                setEditingStudent(null);
                loadAll();
                notify("Data murid diperbarui.");
              }}
              className="mt-4 space-y-3 text-xs"
            >
              <input
                required
                value={editingStudent.nama}
                onChange={(e) => setEditingStudent({ ...editingStudent, nama: e.target.value })}
                placeholder="Nama Lengkap"
                className="w-full rounded-xl border px-3.5 py-2.5"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  required
                  value={editingStudent.nomorInduk}
                  onChange={(e) => setEditingStudent({ ...editingStudent, nomorInduk: e.target.value })}
                  placeholder="NISN"
                  className="rounded-xl border px-3.5 py-2.5"
                />
                <input
                  required
                  value={editingStudent.password}
                  onChange={(e) => setEditingStudent({ ...editingStudent, password: e.target.value })}
                  placeholder="Kata Sandi"
                  className="rounded-xl border px-3.5 py-2.5"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setEditingStudent(null)} className="rounded-full border px-4 py-2 font-semibold">Batal</button>
                <button type="submit" className="rounded-full bg-kemenag-600 px-5 py-2 font-bold text-white">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
