"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  loginWithBelajarId,
  loginWithCredentials,
  registerDummyUser,
} from "@/lib/storage";
import { ArrowRight, Tv, X } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<"masuk" | "daftar">("masuk");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [gisReady, setGisReady] = useState(false);

  // Fallback modal jika Google Client ID belum diisi di environment
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [googleNama, setGoogleNama] = useState("");
  const [googleErr, setGoogleErr] = useState("");

  // Form Daftar Manual
  const [regNama, setRegNama] = useState("");
  const [regNisn, setRegNisn] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regKodeKelas, setRegKodeKelas] = useState("");

  const hasClientId = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId || typeof window === "undefined") return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const g = (window as unknown as {
        google?: {
          accounts?: {
            id?: {
              initialize: (cfg: unknown) => void;
              renderButton: (el: HTMLElement | null, opts: unknown) => void;
            };
          };
        };
      }).google;
      if (g?.accounts?.id) {
        g.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: { credential?: string }) => {
            if (!resp.credential) return;
            setErrMsg("");
            try {
              const verify = await fetch("/api/auth/google", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ credential: resp.credential }),
              });
              const data = await verify.json();
              if (!verify.ok) {
                setErrMsg(data.error || "Login Google ditolak.");
                return;
              }
              const res = loginWithBelajarId(data.email, data.name, data.picture);
              if (res.error) {
                setErrMsg(res.error);
              } else {
                router.push("/");
              }
            } catch {
              setErrMsg("Gagal memverifikasi akun Google. Periksa koneksi internet.");
            }
          },
        });
        g.accounts.id.renderButton(document.getElementById("google-gis-btn"), {
          theme: "outline",
          size: "large",
          shape: "pill",
          width: "100%",
          text: "signin_with",
          locale: "id",
        });
        setGisReady(true);
      }
    };
    document.body.appendChild(script);
  }, [router]);

  function handleBelajarIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    setGoogleErr("");
    const res = loginWithBelajarId(googleEmail, googleNama);
    if (res.error) {
      setGoogleErr(res.error);
      return;
    }
    setShowGoogleModal(false);
    router.push("/");
  }

  function handleCredentialLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrMsg("");
    const ok = loginWithCredentials(identifier, password);
    if (!ok) {
      setErrMsg("Email/NISN atau kata sandi tidak sesuai.");
      return;
    }
    router.push("/");
  }

  function handleRegisterStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!regNama.trim() || !regPassword.trim()) return;
    registerDummyUser(
      {
        role: "murid",
        nama: regNama.trim(),
        email: `${regNama.trim().toLowerCase().replace(/[^a-z0-9]/g, "")}@sma.belajar.id`,
        password: regPassword.trim(),
        nomorInduk: regNisn.trim() || "-",
        sekolah: "SMAN 1 Pangkalan Kerinci",
        kelasUtama: "",
        bio: "Peserta Didik PAI-BP Fase E",
      },
      regKodeKelas.trim()
    );
    router.push("/");
  }

  return (
    <div className="mx-auto flex min-h-[85vh] max-w-4xl items-center justify-center py-6">
      <div className="grid w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:grid-cols-12">
        {/* Panel Kiri */}
        <div className="flex flex-col justify-between bg-kemenag-700 p-7 text-white md:col-span-5">
          <div>
            <span className="text-xs font-semibold text-kemenag-200">
              SMAN 1 Pangkalan Kerinci
            </span>
            <h1 className="mt-2 text-2xl font-extrabold leading-tight">
              Sahabat Nalar PAI
            </h1>
            <p className="mt-2 text-xs leading-relaxed text-kemenag-100">
              Masuk otomatis dengan akun Google <strong>belajar.id</strong>:
              domain <strong>@guru.sma.belajar.id</strong> untuk Guru dan{" "}
              <strong>@sma.belajar.id</strong> untuk Siswa.
            </p>
            <Link
              href="/tv"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/25"
            >
              <Tv className="h-3.5 w-3.5 text-gold-400" />
              <span>Mode Layar Besar (PIN)</span>
            </Link>
          </div>

          <div className="mt-6 hidden overflow-hidden rounded-2xl bg-white p-2 md:block">
            <img
              src="/images/maskot-pelajar.jpg"
              alt="Pelajar SMA/Madrasah"
              className="h-auto w-full rounded-xl object-contain"
            />
          </div>
        </div>

        {/* Panel Kanan */}
        <div className="p-6 sm:p-8 md:col-span-7">
          {/* Tombol Masuk dengan Google (Real OAuth via GIS) */}
          <div className="space-y-2.5">
            <div id="google-gis-btn" className="min-h-[40px]" />
            {(!hasClientId || !gisReady) && (
              <button
                type="button"
                onClick={() => {
                  setGoogleErr("");
                  setShowGoogleModal(true);
                }}
                className="flex w-full items-center justify-center gap-2.5 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.26-2.08 3.56-5.15 3.56-8.65z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.72-4.95H1.28v3.1A12 12 0 0 0 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.29A7.2 7.2 0 0 1 4.9 12c0-.79.14-1.56.38-2.29v-3.1H1.28A12 12 0 0 0 0 12c0 1.94.46 3.77 1.28 5.39l4-3.1z" />
                  <path fill="#EA4335" d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.61l4 3.1c.95-2.84 3.6-4.96 6.72-4.96z" />
                </svg>
                <span>Masuk dengan Google (Akun belajar.id)</span>
              </button>
            )}
            {errMsg && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                {errMsg}
              </p>
            )}
          </div>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-[11px] font-semibold text-slate-400">atau</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setTab("masuk")}
              className={`rounded-full py-2 text-xs font-bold ${
                tab === "masuk" ? "bg-kemenag-600 text-white" : "text-slate-600"
              }`}
            >
              Masuk Manual
            </button>
            <button
              type="button"
              onClick={() => setTab("daftar")}
              className={`rounded-full py-2 text-xs font-bold ${
                tab === "daftar" ? "bg-kemenag-600 text-white" : "text-slate-600"
              }`}
            >
              Daftar Murid
            </button>
          </div>

          {tab === "masuk" ? (
            <form onSubmit={handleCredentialLogin} className="mt-4 space-y-2.5">
              <input
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email Sekolah atau NISN"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-kemenag-600 focus:bg-white focus:outline-none"
              />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kata Sandi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-kemenag-600 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-kemenag-600 py-2.5 text-xs font-bold text-white hover:bg-kemenag-700"
              >
                <span>Masuk</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterStudent} className="mt-4 space-y-2.5">
              <input
                type="text"
                required
                value={regNama}
                onChange={(e) => setRegNama(e.target.value)}
                placeholder="Nama Lengkap Murid"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
              />
              <input
                type="text"
                value={regNisn}
                onChange={(e) => setRegNisn(e.target.value)}
                placeholder="NISN"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
              />
              <input
                type="password"
                required
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="Buat Kata Sandi"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs"
              />
              <input
                type="text"
                value={regKodeKelas}
                onChange={(e) => setRegKodeKelas(e.target.value)}
                placeholder="Kode Kelas dari Guru (opsional)"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs uppercase"
              />
              <button
                type="submit"
                className="w-full rounded-full bg-kemenag-600 py-2.5 text-xs font-bold text-white hover:bg-kemenag-700"
              >
                Daftar & Masuk
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Modal Input Email belajar.id (Fallback Lokal Sebelum Google Client ID Diisi) */}
      {showGoogleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setShowGoogleModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Masuk dengan Akun belajar.id
              </h3>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="rounded-full bg-slate-100 p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Isi <code className="rounded bg-slate-100 px-1">NEXT_PUBLIC_GOOGLE_CLIENT_ID</code> di Vercel/.env.local untuk mengaktifkan pop-up OAuth Google resmi, atau masukkan email belajar.id Anda di bawah ini.
            </p>
            <form onSubmit={handleBelajarIdSubmit} className="mt-4 space-y-2.5">
              <input
                type="text"
                required
                value={googleNama}
                onChange={(e) => setGoogleNama(e.target.value)}
                placeholder="Nama Lengkap"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
              />
              <input
                type="email"
                required
                value={googleEmail}
                onChange={(e) => setGoogleEmail(e.target.value)}
                placeholder="nama@guru.sma.belajar.id atau nama@sma.belajar.id"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs"
              />
              {googleErr && (
                <p className="text-xs font-bold text-rose-600">{googleErr}</p>
              )}
              <button
                type="submit"
                className="w-full rounded-full bg-kemenag-600 py-2.5 text-xs font-bold text-white hover:bg-kemenag-700"
              >
                Lanjutkan
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
