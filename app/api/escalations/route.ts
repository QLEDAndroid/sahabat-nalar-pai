import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEMO_ESCALATIONS } from "@/data/demo-seed";
import { EscalationItem } from "@/lib/types";

const STORE_PATH = path.join(process.env.VERCEL ? "/tmp/sahabat-nalar-pai" : path.join(process.cwd(), "data"), "escalations-store.json");

function readStore(): EscalationItem[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  writeStore(DEMO_ESCALATIONS);
  return DEMO_ESCALATIONS;
}

function writeStore(list: EscalationItem[]) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("[escalations-store] write error:", e);
  }
}

export async function GET() {
  return NextResponse.json(readStore());
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const all = readStore();
    const created: EscalationItem = {
      id: `esc-${Date.now()}`,
      namaSiswa: body.namaSiswa || "Siswa Kelas X",
      kelas: body.kelas || "X.1",
      babId: body.babId || "bab-09",
      babJudul: body.babJudul || "PAI-BP",
      pertanyaan: String(body.pertanyaan || "").trim(),
      konteks: body.konteks || "Pertanyaan dari Ruang Belajar",
      status: "Menunggu Klarifikasi",
      timestamp: new Date().toISOString(),
    };
    if (!created.pertanyaan) {
      return NextResponse.json({ error: "Pertanyaan kosong" }, { status: 400 });
    }
    writeStore([created, ...all]);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: string; catatanGuru: string };
    if (!body.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const all = readStore();
    const next = all.map((item) =>
      item.id === body.id
        ? {
            ...item,
            status: "Sudah Dibahas di Kelas" as const,
            catatanGuru:
              body.catatanGuru?.trim() || "Telah dijawab dan diklarifikasi guru.",
          }
        : item
    );
    writeStore(next);
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
