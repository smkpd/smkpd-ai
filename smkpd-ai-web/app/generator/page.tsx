"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import RichText from "../components/RichText";
import { createId, loadSession } from "../lib/client";
import { dbGetAll, dbPutOne } from "../lib/database";

type Tool = "modul" | "cp" | "atp" | "lkpd" | "soal" | "surat";

const tools = [
  { id: "modul", icon: "📘", title: "Modul Ajar" },
  { id: "cp", icon: "🎯", title: "Capaian Pembelajaran" },
  { id: "atp", icon: "🧭", title: "ATP" },
  { id: "lkpd", icon: "📋", title: "LKPD" },
  { id: "soal", icon: "📝", title: "Soal & Asesmen" },
  { id: "surat", icon: "📄", title: "Surat Resmi" },
] as const;

const defaults = {
  schoolYear: "2026/2027",
  subject: "Dasar-Dasar Nautika Kapal Niaga",
  program: "Nautika Kapal Niaga",
  classPhase: "Kelas X / Fase E",
  semester: "Ganjil",
  topic: "Keselamatan kerja di atas kapal",
  allocation: "4 JP",
  count: "10",
  questionType: "Pilihan Ganda A–E",
  letterType: "Surat Undangan",
  letterNumber: "001/SMK-PD/VII/2026",
  letterDate: "",
  recipient: "Bapak/Ibu Wali Taruna",
  subjectLetter: "Undangan Rapat",
  eventDate: "",
  eventTime: "09.00 WIB",
  eventPlace: "SMK Pelayaran Demak Boarding School",
  signer: "Aisyatus Sa'adah, M.H.",
  signerTitle: "Kepala SMK Pelayaran Demak Boarding School",
  detail: "",
};

function buildPrompt(tool: Tool, form: typeof defaults) {
  if (tool === "surat") {
    return `
Buat ${form.letterType} resmi SMK Pelayaran Demak Boarding School.
Nomor: ${form.letterNumber}
Tanggal surat: ${form.letterDate || "[isi tanggal]"}
Perihal: ${form.subjectLetter}
Penerima: ${form.recipient}
Tanggal kegiatan: ${form.eventDate || "-"}
Waktu: ${form.eventTime}
Tempat: ${form.eventPlace}
Penandatangan: ${form.signer}
Jabatan: ${form.signerTitle}
Isi/keterangan: ${form.detail || "-"}
Gunakan tata naskah surat resmi Indonesia. Jangan memasukkan data mata pelajaran, kelas, asesmen, atau bagian modul ajar.
`;
  }

  const common = `
Sekolah: SMK Pelayaran Demak Boarding School
Tahun ajaran: ${form.schoolYear}
Mata pelajaran: ${form.subject}
Program keahlian: ${form.program}
Kelas/Fase: ${form.classPhase}
Semester: ${form.semester}
Topik: ${form.topic}
Alokasi: ${form.allocation}
Keterangan: ${form.detail || "-"}
`;

  const prompts: Record<Exclude<Tool, "surat">, string> = {
    modul: `Buat Modul Ajar Kurikulum Merdeka lengkap dan siap Word. ${common}`,
    cp: `Buat Capaian Pembelajaran sesuai fase, elemen, kompetensi akhir, ruang lingkup, dan karakteristik mapel. Jangan membuat modul ajar. ${common}`,
    atp: `Buat ATP terurut dengan tujuan pembelajaran, materi, aktivitas, asesmen, dan alokasi JP. ${common}`,
    lkpd: `Buat LKPD operasional dengan tujuan, petunjuk, keselamatan, langkah kerja, pengamatan, analisis, refleksi, dan rubrik. ${common}`,
    soal: `Buat ${form.count} soal ${form.questionType}, kisi-kisi, kunci, pembahasan, dan rubrik bila perlu. ${common}`,
  };

  return prompts[tool];
}

export default function GeneratorPage() {
  const [tool, setTool] = useState<Tool>("modul");
  const [form, setForm] = useState(defaults);
  const [result, setResult] = useState("");
  const [recent, setRecent] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    dbGetAll("documents").then(setRecent);
  }, []);

  const active = useMemo(
    () => tools.find((item) => item.id === tool) || tools[0],
    [tool]
  );

  async function generate(event: FormEvent) {
    event.preventDefault();
    const session = loadSession();
    if (!session) return;

    setLoading(true);
    setNotice("");
    const message = buildPrompt(tool, form);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: tool,
          role: session.role,
          language: "id",
          message,
          history: [{ role: "user", text: message }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Dokumen belum berhasil dibuat.");

      const content = String(data.text || "");
      setResult(content);

      const record = {
        id: createId(),
        jenis: active.title,
        judul:
          tool === "surat"
            ? `${form.letterType} — ${form.subjectLetter}`
            : `${active.title} — ${form.topic}`,
        konten: content,
        dibuat_oleh: session.name,
        tanggal: new Date().toISOString(),
      };
      await dbPutOne("documents", record);
      setRecent(await dbGetAll("documents"));
      setNotice("Dokumen berhasil dibuat dan disimpan ke database.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Terjadi kendala.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setNotice("Hasil berhasil disalin.");
  }

  function print() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`<html><head><title>${active.title}</title><style>body{font-family:'Times New Roman';line-height:1.5;margin:2cm;white-space:pre-wrap}</style></head><body>${result.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</body></html>`);
    win.document.close();
    win.print();
  }

  return (
    <PortalLayout
      title="Generator Dokumen"
      subtitle="Satu menu khusus untuk perangkat ajar, asesmen, dan surat resmi."
      requiredPermission="manage_generators"
    >
      <div className="generator-tool-strip">
        {tools.map((item) => (
          <button
            key={item.id}
            className={tool === item.id ? "active" : ""}
            onClick={() => {
              setTool(item.id);
              setResult("");
              setNotice("");
            }}
          >
            <span>{item.icon}</span>{item.title}
          </button>
        ))}
      </div>

      <section className="simple-generator-layout">
        <form className="simple-generator-form" onSubmit={generate}>
          <p className="suite-eyebrow">FORMULIR {active.title.toUpperCase()}</p>
          <h2>{active.icon} {active.title}</h2>

          {tool === "surat" ? (
            <>
              <label>Jenis Surat<input value={form.letterType} onChange={(e) => setForm({...form, letterType:e.target.value})}/></label>
              <label>Nomor Surat<input value={form.letterNumber} onChange={(e) => setForm({...form, letterNumber:e.target.value})}/></label>
              <label>Tanggal Surat<input type="date" value={form.letterDate} onChange={(e) => setForm({...form, letterDate:e.target.value})}/></label>
              <label>Perihal<input value={form.subjectLetter} onChange={(e) => setForm({...form, subjectLetter:e.target.value})}/></label>
              <label>Penerima<input value={form.recipient} onChange={(e) => setForm({...form, recipient:e.target.value})}/></label>
              <label>Tanggal Kegiatan<input type="date" value={form.eventDate} onChange={(e) => setForm({...form, eventDate:e.target.value})}/></label>
              <label>Waktu<input value={form.eventTime} onChange={(e) => setForm({...form, eventTime:e.target.value})}/></label>
              <label>Tempat<input value={form.eventPlace} onChange={(e) => setForm({...form, eventPlace:e.target.value})}/></label>
              <label>Penandatangan<input value={form.signer} onChange={(e) => setForm({...form, signer:e.target.value})}/></label>
              <label>Jabatan<input value={form.signerTitle} onChange={(e) => setForm({...form, signerTitle:e.target.value})}/></label>
            </>
          ) : (
            <>
              <label>Tahun Ajaran<input value={form.schoolYear} onChange={(e) => setForm({...form, schoolYear:e.target.value})}/></label>
              <label>Mata Pelajaran<input value={form.subject} onChange={(e) => setForm({...form, subject:e.target.value})}/></label>
              <label>Program Keahlian<input value={form.program} onChange={(e) => setForm({...form, program:e.target.value})}/></label>
              <label>Kelas / Fase<input value={form.classPhase} onChange={(e) => setForm({...form, classPhase:e.target.value})}/></label>
              <label>Semester<input value={form.semester} onChange={(e) => setForm({...form, semester:e.target.value})}/></label>
              <label>Topik<input value={form.topic} onChange={(e) => setForm({...form, topic:e.target.value})}/></label>
              <label>Alokasi<input value={form.allocation} onChange={(e) => setForm({...form, allocation:e.target.value})}/></label>
              {tool === "soal" && (
                <>
                  <label>Jumlah Soal<input type="number" value={form.count} onChange={(e) => setForm({...form, count:e.target.value})}/></label>
                  <label>Jenis Soal<input value={form.questionType} onChange={(e) => setForm({...form, questionType:e.target.value})}/></label>
                </>
              )}
            </>
          )}

          <label className="wide">Keterangan Tambahan<textarea rows={5} value={form.detail} onChange={(e) => setForm({...form, detail:e.target.value})}/></label>
          <button disabled={loading}>{loading ? "AI menyusun..." : `Buat ${active.title}`}</button>
          {notice && <p className="module-notice">{notice}</p>}
        </form>

        <section className="simple-generator-result">
          <div className="module-card-header">
            <div><p className="suite-eyebrow">HASIL</p><h2>{result ? active.title : "Belum ada hasil"}</h2></div>
            <div className="result-actions"><button disabled={!result} onClick={copy}>Salin</button><button disabled={!result} onClick={print}>PDF/Cetak</button></div>
          </div>
          <div className="simple-result-content">
            {result ? <RichText text={result}/> : <div className="empty-state"><img src="/logo-smkpd-192.png" alt=""/><p>Lengkapi formulir dan tekan tombol buat.</p></div>}
          </div>
        </section>
      </section>

      <section className="module-card recent-documents-card">
        <div className="module-card-header"><div><p className="suite-eyebrow">DATABASE DOKUMEN</p><h2>Dokumen Terbaru</h2></div></div>
        <div className="recent-documents-grid">
          {recent.slice(0, 8).map((item) => (
            <button key={item.id} onClick={() => setResult(item.konten)}>
              <strong>{item.judul}</strong>
              <small>{item.dibuat_oleh} • {String(item.tanggal).slice(0,10)}</small>
            </button>
          ))}
          {!recent.length && <p>Belum ada dokumen tersimpan.</p>}
        </div>
      </section>
    </PortalLayout>
  );
}
