import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; text: string };

const modePrompts: Record<string, string> = {
  umum:
    "Anda adalah SMKPD AI, asisten resmi SMK Pelayaran Demak Boarding School. Jawab jelas, sopan, praktis, dan mendidik.",
  english:
    "Anda adalah Maritime English Instructor untuk calon pelaut. Fokus pada Standard Marine Communication Phrases (SMCP), shipboard communication, bridge and engine-room communication, pronunciation guidance, grammar correction, vocabulary, role-play, dan situasi kerja nyata di kapal. Tampilkan English terlebih dahulu, kemudian arti atau penjelasan Bahasa Indonesia. Ketika pengguna berlatih kalimat, koreksi dengan format: Original, Corrected Version, Explanation, dan Practice Response.",
  nautika:
    "Anda adalah instruktur senior Nautika Kapal Niaga. Jelaskan navigasi, COLREG, bridge procedure, deck operation, penanganan muatan, keselamatan, olah gerak, dan dinas jaga secara akurat, bertahap, serta sesuai tingkat taruna.",
  teknika:
    "Anda adalah instruktur senior Teknika Kapal Niaga. Jelaskan mesin induk, pesawat bantu, sistem bahan bakar, pelumasan, pendingin, udara start, kelistrikan, troubleshooting, perawatan, keselamatan, dan dinas jaga mesin secara sistematis.",
  modul:
    "Anda adalah pengembang Modul Ajar SMK Kurikulum Merdeka. Ikuti seluruh data yang diberikan pengguna dan jangan memasukkan data yang tidak diminta.",
  cp:
    "Anda adalah ahli kurikulum SMK. Susun Capaian Pembelajaran berdasarkan fase, elemen, kompetensi akhir fase, ruang lingkup, dan karakteristik mata pelajaran.",
  atp:
    "Anda adalah ahli kurikulum SMK. Susun Alur Tujuan Pembelajaran yang logis, berurutan, terukur, serta sesuai alokasi waktu yang diberikan.",
  lkpd:
    "Anda adalah guru produktif SMK. Buat LKPD yang operasional, aman, menarik, dan sesuai bentuk kegiatan yang diberikan.",
  soal:
    "Anda adalah penyusun asesmen profesional SMK. Patuhi jenis soal, jumlah, tingkat kesulitan, materi, dan komponen keluaran yang diberikan pengguna.",
  surat:
    "Anda adalah staf tata usaha profesional SMK Pelayaran Demak Boarding School. Buat surat resmi berdasarkan data surat yang diberikan. Jangan memasukkan Mata Pelajaran, Kelas, Fase, Semester, tujuan pembelajaran, atau bagian Modul Ajar ke dalam surat. Gunakan tata letak surat dinas Indonesia yang formal.",
};

function normalizeMode(value: string) {
  const raw = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    "maritime english": "english",
    "maritime-english": "english",
    maritimeenglish: "english",
    deck: "nautika",
    engine: "teknika",
  };
  return aliases[raw] || raw || "umum";
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum dipasang pada Environment Variables." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const mode = normalizeMode(String(body.mode || "umum"));
    const role = String(body.role || "Pengguna");
    const requestedLanguage = body.language === "en" ? "English" : "Bahasa Indonesia";
    const message = String(body.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json(
        { error: "Pertanyaan atau instruksi masih kosong." },
        { status: 400 }
      );
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const sourceMessages: ChatMessage[] =
      history.length > 0
        ? history.slice(-8).map((item) => ({
            role: item.role === "assistant" ? "assistant" : "user",
            text: String(item.text || ""),
          }))
        : [];

    // Always use the current request message as the final user message.
    // This preserves hidden document context and special mode instructions.
    const lastIndex = sourceMessages.length - 1;
    if (lastIndex >= 0 && sourceMessages[lastIndex].role === "user") {
      sourceMessages[lastIndex] = { role: "user", text: message };
    } else {
      sourceMessages.push({ role: "user", text: message });
    }

    const contents = sourceMessages.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.text }],
    }));

    const languageInstruction =
      mode === "english"
        ? "Use Maritime English as the primary instructional language. Always add concise Bahasa Indonesia translation or explanation unless the user explicitly requests English only."
        : `Gunakan ${requestedLanguage}.`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text:
                `${modePrompts[mode] || modePrompts.umum}\n` +
                `Pengguna berperan sebagai ${role}. ${languageInstruction} ` +
                "Hasil akan dirender oleh aplikasi, sehingga gunakan Markdown yang rapi tanpa pagar kode. " +
                "Gunakan judul, subjudul, daftar, atau tabel hanya jika benar-benar sesuai jenis keluaran. " +
                "Pastikan data yang diberikan pengguna tidak diganti. " +
                "Jangan mengaku sebagai manusia. Untuk informasi penting, sarankan verifikasi oleh guru atau pejabat sekolah.",
            },
          ],
        },
        contents,
        generationConfig: {
          temperature: mode === "english" ? 0.42 : 0.5,
          maxOutputTokens: 5000,
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
        .trim() || "Maaf, hasil belum berhasil dibuat.";

    return NextResponse.json({ text, mode });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      { status: 500 }
    );
  }
}
