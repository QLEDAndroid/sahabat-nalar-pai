import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getModuleById } from "@/lib/modules";
import { ModuleData, QuizQuestion } from "@/lib/types";

const MODEL_CANDIDATES = ["gemini-3.8-flash", "gemini-3.5-flash-lite"];

/** Fallback lokal cerdas jika Gemini API sedang 503 high demand */
function buildLocalFallbackQuestions(
  mod: ModuleData | undefined,
  sourceType: "prompt" | "materi" | "bank_soal",
  documentText: string,
  count: number
): QuizQuestion[] {
  // 1. Jika bank_soal, coba parse soal bernomor (1. ... A. ... B. ... C. ... D. ...)
  if (sourceType === "bank_soal" && documentText.trim()) {
    const blocks = documentText
      .split(/\n(?=\d+[\.\)]\s)/)
      .map((b) => b.trim())
      .filter((b) => b.length > 15);
    const parsed: QuizQuestion[] = [];
    blocks.slice(0, count).forEach((blk, idx) => {
      const lines = blk.split("\n").map((l) => l.trim()).filter(Boolean);
      const qLine = (lines[0] || "").replace(/^\d+[\.\)]\s*/, "");
      const opts: string[] = [];
      for (const l of lines.slice(1)) {
        const m = l.match(/^[A-Da-d][\.\)]\s*(.+)/);
        if (m) opts.push(m[1].trim());
      }
      while (opts.length < 4) opts.push(`Pilihan ${opts.length + 1}`);
      if (qLine) {
        parsed.push({
          id: `loc-${Date.now()}-${idx}`,
          pertanyaan: qLine,
          opsi: opts.slice(0, 4),
          jawabanBenar: 0,
          pembahasan: "Soal diekstrak dari bank soal guru (silakan periksa kunci jawaban).",
        });
      }
    });
    if (parsed.length > 0) return parsed;
  }

  // 2. Bangun soal akurat langsung dari Glosarium (Bagian N) & Dalil (Bagian F) modul resmi
  if (!mod) return [];
  const results: QuizQuestion[] = [];
  const glos = mod.glosarium;

  for (let i = 0; i < glos.length && results.length < count; i++) {
    const target = glos[i];
    const distractors = glos
      .filter((_, idx) => idx !== i)
      .slice(0, 3)
      .map((g) => g.istilah);
    while (distractors.length < 3) distractors.push(`Konsep lain ${distractors.length + 1}`);
    const correctIdx = i % 4;
    const opsi = [...distractors];
    opsi.splice(correctIdx, 0, target.istilah);

    results.push({
      id: `modq-${Date.now()}-${i}`,
      pertanyaan: `Pada BAB ${mod.bab} (${mod.judul}), istilah yang tepat untuk pengertian "${target.penjelasan}" adalah...`,
      opsi: opsi.slice(0, 4),
      jawabanBenar: correctIdx,
      pembahasan: `Merujuk Glosarium Bagian N BAB ${mod.bab}: ${target.istilah} adalah ${target.penjelasan}`,
    });
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      babId,
      sourceType,
      prompt = "",
      documentText = "",
      count = 5,
    } = body as {
      babId: string;
      sourceType: "prompt" | "materi" | "bank_soal";
      prompt?: string;
      documentText?: string;
      count?: number;
    };

    const mod = getModuleById(babId);
    const numQuestions = Math.min(15, Math.max(1, Number(count) || 5));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const localQ = buildLocalFallbackQuestions(mod, sourceType, documentText, numQuestions);
      return NextResponse.json({ questions: localQ, source: "local-module" });
    }

    const ai = new GoogleGenAI({ apiKey });

    let taskInstruction = "";
    if (sourceType === "bank_soal") {
      taskInstruction = `TUGAS: Ekstrak dan rapikan soal-soal pilihan ganda dari BANK SOAL / DOKUMEN GURU di bawah ini menjadi format JSON yang bersih (maksimal ${numQuestions} soal). Lengkapi 4 opsi jawaban (A-D), tentukan indeks jawabanBenar (0-3), dan tulis pembahasan singkat.

DOKUMEN BANK SOAL GURU:
${documentText.slice(0, 12000)}`;
    } else if (sourceType === "materi") {
      taskInstruction = `TUGAS: Buatkan tepat ${numQuestions} soal pilihan ganda PAI-BP SMA Kelas X HANYA berdasarkan DOKUMEN MATERI guru di bawah ini.

DOKUMEN MATERI GURU:
${documentText.slice(0, 12000)}
${prompt ? `\nINSTRUKSI TAMBAHAN: ${prompt}` : ""}`;
    } else {
      taskInstruction = `TUGAS: Buatkan tepat ${numQuestions} soal pilihan ganda PAI-BP SMA Kelas X berdasarkan permintaan guru dan Modul Resmi BAB ${mod?.bab || ""} (${mod?.judul || ""}).

PERMINTAAN GURU:
${prompt || `Buatkan ${numQuestions} soal pemahaman dan studi kasus dari BAB ${mod?.bab} (${mod?.judul}).`}

REFERENSI MODUL RESMI (BAGIAN F):
${(mod?.materiLengkap || "").slice(0, 9000)}`;
    }

    const systemInstruction = `Kamu adalah "AIsyah", asisten penyusun asesmen PAI-BP untuk Guru SMA.
Keluarkan HANYA array JSON valid tanpa teks tambahan:
[
  {
    "pertanyaan": "Teks pertanyaan",
    "opsi": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
    "jawabanBenar": 0,
    "pembahasan": "Penjelasan singkat"
  }
]`;

    let rawJson = "";
    for (const modelName of MODEL_CANDIDATES) {
      try {
        const res = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: taskInstruction }] }],
          config: {
            systemInstruction,
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        });
        if (res.text) {
          rawJson = res.text;
          break;
        }
      } catch (e) {
        console.error(`[AIsyah QuizGen] ${modelName} gagal:`, e);
      }
    }

    let questions: QuizQuestion[] = [];
    if (rawJson) {
      try {
        const cleaned = rawJson
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/```$/i, "")
          .trim();
        const parsed = JSON.parse(cleaned);
        questions = (Array.isArray(parsed) ? parsed : [])
          .filter((q) => q.pertanyaan && Array.isArray(q.opsi) && q.opsi.length >= 2)
          .map((q, idx) => {
            const opts = [...(q.opsi || [])].slice(0, 4);
            while (opts.length < 4) opts.push(`Pilihan ${opts.length + 1}`);
            const ans =
              typeof q.jawabanBenar === "number" && q.jawabanBenar >= 0 && q.jawabanBenar <= 3
                ? q.jawabanBenar
                : 0;
            return {
              id: `aiq-${Date.now()}-${idx}`,
              pertanyaan: String(q.pertanyaan).trim(),
              opsi: opts.map((o) => String(o).trim()),
              jawabanBenar: ans,
              pembahasan: String(q.pembahasan || "Merujuk materi PAI-BP.").trim(),
            };
          });
      } catch {
        questions = [];
      }
    }

    // Jika Gemini API sedang 503 high demand, otomatis gunakan fallback lokal berbasis modul/bank soal!
    if (questions.length === 0) {
      const localQ = buildLocalFallbackQuestions(mod, sourceType, documentText, numQuestions);
      if (localQ.length > 0) {
        return NextResponse.json({
          questions: localQ,
          source: "local-module-fallback",
        });
      }
      return NextResponse.json(
        { error: "Server AI sedang padat sementara. Coba klik Generate beberapa detik lagi." },
        { status: 503 }
      );
    }

    return NextResponse.json({ questions, source: "gemini" });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gagal membuat soal.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
