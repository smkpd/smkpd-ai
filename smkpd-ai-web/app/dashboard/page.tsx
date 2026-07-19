"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = "Admin" | "Guru" | "Taruna" | "Wali Taruna";
type Session = { role: Role; name: string; loginAt: string };
type ToolId = "modul" | "cp" | "atp" | "lkpd" | "soal" | "surat";

type DocumentRecord = {
  id: string;
  tool: ToolId;
  toolTitle: string;
  title: string;
  mapel: string;
  kelas: string;
  semester: string;
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
}> = [
  { id: "modul", icon: "📘", title: "Modul Ajar", subtitle: "Modul lengkap siap diedit" },
  { id: "cp", icon: "🎯", title: "Capaian Pembelajaran", subtitle: "Susun CP sesuai fase" },
  { id: "atp", icon: "🧭", title: "ATP", subtitle: "Alur tujuan pembelajaran" },
  { id: "lkpd", icon: "📋", title: "LKPD", subtitle: "Lembar kerja taruna" },
  { id: "soal", icon: "📝", title: "Generator Soal", subtitle: "Soal, kisi-kisi, dan kunci" },
  { id: "surat", icon: "📄", title: "Generator Surat", subtitle: "Surat resmi sekolah" },
];

const roleMenus: Record<Role, string[]> = {
  Admin: ["Dashboard", "AI Assistant", "Perangkat Ajar", "Soal & Asesmen", "Surat Digital", "Pengguna"],
  Guru: ["Dashboard", "AI Assistant", "Perangkat Ajar", "Soal & Asesmen", "Surat Digital"],
  Taruna: ["Dashboard", "AI Assistant", "Maritime English", "Nautika", "Teknika"],
  "Wali Taruna": ["Dashboard", "Pengumuman", "Informasi Akademik", "AI Assistant"],
};

function safeFileName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "dokumen-smkpd";
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
    const rawLine = lines[index];
    const line = rawLine.trim();

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
      headers.forEach((header) => {
        html.push(`<th>${formatInline(header)}</th>`);
      });
      html.push("</tr></thead><tbody>");

      rows.forEach((row) => {
        html.push("<tr>");
        headers.forEach((_, cellIndex) => {
          html.push(`<td>${formatInline(row[cellIndex] || "")}</td>`);
        });
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

    const quote = line.match(/^>\s*(.+)$/);
    if (quote) {
      closeList();
      html.push(`<blockquote>${formatInline(quote[1])}</blockquote>`);
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
  localStorage.setItem("smkpd_documents", JSON.stringify(documents.slice(0, 100)));
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

function buildPrompt(
  tool: ToolId,
  data: {
    language: string;
    mapel: string;
    kelas: string;
    semester: string;
    topik: string;
    jumlah: string;
    detail: string;
    outputFormat: string;
  }
) {
  const languageText = data.language === "en" ? "English" : "Bahasa Indonesia";
  const identity =
    `Sekolah: SMK Pelayaran Demak Boarding School. ` +
    `Gunakan ${languageText}. Mapel/bidang: ${data.mapel}. ` +
    `Kelas/Fase: ${data.kelas}. Semester: ${data.semester}. ` +
    `Topik/keperluan: ${data.topik}.`;

  const formatInstruction =
    data.outputFormat === "table"
      ? "Prioritaskan penyajian dalam tabel Markdown yang valid. Setiap tabel harus memiliki baris judul kolom dan baris pemisah, misalnya | No | Materi | Alokasi | lalu | --- | --- | --- |. Gunakan tabel untuk identitas, kegiatan, asesmen, kisi-kisi, rubrik, atau data terstruktur. Narasi tetap boleh digunakan untuk penjelasan."
      : data.outputFormat === "narrative"
        ? "Gunakan format narasi, judul, dan daftar. Jangan gunakan tabel."
        : "Gunakan tabel Markdown yang valid untuk bagian yang bersifat data terstruktur, seperti identitas, kegiatan, asesmen, kisi-kisi, rubrik, dan alokasi waktu. Gunakan narasi atau daftar untuk penjelasan.";

  const prompts: Record<ToolId, string> = {
    modul:
      `${identity} Buat MODUL AJAR Kurikulum Merdeka yang lengkap dan siap ditempel ke Word. ` +
      `Sertakan identitas, kompetensi awal, profil pelajar, sarana, target peserta didik, model pembelajaran, ` +
      `tujuan pembelajaran, pemahaman bermakna, pertanyaan pemantik, kegiatan pendahuluan-inti-penutup, ` +
      `asesmen diagnostik-formatif-sumatif, diferensiasi, remedial, pengayaan, refleksi, LKPD ringkas, rubrik, dan daftar pustaka. ` +
      `Keterangan tambahan: ${data.detail || "-"}`,
    cp:
      `${identity} Susun CAPAIAN PEMBELAJARAN yang profesional. Sertakan rasional, karakteristik mata pelajaran, ` +
      `elemen, kompetensi akhir fase, ruang lingkup, dan indikator ketercapaian. ` +
      `Keterangan tambahan: ${data.detail || "-"}`,
    atp:
      `${identity} Susun ALUR TUJUAN PEMBELAJARAN satu semester. Buat tabel teks dengan nomor, elemen, ` +
      `tujuan pembelajaran, materi, aktivitas, asesmen, alokasi waktu, dan profil/karakter. ` +
      `Keterangan tambahan: ${data.detail || "-"}`,
    lkpd:
      `${identity} Buat LKPD taruna yang menarik dan operasional. Sertakan identitas, tujuan, alat/bahan, ` +
      `petunjuk keselamatan, langkah kerja, tabel pengamatan, pertanyaan analisis, kesimpulan, refleksi, dan rubrik. ` +
      `Keterangan tambahan: ${data.detail || "-"}`,
    soal:
      `${identity} Buat ${data.jumlah || "10"} soal berkualitas. Sertakan kisi-kisi ringkas, soal, pilihan A-E bila pilihan ganda, ` +
      `kunci jawaban, pembahasan singkat, serta rubrik untuk soal uraian. Sesuaikan dengan level SMK dan gunakan sebagian soal HOTS. ` +
      `Keterangan tambahan: ${data.detail || "-"}`,
    surat:
      `${identity} Buat SURAT RESMI sekolah. Sertakan kop dalam bentuk teks, nomor, lampiran, perihal, tujuan, salam pembuka, ` +
      `isi yang jelas, penutup, tempat dan tanggal, serta blok tanda tangan Kepala SMK Pelayaran Demak Boarding School. ` +
      `Gunakan format yang mudah diedit. Keterangan tambahan: ${data.detail || "-"}`,
  };

  return `${prompts[tool]} ${formatInstruction}`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [tool, setTool] = useState<ToolId>("modul");
  const [mapel, setMapel] = useState("Dasar-Dasar Nautika Kapal Niaga");
  const [kelas, setKelas] = useState("Kelas X / Fase E");
  const [semester, setSemester] = useState("Ganjil");
  const [topik, setTopik] = useState("Keselamatan kerja di atas kapal");
  const [jumlah, setJumlah] = useState("10");
  const [language, setLanguage] = useState("id");
  const [outputFormat, setOutputFormat] = useState("automatic");
  const [detail, setDetail] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [activityCount, setActivityCount] = useState(0);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [documentSearch, setDocumentSearch] = useState("");
  const [documentFilter, setDocumentFilter] = useState<"all" | ToolId>("all");
  const [selectedDocumentId, setSelectedDocumentId] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("smkpd_session");
    if (!raw) {
      router.replace("/login");
      return;
    }

    try {
      setSession(JSON.parse(raw));
      const activities = JSON.parse(localStorage.getItem("smkpd_activities") || "[]");
      setActivityCount(Array.isArray(activities) ? activities.length : 0);
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

  const filteredDocuments = useMemo(() => {
    const keyword = documentSearch.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesFilter = documentFilter === "all" || document.tool === documentFilter;
      const matchesKeyword =
        !keyword ||
        document.title.toLowerCase().includes(keyword) ||
        document.mapel.toLowerCase().includes(keyword) ||
        document.toolTitle.toLowerCase().includes(keyword);

      return matchesFilter && matchesKeyword;
    });
  }, [documents, documentFilter, documentSearch]);

  async function generate(event: FormEvent) {
    event.preventDefault();
    if (!session || loading) return;

    setLoading(true);
    setNotice("");
    setResult("");

    const message = buildPrompt(tool, {
      language,
      mapel,
      kelas,
      semester,
      topik,
      jumlah,
      detail,
      outputFormat,
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: tool,
          role: session.role,
          language,
          message,
          history: [{ role: "user", text: message }],
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Dokumen belum berhasil dibuat.");

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
        title: topik,
        mapel,
        kelas,
        semester,
        language,
        outputFormat,
        content: output,
        createdAt: now,
      };

      const nextDocuments = [documentRecord, ...loadDocuments()].slice(0, 100);
      saveDocuments(nextDocuments);
      setDocuments(nextDocuments);
      setSelectedDocumentId(documentId);

      const activity = {
        tool: activeTool.title,
        title: topik,
        at: now,
      };
      const previous = JSON.parse(localStorage.getItem("smkpd_activities") || "[]");
      const next = [activity, ...(Array.isArray(previous) ? previous : [])].slice(0, 30);
      localStorage.setItem("smkpd_activities", JSON.stringify(next));
      setActivityCount(nextDocuments.length);
      setNotice("Dokumen berhasil dibuat dan otomatis tersimpan di Arsip Dokumen.");
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
            blockquote{margin:10px 0;padding:8px 12px;border-left:4px solid #777;background:#f5f5f5}
            table{width:100%;border-collapse:collapse;margin:12px 0 18px;page-break-inside:auto}
            thead{display:table-header-group}
            tr{page-break-inside:avoid}
            th,td{border:1px solid #222;padding:7px 8px;vertical-align:top}
            th{font-weight:bold;text-align:center;background:#eaf0f6}
          </style>
        </head>
        <body>
          <h1>${activeTool.title.toUpperCase()}</h1>
          <p style="text-align:center"><b>SMK PELAYARAN DEMAK BOARDING SCHOOL</b></p>
          <hr>
          ${renderedDocument}
        </body>
      </html>`;

    const blob = new Blob(["\ufeff", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(activeTool.title + "-" + topik)}.doc`;
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
    printWindow.document.write(`
      <html>
        <head>
          <title>${activeTool.title}</title>
          <style>
            @page{size:A4;margin:2cm}
            body{font-family:'Times New Roman',serif;font-size:12pt;line-height:1.5;color:#111}
            h1{text-align:center;font-size:16pt;margin:0}
            .school-name{text-align:center;font-size:14pt;font-weight:bold;margin:5px 0 12px}
            h2{font-size:15pt;margin:18px 0 8px}
            h3{font-size:13pt;margin:15px 0 7px}
            h4{font-size:12pt;margin:12px 0 6px}
            p{margin:6px 0}
            ul,ol{margin:6px 0 10px 24px}
            blockquote{margin:10px 0;padding:8px 12px;border-left:4px solid #777;background:#f5f5f5}
            table{width:100%;border-collapse:collapse;margin:12px 0 18px;page-break-inside:auto}
            thead{display:table-header-group}
            tr{page-break-inside:avoid;page-break-after:auto}
            th,td{border:1px solid #222;padding:7px 8px;vertical-align:top}
            th{font-weight:bold;text-align:center;background:#eaf0f6}
          </style>
        </head>
        <body>
          <h1>${activeTool.title.toUpperCase()}</h1>
          <div class="school-name">SMK PELAYARAN DEMAK BOARDING SCHOOL</div>
          <hr>
          ${renderedDocument}
          <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  function openDocument(record: DocumentRecord) {
    setTool(record.tool);
    setMapel(record.mapel);
    setKelas(record.kelas);
    setSemester(record.semester);
    setLanguage(record.language);
    setOutputFormat(record.outputFormat);
    setTopik(record.title);
    setResult(record.content);
    setSelectedDocumentId(record.id);
    setNotice(`Dokumen "${record.title}" berhasil dibuka kembali.`);

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: window.document.documentElement.scrollHeight * 0.45,
        behavior: "smooth",
      });
    });
  }

  function deleteDocument(documentId: string) {
    const document = documents.find((item) => item.id === documentId);
    if (!document) return;

    const confirmed = window.confirm(
      `Hapus dokumen "${document.title}" dari arsip? Tindakan ini tidak dapat dibatalkan.`
    );
    if (!confirmed) return;

    const nextDocuments = documents.filter((item) => item.id !== documentId);
    saveDocuments(nextDocuments);
    setDocuments(nextDocuments);
    setActivityCount(nextDocuments.length);

    if (selectedDocumentId === documentId) {
      setSelectedDocumentId("");
    }

    setNotice("Dokumen berhasil dihapus dari arsip.");
  }

  function clearArchive() {
    if (documents.length === 0) return;

    const confirmed = window.confirm(
      "Hapus seluruh arsip dokumen di perangkat ini? Tindakan ini tidak dapat dibatalkan."
    );
    if (!confirmed) return;

    saveDocuments([]);
    setDocuments([]);
    setActivityCount(0);
    setSelectedDocumentId("");
    setNotice("Seluruh arsip dokumen berhasil dikosongkan.");
  }

  function startNewDocument() {
    setResult("");
    setSelectedDocumentId("");
    setNotice("Formulir baru siap digunakan.");
    window.scrollTo({ top: 0, behavior: "smooth" });
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

  return (
    <main className="dashboard-page">
      <aside className="dashboard-sidebar">
        <Link href="/" className="dash-brand">
          <img src="/logo-smkpd.png" alt="Logo SMKPD" />
          <div><strong>SMKPD AI</strong><small>Official Logo v2.4.1</small></div>
        </Link>

        <div className="dash-user">
          <span>{session.role === "Guru" ? "👨‍🏫" : session.role === "Taruna" ? "👨‍🎓" : session.role === "Admin" ? "👨‍💼" : "👨‍👩‍👦"}</span>
          <div><strong>{session.name}</strong><small>{session.role}</small></div>
        </div>

        <nav className="dash-menu">
          {roleMenus[session.role].map((item, index) => (
            <button className={index === 0 ? "active" : ""} key={item}>
              <span>{["▦", "✦", "📘", "📝", "📄", "👥"][index] || "•"}</span>{item}
            </button>
          ))}
        </nav>

        <button className="logout-button" onClick={logout}>Keluar dari Akun</button>
      </aside>

      <section className="dashboard-content">
        <header className="dashboard-topbar">
          <div>
            <p>SELAMAT DATANG, {session.role.toUpperCase()}</p>
            <h1>Dashboard SMKPD AI</h1>
          </div>
          <div className="topbar-actions">
            <Link href="/" className="outline-action">AI Assistant</Link>
            <button className="notification-button">🔔</button>
          </div>
        </header>

        <section className="dashboard-hero">
          <div>
            <p className="eyebrow">SMART MARITIME WORKSPACE</p>
            <h2>Administrasi dan pembelajaran selesai lebih cepat.</h2>
            <p>
              Buat perangkat ajar, soal, LKPD, dan surat resmi menggunakan AI,
              lalu ekspor hasilnya ke Word atau PDF.
            </p>
          </div>
          <img src="/logo-smkpd.png" alt="" />
        </section>

        <section className="dashboard-stats">
          <article><span>🗂️</span><div><strong>{documents.length}</strong><small>Dokumen Tersimpan</small></div></article>
          <article><span>🧰</span><div><strong>6</strong><small>Generator Aktif</small></div></article>
          <article><span>👤</span><div><strong>{session.role}</strong><small>Hak Akses</small></div></article>
          <article><span>●</span><div><strong>Online</strong><small>Status Gemini AI</small></div></article>
        </section>

        <section className="dashboard-tools">
          <div className="dashboard-section-title">
            <div><p>GENERATOR PROFESIONAL</p><h2>Pilih dokumen yang akan dibuat</h2></div>
            <span>Powered by Gemini AI</span>
          </div>
          <div className="dashboard-tool-grid">
            {tools.map((item) => (
              <button
                key={item.id}
                className={tool === item.id ? "selected" : ""}
                onClick={() => setTool(item.id)}
              >
                <span>{item.icon}</span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="generator-workspace">
          <form className="generator-form" onSubmit={generate}>
            <div className="generator-heading">
              <span>{activeTool.icon}</span>
              <div>
                <p>GENERATOR AKTIF</p>
                <h2>{activeTool.title}</h2>
              </div>
            </div>

            <div className="form-grid">
              <label>
                Mata Pelajaran / Bidang
                <input value={mapel} onChange={(e) => setMapel(e.target.value)} required />
              </label>
              <label>
                Kelas / Fase
                <input value={kelas} onChange={(e) => setKelas(e.target.value)} required />
              </label>
              <label>
                Semester
                <select value={semester} onChange={(e) => setSemester(e.target.value)}>
                  <option>Ganjil</option><option>Genap</option><option>1 Tahun</option>
                </select>
              </label>
              <label>
                Bahasa
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="id">Indonesia</option><option value="en">English</option>
                </select>
              </label>
              <label>
                Format Hasil
                <select value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
                  <option value="automatic">Otomatis: Narasi + Tabel</option>
                  <option value="table">Prioritaskan Tabel</option>
                  <option value="narrative">Narasi Tanpa Tabel</option>
                </select>
              </label>
              <label className="form-wide">
                Topik / Perihal
                <input value={topik} onChange={(e) => setTopik(e.target.value)} required />
              </label>
              {tool === "soal" && (
                <label>
                  Jumlah Soal
                  <input type="number" min="1" max="100" value={jumlah} onChange={(e) => setJumlah(e.target.value)} />
                </label>
              )}
              <label className="form-wide">
                Keterangan Tambahan
                <textarea
                  rows={4}
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="Contoh: gunakan pembelajaran mendalam, sertakan rubrik praktik, format resmi sekolah..."
                />
              </label>
            </div>

            <button className="generate-button" disabled={loading}>
              {loading ? "AI sedang menyusun dokumen..." : `✨ Buat ${activeTool.title}`}
            </button>
            {notice && <p className="generator-notice">{notice}</p>}
          </form>

          <div className="generator-result">
            <div className="result-toolbar">
              <div><p>HASIL DOKUMEN</p><h2>{result ? activeTool.title : "Belum ada hasil"}</h2></div>
              <div>
                <button onClick={startNewDocument}>Dokumen Baru</button>
                <button onClick={copyResult} disabled={!result}>Salin</button>
                <button onClick={downloadWord} disabled={!result}>Word</button>
                <button onClick={printPdf} disabled={!result}>PDF</button>
              </div>
            </div>

            <div className={`result-document ${!result ? "empty" : ""}`}>
              {result ? (
                <div
                  className="ai-document-html"
                  dangerouslySetInnerHTML={{ __html: documentToHtml(result) }}
                />
              ) : (
                <div>
                  <img className="result-empty-logo" src="/logo-smkpd-192.png" alt="Logo SMK Pelayaran Demak" />
                  <h3>Dokumen akan tampil di sini</h3>
                  <p>Lengkapi formulir lalu klik tombol generator.</p>
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
                Maksimal 100 dokumen tersimpan pada browser dan perangkat yang sedang digunakan.
              </span>
            </div>
            <button onClick={clearArchive} disabled={documents.length === 0}>
              Kosongkan Arsip
            </button>
          </div>

          <div className="archive-controls">
            <label>
              Cari Dokumen
              <input
                value={documentSearch}
                onChange={(event) => setDocumentSearch(event.target.value)}
                placeholder="Cari judul, mapel, atau jenis dokumen..."
              />
            </label>
            <label>
              Jenis Dokumen
              <select
                value={documentFilter}
                onChange={(event) =>
                  setDocumentFilter(event.target.value as "all" | ToolId)
                }
              >
                <option value="all">Semua Jenis</option>
                {tools.map((item) => (
                  <option key={item.id} value={item.id}>{item.title}</option>
                ))}
              </select>
            </label>
          </div>

          {filteredDocuments.length > 0 ? (
            <div className="archive-list">
              {filteredDocuments.map((document) => (
                <article
                  key={document.id}
                  className={selectedDocumentId === document.id ? "selected" : ""}
                >
                  <div className="archive-icon">
                    {tools.find((item) => item.id === document.tool)?.icon || "📄"}
                  </div>
                  <div className="archive-info">
                    <div className="archive-meta">
                      <span>{document.toolTitle}</span>
                      <time>{formatDocumentDate(document.createdAt)}</time>
                    </div>
                    <h3>{document.title}</h3>
                    <p>{document.mapel} • {document.kelas} • Semester {document.semester}</p>
                  </div>
                  <div className="archive-actions">
                    <button onClick={() => openDocument(document)}>Buka</button>
                    <button className="danger" onClick={() => deleteDocument(document.id)}>
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="archive-empty">
              <img className="archive-empty-logo" src="/logo-smkpd-192.png" alt="Logo SMK Pelayaran Demak" />
              <h3>Belum ada dokumen pada arsip ini</h3>
              <p>Buat dokumen baru atau ubah kata pencarian dan filter.</p>
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <span>SMKPD AI Official Logo v2.4.1</span>
          <span>SMK Pelayaran Demak Boarding School • 2026</span>
        </footer>
      </section>
    </main>
  );
}
