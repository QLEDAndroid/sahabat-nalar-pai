"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  getCurrentUser,
  logoutUser,
  updateUserProfile,
} from "@/lib/storage";
import { UserProfile } from "@/lib/types";
import {
  Camera,
  Gamepad2,
  Home,
  LayoutDashboard,
  LogOut,
  Sparkles,
  User,
  X,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showProfile, setShowProfile] = useState(false);

  const [editNama, setEditNama] = useState("");
  const [editNoInduk, setEditNoInduk] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState<string | undefined>(undefined);
  const [savedToast, setSavedToast] = useState(false);

  function syncUser() {
    const u = getCurrentUser();
    setUser(u);
    if (u) {
      setEditNama(u.nama);
      setEditNoInduk(u.nomorInduk);
      setEditBio(u.bio);
      setEditAvatar(u.avatarDataUrl);
    }
  }

  useEffect(() => {
    syncUser();
    window.addEventListener("snp-auth-changed", syncUser);
    return () => window.removeEventListener("snp-auth-changed", syncUser);
  }, []);

  if (pathname === "/login" || pathname === "/tv") return null;

  function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setEditAvatar(reader.result);
    };
    reader.readAsDataURL(file);
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    updateUserProfile(user.id, {
      nama: editNama.trim() || user.nama,
      nomorInduk: editNoInduk.trim() || user.nomorInduk,
      bio: editBio.trim(),
      avatarDataUrl: editAvatar,
    });
    setSavedToast(true);
    setTimeout(() => {
      setSavedToast(false);
      setShowProfile(false);
    }, 800);
  }

  function handleLogout() {
    logoutUser();
    setShowProfile(false);
    router.push("/login");
  }

  const isHome = pathname === "/";
  const isGuruPage = pathname?.startsWith("/guru");
  const isGamePage = pathname?.startsWith("/game");

  return (
    <>
      <header className="no-print sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/images/avatar-aisyah.jpg"
              alt="Sahabat Nalar PAI"
              className="h-9 w-9 rounded-full border border-kemenag-200 object-cover"
            />
            <div>
              <span className="block text-sm font-extrabold tracking-tight text-kemenag-900 sm:text-base">
                Sahabat Nalar PAI
              </span>
              <span className="block text-[11px] text-slate-500">
                SMAN 1 Pangkalan Kerinci
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {user && (
              <Link
                href="/game"
                className={`hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:inline-flex ${
                  isGamePage
                    ? "bg-kemenag-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-kemenag-800"
                }`}
              >
                <Gamepad2 className="h-3.5 w-3.5" />
                <span>Game</span>
              </Link>
            )}

            {user?.role === "guru" && (
              <>
                <Link
                  href="/"
                  className={`hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:inline-flex ${
                    isHome
                      ? "bg-kemenag-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-kemenag-800"
                  }`}
                >
                  <Home className="h-3.5 w-3.5" />
                  <span>Daftar Kelas</span>
                </Link>
                <Link
                  href="/guru"
                  className={`hidden items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition sm:inline-flex ${
                    isGuruPage
                      ? "bg-kemenag-600 text-white"
                      : "text-slate-600 hover:bg-slate-100 hover:text-kemenag-800"
                  }`}
                >
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Laporan & Tanya Guru</span>
                </Link>
              </>
            )}

            {user ? (
              <button
                onClick={() => setShowProfile(true)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 transition hover:border-kemenag-500"
              >
                {user.avatarDataUrl ? (
                  <img
                    src={user.avatarDataUrl}
                    alt={user.nama}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-kemenag-600 text-xs font-bold text-white">
                    {user.nama.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden max-w-[110px] truncate text-xs font-semibold text-slate-800 sm:inline">
                  {user.nama}
                </span>
              </button>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-kemenag-600 px-4 py-2 text-xs font-bold text-white"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

      {user && (
        <nav className="no-print fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 py-2 backdrop-blur sm:hidden">
          <Link
            href="/"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
              isHome ? "text-kemenag-600" : "text-slate-500"
            }`}
          >
            <Home className="h-5 w-5" />
            <span>Beranda</span>
          </Link>
          <Link
            href="/game"
            className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
              isGamePage ? "text-kemenag-600" : "text-slate-500"
            }`}
          >
            <Gamepad2 className="h-5 w-5" />
            <span>Game</span>
          </Link>
          {user.role === "guru" ? (
            <Link
              href="/guru"
              className={`flex flex-col items-center gap-0.5 text-[10px] font-semibold ${
                isGuruPage ? "text-kemenag-600" : "text-slate-500"
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Tanya Guru</span>
            </Link>
          ) : (
            <Link
              href="/belajar/bab-09"
              className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-slate-500"
            >
              <Sparkles className="h-5 w-5" />
              <span>AIsyah</span>
            </Link>
          )}
          <button
            onClick={() => setShowProfile(true)}
            className="flex flex-col items-center gap-0.5 text-[10px] font-semibold text-slate-500"
          >
            <User className="h-5 w-5" />
            <span>Profil</span>
          </button>
        </nav>
      )}

      {showProfile && user && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setShowProfile(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">Profil Akun</h3>
              <button
                onClick={() => setShowProfile(false)}
                className="rounded-full bg-slate-100 p-1.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="Foto Profil"
                      className="h-20 w-20 rounded-full border-2 border-kemenag-500 object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-kemenag-600 text-2xl font-bold text-white">
                      {editNama.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-kemenag-600 text-white shadow">
                    <Camera className="h-3.5 w-3.5" />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {user.role === "guru" ? "Guru PAI-BP" : `Peserta Didik • ${user.kelasUtama || ""}`}
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700">Nama Lengkap</label>
                  <input
                    type="text"
                    value={editNama}
                    onChange={(e) => setEditNama(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">
                    {user.role === "guru" ? "No. SIAGA / NIP" : "NISN"}
                  </label>
                  <input
                    type="text"
                    value={editNoInduk}
                    onChange={(e) => setEditNoInduk(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700">Bio</label>
                  <textarea
                    rows={2}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2"
                  />
                </div>
              </div>

              {savedToast && (
                <p className="text-center text-xs font-semibold text-kemenag-700">
                  Profil tersimpan.
                </p>
              )}

              <div className="flex items-center justify-between border-t pt-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Keluar</span>
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-kemenag-600 px-5 py-2 text-xs font-bold text-white"
                >
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
