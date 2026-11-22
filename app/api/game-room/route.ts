import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kvStore";
import { TUG_QUESTIONS } from "@/data/game-bank";

export type TugTeam = "hijau" | "emas";

export interface TugPlayer {
  id: string;
  name: string;
  team: TugTeam;
  score: number;
}

export interface TugRoom {
  pin: string;
  status: "lobby" | "playing" | "finished";
  /** -100 = Tim Hijau menang, +100 = Tim Emas menang, 0 = tengah */
  ropePosition: number;
  hijauScore: number;
  emasScore: number;
  winner?: TugTeam;
  lastPullBy?: string;
  lastPullTeam?: TugTeam;
  players: TugPlayer[];
  updatedAt: number;
}

async function readRooms(): Promise<Record<string, TugRoom>> {
  return kvGet<Record<string, TugRoom>>("snp_tug_rooms", {});
}

async function writeRooms(rooms: Record<string, TugRoom>) {
  await kvSet("snp_tug_rooms", rooms);
}

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin")?.trim();
  const rooms = await readRooms();
  if (!pin) {
    return NextResponse.json({ rooms: Object.values(rooms) });
  }
  const room = rooms[pin];
  if (!room) {
    return NextResponse.json({ error: "PIN ruangan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ room, totalQuestions: TUG_QUESTIONS.length });
}

export async function POST() {
  const rooms = await readRooms();
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const room: TugRoom = {
    pin,
    status: "lobby",
    ropePosition: 0,
    hijauScore: 0,
    emasScore: 0,
    players: [],
    updatedAt: Date.now(),
  };
  rooms[pin] = room;
  await writeRooms(rooms);
  return NextResponse.json({ room }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body.pin || "").trim();
    const action = String(body.action || "");
    const rooms = await readRooms();
    const room = rooms[pin];
    if (!room) {
      return NextResponse.json({ error: "PIN ruangan tidak ditemukan" }, { status: 404 });
    }

    if (action === "join") {
      const name = String(body.name || "Siswa").trim().slice(0, 28);
      const team: TugTeam = body.team === "emas" ? "emas" : "hijau";
      const playerId = String(body.playerId || `p-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      const exists = room.players.find((p) => p.id === playerId);
      if (!exists) {
        room.players.push({ id: playerId, name, team, score: 0 });
      }
      room.updatedAt = Date.now();
      await writeRooms(rooms);
      return NextResponse.json({ room, playerId });
    }

    if (action === "start") {
      room.status = "playing";
      room.ropePosition = 0;
      room.hijauScore = 0;
      room.emasScore = 0;
      room.winner = undefined;
      room.lastPullBy = undefined;
      room.lastPullTeam = undefined;
      room.players = room.players.map((p) => ({ ...p, score: 0 }));
      room.updatedAt = Date.now();
      await writeRooms(rooms);
      return NextResponse.json({ room });
    }

    if (action === "pull") {
      if (room.status !== "playing") {
        return NextResponse.json({ room });
      }
      const playerId = String(body.playerId || "");
      const team: TugTeam = body.team === "emas" ? "emas" : "hijau";
      const name = String(body.name || "Siswa");
      const delta = team === "hijau" ? -12 : 12;
      room.ropePosition = Math.max(-100, Math.min(100, room.ropePosition + delta));
      if (team === "hijau") room.hijauScore += 10;
      else room.emasScore += 10;
      room.lastPullBy = name;
      room.lastPullTeam = team;
      const p = room.players.find((x) => x.id === playerId);
      if (p) p.score += 10;

      if (room.ropePosition <= -100) {
        room.status = "finished";
        room.winner = "hijau";
      } else if (room.ropePosition >= 100) {
        room.status = "finished";
        room.winner = "emas";
      }
      room.updatedAt = Date.now();
      await writeRooms(rooms);
      return NextResponse.json({ room });
    }

    if (action === "finish") {
      room.status = "finished";
      room.winner =
        room.ropePosition < 0
          ? "hijau"
          : room.ropePosition > 0
          ? "emas"
          : room.hijauScore >= room.emasScore
          ? "hijau"
          : "emas";
      room.updatedAt = Date.now();
      await writeRooms(rooms);
      return NextResponse.json({ room });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid" }, { status: 400 });
  }
}
