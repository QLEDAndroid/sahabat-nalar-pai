import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { ALL_MODULES, getModuleById } from "@/lib/modules";

const MODEL_CANDIDATES = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
];

function resolveMentionedModule(message: string, fallbackBabId: string) {
  const match = message.match(/@\s*bab\s*(\d{1,2})\b/i);
  if (match) {
    const num = Number(match[1]);
    const mentioned = ALL_MODULES.find((m) => m.bab === num);
    if (mentioned) return { mod: mentioned, mentioned: true };
  }
  return { mod: getModuleById(fallbackBabId), mentioned: false };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      babId,
      stage,
      mode,
      message,
      history = [],
      kasusJudul,
    } = body as {
      babId: string;
      stage: "memahami" | "mengaplikasi";
      mode?: string;
      message: string;
      history?: Array<{ role: "user" | "model"; text: string }>;
      kasusJudul?: string;
    };

    const { mod, mentioned } = resolveMentionedModule(message || "", babId);
    if (!mod) {
      return NextResponse.json(
        { error: "Modul bab tidak ditemukan." },
        { status: 404 }
      );
    }

    const trimmed = (message || "").trim().toLowerCase();
    if (/^(hai|halo|hello|hi|assalamu'?alaikum|p|tes|test)[!.?]*$/.test(trimmed)) {
      const dalilUtama = mod.dalilTerverifikasi[0]?.sumber;
      return NextResponse.json({
        reply: `Wa'alaikumussalam, hai! Aku **AIsyah**. Kita lagi di **BAB ${mod.bab}: ${mod.judul}** (${mod.elemen}).${
          dalilUtama ? ` Rujukan utamanya **${dalilUtama}**.` : ""
        }\n\nKamu bisa langsung tanya apa saja, ganti mode belajar di atas, atau ketik **@Bab 1–10** untuk menghubungkan ke bab lain!`,
        shouldEscalateToTeacher: false,
        activeBab: mod.bab,
        model: "instant-greeting",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum diisi di .env.local." },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    const dalilText =
      mod.dalilTerverifikasi.length > 0
        ? mod.dalilTerverifikasi
            .slice(0, 8)
            .map((d) => `- [${d.jenis}] ${d.sumber}: "${d.terjemahan}"`)
            .join("\n")
        : "(Rujuk narasi materi Bagian F di bawah.)";

    const glosariumText = mod.glosarium
      .slice(0, 15)
      .map((g) => `- ${g.istilah}: ${g.penjelasan}`)
      .join("\n");

    const terkaitText = mod.babTerkait
      .map((b) => `BAB ${b.bab} (${b.judul})`)
      .join(", ");

    const stageInstruction =
      stage === "memahami"
        ? `TAHAP: MEMAHAMI (Mode: "${mode || "Analogi Pelajar"}")
- Analogi Pelajar: 1 analogi singkat dekat keseharian anak SMA.
- Alur Logika & Konsep: definisi, prinsip, dan 1 contoh nyata ringkas.
- Kisah & Konteks: narasi kontekstual hangat dan beradab islami.
- Bedah Dalil & Istilah: jelaskan maksud ayat/hadis terverifikasi & glosarium.`
        : `TAHAP: MENGAPLIKASI (Dialog Sokratik Taksonomi SOLO)
Kasus aktif: "${kasusJudul || "Studi Kasus Aktual Modul"}"
- JANGAN menyuapi jawaban jadi.
- Pandu siswa bernalar bertahap (Multistruktural -> Relasional -> Extended Abstract) dengan 1 pertanyaan pancingan singkat.`;

    const systemInstruction = `Kamu adalah "AIsyah", teman belajar PAI-BP yang ramah, cerdas, dan santai untuk siswa SMA Kelas X SMAN 1 Pangkalan Kerinci.
${mentioned ? `CATATAN CONNECTOR: Siswa baru saja me-mention @Bab ${mod.bab} (${mod.judul}), jadi jawab berdasarkan modul BAB ${mod.bab} di bawah ini.` : ""}

GAYA BAHASA & PANJANG (WAJIB):
- Jawab SINGKAT, PADAT, NATURAL seperti chat teman belajar (maksimal 100–140 kata, 2–3 paragraf pendek).
- DILARANG pakai heading ###, garis pemisah ---, atau pembuka kaku khas AI. Langsung ke inti.
- Boleh pakai **tebal** secukupnya pada istilah kunci atau nama surat/bagian modul.

ATURAN GUARDRAIL KETAT:
1. SUMBER TUNGGAL: Jawab HANYA dari modul BAB ${mod.bab} ("${mod.judul}") dan keterkaitan (${terkaitText}).
2. ANTI-HALUSINASI DALIL: DILARANG mengarang ayat/nomor surat/hadis di luar DATA MODUL.
3. WAJIB SITASI RINGKAS: Sebutkan rujukan bagian modul secara natural.
4. WASATHIYYAH: Bahasa santun, sejuk, tidak menghakimi.
5. BATASAN OTORITAS: Jika di luar modul atau fatwa kontemporer sensitif, tolak berfatwa secara santun, arahkan klik "Tanya Guru PAI", dan tutup dengan [ESKALASI_GURU].

${stageInstruction}

=== DATA MODUL RESMI BAB ${mod.bab}: ${mod.judul} ===
DALIL TERVERIFIKASI:
${dalilText}

GLOSARIUM (BAGIAN N):
${glosariumText}

MATERI MODUL (BAGIAN F):
${mod.materiLengkap.slice(0, 9000)}
`;

    const contents = [
      ...history.slice(-6).map((h) => ({
        role: h.role,
        parts: [{ text: h.text }],
      })),
      { role: "user" as const, parts: [{ text: message }] },
    ];

    let response = null;
    let usedModel = MODEL_CANDIDATES[0];

    for (const modelName of MODEL_CANDIDATES) {
      try {
        usedModel = modelName;
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            temperature: 0.25,
            maxOutputTokens: 420,
          },
        });
        if (response?.text) break;
      } catch (e: unknown) {
        console.error(`[AIsyah] Model ${modelName} gagal:`, e);
      }
    }

    if (!response?.text) {
      const g = mod.glosarium[0];
      const d = mod.dalilTerverifikasi[0];
      const ringkasan = mod.materiLengkap.replace(/\s+/g, " ").slice(0, 240).trim();
      return NextResponse.json({
        reply: `Merujuk **Bagian F Modul BAB ${mod.bab} (${mod.judul})**: ${ringkasan}...\n\n${
          g ? `Istilah kunci **${g.istilah}**: ${g.penjelasan}` : ""
        }${d ? `\nDalil resmi: **${d.sumber}** (*"${d.terjemahan.slice(0, 120)}..."*).` : ""}`,
        shouldEscalateToTeacher: false,
        activeBab: mod.bab,
        model: "curated-module-fallback",
      });
    }

    const rawText = response.text;
    const shouldEscalateToTeacher = rawText.includes("[ESKALASI_GURU]");
    const cleanReply = rawText
      .replace(/\[ESKALASI_GURU\]/g, "")
      .replace(/^#{1,6}\s*/gm, "")
      .replace(/^---+$/gm, "")
      .trim();

    return NextResponse.json({
      reply: cleanReply,
      shouldEscalateToTeacher,
      activeBab: mod.bab,
      model: usedModel,
      temperature: 0.25,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Terjadi kesalahan server.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
