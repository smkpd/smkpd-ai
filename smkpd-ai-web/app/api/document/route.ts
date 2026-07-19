import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type GeminiPart = { text?: string };

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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY belum dipasang pada Vercel/Environment Variables." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File PDF belum dipilih." }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Saat ini Knowledge Base menerima file PDF." },
        { status: 400 }
      );
    }

    const maxSize = 4 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "Ukuran satu dokumen PDF maksimal 4 MB." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const base64 = bytes.toString("base64");
    const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `
Analisis PDF sekolah ini secara teliti. Kembalikan JSON valid tanpa pagar kode dengan struktur:
{
  "title": "judul dokumen yang singkat",
  "summary": "ringkasan terstruktur 5-10 paragraf atau poin",
  "content": "isi penting dokumen yang diekstrak dan disusun ulang secara lengkap, maksimal 18000 karakter",
  "suggestedQuestions": ["pertanyaan 1", "pertanyaan 2", "pertanyaan 3", "pertanyaan 4"]
}

Ketentuan:
- Gunakan Bahasa Indonesia.
- Jangan mengarang informasi yang tidak ada pada PDF.
- Pertahankan nama, tanggal, angka, ketentuan, dan istilah penting.
- Bila terdapat tabel, ubah menjadi uraian atau tabel Markdown yang rapi.
- Isi content harus cukup lengkap agar dapat dipakai sebagai Knowledge Base.
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
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 6500,
          responseMimeType: "application/json",
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data?.error?.message || "Gemini gagal membaca PDF.";
      return NextResponse.json({ error: detail }, { status: response.status });
    }

    const raw =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: GeminiPart) => part.text || "")
        .join("")
        .trim() || "";

    const parsed = extractJson(raw);

    return NextResponse.json({
      title: String(parsed.title || file.name.replace(/\.pdf$/i, "")),
      summary: String(parsed.summary || "Ringkasan belum tersedia."),
      content: String(parsed.content || parsed.summary || ""),
      suggestedQuestions: Array.isArray(parsed.suggestedQuestions)
        ? parsed.suggestedQuestions.slice(0, 6).map(String)
        : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan ketika membaca PDF.",
      },
      { status: 500 }
    );
  }
}
