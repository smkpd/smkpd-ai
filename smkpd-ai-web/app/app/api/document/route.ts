import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type GeminiPart = { text?: string };

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function extractJson(value: string) {
  const cleaned = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("Format hasil analisis dokumen belum valid.");
  }
}

function getApiKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY belum dipasang pada Environment Variables."
    );
  }
  return apiKey;
}

async function startUpload(request: NextRequest) {
  const apiKey = getApiKey();
  const body = await request.json();
  const fileName = String(body.fileName || "dokumen.pdf").slice(0, 180);
  const mimeType = String(body.mimeType || "application/pdf");
  const fileSize = Number(body.fileSize || 0);

  if (mimeType !== "application/pdf") {
    return NextResponse.json(
      { error: "Perpustakaan AI menerima dokumen PDF." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return NextResponse.json(
      { error: "Ukuran file tidak valid." },
      { status: 400 }
    );
  }

  if (fileSize > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Ukuran satu dokumen PDF maksimal 30 MB." },
      { status: 400 }
    );
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(fileSize),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        file: {
          display_name: fileName,
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text();
    return NextResponse.json(
      {
        error:
          detail || "Sesi upload dokumen belum berhasil dibuat.",
      },
      { status: response.status }
    );
  }

  const uploadUrl = response.headers.get("x-goog-upload-url");

  if (!uploadUrl) {
    return NextResponse.json(
      { error: "Alamat upload dokumen tidak diterima dari Gemini." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    uploadUrl,
    maxSize: MAX_FILE_SIZE,
  });
}

async function waitUntilActive(
  resourceName: string,
  apiKey: string
) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${resourceName}?key=${apiKey}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Status dokumen Gemini belum dapat diperiksa.");
    }

    const file = await response.json();
    const state = String(file.state || "ACTIVE").toUpperCase();

    if (state === "ACTIVE") return file;
    if (state === "FAILED") {
      throw new Error("Gemini gagal memproses dokumen PDF.");
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(
    "Dokumen masih diproses. Silakan ulangi beberapa saat lagi."
  );
}

async function analyzeUploadedFile(request: NextRequest) {
  const apiKey = getApiKey();
  const body = await request.json();

  const fileUri = String(body.fileUri || "");
  const resourceName = String(body.resourceName || "");
  const mimeType = String(body.mimeType || "application/pdf");
  const originalFileName = String(body.fileName || "dokumen.pdf");

  if (!fileUri || !resourceName) {
    return NextResponse.json(
      { error: "Data file Gemini belum lengkap." },
      { status: 400 }
    );
  }

  await waitUntilActive(resourceName, apiKey);

  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = `
Analisis PDF sekolah ini secara teliti. Kembalikan JSON valid tanpa pagar kode dengan struktur:
{
  "title": "judul dokumen yang singkat",
  "summary": "ringkasan terstruktur 5-10 paragraf atau poin",
  "content": "isi penting dokumen yang diekstrak dan disusun ulang secara lengkap, maksimal 24000 karakter",
  "suggestedQuestions": ["pertanyaan 1", "pertanyaan 2", "pertanyaan 3", "pertanyaan 4"]
}

Ketentuan:
- Gunakan Bahasa Indonesia.
- Jangan mengarang informasi yang tidak ada pada PDF.
- Pertahankan nama, tanggal, angka, ketentuan, dan istilah penting.
- Bila terdapat tabel, ubah menjadi uraian atau tabel Markdown yang rapi.
- Isi content harus cukup lengkap agar dapat dipakai seluruh pengguna sebagai Perpustakaan AI.
`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              fileData: {
                mimeType,
                fileUri,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8000,
        responseMimeType: "application/json",
      },
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data?.error?.message || "Gemini gagal membaca PDF.";
    return NextResponse.json(
      { error: detail },
      { status: response.status }
    );
  }

  const raw =
    data?.candidates?.[0]?.content?.parts
      ?.map((part: GeminiPart) => part.text || "")
      .join("")
      .trim() || "";

  const parsed = extractJson(raw);

  // Best effort cleanup. The extracted summary remains in SMKPD database.
  fetch(
    `https://generativelanguage.googleapis.com/v1beta/${resourceName}?key=${apiKey}`,
    { method: "DELETE" }
  ).catch(() => undefined);

  return NextResponse.json({
    title: String(
      parsed.title || originalFileName.replace(/\.pdf$/i, "")
    ),
    summary: String(parsed.summary || "Ringkasan belum tersedia."),
    content: String(parsed.content || parsed.summary || ""),
    suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
      ? parsed.suggestedQuestions.slice(0, 6).map(String)
      : [],
  });
}

export async function POST(request: NextRequest) {
  try {
    const action =
      request.nextUrl.searchParams.get("action") || "start-upload";

    if (action === "start-upload") {
      return await startUpload(request);
    }

    if (action === "analyze") {
      return await analyzeUploadedFile(request);
    }

    return NextResponse.json(
      { error: "Aksi dokumen tidak dikenal." },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan ketika memproses dokumen.",
      },
      { status: 500 }
    );
  }
}
