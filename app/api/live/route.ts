import { NextRequest, NextResponse } from "next/server";

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

const globalRooms = globalThis as unknown as {
  __snpLiveRooms?: Record<string, LiveRoom>;
  __snpCheerSeq?: number;
};

function getRooms(): Record<string, LiveRoom> {
  if (!globalRooms.__snpLiveRooms) {
    globalRooms.__snpLiveRooms = {};
  }
  return globalRooms.__snpLiveRooms;
}

function getOrCreateRoom(pin: string): LiveRoom {
  const rooms = getRooms();
  if (!rooms[pin]) {
    rooms[pin] = {
      pin,
      status: "lobby",
      currentQuestionIdx: 0,
      players: [],
      cheers: [],
      updatedAt: Date.now(),
    };
  }
  return rooms[pin];
}

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get("pin") || "9026";
  const room = getOrCreateRoom(pin);
  return NextResponse.json(room);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const pin = String(body.pin || "9026");
    const action = String(body.action || "");
    const room = getOrCreateRoom(pin);

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
        player.eliminated = true;
      }
    } else if (action === "cheer") {
      const seq = (globalRooms.__snpCheerSeq || 0) + 1;
      globalRooms.__snpCheerSeq = seq;
      room.cheers.unshift({
        id: seq,
        sender: body.sender || "Spektator",
        emoji: body.emoji || "🔥",
        label: body.label || "Semangat!",
        sound: body.sound || "hype",
        createdAt: Date.now(),
      });
      room.cheers = room.cheers.slice(0, 15);
    } else if (action === "host_update") {
      if (body.status) room.status = body.status;
      if (typeof body.currentQuestionIdx === "number") {
        room.currentQuestionIdx = body.currentQuestionIdx;
      }
    } else if (action === "reset") {
      room.status = "lobby";
      room.currentQuestionIdx = 0;
      room.players = [];
      room.cheers = [];
    }

    room.updatedAt = Date.now();
    return NextResponse.json(room);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Bad request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
