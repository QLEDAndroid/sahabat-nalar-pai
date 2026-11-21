import {
  DEMO_ESCALATIONS,
  DEMO_REFLECTIONS,
  DEMO_STUDY_LOGS,
} from "@/data/demo-seed";
import {
  DEMO_ASSESSMENTS,
  DEMO_CLASSROOMS,
  DEMO_FORUM_POSTS,
  DEMO_SUBMISSIONS,
  DEMO_USERS,
} from "@/data/classroom-seed";
import {
  Assessment,
  AssessmentSubmission,
  Classroom,
  ClassVisibilityConfig,
  EscalationItem,
  ForumPost,
  ReflectionEntry,
  StudyLog,
  UserProfile,
} from "./types";

const KEYS = {
  USERS: "snp_users_v3",
  CURRENT_USER_ID: "snp_current_user_id_v3",
  CLASSROOMS: "snp_classrooms_v3",
  FORUM: "snp_forum_v3",
  ASSESSMENTS: "snp_assessments_v4",
  SUBMISSIONS: "snp_submissions_v3",
  LOGS: "snp_study_logs_v1",
  ESCALATIONS: "snp_escalations_v1",
  REFLECTIONS: "snp_reflections_v1",
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      window.localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore storage quota issues
  }
}

/* ================= AUTH & CREDENTIALS ================= */
export function getUsers(): UserProfile[] {
  return readStorage<UserProfile[]>(KEYS.USERS, DEMO_USERS);
}

export function getCurrentUser(): UserProfile | null {
  if (typeof window === "undefined") return null;
  const id = window.localStorage.getItem(KEYS.CURRENT_USER_ID);
  if (!id) return null;
  return getUsers().find((u) => u.id === id) || null;
}

export function loginAsUser(userId: string): UserProfile | null {
  const user = getUsers().find((u) => u.id === userId) || null;
  if (user && typeof window !== "undefined") {
    window.localStorage.setItem(KEYS.CURRENT_USER_ID, user.id);
    window.dispatchEvent(new Event("snp-auth-changed"));
  }
  return user;
}

export function loginWithCredentials(
  identifier: string,
  password: string
): UserProfile | null {
  const cleanId = identifier.trim().toLowerCase();
  const found = getUsers().find(
    (u) =>
      (u.email.toLowerCase() === cleanId ||
        u.nomorInduk.toLowerCase() === cleanId) &&
      u.password === password
  );
  if (found) {
    return loginAsUser(found.id);
  }
  return null;
}

export function registerDummyUser(
  profile: Omit<UserProfile, "id">,
  autoJoinKodeKelas?: string
): UserProfile {
  const users = getUsers();
  const created: UserProfile = {
    ...profile,
    id: `${profile.role}-${Date.now()}`,
  };
  writeStorage(KEYS.USERS, [...users, created]);
  if (autoJoinKodeKelas && profile.role === "murid") {
    joinClassroomByCode(autoJoinKodeKelas, created.id);
  }
  if (typeof window !== "undefined") {
    window.localStorage.setItem(KEYS.CURRENT_USER_ID, created.id);
    window.dispatchEvent(new Event("snp-auth-changed"));
  }
  return created;
}

export function addStudentAccountToClass(
  classId: string,
  nama: string,
  nisn: string,
  password: string
): UserProfile {
  const users = getUsers();
  const email = `${nama.toLowerCase().replace(/[^a-z0-9]/g, "")}@sman1pk.sch.id`;
  const created: UserProfile = {
    id: `murid-${Date.now()}`,
    role: "murid",
    nama: nama.trim(),
    email,
    password: password.trim() || "123456",
    nomorInduk: nisn.trim() || `0091${Math.floor(100000 + Math.random() * 900000)}`,
    sekolah: "SMAN 1 Pangkalan Kerinci",
    bio: "Peserta Didik PAI-BP Fase E",
  };
  writeStorage(KEYS.USERS, [...users, created]);
  const classes = getClassrooms().map((c) =>
    c.id === classId
      ? { ...c, studentIds: [...c.studentIds, created.id] }
      : c
  );
  writeStorage(KEYS.CLASSROOMS, classes);
  return created;
}

export function updateUserProfile(
  userId: string,
  patch: Partial<UserProfile>
): UserProfile | null {
  const users = getUsers();
  let updatedUser: UserProfile | null = null;
  const next = users.map((u) => {
    if (u.id === userId) {
      updatedUser = { ...u, ...patch };
      return updatedUser;
    }
    return u;
  });
  writeStorage(KEYS.USERS, next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("snp-auth-changed"));
  }
  return updatedUser;
}


export function loginWithBelajarId(
  email: string,
  nama?: string,
  avatarDataUrl?: string
): { user?: UserProfile; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  let role: "guru" | "murid" | null = null;
  if (cleanEmail.endsWith("@guru.sma.belajar.id")) {
    role = "guru";
  } else if (cleanEmail.endsWith("@sma.belajar.id")) {
    role = "murid";
  } else {
    return {
      error:
        "Domain email tidak dikenali. Gunakan akun @sma.belajar.id (Siswa) atau @guru.sma.belajar.id (Guru).",
    };
  }

  const users = getUsers();
  const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);
  if (existing) {
    if (avatarDataUrl && !existing.avatarDataUrl) {
      updateUserProfile(existing.id, { avatarDataUrl });
    }
    const logged = loginAsUser(existing.id);
    return { user: logged || existing };
  }

  // Buat akun otomatis sesuai peran domain belajar.id
  const displayName =
    nama?.trim() ||
    cleanEmail
      .split("@")[0]
      .replace(/[0-9._-]+/g, " ")
      .replace(/\w/g, (ch) => ch.toUpperCase())
      .trim();

  const created = registerDummyUser(
    {
      role,
      nama: displayName || (role === "guru" ? "Guru PAI" : "Siswa SMA"),
      email: cleanEmail,
      password: "google-oauth-belajar-id",
      nomorInduk: role === "guru" ? "Akun belajar.id Guru" : "Akun belajar.id Siswa",
      sekolah: "SMAN 1 Pangkalan Kerinci",
      kelasUtama: role === "murid" ? "X.1" : undefined,
      bio:
        role === "guru"
          ? "Guru PAI-BP • Terverifikasi @guru.sma.belajar.id"
          : "Peserta Didik • Terverifikasi @sma.belajar.id",
      avatarDataUrl,
    },
    role === "murid" ? "PAIX1-26" : undefined
  );
  return { user: created };
}

export function logoutUser(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(KEYS.CURRENT_USER_ID);
    window.dispatchEvent(new Event("snp-auth-changed"));
  }
}

/* ================= CLASSROOMS ================= */
export function getClassrooms(): Classroom[] {
  return readStorage<Classroom[]>(KEYS.CLASSROOMS, DEMO_CLASSROOMS);
}

export function getClassroomById(id: string): Classroom | undefined {
  return getClassrooms().find((c) => c.id === id);
}

export function createClassroom(
  data: Pick<Classroom, "nama" | "subjudul" | "guruId" | "guruNama">
): Classroom {
  const list = getClassrooms();
  const kode =
    "PAI-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  const created: Classroom = {
    id: `kelas-${Date.now()}`,
    nama: data.nama,
    subjudul: data.subjudul || "Kelas PAI-BP Fase E",
    kodeKelas: kode,
    bannerColor: "from-kemenag-700 via-kemenag-600 to-teal-700",
    guruId: data.guruId,
    guruNama: data.guruNama,
    studentIds: [],
    visibility: {
      enabledBabIds: ["bab-01", "bab-09"],
      showAisyah: true,
      showSocraticSolo: true,
      showRefleksi: true,
      showAsesmen: true,
    },
  };
  writeStorage(KEYS.CLASSROOMS, [created, ...list]);
  return created;
}

export function joinClassroomByCode(
  kodeKelas: string,
  studentId: string
): Classroom | null {
  const list = getClassrooms();
  const target = list.find(
    (c) => c.kodeKelas.toLowerCase() === kodeKelas.trim().toLowerCase()
  );
  if (!target) return null;
  // Pastikan 1 akun murid hanya tergabung di 1 kelas
  const next = list.map((c) => {
    const cleaned = c.studentIds.filter((id) => id !== studentId);
    return c.id === target.id
      ? { ...c, studentIds: [...cleaned, studentId] }
      : { ...c, studentIds: cleaned };
  });
  writeStorage(KEYS.CLASSROOMS, next);
  return target;
}


export function removeStudentFromClass(classId: string, studentId: string): Classroom[] {
  const next = getClassrooms().map((c) =>
    c.id === classId
      ? { ...c, studentIds: c.studentIds.filter((id) => id !== studentId) }
      : c
  );
  writeStorage(KEYS.CLASSROOMS, next);
  return next;
}

export function deleteForumPost(postId: string, classId: string): ForumPost[] {
  const all = readStorage<ForumPost[]>(KEYS.FORUM, DEMO_FORUM_POSTS);
  const next = all.filter((p) => p.id !== postId);
  writeStorage(KEYS.FORUM, next);
  return next.filter((p) => p.classId === classId);
}

export function updateClassVisibility(
  classId: string,
  visibility: ClassVisibilityConfig
): Classroom[] {
  const next = getClassrooms().map((c) =>
    c.id === classId ? { ...c, visibility } : c
  );
  writeStorage(KEYS.CLASSROOMS, next);
  return next;
}

/* ================= FORUM ================= */
export function getForumPosts(classId: string): ForumPost[] {
  return readStorage<ForumPost[]>(KEYS.FORUM, DEMO_FORUM_POSTS).filter(
    (p) => p.classId === classId
  );
}

export function addForumPost(
  post: Omit<ForumPost, "id" | "timestamp" | "comments">
): ForumPost[] {
  const all = readStorage<ForumPost[]>(KEYS.FORUM, DEMO_FORUM_POSTS);
  const created: ForumPost = {
    ...post,
    id: `post-${Date.now()}`,
    timestamp: new Date().toISOString(),
    comments: [],
  };
  const next = [created, ...all];
  writeStorage(KEYS.FORUM, next);
  return next.filter((p) => p.classId === post.classId);
}

export function addForumComment(
  postId: string,
  classId: string,
  authorName: string,
  authorRole: "guru" | "murid",
  text: string
): ForumPost[] {
  const all = readStorage<ForumPost[]>(KEYS.FORUM, DEMO_FORUM_POSTS);
  const next = all.map((p) =>
    p.id === postId
      ? {
          ...p,
          comments: [
            ...p.comments,
            {
              id: `c-${Date.now()}`,
              authorName,
              authorRole,
              text,
              timestamp: new Date().toISOString(),
            },
          ],
        }
      : p
  );
  writeStorage(KEYS.FORUM, next);
  return next.filter((p) => p.classId === classId);
}

/* ================= ASSESSMENTS & LIVE QUIZ ARENA ================= */
export function getAssessments(classId?: string): Assessment[] {
  const all = readStorage<Assessment[]>(KEYS.ASSESSMENTS, DEMO_ASSESSMENTS);
  return classId ? all.filter((a) => a.classId === classId) : all;
}

export function getAssessmentById(id: string): Assessment | undefined {
  return getAssessments().find((a) => a.id === id);
}

export function createAssessment(
  item: Omit<Assessment, "id" | "createdAt">
): Assessment {
  const all = getAssessments();
  const pinKuis =
    (item.jenis === "Kuis" || item.jenis === "Ulangan Harian")
      ? String(Math.floor(1000 + Math.random() * 9000))
      : undefined;
  const created: Assessment = {
    ...item,
    id: `asm-${Date.now()}`,
    pinKuis,
    createdAt: new Date().toISOString(),
  };
  writeStorage(KEYS.ASSESSMENTS, [created, ...all]);
  return created;
}


export function updateAssessment(
  id: string,
  patch: Partial<Assessment>
): Assessment[] {
  const next = getAssessments().map((a) =>
    a.id === id ? { ...a, ...patch } : a
  );
  writeStorage(KEYS.ASSESSMENTS, next);
  return next;
}

export function deleteAssessment(id: string): Assessment[] {
  const next = getAssessments().filter((a) => a.id !== id);
  writeStorage(KEYS.ASSESSMENTS, next);
  return next;
}

export function updateAssessmentMode(
  id: string,
  mode: "cbt" | "kahoot" | "gform"
): Assessment[] {
  const next = getAssessments().map((a) => (a.id === id ? { ...a, mode } : a));
  writeStorage(KEYS.ASSESSMENTS, next);
  return next;
}

export function getSubmissions(classId?: string): AssessmentSubmission[] {
  const all = readStorage<AssessmentSubmission[]>(
    KEYS.SUBMISSIONS,
    DEMO_SUBMISSIONS
  );
  return classId ? all.filter((s) => s.classId === classId) : all;
}

export function addSubmission(
  sub: Omit<AssessmentSubmission, "id" | "timestamp">
): AssessmentSubmission[] {
  const all = getSubmissions();
  const next: AssessmentSubmission[] = [
    { ...sub, id: `sub-${Date.now()}`, timestamp: new Date().toISOString() },
    ...all,
  ];
  writeStorage(KEYS.SUBMISSIONS, next);
  return next;
}


/* ================= LOGS, ESCALATIONS, REFLECTIONS ================= */
export function getStudyLogs(): StudyLog[] {
  return readStorage<StudyLog[]>(KEYS.LOGS, DEMO_STUDY_LOGS);
}

export function addStudyLog(
  entry: Omit<StudyLog, "id" | "timestamp">
): StudyLog[] {
  const current = getStudyLogs();
  const next: StudyLog[] = [
    { ...entry, id: `log-${Date.now()}`, timestamp: new Date().toISOString() },
    ...current,
  ];
  writeStorage(KEYS.LOGS, next);
  return next;
}

export function getEscalations(): EscalationItem[] {
  return readStorage<EscalationItem[]>(KEYS.ESCALATIONS, DEMO_ESCALATIONS);
}

export function addEscalation(
  item: Omit<EscalationItem, "id" | "status" | "timestamp">
): EscalationItem[] {
  const current = getEscalations();
  const next: EscalationItem[] = [
    {
      ...item,
      id: `esc-${Date.now()}`,
      status: "Menunggu Klarifikasi",
      timestamp: new Date().toISOString(),
    },
    ...current,
  ];
  writeStorage(KEYS.ESCALATIONS, next);
  return next;
}

export function resolveEscalation(
  id: string,
  catatanGuru: string
): EscalationItem[] {
  const current = getEscalations();
  const next = current.map((item) =>
    item.id === id
      ? { ...item, status: "Sudah Dibahas di Kelas" as const, catatanGuru }
      : item
  );
  writeStorage(KEYS.ESCALATIONS, next);
  return next;
}

export function getReflections(): ReflectionEntry[] {
  return readStorage<ReflectionEntry[]>(KEYS.REFLECTIONS, DEMO_REFLECTIONS);
}

export function addReflection(
  entry: Omit<ReflectionEntry, "id" | "timestamp">
): ReflectionEntry[] {
  const current = getReflections();
  const next: ReflectionEntry[] = [
    { ...entry, id: `ref-${Date.now()}`, timestamp: new Date().toISOString() },
    ...current,
  ];
  writeStorage(KEYS.REFLECTIONS, next);
  return next;
}

export function resetAllDemoData(): void {
  writeStorage(KEYS.USERS, DEMO_USERS);
  writeStorage(KEYS.CLASSROOMS, DEMO_CLASSROOMS);
  writeStorage(KEYS.FORUM, DEMO_FORUM_POSTS);
  writeStorage(KEYS.ASSESSMENTS, DEMO_ASSESSMENTS);
  writeStorage(KEYS.SUBMISSIONS, DEMO_SUBMISSIONS);
  writeStorage(KEYS.LOGS, DEMO_STUDY_LOGS);
  writeStorage(KEYS.ESCALATIONS, DEMO_ESCALATIONS);
  writeStorage(KEYS.REFLECTIONS, DEMO_REFLECTIONS);
}
