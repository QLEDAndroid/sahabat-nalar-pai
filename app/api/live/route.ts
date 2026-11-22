import { NextRequest, NextResponse } from "next/server";
import { kvGet, kvSet } from "@/lib/kvStore";

export interface LivePlayer {
  id: string;
  nama: string;
  skor: number;
  streak: number;
  benar: number;
  eliminated: boolean;
}

export interface LiveCheerEvent {
  id: number;
  sender: string;
  emoji: string;
  label: string;
  sound: string;
  createdAt: number;
}

export interface LiveRoom {
  pin: string;
  status: "lobby" | "question" | "podium";
  currentQuestionIdx: number;
  players: LivePlayer[];
  cheers: LiveCheerEvent[];
  updatedAt: number;
}

function defaultRoom(pin: string): LiveRoom {
  return {
    pin,
    status: "lobby",
    currentQuestionIdx: 0,
    players: [],
    cheers: [],
    updatedAt: Date.now(),
  };
}

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin") || "9026";
  const room = await kvGet<LiveRoom>(`snp_live_${pin}`, defaultRoom(pin));
  return NextResponse.json(room);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body.pin || "9026");
    const action = String(body.action || "");
    const key = `snp_live_${pin}`;
    const room = await kvGet<LiveRoom>(key, defaultRoom(pin));

    if (action === "join") {
      const { id, nama } = body;
      if (id && nama && !room.players.find((p) => p.id === id)) {
        room.players.push({
          id,
          nama,
          skor: 0,
          streak: 0,
          benar: 0,
          eliminated: false,
        });
      }
    } else if (action === "answer") {
      const { id, nama, points = 0, correct = false } = body;
      let player = room.players.find((p) => p.id === id);
      if (!player) {
        player = {
          id: id || `p-${Date.now()}`,
          nama: nama || "Peserta",
          skor: 0,
          streak: 0,
          benar: 0,
          eliminated: false,
        };
        room.players.push(player);
      }
      if (correct) {
        player.skor += Number(points) || 750;
        player.streak += 1;
        player.benar += 1;
      } else {
        player.streak = 0;
      }
    } else if (action === "start") {
      room.status = "question";
      room.currentQuestionIdx = 0;
    } else if (action === "next") {
      const total = Number(body.totalQuestions || 4);
      if (room.currentQuestionIdx + 1 >= total) {
        room.status = "podium";
      } else {
        room.currentQuestionIdx += 1;
      }
    } else if (action === "podium") {
      room.status = "podium";
    } else if (action === "reset") {
      room.status = "lobby";
      room.currentQuestionIdx = 0;
      room.players = [];
      room.cheers = [];
    } else if (action === "cheer") {
      const ev: LiveCheerEvent = {
        id: Date.now(),
        sender: String(body.sender || "Penonton"),
        emoji: String(body.emoji || "👏"),
        label: String(body.label || "Semangat!"),
        sound: String(body.sound || "applause"),
        createdAt: Date.now(),
      };
      room.cheers = [...room.cheers.slice(-24), ev];
    }

    room.updatedAt = Date.now();
    await kvSet(key, room);
    return NextResponse.json(room);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
