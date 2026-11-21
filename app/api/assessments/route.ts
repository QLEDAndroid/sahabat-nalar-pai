import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DEMO_ASSESSMENTS } from "@/data/classroom-seed";
import { Assessment } from "@/lib/types";

const STORE_PATH = path.join(process.env.VERCEL ? "/tmp/sahabat-nalar-pai" : path.join(process.cwd(), "data"), "assessments-store.json");

function readStore(): Assessment[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fallback to seed
  }
  writeStore(DEMO_ASSESSMENTS);
  return DEMO_ASSESSMENTS;
}

function writeStore(list: Assessment[]) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (e) {
    console.error("[assessments-store] write error:", e);
  }
}

export async function GET(req: NextRequest) {
  const all = readStore();
  const id = req.nextUrl.searchParams.get("id");
  const classId = req.nextUrl.searchParams.get("classId");
  const pin = req.nextUrl.searchParams.get("pin");

  if (id) {
    const found = all.find((a) => a.id === id);
    if (!found) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  if (pin) {
    const clean = pin.trim().toUpperCase();
    const found = all.find((a) => a.pinKuis?.toUpperCase() === clean);
    if (!found) {
      return NextResponse.json({ error: "PIN not found" }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  if (classId) {
    return NextResponse.json(all.filter((a) => a.classId === classId));
  }

  return NextResponse.json(all);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Omit<Assessment, "id" | "createdAt">;
    const all = readStore();
    const created: Assessment = {
      ...body,
      id: `asm-${Date.now()}`,
      pinKuis:
        body.jenis === "Latihan Soal"
          ? undefined
          : body.pinKuis?.trim().toUpperCase() ||
            String(Math.floor(1000 + Math.random() * 9000)),
      createdAt: new Date().toISOString(),
    };
    writeStore([created, ...all]);
    return NextResponse.json(created, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = (await req.json()) as { id: string } & Partial<Assessment>;
    if (!body.id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    const all = readStore();
    const next = all.map((a) => (a.id === body.id ? { ...a, ...body } : a));
    writeStore(next);
    return NextResponse.json(next.find((a) => a.id === body.id) || null);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Invalid payload";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const all = readStore();
  writeStore(all.filter((a) => a.id !== id));
  return NextResponse.json({ ok: true });
}
