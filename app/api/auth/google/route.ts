import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { credential } = (await req.json()) as { credential?: string };
    if (!credential) {
      return NextResponse.json({ error: "Token Google tidak ditemukan." }, { status: 400 });
    }

    const verifyRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`,
      { cache: "no-store" }
    );
    if (!verifyRes.ok) {
      return NextResponse.json({ error: "Verifikasi token Google gagal." }, { status: 401 });
    }

    const payload = (await verifyRes.json()) as {
      aud?: string;
      email?: string;
      email_verified?: string | boolean;
      name?: string;
      picture?: string;
    };

    const expectedClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (expectedClientId && payload.aud !== expectedClientId) {
      return NextResponse.json({ error: "Client ID Google tidak cocok." }, { status: 401 });
    }

    const email = (payload.email || "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ error: "Email Google tidak terbaca." }, { status: 400 });
    }

    const isGuru = email.endsWith("@guru.sma.belajar.id");
    const isMurid = email.endsWith("@sma.belajar.id");
    const allowAny = process.env.NEXT_PUBLIC_ALLOW_ANY_GOOGLE_DOMAIN === "true";

    if (!isGuru && !isMurid && !allowAny) {
      return NextResponse.json(
        {
          error:
            "Gunakan akun Google belajar.id (@guru.sma.belajar.id untuk Guru atau @sma.belajar.id untuk Siswa).",
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      email,
      name: payload.name || email.split("@")[0],
      picture: payload.picture || "",
      role: isGuru ? "guru" : "murid",
    });
  } catch {
    return NextResponse.json({ error: "Gagal memproses login Google." }, { status: 500 });
  }
}
