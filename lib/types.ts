export type SemesterType = "Ganjil" | "Genap";

export type ElemenPAI =
  | "Al-Qur'an dan Hadis"
  | "Akidah"
  | "Akhlak"
  | "Fikih"
  | "Sejarah Peradaban Islam";

export type SoloLevel =
  | "Multistruktural"
  | "Relasional"
  | "Extended Abstract";

export type DimensiCinta =
  | "Cinta Allah dan Rasul-Nya"
  | "Cinta Ilmu"
  | "Cinta Diri dan Sesama"
  | "Cinta Tanah Air";

export type UserRole = "guru" | "murid";

export type AssessmentMode = "cbt" | "kahoot" | "gform";
export type AssessmentType = "Latihan Soal" | "Ulangan Harian" | "Kuis";

export interface UserProfile {
  id: string;
  role: UserRole;
  nama: string;
  email: string;
  password: string;
  nomorInduk: string;
  sekolah: string;
  kelasUtama?: string;
  bio: string;
  avatarDataUrl?: string;
}

export interface ClassVisibilityConfig {
  enabledBabIds: string[];
  showAisyah: boolean;
  showSocraticSolo: boolean;
  showRefleksi: boolean;
  showAsesmen: boolean;
}

export interface ForumComment {
  id: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  timestamp: string;
}

export interface ForumAttachment {
  id: string;
  type: "file" | "link" | "youtube";
  title: string;
  url: string;
}

export interface ForumPost {
  id: string;
  classId: string;
  authorName: string;
  authorRole: UserRole;
  content: string;
  timestamp: string;
  attachments?: ForumAttachment[];
  comments: ForumComment[];
}

export interface QuizQuestion {
  id: string;
  pertanyaan: string;
  opsi: string[];
  jawabanBenar: number;
  pembahasan: string;
}

export interface Assessment {
  id: string;
  classId: string;
  babId: string;
  judul: string;
  jenis: AssessmentType;
  mode: AssessmentMode;
  durasiMenit: number;
  waktuPerSoalDetik?: number; // khusus mode Kahoot
  pinKuis?: string; // khusus Kuis Interaktif Layar Besar
  published: boolean;
  soal: QuizQuestion[];
  createdAt: string;
}

export interface AssessmentSubmission {
  id: string;
  assessmentId: string;
  assessmentJudul: string;
  classId: string;
  studentId: string;
  studentName: string;
  mode: AssessmentMode;
  skor: number;
  benar: number;
  total: number;
  timestamp: string;
}


export interface Classroom {
  id: string;
  nama: string;
  subjudul: string;
  kodeKelas: string;
  bannerColor: string;
  guruId: string;
  guruNama: string;
  studentIds: string[];
  visibility: ClassVisibilityConfig;
}

export interface BabTerkait {
  id: string;
  bab: number;
  judul: string;
  alasan: string;
}

export interface DalilItem {
  jenis: "Al-Qur'an" | "Hadis";
  sumber: string;
  terjemahan: string;
}

export interface GlosariumItem {
  istilah: string;
  penjelasan: string;
}

export interface StudiKasusItem {
  id: string;
  judul: string;
  levelSolo: SoloLevel;
  deskripsi: string;
}

export interface ModuleData {
  id: string;
  bab: number;
  judul: string;
  semester: SemesterType;
  elemen: ElemenPAI;
  fase: string;
  tahunAjaran: string;
  penyusun: string;
  sekolah: string;
  babTerkait: BabTerkait[];
  cp: string;
  tp: string[];
  dimensiCinta: string[];
  materiLengkap: string;
  dalilTerverifikasi: DalilItem[];
  glosarium: GlosariumItem[];
  studiKasus: StudiKasusItem[];
  pertanyaanRefleksi: string[];
}

export interface StudyLog {
  id: string;
  babId: string;
  babJudul: string;
  tahap: "Memahami" | "Mengaplikasi" | "Merefleksi";
  mode?: string;
  soloLevel: SoloLevel;
  topik: string;
  timestamp: string;
}

export interface EscalationItem {
  id: string;
  namaSiswa: string;
  kelas: string;
  babId: string;
  babJudul: string;
  pertanyaan: string;
  konteks: string;
  status: "Menunggu Klarifikasi" | "Sudah Dibahas di Kelas";
  catatanGuru?: string;
  timestamp: string;
}

export interface ReflectionEntry {
  id: string;
  namaSiswa: string;
  kelas: string;
  babId: string;
  babJudul: string;
  pertanyaan: string;
  jawabanRefleksi: string;
  komitmenAksi: string;
  dimensiCinta: DimensiCinta;
  timestamp: string;
}
