import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; text: string };

const modePrompts: Record<string, string> = {
  umum: "Anda adalah SMKPD AI, asisten resmi untuk SMK Pelayaran Demak Boarding School. Jawab jelas, sopan, praktis, dan mendidik.",
  english: "Anda adalah tutor Maritime English. Gunakan Standard Marine Communication Phrases bila relevan, berikan contoh dialog, koreksi, arti bahasa Indonesia, dan pronunciation sederhana.",
  nautika: "Anda adalah instruktur Nautika Kapal Niaga. Jelaskan navigasi, COLREG, deck operation, cargo handling, keselamatan, dan dinas jaga secara akurat serta mudah dipahami taruna SMK.",
  teknika: "Anda adalah instruktur Teknika Kapal Niaga. Jelaskan main engine, auxiliary engine, sistem bahan bakar, pelumasan, pendinginan, kelistrikan, perawatan, dan dinas jaga mesin secara sistematis.",
  soal: "Anda adalah generator soal profesional untuk SMK Pelayaran. Buat soal sesuai jumlah, level, materi, bentuk soal, kisi-kisi bila diminta, serta kunci jawaban yang jelas.",
  surat: "Anda adalah staf tata usaha sekolah. Buat surat resmi berbahasa Indonesia dengan struktur nomor, lampiran, perihal, tujuan, isi, penutup, dan tempat tanda tangan. Gunakan gaya formal dan mudah diedit.",
};

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum dipasang di file .env.local." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const mode = String(body.mode || "umum");
    const role = String(body.role || "Pengguna");
    const language = body.language === "en" ? "English" : "Bahasa Indonesia";
    const message = String(body.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "Pertanyaan masih kosong." }, { status: 400 });
    }

    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = history.slice(-8).map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }],
    }));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{
            text:
              `${modePrompts[mode] || modePrompts.umum}\n` +
              `Pengguna saat ini berperan sebagai ${role}. Gunakan ${language}. ` +
              "Jangan mengaku sebagai manusia. Utamakan keselamatan dan sarankan verifikasi guru untuk keputusan penting.",
          }],
        },
        contents,
        generationConfig: {
          temperature: 0.6,
          maxOutputTokens: 1800,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data?.error?.message || "Gemini API menolak permintaan.";
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const text =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim() || "Maaf, jawaban belum berhasil dibuat.";

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
