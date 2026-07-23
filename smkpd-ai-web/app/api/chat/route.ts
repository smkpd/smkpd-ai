import { NextRequest, NextResponse } from "next/server";

type ChatMessage = { role: "user" | "assistant"; text: string };
type ProviderName = "groq" | "gemini";

type ProviderSuccess = {
  ok: true;
  provider: ProviderName;
  text: string;
  model: string;
};

type ProviderFailure = {
  ok: false;
  provider: ProviderName;
  status: number;
  message: string;
  retryable: boolean;
};

type ProviderResult = ProviderSuccess | ProviderFailure;

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

function buildSystemPrompt(mode: string, role: string, requestedLanguage: string) {
  const languageInstruction =
    mode === "english"
      ? "Use Maritime English as the primary instructional language. Always add concise Bahasa Indonesia translation or explanation unless the user explicitly requests English only."
      : `Gunakan ${requestedLanguage}.`;

  return (
    `${modePrompts[mode] || modePrompts.umum}\n` +
    `Pengguna berperan sebagai ${role}. ${languageInstruction} ` +
    "Hasil akan dirender oleh aplikasi, sehingga gunakan Markdown yang rapi tanpa pagar kode. " +
    "Gunakan judul, subjudul, daftar, atau tabel hanya jika benar-benar sesuai jenis keluaran. " +
    "Pastikan data yang diberikan pengguna tidak diganti. " +
    "Jangan mengaku sebagai manusia. Untuk informasi penting, sarankan verifikasi oleh guru atau pejabat sekolah."
  );
}

function normalizeHistory(history: unknown, message: string): ChatMessage[] {
  const source: ChatMessage[] = Array.isArray(history)
    ? history.slice(-8).map((item: unknown) => {
        const entry = item as Partial<ChatMessage>;
        return {
          role: entry.role === "assistant" ? "assistant" : "user",
          text: String(entry.text || ""),
        };
      })
    : [];

  const lastIndex = source.length - 1;
  if (lastIndex >= 0 && source[lastIndex].role === "user") {
    source[lastIndex] = { role: "user", text: message };
  } else {
    source.push({ role: "user", text: message });
  }

  return source;
}

function parseProviderOrder(): ProviderName[] {
  const configured = String(process.env.AI_PROVIDER_ORDER || "groq,gemini")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ProviderName => value === "groq" || value === "gemini");

  return configured.length > 0 ? [...new Set(configured)] : ["groq", "gemini"];
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: "no-store" });
  } finally {
    clearTimeout(timer);
  }
}

async function callGroq(
  systemPrompt: string,
  history: ChatMessage[],
  mode: string
): Promise<ProviderResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const provider: ProviderName = "groq";

  if (!apiKey) {
    return {
      ok: false,
      provider,
      status: 503,
      message: "GROQ_API_KEY belum dipasang.",
      retryable: true,
    };
  }

  const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

  try {
    const response = await fetchWithTimeout(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            ...history.map((item) => ({
              role: item.role,
              content: item.text,
            })),
          ],
          temperature: mode === "english" ? 0.42 : 0.5,
          max_completion_tokens: 4000,
        }),
      },
      20_000
    );

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        ok: false,
        provider,
        status: response.status,
        message: data.error?.message || "Groq API menolak permintaan.",
        retryable: isRetryableStatus(response.status),
      };
    }

    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) {
      return {
        ok: false,
        provider,
        status: 502,
        message: "Groq tidak mengembalikan teks.",
        retryable: true,
      };
    }

    return { ok: true, provider, text, model };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Groq timeout setelah 20 detik."
        : error instanceof Error
          ? error.message
          : "Groq tidak dapat dihubungi.";

    return { ok: false, provider, status: 503, message, retryable: true };
  }
}

async function callGemini(
  systemPrompt: string,
  history: ChatMessage[],
  mode: string
): Promise<ProviderResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const provider: ProviderName = "gemini";

  if (!apiKey) {
    return {
      ok: false,
      provider,
      status: 503,
      message: "GEMINI_API_KEY belum dipasang.",
      retryable: true,
    };
  }

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: history.map((item) => ({
            role: item.role === "assistant" ? "model" : "user",
            parts: [{ text: item.text }],
          })),
          generationConfig: {
            temperature: mode === "english" ? 0.42 : 0.5,
            maxOutputTokens: 5000,
          },
        }),
      },
      30_000
    );

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      return {
        ok: false,
        provider,
        status: response.status,
        message: data.error?.message || "Gemini API menolak permintaan.",
        retryable: isRetryableStatus(response.status),
      };
    }

    const text =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() || "";

    if (!text) {
      return {
        ok: false,
        provider,
        status: 502,
        message: "Gemini tidak mengembalikan teks.",
        retryable: true,
      };
    }

    return { ok: true, provider, text, model };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Gemini timeout setelah 30 detik."
        : error instanceof Error
          ? error.message
          : "Gemini tidak dapat dihubungi.";

    return { ok: false, provider, status: 503, message, retryable: true };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: unknown;
      role?: unknown;
      language?: unknown;
      message?: unknown;
      history?: unknown;
    };

    const mode = normalizeMode(String(body.mode || "umum"));
    const role = String(body.role || "Pengguna");
    const requestedLanguage = body.language === "en" ? "English" : "Bahasa Indonesia";
    const message = String(body.message || "").trim();

    if (!message) {
      return NextResponse.json(
        { error: "Pertanyaan atau instruksi masih kosong." },
        { status: 400 }
      );
    }

    const history = normalizeHistory(body.history, message);
    const systemPrompt = buildSystemPrompt(mode, role, requestedLanguage);
    const providerOrder = parseProviderOrder();
    const failures: ProviderFailure[] = [];

    for (const provider of providerOrder) {
      const result =
        provider === "groq"
          ? await callGroq(systemPrompt, history, mode)
          : await callGemini(systemPrompt, history, mode);

      if (result.ok) {
        return NextResponse.json({
          text: result.text,
          mode,
          provider: result.provider,
          model: result.model,
          fallbackUsed: failures.length > 0,
        });
      }

      failures.push(result);

      // Kesalahan autentikasi/izin harus dibenahi oleh admin, bukan dicoba berulang.
      if (!result.retryable && [400, 401, 403].includes(result.status)) {
        return NextResponse.json(
          {
            error: `${result.provider}: ${result.message}`,
            providerErrors: failures,
          },
          { status: result.status }
        );
      }
    }

    const detail = failures.map((item) => `${item.provider}: ${item.message}`).join(" | ");
    return NextResponse.json(
      {
        error:
          detail ||
          "Semua provider AI gratis sedang tidak tersedia. Silakan coba beberapa saat lagi.",
        providerErrors: failures,
      },
      { status: 503 }
    );
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
