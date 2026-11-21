import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export type BigScreenGameType = "race" | "tower" | "jeopardy" | "territory" | "bomb";

export interface BigScreenRoom {
  pin: string;
  gameType: BigScreenGameType;
  creatorName: string;
  creatorRole: string;
  status: "waiting_tv" | "playing" | "finished";
  tvConnected: boolean;
  eventSeq: number;
  lastSfx?: string;
  state: Record<string, unknown>;
  updatedAt: number;
}

const STORE_PATH = path.join(process.env.VERCEL ? "/tmp/sahabat-nalar-pai" : path.join(process.cwd(), "data"), "bigscreen-games-store.json");

function readRooms(): Record<string, BigScreenRoom> {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return {};
}

function writeRooms(rooms: Record<string, BigScreenRoom>) {
  try {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
    fs.writeFileSync(STORE_PATH, JSON.stringify(rooms, null, 2), "utf-8");
  } catch (e) {
    console.error("[bigscreen-game] write error:", e);
  }
}

function initialStateFor(gameType: BigScreenGameType): Record<string, unknown> {
  if (gameType === "race") {
    return {
      positions: [0, 0, 0, 0],
      qIdx: Math.floor(Math.random() * 12),
      buzzedTeam: null,
      feedback: "",
      winnerIdx: null,
    };
  }
  if (gameType === "tower") {
    return {
      wave: 1,
      fortressHp: 100,
      score: 0,
      qIdx: Math.floor(Math.random() * 12),
      bossHitsLeft: 1,
      lastShotOk: null,
      feedback: "",
      outcome: null, // "win" | "gameover"
    };
  }
  return {
    usedIds: [],
    activeTileId: null,
    activeCat: null,
    showAnswer: false,
    scores: [0, 0, 0, 0],
  };
}

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin")?.trim();
  const rooms = readRooms();
  if (!pin) return NextResponse.json({ rooms: Object.values(rooms) });
  const room = rooms[pin];
  if (!room) {
    return NextResponse.json({ error: "Kode ruangan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ room });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const allowed: BigScreenGameType[] = ["race", "tower", "jeopardy", "territory", "bomb"];
    const gameType: BigScreenGameType = allowed.includes(body.gameType) ? body.gameType : "race";
    const rooms = readRooms();
    // Generate unique 4-digit PIN (avoid 9026/8026 defaults)
    let pin = String(Math.floor(1000 + Math.random() * 8999));
    while (pin === "9026" || pin === "8026" || rooms[pin]) {
      pin = String(Math.floor(1000 + Math.random() * 8999));
    }
    const room: BigScreenRoom = {
      pin,
      gameType,
      creatorName: String(body.creatorName || "Moderator Kelas"),
      creatorRole: String(body.creatorRole || "murid"),
      status: "waiting_tv",
      tvConnected: false,
      eventSeq: 1,
      state: initialStateFor(gameType),
      updatedAt: Date.now(),
    };
    rooms[pin] = room;
    writeRooms(rooms);
    return NextResponse.json({ room }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body.pin || "").trim();
    const action = String(body.action || "");
    const rooms = readRooms();
    const room = rooms[pin];
    if (!room) {
      return NextResponse.json({ error: "Kode tidak ditemukan" }, { status: 404 });
    }

    if (action === "tv_connect") {
      room.tvConnected = true;
      room.status = "playing";
      room.eventSeq += 1;
      room.lastSfx = "powerup";
      room.updatedAt = Date.now();
      writeRooms(rooms);
      return NextResponse.json({ room });
    }

    if (action === "reset") {
      room.status = room.tvConnected ? "playing" : "waiting_tv";
      room.state = initialStateFor(room.gameType);
      room.eventSeq += 1;
      room.lastSfx = "powerup";
      room.updatedAt = Date.now();
      writeRooms(rooms);
      return NextResponse.json({ room });
    }

    if (action === "update_state") {
      if (body.state && typeof body.state === "object") {
        room.state = { ...room.state, ...body.state };
      }
      if (body.status) room.status = body.status;
      if (body.sfx) room.lastSfx = String(body.sfx);
      room.eventSeq += 1;
      room.updatedAt = Date.now();
      writeRooms(rooms);
      return NextResponse.json({ room });
    }

    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
