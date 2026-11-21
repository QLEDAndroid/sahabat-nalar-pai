"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/lib/storage";
import { GameLibrary } from "@/components/games/GameLibrary";
import { ArrowLeft } from "lucide-react";

export default function GameLibraryPage() {
  const [isGuru, setIsGuru] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    setIsGuru(u?.role === "guru");
  }, []);

  return (
    <div className="space-y-4 pb-10">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:border-kemenag-400 hover:text-kemenag-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Kembali ke Beranda</span>
        </Link>
      </div>
      <GameLibrary isGuru={isGuru} />
    </div>
  );
}
