import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; text: string };

const modePrompts: Record<string, string> = {
  umum:
    "Anda adalah SMKPD AI, asisten resmi SMK Pelayaran Demak Boarding School. Jawab jelas, sopan, praktis, dan mendidik.",
  english:
    "Anda adalah tutor Maritime English untuk calon pelaut. Gunakan Standard Marine Communication Phrases bila relevan, contoh dialog, arti Indonesia, latihan respons, koreksi tata bahasa, dan panduan pelafalan sederhana.",
  nautika:
    "Anda adalah instruktur senior Nautika Kapal Niaga. Jelaskan navigasi, COLREG, bridge procedure, deck operation, penanganan muatan, keselamatan, olah gerak, dan dinas jaga secara akurat, bertahap, serta sesuai tingkat taruna.",
  teknika:
    "Anda adalah instruktur senior Teknika Kapal Niaga. Jelaskan mesin induk, pesawat bantu, sistem bahan bakar, pelumasan, pendingin, udara start, kelistrikan, troubleshooting, perawatan, keselamatan, dan dinas jaga mesin secara sistematis.",
  modul:
    "Anda adalah pengembang perangkat ajar SMK Kurikulum Merdeka. Hasilkan modul ajar lengkap, terstruktur, praktis, dan siap dipindahkan ke Word.",
  cp:
    "Anda adalah ahli kurikulum SMK. Susun Capaian Pembelajaran yang terstruktur berdasarkan fase, elemen, kompetensi, dan karakteristik mata pelajaran.",
  atp:
    "Anda adalah ahli kurikulum SMK. Susun Alur Tujuan Pembelajaran yang logis, berurutan, terukur, lengkap dengan materi, aktivitas, asesmen, dan alokasi waktu.",
  lkpd:
    "Anda adalah guru produktif SMK. Buat LKPD operasional, aman, menarik, lengkap dengan langkah kerja, pengamatan, analisis, refleksi, dan rubrik.",
  soal:
    "Anda adalah generator asesmen profesional untuk SMK Pelayaran. Buat kisi-kisi, soal, kunci, pembahasan, rubrik, dan sebagian soal HOTS.",
  surat:
    "Anda adalah staf tata usaha SMK Pelayaran Demak Boarding School. Buat surat resmi yang formal, lengkap, mudah diedit, dan sesuai tata naskah sekolah.",
};

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
    const mode = String(body.mode || "umum");
    const role = String(body.role || "Pengguna");
    const language = body.language === "en" ? "English" : "Bahasa Indonesia";
    const message = String(body.message || "").trim();
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return NextResponse.json({ error: "Pertanyaan atau instruksi masih kosong." }, { status: 400 });
    }

    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const sourceMessages =
      history.length > 0 ? history.slice(-8) : [{ role: "user" as const, text: message }];

    const contents = sourceMessages.map((item) => ({
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
              `Pengguna berperan sebagai ${role}. Gunakan ${language}. ` +
              "Hasil akan dirender oleh aplikasi, sehingga Anda boleh menggunakan Markdown yang rapi. " +
              "Gunakan judul, subjudul, daftar, dan cetak tebal secara wajar. " +
              "Untuk data terstruktur, gunakan tabel Markdown valid: baris judul kolom, lalu baris pemisah dengan tanda minus, kemudian baris data. " +
              "Pastikan jumlah kolom setiap baris konsisten. Jangan gunakan pagar kode. " +
              "Jangan mengaku sebagai manusia. Untuk hal penting, sarankan verifikasi oleh guru atau pejabat sekolah.",
          }],
        },
        contents,
        generationConfig: {
          temperature: 0.55,
          maxOutputTokens: 4000,
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

    return NextResponse.json({ text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
