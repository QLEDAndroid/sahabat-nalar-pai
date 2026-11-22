import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kvStore";
import { EscalationItem } from "@/lib/types";

const KEY = "snp_escalations_db";

export async function GET() {
  const list = await kvGet<EscalationItem[]>(KEY, []);
  return NextResponse.json(list);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const all = await kvGet<EscalationItem[]>(KEY, []);
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
    await kvSet(KEY, [created, ...all]);
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: string; catatanGuru: string };
    if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const all = await kvGet<EscalationItem[]>(KEY, []);
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
    await kvSet(KEY, next);
    return NextResponse.json(next);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
