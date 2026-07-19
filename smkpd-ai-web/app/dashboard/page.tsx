"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = "Admin" | "Guru" | "Taruna" | "Wali Taruna";
type Session = { role: Role; name: string; loginAt: string };
type ToolId = "modul" | "cp" | "atp" | "lkpd" | "soal" | "surat";

type GeneratorForm = {
  language: string;
  outputFormat: string;
  teacherName: string;
  schoolYear: string;
  mapel: string;
  program: string;
  kelasFase: string;
  semester: string;
  topic: string;
  allocation: string;
  learningModel: string;
  elements: string;
  activityType: string;
  toolsMaterials: string;
  safetyNotes: string;
  questionType: string;
  questionCount: string;
  difficulty: string;
  letterType: string;
  letterNumber: string;
  letterDate: string;
  attachment: string;
  subject: string;
  recipientName: string;
  recipientPosition: string;
  recipientInstitution: string;
  recipientAddress: string;
  eventDate: string;
  eventTime: string;
  eventPlace: string;
  signerName: string;
  signerTitle: string;
  detail: string;
};

type DocumentRecord = {
  id: string;
  tool: ToolId;
  toolTitle: string;
  title: string;
  mapel: string;
  kelas: string;
  semester: string;
  description?: string;
  formData?: GeneratorForm;
  language: string;
  outputFormat: string;
  content: string;
  createdAt: string;
};

const tools: Array<{
  id: ToolId;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
}> = [
  {
    id: "modul",
    icon: "📘",
    title: "Modul Ajar",
    subtitle: "Pembelajaran lengkap",
    description:
      "Identitas, tujuan, kegiatan, asesmen, diferensiasi, LKPD, dan rubrik.",
  },
  {
    id: "cp",
    icon: "🎯",
    title: "Capaian Pembelajaran",
    subtitle: "CP sesuai fase",
    description:
      "Rasional, karakteristik, elemen, kompetensi akhir fase, dan ruang lingkup.",
  },
  {
    id: "atp",
    icon: "🧭",
    title: "ATP",
    subtitle: "Alur satu semester/tahun",
    description:
      "Tujuan pembelajaran berurutan, materi, aktivitas, asesmen, dan alokasi JP.",
  },
  {
    id: "lkpd",
    icon: "📋",
    title: "LKPD",
    subtitle: "Lembar kerja taruna",
    description:
      "Petunjuk, keselamatan, langkah kerja, pengamatan, analisis, dan rubrik.",
  },
  {
    id: "soal",
    icon: "📝",
    title: "Generator Soal",
    subtitle: "Asesmen terarah",
    description:
      "Kisi-kisi, pilihan ganda/uraian, HOTS, kunci, pembahasan, dan rubrik.",
  },
  {
    id: "surat",
    icon: "📄",
    title: "Generator Surat",
    subtitle: "Surat dinas resmi",
    description:
      "Jenis surat, nomor, penerima, acara, isi, serta penandatangan resmi.",
  },
];

const initialForm: GeneratorForm = {
  language: "id",
  outputFormat: "automatic",
  teacherName: "",
  schoolYear: "2026/2027",
  mapel: "Dasar-Dasar Nautika Kapal Niaga",
  program: "Nautika Kapal Niaga",
  kelasFase: "Kelas X / Fase E",
  semester: "Ganjil",
  topic: "Keselamatan kerja di atas kapal",
  allocation: "4 JP",
  learningModel: "Pembelajaran Mendalam / Problem Based Learning",
  elements: "",
  activityType: "Praktik dan diskusi kelompok",
  toolsMaterials: "",
  safetyNotes: "Gunakan APD dan ikuti prosedur keselamatan kerja.",
  questionType: "Pilihan Ganda A–E",
  questionCount: "10",
  difficulty: "Campuran LOTS, MOTS, dan HOTS",
  letterType: "Surat Undangan",
  letterNumber: "001/SMK-PD/VII/2026",
  letterDate: "",
  attachment: "-",
  subject: "Undangan Rapat",
  recipientName: "Bapak/Ibu Wali Taruna",
  recipientPosition: "",
  recipientInstitution: "",
  recipientAddress: "di Tempat",
  eventDate: "",
  eventTime: "",
  eventPlace: "SMK Pelayaran Demak Boarding School",
  signerName: "Aisyatus Sa'adah, M.H.",
  signerTitle: "Kepala SMK Pelayaran Demak Boarding School",
  detail: "",
};

const toolDefaults: Record<ToolId, Partial<GeneratorForm>> = {
  modul: {
    mapel: "Dasar-Dasar Nautika Kapal Niaga",
    kelasFase: "Kelas X / Fase E",
    topic: "Keselamatan kerja di atas kapal",
    allocation: "4 JP",
    learningModel: "Pembelajaran Mendalam / Problem Based Learning",
    detail:
      "Sertakan asesmen diagnostik, formatif, sumatif, remedial, pengayaan, refleksi, dan rubrik.",
  },
  cp: {
    mapel: "Dasar-Dasar Nautika Kapal Niaga",
    kelasFase: "Fase E",
    program: "Nautika Kapal Niaga",
    topic: "Seluruh ruang lingkup pembelajaran fase",
    elements: "Tuliskan elemen atau kompetensi utama yang diperlukan.",
    detail: "Gunakan bahasa kompetensi yang terukur dan mudah dipahami.",
  },
  atp: {
    mapel: "Dasar-Dasar Nautika Kapal Niaga",
    kelasFase: "Kelas X / Fase E",
    topic: "ATP satu semester",
    allocation: "72 JP per tahun",
    detail:
      "Susun berurutan dari fondasi menuju penerapan, lengkap dengan asesmen dan alokasi JP.",
  },
  lkpd: {
    mapel: "Dasar-Dasar Teknika Kapal Niaga",
    kelasFase: "Kelas X / Fase E",
    topic: "Pemeriksaan keselamatan sebelum bekerja",
    activityType: "Praktik dan observasi",
    allocation: "4 JP",
    toolsMaterials: "APD, lembar observasi, dan peralatan praktik sesuai topik.",
    safetyNotes: "Gunakan APD dan patuhi instruksi guru/instruktur.",
    detail: "Sertakan tabel pengamatan, pertanyaan analisis, refleksi, dan rubrik.",
  },
  soal: {
    mapel: "Pendidikan Agama Islam dan Budi Pekerti",
    kelasFase: "Kelas X / Fase E",
    topic: "Al-Kulliyat Al-Khamsah",
    questionType: "Pilihan Ganda A–E",
    questionCount: "10",
    difficulty: "Campuran LOTS, MOTS, dan HOTS",
    detail: "Sertakan kisi-kisi, kunci jawaban, dan pembahasan singkat.",
  },
  surat: {
    letterType: "Surat Undangan",
    letterNumber: "001/SMK-PD/VII/2026",
    subject: "Undangan Rapat Wali Taruna",
    recipientName: "Bapak/Ibu Wali Taruna",
    recipientAddress: "di Tempat",
    eventPlace: "SMK Pelayaran Demak Boarding School",
    signerName: "Aisyatus Sa'adah, M.H.",
    signerTitle: "Kepala SMK Pelayaran Demak Boarding School",
    detail:
      "Sampaikan tujuan kegiatan dengan sopan, jelas, singkat, dan gunakan tata naskah surat resmi.",
    outputFormat: "narrative",
  },
};

const roleMenus: Record<
  Role,
  Array<{ label: string; href: string; icon: string }>
> = {
  Admin: [
    { label: "Dashboard", href: "/dashboard", icon: "▦" },
    { label: "AI Profesional", href: "/ai", icon: "✦" },
    { label: "Generator", href: "/dashboard#generator", icon: "📘" },
    { label: "PDF & Knowledge", href: "/knowledge", icon: "📂" },
    { label: "Dashboard Kepala", href: "/kepala-sekolah", icon: "📊" },
    { label: "Mode Presentasi", href: "/presentasi", icon: "▶" },
  ],
  Guru: [
    { label: "Dashboard", href: "/dashboard", icon: "▦" },
    { label: "AI Profesional", href: "/ai", icon: "✦" },
    { label: "Generator", href: "/dashboard#generator", icon: "📘" },
    { label: "PDF & Knowledge", href: "/knowledge", icon: "📂" },
    { label: "AI Nautika", href: "/ai?mode=nautika", icon: "⚓" },
    { label: "Maritime English", href: "/ai?mode=english", icon: "📚" },
  ],
  Taruna: [
    { label: "Dashboard", href: "/dashboard", icon: "▦" },
    { label: "AI Assistant", href: "/ai", icon: "✦" },
    { label: "Maritime English", href: "/ai?mode=english", icon: "📚" },
    { label: "AI Nautika", href: "/ai?mode=nautika", icon: "⚓" },
    { label: "AI Teknika", href: "/ai?mode=teknika", icon: "⚙️" },
    { label: "Knowledge Base", href: "/knowledge", icon: "📂" },
  ],
  "Wali Taruna": [
    { label: "Dashboard", href: "/dashboard", icon: "▦" },
    { label: "AI Assistant", href: "/ai", icon: "✦" },
    { label: "Informasi Dokumen", href: "/knowledge", icon: "📂" },
    { label: "Mode Presentasi", href: "/presentasi", icon: "▶" },
  ],
};

function safeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "dokumen-smkpd"
  );
}

function normalizeAiOutput(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => !/^\s*```(?:markdown|md|text)?\s*$/i.test(line))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatInline(value: string) {
  return escapeHtml(value.trim())
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "<em>$1</em>")
    .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "<em>$1</em>");
}

function splitTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isTableDivider(line: string) {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function documentToHtml(value: string) {
  const lines = normalizeAiOutput(value).split("\n");
  const html: string[] = [];
  let index = 0;
  let listType: "ul" | "ol" | null = null;

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  while (index < lines.length) {
    const line = lines[index].trim();

    if (!line) {
      closeList();
      index += 1;
      continue;
    }

    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) {
      closeList();
      html.push("<hr>");
      index += 1;
      continue;
    }

    const nextLine = lines[index + 1] || "";
    if (line.includes("|") && isTableDivider(nextLine)) {
      closeList();
      const headers = splitTableRow(line);
      const rows: string[][] = [];
      index += 2;

      while (index < lines.length) {
        const candidate = lines[index].trim();
        if (!candidate || !candidate.includes("|") || isTableDivider(candidate)) break;
        rows.push(splitTableRow(candidate));
        index += 1;
      }

      html.push('<div class="ai-table-wrap"><table class="ai-table"><thead><tr>');
      headers.forEach((header) => html.push(`<th>${formatInline(header)}</th>`));
      html.push("</tr></thead><tbody>");
      rows.forEach((row) => {
        html.push("<tr>");
        headers.forEach((_, cellIndex) =>
          html.push(`<td>${formatInline(row[cellIndex] || "")}</td>`)
        );
        html.push("</tr>");
      });
      html.push("</tbody></table></div>");
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      const level = Math.min(heading[1].length + 1, 4);
      html.push(`<h${level}>${formatInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    if (ordered) {
      if (listType !== "ol") {
        closeList();
        html.push("<ol>");
        listType = "ol";
      }
      html.push(`<li>${formatInline(ordered[1])}</li>`);
      index += 1;
      continue;
    }

    const unordered = line.match(/^[-*+•]\s+(.+)$/);
    if (unordered) {
      if (listType !== "ul") {
        closeList();
        html.push("<ul>");
        listType = "ul";
      }
      html.push(`<li>${formatInline(unordered[1])}</li>`);
      index += 1;
      continue;
    }

    closeList();
    html.push(`<p>${formatInline(line)}</p>`);
    index += 1;
  }

  closeList();
  return html.join("");
}

function documentToPlainText(value: string) {
  const lines = normalizeAiOutput(value).split("\n");
  const output: string[] = [];

  for (const rawLine of lines) {
    let line = rawLine.trimEnd();
    if (isTableDivider(line)) continue;

    if (line.includes("|")) {
      const cells = splitTableRow(line);
      if (cells.length > 1) {
        output.push(cells.join("\t"));
        continue;
      }
    }

    line = line
      .replace(/^\s{0,3}#{1,6}\s*/g, "")
      .replace(/^\s*>\s?/g, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1")
      .replace(/(?<!_)_([^_\n]+)_(?!_)/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/^\s*[-*+]\s+/g, "• ");

    output.push(line);
  }

  return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function loadDocuments(): DocumentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem("smkpd_documents") || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveDocuments(documents: DocumentRecord[]) {
  localStorage.setItem(
    "smkpd_documents",
    JSON.stringify(documents.slice(0, 100))
  );
}

function formatDocumentDate(value: string) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildPrompt(tool: ToolId, data: GeneratorForm) {
  const languageText =
    data.language === "en" ? "English" : "Bahasa Indonesia";

  const structuredFormat =
    data.outputFormat === "table"
      ? "Gunakan tabel Markdown yang valid untuk data terstruktur, sedangkan penjelasan menggunakan narasi singkat."
      : data.outputFormat === "narrative"
        ? "Gunakan narasi, judul, dan daftar yang rapi tanpa tabel."
        : "Gunakan kombinasi narasi dan tabel hanya pada bagian yang memang lebih jelas dalam bentuk tabel.";

  switch (tool) {
    case "modul":
      return `
Buat MODUL AJAR Kurikulum Merdeka yang lengkap dan siap diedit.
Satuan pendidikan: SMK Pelayaran Demak Boarding School
Nama guru: ${data.teacherName || "Belum diisi"}
Tahun ajaran: ${data.schoolYear}
Mata pelajaran: ${data.mapel}
Program keahlian: ${data.program}
Kelas/Fase: ${data.kelasFase}
Semester: ${data.semester}
Topik: ${data.topic}
Alokasi waktu: ${data.allocation}
Model/pendekatan: ${data.learningModel}
Bahasa: ${languageText}

Wajib memuat: identitas, kompetensi awal, profil/karakter, sarana, target peserta didik, tujuan pembelajaran, pemahaman bermakna, pertanyaan pemantik, persiapan, kegiatan pendahuluan-inti-penutup dengan pembagian waktu, asesmen diagnostik-formatif-sumatif, diferensiasi, remedial, pengayaan, refleksi guru dan taruna, LKPD ringkas, rubrik, glosarium, dan daftar pustaka.
Keterangan tambahan: ${data.detail || "-"}
${structuredFormat}
`;
    case "cp":
      return `
Susun CAPAIAN PEMBELAJARAN yang profesional untuk SMK Pelayaran Demak Boarding School.
Tahun ajaran: ${data.schoolYear}
Mata pelajaran: ${data.mapel}
Program keahlian: ${data.program}
Fase: ${data.kelasFase}
Ruang lingkup/topik: ${data.topic}
Elemen atau kompetensi yang diharapkan: ${data.elements || "Tentukan secara logis berdasarkan mata pelajaran."}
Bahasa: ${languageText}

Wajib memuat: rasional, tujuan mata pelajaran, karakteristik, elemen, deskripsi setiap elemen, kompetensi akhir fase, ruang lingkup materi, keterkaitan dengan karakter dan dunia kerja, serta catatan verifikasi tim kurikulum. Jangan membuat kegiatan pembelajaran harian seperti Modul Ajar.
Keterangan tambahan: ${data.detail || "-"}
${structuredFormat}
`;
    case "atp":
      return `
Susun ALUR TUJUAN PEMBELAJARAN (ATP) untuk SMK Pelayaran Demak Boarding School.
Tahun ajaran: ${data.schoolYear}
Mata pelajaran: ${data.mapel}
Program keahlian: ${data.program}
Kelas/Fase: ${data.kelasFase}
Periode: ${data.semester}
Cakupan: ${data.topic}
Total alokasi: ${data.allocation}
Bahasa: ${languageText}

Wajib memuat: rasional urutan, tujuan pembelajaran yang terukur, elemen/kompetensi, materi inti, aktivitas utama, asesmen, alokasi JP, dimensi karakter, dan keterkaitan dunia kerja. Susun urut dari kompetensi dasar menuju penerapan. Jangan membuat rincian kegiatan per pertemuan seperti Modul Ajar.
Keterangan tambahan: ${data.detail || "-"}
${structuredFormat}
`;
    case "lkpd":
      return `
Buat LKPD TARUNA yang operasional dan siap digunakan.
Satuan pendidikan: SMK Pelayaran Demak Boarding School
Mata pelajaran: ${data.mapel}
Program keahlian: ${data.program}
Kelas/Fase: ${data.kelasFase}
Topik/kegiatan: ${data.topic}
Bentuk kegiatan: ${data.activityType}
Alokasi waktu: ${data.allocation}
Alat dan bahan: ${data.toolsMaterials || "Sesuaikan dengan kegiatan."}
Catatan keselamatan: ${data.safetyNotes || "Patuhi prosedur keselamatan."}
Bahasa: ${languageText}

Wajib memuat: identitas, tujuan, petunjuk, alat/bahan, keselamatan kerja, langkah kegiatan, tabel/lembar pengamatan, pertanyaan analisis, kesimpulan, refleksi, dan rubrik penilaian. Gunakan instruksi langsung kepada taruna dan jangan membuat Modul Ajar lengkap.
Keterangan tambahan: ${data.detail || "-"}
${structuredFormat}
`;
    case "soal":
      return `
Buat DOKUMEN ASESMEN untuk SMK Pelayaran Demak Boarding School.
Mata pelajaran: ${data.mapel}
Kelas/Fase: ${data.kelasFase}
Semester: ${data.semester}
Materi/topik: ${data.topic}
Jenis soal: ${data.questionType}
Jumlah soal: ${data.questionCount}
Tingkat kesulitan: ${data.difficulty}
Bahasa: ${languageText}

Wajib memuat: identitas asesmen, kisi-kisi (indikator, materi, level kognitif, bentuk, nomor), soal sesuai jumlah dan jenis, kunci jawaban, pembahasan singkat, serta rubrik bila terdapat uraian/praktik. Pastikan pilihan ganda memiliki opsi A–E dan hanya satu jawaban terbaik. Jangan membuat Modul Ajar.
Keterangan tambahan: ${data.detail || "-"}
${structuredFormat}
`;
    case "surat":
      return `
Buat SURAT RESMI sekolah berdasarkan data berikut.
Nama sekolah: SMK Pelayaran Demak Boarding School
Jenis surat: ${data.letterType}
Nomor surat: ${data.letterNumber || "[Nomor surat]"}
Tanggal surat: ${data.letterDate || "[Tanggal surat]"}
Lampiran: ${data.attachment || "-"}
Perihal: ${data.subject}
Penerima: ${data.recipientName}
Jabatan penerima: ${data.recipientPosition || "-"}
Instansi penerima: ${data.recipientInstitution || "-"}
Alamat penerima: ${data.recipientAddress || "di Tempat"}
Tanggal kegiatan (jika relevan): ${data.eventDate || "-"}
Waktu kegiatan (jika relevan): ${data.eventTime || "-"}
Tempat kegiatan (jika relevan): ${data.eventPlace || "-"}
Penandatangan: ${data.signerName}
Jabatan penandatangan: ${data.signerTitle}
Pokok isi/keterangan: ${data.detail || "-"}

Gunakan ${languageText}. Buat tata letak surat dinas Indonesia: kop dalam bentuk teks, nomor/lampiran/perihal, alamat tujuan, salam pembuka, isi surat yang formal dan jelas, rincian kegiatan bila ada, penutup, serta blok tanda tangan. JANGAN memasukkan Mata Pelajaran, Kelas, Fase, Semester, tujuan pembelajaran, asesmen, LKPD, atau bagian Modul Ajar. Jangan jadikan seluruh surat sebagai tabel.
`;
  }
}

function getDocumentTitle(tool: ToolId, form: GeneratorForm) {
  if (tool === "surat") return `${form.letterType} — ${form.subject}`;
  return form.topic || tools.find((item) => item.id === tool)?.title || "Dokumen";
}

function getDocumentDescription(tool: ToolId, form: GeneratorForm) {
  if (tool === "surat") {
    return `${form.letterNumber || "Tanpa nomor"} • ${form.recipientName} • ${form.letterDate || "Tanggal belum diisi"}`;
  }
  if (tool === "soal") {
    return `${form.mapel} • ${form.kelasFase} • ${form.questionCount} soal`;
  }
  return `${form.mapel} • ${form.kelasFase} • ${form.semester}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [tool, setTool] = useState<ToolId>("modul");
  const [form, setForm] = useState<GeneratorForm>({
    ...initialForm,
    ...toolDefaults.modul,
  });
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentFilter, setDocumentFilter] = useState<"all" | ToolId>("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [notice, setNotice] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("smkpd_session");
    if (!raw) {
      router.replace("/login");
      return;
    }

    try {
      setSession(JSON.parse(raw));
      setDocuments(loadDocuments());
    } catch {
      localStorage.removeItem("smkpd_session");
      router.replace("/login");
    }
  }, [router]);

  const activeTool = useMemo(
    () => tools.find((item) => item.id === tool) || tools[0],
    [tool]
  );

  const canGenerate =
    session?.role === "Admin" || session?.role === "Guru";

  const filteredDocuments = useMemo(() => {
    const keyword = documentSearch.trim().toLowerCase();

    return documents.filter((record) => {
      const matchesFilter =
        documentFilter === "all" || record.tool === documentFilter;
      const haystack = [
        record.title,
        record.mapel,
        record.kelas,
        record.toolTitle,
        record.description || "",
      ]
        .join(" ")
        .toLowerCase();
      return matchesFilter && (!keyword || haystack.includes(keyword));
    });
  }, [documents, documentFilter, documentSearch]);

  function updateForm<K extends keyof GeneratorForm>(
    key: K,
    value: GeneratorForm[K]
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function selectTool(nextTool: ToolId) {
    setTool(nextTool);
    setForm((previous) => ({
      ...previous,
      ...toolDefaults[nextTool],
    }));
    setResult("");
    setSelectedDocumentId("");
    setNotice(`${tools.find((item) => item.id === nextTool)?.title} siap digunakan.`);
  }

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!session || loading || !canGenerate) return;

    setLoading(true);
    setNotice("");
    setResult("");

    const message = buildPrompt(tool, form);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: tool,
          role: session.role,
          language: form.language,
          message,
          history: [{ role: "user", text: message }],
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Dokumen belum berhasil dibuat.");
      }

      const output = normalizeAiOutput(String(data.text || ""));
      setResult(output);

      const now = new Date().toISOString();
      const documentId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      const documentRecord: DocumentRecord = {
        id: documentId,
        tool,
        toolTitle: activeTool.title,
        title: getDocumentTitle(tool, form),
        mapel: tool === "surat" ? form.letterType : form.mapel,
        kelas: tool === "surat" ? form.recipientName : form.kelasFase,
        semester: tool === "surat" ? form.letterDate : form.semester,
        description: getDocumentDescription(tool, form),
        formData: form,
        language: form.language,
        outputFormat: form.outputFormat,
        content: output,
        createdAt: now,
      };

      const nextDocuments = [
        documentRecord,
        ...loadDocuments(),
      ].slice(0, 100);
      saveDocuments(nextDocuments);
      setDocuments(nextDocuments);
      setSelectedDocumentId(documentId);

      const logs = JSON.parse(localStorage.getItem("smkpd_ai_logs") || "[]");
      const log = {
        id: documentId,
        type: "document",
        mode: tool,
        title: documentRecord.title,
        role: session.role,
        createdAt: now,
        inputChars: message.length,
        outputChars: output.length,
      };
      localStorage.setItem(
        "smkpd_ai_logs",
        JSON.stringify([log, ...(Array.isArray(logs) ? logs : [])].slice(0, 200))
      );

      setNotice(
        `${activeTool.title} berhasil dibuat dan otomatis tersimpan di Arsip Dokumen.`
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Terjadi kendala.");
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    await navigator.clipboard.writeText(documentToPlainText(result));
    setNotice("Hasil berhasil disalin.");
  }

  function downloadWord() {
    if (!result) return;

    const renderedDocument = documentToHtml(result);
    const appHeading =
      tool === "surat"
        ? ""
        : `<h1>${activeTool.title.toUpperCase()}</h1>
           <p style="text-align:center"><b>SMK PELAYARAN DEMAK BOARDING SCHOOL</b></p>
           <hr>`;

    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;margin:2.5cm;color:#111}
            h1{text-align:center;font-size:16pt;margin:0 0 4px}
            h2{font-size:15pt;margin:18px 0 8px}
            h3{font-size:13pt;margin:15px 0 7px}
            h4{font-size:12pt;margin:12px 0 6px}
            p{margin:6px 0}
            ul,ol{margin:6px 0 10px 24px}
            table{width:100%;border-collapse:collapse;margin:12px 0 18px}
            th,td{border:1px solid #222;padding:7px 8px;vertical-align:top}
            th{font-weight:bold;text-align:center;background:#eaf0f6}
          </style>
        </head>
        <body>
          ${appHeading}
          ${renderedDocument}
        </body>
      </html>`;

    const blob = new Blob(["\ufeff", html], {
      type: "application/msword",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(getDocumentTitle(tool, form))}.doc`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    if (!result) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      setNotice("Izinkan pop-up browser agar ekspor PDF dapat dibuka.");
      return;
    }

    const renderedDocument = documentToHtml(result);
    const appHeading =
      tool === "surat"
        ? ""
        : `<h1>${activeTool.title.toUpperCase()}</h1>
           <div class="school-name">SMK PELAYARAN DEMAK BOARDING SCHOOL</div>
           <hr>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${activeTool.title}</title>
          <style>
            @page{size:A4;margin:2cm}
            body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#111}
            h1{text-align:center;font-size:16pt;margin:0}
            .school-name{text-align:center;font-size:14pt;font-weight:bold;margin:5px 0 12px}
            table{width:100%;border-collapse:collapse;margin:12px 0 18px}
            th,td{border:1px solid #222;padding:7px 8px;vertical-align:top}
            th{font-weight:bold;text-align:center;background:#eaf0f6}
          </style>
        </head>
        <body>
          ${appHeading}
          ${renderedDocument}
          <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function openDocument(record: DocumentRecord) {
    setTool(record.tool);
    setForm(
      record.formData
        ? record.formData
        : {
            ...initialForm,
            ...toolDefaults[record.tool],
            mapel: record.mapel || initialForm.mapel,
            kelasFase: record.kelas || initialForm.kelasFase,
            semester: record.semester || initialForm.semester,
            topic: record.title || initialForm.topic,
            language: record.language || "id",
            outputFormat: record.outputFormat || "automatic",
          }
    );
    setResult(record.content);
    setSelectedDocumentId(record.id);
    setNotice(`Dokumen "${record.title}" berhasil dibuka kembali.`);
    window.requestAnimationFrame(() => {
      window.document
        .getElementById("generator-workspace")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function deleteDocument(documentId: string) {
    const record = documents.find((item) => item.id === documentId);
    if (!record) return;
    if (!window.confirm(`Hapus dokumen "${record.title}" dari arsip?`)) return;

    const nextDocuments = documents.filter((item) => item.id !== documentId);
    saveDocuments(nextDocuments);
    setDocuments(nextDocuments);
    if (selectedDocumentId === documentId) setSelectedDocumentId("");
    setNotice("Dokumen berhasil dihapus dari arsip.");
  }

  function clearArchive() {
    if (documents.length === 0) return;
    if (!window.confirm("Hapus seluruh arsip dokumen pada browser ini?")) return;
    saveDocuments([]);
    setDocuments([]);
    setSelectedDocumentId("");
    setNotice("Seluruh arsip dokumen berhasil dikosongkan.");
  }

  function startNewDocument() {
    setResult("");
    setSelectedDocumentId("");
    setNotice("Formulir baru siap digunakan.");
  }

  function logout() {
    localStorage.removeItem("smkpd_session");
    router.push("/login");
  }

  if (!session) {
    return (
      <main className="dashboard-loading">
        <img src="/logo-smkpd.png" alt="" />
        <p>Menyiapkan dashboard...</p>
      </main>
    );
  }

  const roleTitle =
    session.role === "Taruna"
      ? "Pusat Belajar Taruna"
      : session.role === "Wali Taruna"
        ? "Portal Informasi Wali Taruna"
        : "Administrasi dan pembelajaran selesai lebih cepat.";

  const roleDescription =
    session.role === "Taruna"
      ? "Gunakan AI Nautika, AI Teknika, Maritime English, dan Knowledge Base untuk mendukung pembelajaran."
      : session.role === "Wali Taruna"
        ? "Akses AI Assistant dan dokumen informasi sekolah yang tersedia pada perangkat ini."
        : "Buat perangkat ajar, asesmen, LKPD, dan surat resmi dengan formulir yang sesuai.";

  return (
    <main className="dashboard-page">
      <button
        className={`dashboard-overlay ${menuOpen ? "show" : ""}`}
        aria-label="Tutup menu"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`dashboard-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="dashboard-sidebar-mobile-head">
          <span>Menu Dashboard</span>
          <button onClick={() => setMenuOpen(false)}>×</button>
        </div>

        <Link href="/" className="dash-brand">
          <img src="/logo-smkpd.png" alt="Logo SMKPD" />
          <div>
            <strong>SMKPD AI</strong>
            <small>Mobile Edition v3.1</small>
          </div>
        </Link>

        <div className="dash-user">
          <span>
            {session.role === "Guru"
              ? "👨‍🏫"
              : session.role === "Taruna"
                ? "👨‍🎓"
                : session.role === "Admin"
                  ? "👨‍💼"
                  : "👨‍👩‍👦"}
          </span>
          <div>
            <strong>{session.name}</strong>
            <small>{session.role}</small>
          </div>
        </div>

        <nav className="dash-menu">
          {roleMenus[session.role].map((item, index) => {
            const isQueryLink = item.href.includes("?");
            return isQueryLink ? (
              <a
                className={index === 0 ? "active" : ""}
                key={`${item.label}-${item.href}`}
                href={item.href}
              >
                <span>{item.icon}</span>
                {item.label}
              </a>
            ) : (
              <Link
                className={index === 0 ? "active" : ""}
                key={`${item.label}-${item.href}`}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button className="logout-button" onClick={logout}>
          Keluar dari Akun
        </button>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <button
            className="dashboard-menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Buka menu"
          >
            ☰
          </button>
          <div className="dashboard-title">
            <p>SELAMAT DATANG, {session.role.toUpperCase()}</p>
            <h1>Dashboard SMKPD AI</h1>
          </div>
          <div className="topbar-actions">
            <Link href="/ai" className="outline-action">
              AI Profesional
            </Link>
          </div>
        </header>

        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">SMART MARITIME WORKSPACE</p>
            <h2>{roleTitle}</h2>
            <p>{roleDescription}</p>
          </div>
          <img src="/logo-smkpd.png" alt="" />
        </section>

        <section className="dashboard-stats">
          <article>
            <span>🗂️</span>
            <div>
              <strong>{documents.length}</strong>
              <small>Dokumen Tersimpan</small>
            </div>
          </article>
          <article>
            <span>✦</span>
            <div>
              <strong>{canGenerate ? "6" : "4"}</strong>
              <small>{canGenerate ? "Generator Aktif" : "Layanan Belajar"}</small>
            </div>
          </article>
          <article>
            <span>👤</span>
            <div>
              <strong>{session.role}</strong>
              <small>Hak Akses</small>
            </div>
          </article>
          <article>
            <span>●</span>
            <div>
              <strong>Online</strong>
              <small>Status Gemini AI</small>
            </div>
          </article>
        </section>

        {!canGenerate && (
          <section className="role-quick-access">
            <div className="dashboard-section-title">
              <div>
                <p>AKSES CEPAT</p>
                <h2>Layanan sesuai peran Anda</h2>
              </div>
            </div>
            <div className="role-access-grid">
              <a href="/ai?mode=english">
                <span>📚</span>
                <strong>Maritime English</strong>
                <small>Conversation, SMCP, grammar, dan pronunciation.</small>
              </a>
              <a href="/ai?mode=nautika">
                <span>⚓</span>
                <strong>AI Nautika</strong>
                <small>Navigasi, COLREG, deck, dan dinas jaga.</small>
              </a>
              <a href="/ai?mode=teknika">
                <span>⚙️</span>
                <strong>AI Teknika</strong>
                <small>Mesin, sistem kapal, dan troubleshooting.</small>
              </a>
              <Link href="/knowledge">
                <span>📂</span>
                <strong>Knowledge Base</strong>
                <small>Baca dan tanyakan dokumen sekolah.</small>
              </Link>
            </div>
          </section>
        )}

        {canGenerate && (
          <>
            <section className="dashboard-tools" id="generator">
              <div className="dashboard-section-title">
                <div>
                  <p>GENERATOR PROFESIONAL</p>
                  <h2>Pilih dokumen yang akan dibuat</h2>
                </div>
                <span>Setiap menu memiliki formulir yang berbeda</span>
              </div>

              <div className="dashboard-tool-grid">
                {tools.map((item) => (
                  <button
                    key={item.id}
                    className={tool === item.id ? "selected" : ""}
                    onClick={() => selectTool(item.id)}
                  >
                    <span>{item.icon}</span>
                    <strong>{item.title}</strong>
                    <small>{item.subtitle}</small>
                  </button>
                ))}
              </div>
            </section>

            <section
              className="generator-workspace"
              id="generator-workspace"
            >
              <form className="generator-form" onSubmit={generate}>
                <div className="generator-heading">
                  <span>{activeTool.icon}</span>
                  <div>
                    <p>GENERATOR AKTIF</p>
                    <h2>{activeTool.title}</h2>
                    <small>{activeTool.description}</small>
                  </div>
                </div>

                <div className="form-grid">
                  {tool !== "surat" && (
                    <>
                      <label>
                        Mata Pelajaran
                        <input
                          value={form.mapel}
                          onChange={(event) =>
                            updateForm("mapel", event.target.value)
                          }
                          required
                        />
                      </label>

                      <label>
                        Program Keahlian
                        <input
                          value={form.program}
                          onChange={(event) =>
                            updateForm("program", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Kelas / Fase
                        <input
                          value={form.kelasFase}
                          onChange={(event) =>
                            updateForm("kelasFase", event.target.value)
                          }
                          required
                        />
                      </label>
                    </>
                  )}

                  {(tool === "modul" || tool === "atp" || tool === "soal") && (
                    <label>
                      Semester / Periode
                      <select
                        value={form.semester}
                        onChange={(event) =>
                          updateForm("semester", event.target.value)
                        }
                      >
                        <option>Ganjil</option>
                        <option>Genap</option>
                        <option>1 Tahun</option>
                      </select>
                    </label>
                  )}

                  {(tool === "modul" || tool === "cp" || tool === "atp") && (
                    <label>
                      Tahun Ajaran
                      <input
                        value={form.schoolYear}
                        onChange={(event) =>
                          updateForm("schoolYear", event.target.value)
                        }
                      />
                    </label>
                  )}

                  {tool === "modul" && (
                    <>
                      <label>
                        Nama Guru
                        <input
                          value={form.teacherName}
                          onChange={(event) =>
                            updateForm("teacherName", event.target.value)
                          }
                          placeholder="Nama lengkap dan gelar"
                        />
                      </label>
                      <label>
                        Alokasi Waktu
                        <input
                          value={form.allocation}
                          onChange={(event) =>
                            updateForm("allocation", event.target.value)
                          }
                        />
                      </label>
                      <label className="form-wide">
                        Model / Pendekatan Pembelajaran
                        <input
                          value={form.learningModel}
                          onChange={(event) =>
                            updateForm("learningModel", event.target.value)
                          }
                        />
                      </label>
                    </>
                  )}

                  {tool === "cp" && (
                    <label className="form-wide">
                      Elemen / Kompetensi Utama
                      <textarea
                        rows={3}
                        value={form.elements}
                        onChange={(event) =>
                          updateForm("elements", event.target.value)
                        }
                        placeholder="Contoh: proses bisnis, perkembangan teknologi, keselamatan, orientasi teknis..."
                      />
                    </label>
                  )}

                  {tool === "atp" && (
                    <label>
                      Total Alokasi
                      <input
                        value={form.allocation}
                        onChange={(event) =>
                          updateForm("allocation", event.target.value)
                        }
                        placeholder="Contoh: 72 JP per tahun"
                      />
                    </label>
                  )}

                  {tool === "lkpd" && (
                    <>
                      <label>
                        Bentuk Kegiatan
                        <select
                          value={form.activityType}
                          onChange={(event) =>
                            updateForm("activityType", event.target.value)
                          }
                        >
                          <option>Praktik dan observasi</option>
                          <option>Diskusi kelompok</option>
                          <option>Proyek</option>
                          <option>Studi kasus</option>
                          <option>Simulasi</option>
                        </select>
                      </label>
                      <label>
                        Alokasi Waktu
                        <input
                          value={form.allocation}
                          onChange={(event) =>
                            updateForm("allocation", event.target.value)
                          }
                        />
                      </label>
                      <label className="form-wide">
                        Alat dan Bahan
                        <textarea
                          rows={2}
                          value={form.toolsMaterials}
                          onChange={(event) =>
                            updateForm("toolsMaterials", event.target.value)
                          }
                        />
                      </label>
                      <label className="form-wide">
                        Catatan Keselamatan
                        <textarea
                          rows={2}
                          value={form.safetyNotes}
                          onChange={(event) =>
                            updateForm("safetyNotes", event.target.value)
                          }
                        />
                      </label>
                    </>
                  )}

                  {tool === "soal" && (
                    <>
                      <label>
                        Jenis Soal
                        <select
                          value={form.questionType}
                          onChange={(event) =>
                            updateForm("questionType", event.target.value)
                          }
                        >
                          <option>Pilihan Ganda A–E</option>
                          <option>Uraian</option>
                          <option>Campuran Pilihan Ganda dan Uraian</option>
                          <option>Isian Singkat</option>
                          <option>Studi Kasus / HOTS</option>
                        </select>
                      </label>
                      <label>
                        Jumlah Soal
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={form.questionCount}
                          onChange={(event) =>
                            updateForm("questionCount", event.target.value)
                          }
                        />
                      </label>
                      <label className="form-wide">
                        Tingkat Kesulitan
                        <select
                          value={form.difficulty}
                          onChange={(event) =>
                            updateForm("difficulty", event.target.value)
                          }
                        >
                          <option>Campuran LOTS, MOTS, dan HOTS</option>
                          <option>Dasar / LOTS</option>
                          <option>Menengah / MOTS</option>
                          <option>Dominan HOTS</option>
                        </select>
                      </label>
                    </>
                  )}

                  {tool !== "surat" && (
                    <label className="form-wide">
                      {tool === "soal"
                        ? "Materi / Topik Soal"
                        : tool === "cp"
                          ? "Ruang Lingkup"
                          : tool === "atp"
                            ? "Cakupan ATP"
                            : tool === "lkpd"
                              ? "Topik / Kegiatan"
                              : "Topik Pembelajaran"}
                      <input
                        value={form.topic}
                        onChange={(event) =>
                          updateForm("topic", event.target.value)
                        }
                        required
                      />
                    </label>
                  )}

                  {tool === "surat" && (
                    <>
                      <label>
                        Jenis Surat
                        <select
                          value={form.letterType}
                          onChange={(event) =>
                            updateForm("letterType", event.target.value)
                          }
                        >
                          <option>Surat Undangan</option>
                          <option>Surat Pemberitahuan</option>
                          <option>Surat Tugas</option>
                          <option>Surat Keterangan</option>
                          <option>Surat Permohonan</option>
                          <option>Surat Edaran</option>
                          <option>Surat Rekomendasi</option>
                        </select>
                      </label>

                      <label>
                        Nomor Surat
                        <input
                          value={form.letterNumber}
                          onChange={(event) =>
                            updateForm("letterNumber", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Tanggal Surat
                        <input
                          type="date"
                          value={form.letterDate}
                          onChange={(event) =>
                            updateForm("letterDate", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Lampiran
                        <input
                          value={form.attachment}
                          onChange={(event) =>
                            updateForm("attachment", event.target.value)
                          }
                        />
                      </label>

                      <label className="form-wide">
                        Perihal
                        <input
                          value={form.subject}
                          onChange={(event) =>
                            updateForm("subject", event.target.value)
                          }
                          required
                        />
                      </label>

                      <label>
                        Nama / Sebutan Penerima
                        <input
                          value={form.recipientName}
                          onChange={(event) =>
                            updateForm("recipientName", event.target.value)
                          }
                          required
                        />
                      </label>

                      <label>
                        Jabatan Penerima
                        <input
                          value={form.recipientPosition}
                          onChange={(event) =>
                            updateForm("recipientPosition", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Instansi Penerima
                        <input
                          value={form.recipientInstitution}
                          onChange={(event) =>
                            updateForm("recipientInstitution", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Alamat Penerima
                        <input
                          value={form.recipientAddress}
                          onChange={(event) =>
                            updateForm("recipientAddress", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Tanggal Kegiatan
                        <input
                          type="date"
                          value={form.eventDate}
                          onChange={(event) =>
                            updateForm("eventDate", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Waktu Kegiatan
                        <input
                          value={form.eventTime}
                          onChange={(event) =>
                            updateForm("eventTime", event.target.value)
                          }
                          placeholder="Contoh: 09.00 WIB"
                        />
                      </label>

                      <label className="form-wide">
                        Tempat Kegiatan
                        <input
                          value={form.eventPlace}
                          onChange={(event) =>
                            updateForm("eventPlace", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Nama Penandatangan
                        <input
                          value={form.signerName}
                          onChange={(event) =>
                            updateForm("signerName", event.target.value)
                          }
                        />
                      </label>

                      <label>
                        Jabatan Penandatangan
                        <input
                          value={form.signerTitle}
                          onChange={(event) =>
                            updateForm("signerTitle", event.target.value)
                          }
                        />
                      </label>
                    </>
                  )}

                  <label>
                    Bahasa
                    <select
                      value={form.language}
                      onChange={(event) =>
                        updateForm("language", event.target.value)
                      }
                    >
                      <option value="id">Bahasa Indonesia</option>
                      <option value="en">English</option>
                    </select>
                  </label>

                  {tool !== "surat" && (
                    <label>
                      Format Hasil
                      <select
                        value={form.outputFormat}
                        onChange={(event) =>
                          updateForm("outputFormat", event.target.value)
                        }
                      >
                        <option value="automatic">
                          Otomatis: Narasi + Tabel
                        </option>
                        <option value="table">Prioritaskan Tabel</option>
                        <option value="narrative">Narasi Tanpa Tabel</option>
                      </select>
                    </label>
                  )}

                  <label className="form-wide">
                    {tool === "surat"
                      ? "Pokok Isi / Keterangan Surat"
                      : "Keterangan Tambahan"}
                    <textarea
                      rows={5}
                      value={form.detail}
                      onChange={(event) =>
                        updateForm("detail", event.target.value)
                      }
                      placeholder={
                        tool === "surat"
                          ? "Tuliskan tujuan, pesan utama, ketentuan, atau informasi yang harus dimuat dalam surat."
                          : "Tuliskan kebutuhan khusus yang belum tercakup pada kolom lain."
                      }
                    />
                  </label>
                </div>

                <button className="generate-button" disabled={loading}>
                  {loading
                    ? "AI sedang menyusun dokumen..."
                    : `✨ Buat ${activeTool.title}`}
                </button>
                {notice && <p className="generator-notice">{notice}</p>}
              </form>

              <div className="generator-result">
                <div className="result-toolbar">
                  <div>
                    <p>HASIL DOKUMEN</p>
                    <h2>{result ? activeTool.title : "Belum ada hasil"}</h2>
                  </div>
                  <div>
                    <button onClick={startNewDocument}>
                      Dokumen Baru
                    </button>
                    <button onClick={copyResult} disabled={!result}>
                      Salin
                    </button>
                    <button onClick={downloadWord} disabled={!result}>
                      Word
                    </button>
                    <button onClick={printPdf} disabled={!result}>
                      PDF
                    </button>
                  </div>
                </div>

                <div
                  className={`result-document ${!result ? "empty" : ""}`}
                >
                  {result ? (
                    <div
                      className="ai-document-html"
                      dangerouslySetInnerHTML={{
                        __html: documentToHtml(result),
                      }}
                    />
                  ) : (
                    <div>
                      <img
                        className="result-empty-logo"
                        src="/logo-smkpd-192.png"
                        alt="Logo SMK Pelayaran Demak"
                      />
                      <h3>Dokumen akan tampil di sini</h3>
                      <p>
                        Formulir telah disesuaikan dengan jenis dokumen yang
                        dipilih.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="document-archive">
              <div className="archive-header">
                <div>
                  <p>ARSIP LOKAL</p>
                  <h2>Dokumen Tersimpan</h2>
                  <span>
                    Maksimal 100 dokumen pada browser dan perangkat ini.
                  </span>
                </div>
                <button
                  onClick={clearArchive}
                  disabled={documents.length === 0}
                >
                  Kosongkan Arsip
                </button>
              </div>

              <div className="archive-controls">
                <label>
                  Cari Dokumen
                  <input
                    value={documentSearch}
                    onChange={(event) =>
                      setDocumentSearch(event.target.value)
                    }
                    placeholder="Cari judul, mapel, penerima, atau jenis..."
                  />
                </label>
                <label>
                  Jenis Dokumen
                  <select
                    value={documentFilter}
                    onChange={(event) =>
                      setDocumentFilter(
                        event.target.value as "all" | ToolId
                      )
                    }
                  >
                    <option value="all">Semua Jenis</option>
                    {tools.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filteredDocuments.length > 0 ? (
                <div className="archive-list">
                  {filteredDocuments.map((record) => (
                    <article
                      key={record.id}
                      className={
                        selectedDocumentId === record.id ? "selected" : ""
                      }
                    >
                      <div className="archive-icon">
                        {tools.find((item) => item.id === record.tool)
                          ?.icon || "📄"}
                      </div>
                      <div className="archive-info">
                        <div className="archive-meta">
                          <span>{record.toolTitle}</span>
                          <time>
                            {formatDocumentDate(record.createdAt)}
                          </time>
                        </div>
                        <h3>{record.title}</h3>
                        <p>
                          {record.description ||
                            `${record.mapel} • ${record.kelas} • ${record.semester}`}
                        </p>
                      </div>
                      <div className="archive-actions">
                        <button onClick={() => openDocument(record)}>
                          Buka
                        </button>
                        <button
                          className="danger"
                          onClick={() => deleteDocument(record.id)}
                        >
                          Hapus
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="archive-empty">
                  <img
                    className="archive-empty-logo"
                    src="/logo-smkpd-192.png"
                    alt="Logo SMK Pelayaran Demak"
                  />
                  <h3>Belum ada dokumen pada arsip ini</h3>
                  <p>Buat dokumen baru atau ubah pencarian dan filter.</p>
                </div>
              )}
            </section>
          </>
        )}

        <footer className="dashboard-footer">
          <span>SMKPD AI Mobile & Functional Edition v3.1</span>
          <span>SMK Pelayaran Demak Boarding School • 2026</span>
        </footer>
      </section>
    </main>
  );
}
