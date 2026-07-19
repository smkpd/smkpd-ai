"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import RichText from "../components/RichText";
import {
  createId,
  formatDate,
  KnowledgeRecord,
  loadArray,
  loadSession,
  saveArray,
  UsageLog,
} from "../lib/client";

export default function KnowledgePage() {
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState("");

  useEffect(() => {
    const stored = loadArray<KnowledgeRecord>("smkpd_knowledge");
    setRecords(stored);
    setSelectedId(stored[0]?.id || "");
    setRole(loadSession()?.role || "");
  }, []);

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId),
    [records, selectedId]
  );

  const canUpload = role === "Admin" || role === "Guru";

  async function uploadPdf(event: FormEvent) {
    event.preventDefault();
    if (!file || uploading || !canUpload) return;

    const session = loadSession();
    if (!session) return;

    setUploading(true);
    setNotice("Gemini sedang membaca dan menyusun isi PDF...");
    setAnswer("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/document", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "PDF belum berhasil dibaca.");

      const record: KnowledgeRecord = {
        id: createId(),
        fileName: file.name,
        title: String(data.title || file.name),
        summary: String(data.summary || ""),
        content: String(data.content || ""),
        suggestedQuestions: Array.isArray(data.suggestedQuestions)
          ? data.suggestedQuestions.map(String)
          : [],
        size: file.size,
        createdAt: new Date().toISOString(),
        createdBy: session.name,
      };

      const next = [record, ...records].slice(0, 12);
      saveArray("smkpd_knowledge", next, 12);
      setRecords(next);
      setSelectedId(record.id);
      setFile(null);
      setNotice("PDF berhasil dimasukkan ke Knowledge Base.");

      const log: UsageLog = {
        id: createId(),
        type: "knowledge",
        mode: "pdf",
        title: record.title,
        role: session.role,
        createdAt: record.createdAt,
        inputChars: file.size,
        outputChars: record.content.length,
      };
      saveArray("smkpd_ai_logs", [log, ...loadArray<UsageLog>("smkpd_ai_logs")], 200);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Terjadi kendala saat membaca PDF."
      );
    } finally {
      setUploading(false);
    }
  }

  async function askDocument(event?: FormEvent, suggested?: string) {
    event?.preventDefault();
    const activeQuestion = (suggested || question).trim();
    const session = loadSession();

    if (!selected || !activeQuestion || asking || !session) return;

    setQuestion(activeQuestion);
    setAsking(true);
    setAnswer("");
    setNotice("");

    const message = `
Gunakan hanya informasi yang tersedia pada dokumen berikut.

JUDUL DOKUMEN:
${selected.title}

ISI DOKUMEN:
${selected.content.slice(0, 20000)}

PERTANYAAN:
${activeQuestion}

Jawab secara jelas. Bila informasi tidak tersedia dalam dokumen, katakan bahwa informasi tersebut tidak ditemukan.
`;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "umum",
          role: session.role,
          language: "id",
          message,
          history: [{ role: "user", text: message }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pertanyaan belum terjawab.");

      const output = String(data.text || "");
      setAnswer(output);

      const log: UsageLog = {
        id: createId(),
        type: "chat",
        mode: "knowledge",
        title: activeQuestion.slice(0, 80),
        role: session.role,
        createdAt: new Date().toISOString(),
        inputChars: activeQuestion.length,
        outputChars: output.length,
      };
      saveArray("smkpd_ai_logs", [log, ...loadArray<UsageLog>("smkpd_ai_logs")], 200);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Terjadi kendala.");
    } finally {
      setAsking(false);
    }
  }

  function removeRecord(record: KnowledgeRecord) {
    const confirmed = window.confirm(`Hapus "${record.title}" dari Knowledge Base?`);
    if (!confirmed) return;

    const next = records.filter((item) => item.id !== record.id);
    saveArray("smkpd_knowledge", next, 12);
    setRecords(next);
    setSelectedId(next[0]?.id || "");
    setAnswer("");
    setNotice("Dokumen berhasil dihapus dari Knowledge Base.");
  }

  return (
    <PortalLayout
      title="PDF & AI Knowledge Base"
      subtitle="Unggah PDF, buat ringkasan, simpan pengetahuan, dan tanyakan isi dokumen."
    >
      <section className="knowledge-layout">
        <aside className="knowledge-sidebar">
          {canUpload ? (
            <form className="pdf-upload-card" onSubmit={uploadPdf}>
              <img src="/logo-smkpd-192.png" alt="" />
              <p className="suite-eyebrow">UPLOAD DOKUMEN</p>
              <h2>Masukkan PDF Sekolah</h2>
              <p>
                PDF akan dianalisis oleh AI dan disimpan sebagai Knowledge Base
                pada browser ini.
              </p>
              <label>
                Pilih PDF maksimal 4 MB
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
              </label>
              {file && (
                <div className="selected-pdf">
                  <strong>{file.name}</strong>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
              <button disabled={!file || uploading}>
                {uploading ? "Membaca PDF..." : "📂 Proses ke Knowledge Base"}
              </button>
            </form>
          ) : (
            <div className="pdf-upload-card viewer">
              <img src="/logo-smkpd-192.png" alt="" />
              <h2>Mode Pembaca</h2>
              <p>
                Taruna dan wali taruna dapat membaca serta bertanya pada dokumen
                yang sudah dimasukkan oleh guru atau administrator di browser ini.
              </p>
            </div>
          )}

          <div className="knowledge-list-card">
            <div className="knowledge-list-heading">
              <div>
                <p className="suite-eyebrow">ARSIP PENGETAHUAN</p>
                <h3>{records.length} Dokumen</h3>
              </div>
            </div>
            <div className="knowledge-list">
              {records.map((record) => (
                <button
                  key={record.id}
                  className={selectedId === record.id ? "active" : ""}
                  onClick={() => {
                    setSelectedId(record.id);
                    setAnswer("");
                    setQuestion("");
                  }}
                >
                  <span>📄</span>
                  <div>
                    <strong>{record.title}</strong>
                    <small>{formatDate(record.createdAt)}</small>
                  </div>
                </button>
              ))}
              {records.length === 0 && (
                <div className="knowledge-empty-small">
                  Belum ada PDF pada Knowledge Base.
                </div>
              )}
            </div>
          </div>
        </aside>

        <section className="knowledge-workspace">
          {selected ? (
            <>
              <header className="knowledge-document-header">
                <div>
                  <p className="suite-eyebrow">DOKUMEN AKTIF</p>
                  <h2>{selected.title}</h2>
                  <span>
                    {selected.fileName} • {(selected.size / 1024 / 1024).toFixed(2)} MB
                    • Oleh {selected.createdBy}
                  </span>
                </div>
                {canUpload && (
                  <button onClick={() => removeRecord(selected)}>Hapus PDF</button>
                )}
              </header>

              <article className="knowledge-summary">
                <h3>Ringkasan AI</h3>
                <RichText text={selected.summary} />
              </article>

              <div className="suggested-questions">
                <strong>Pertanyaan yang disarankan</strong>
                <div>
                  {selected.suggestedQuestions.map((item) => (
                    <button key={item} onClick={() => askDocument(undefined, item)}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <form className="knowledge-question" onSubmit={askDocument}>
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  rows={3}
                  placeholder="Tanyakan isi dokumen ini..."
                />
                <button disabled={!question.trim() || asking}>
                  {asking ? "Mencari jawaban..." : "Tanyakan Dokumen →"}
                </button>
              </form>

              {answer && (
                <article className="knowledge-answer">
                  <div className="knowledge-answer-title">
                    <img src="/logo-smkpd-64.png" alt="" />
                    <strong>Jawaban berdasarkan dokumen</strong>
                  </div>
                  <RichText text={answer} />
                </article>
              )}
            </>
          ) : (
            <div className="knowledge-empty">
              <img src="/logo-smkpd-192.png" alt="" />
              <h2>Knowledge Base belum berisi dokumen</h2>
              <p>Unggah PDF pertama untuk memulai analisis dan tanya jawab.</p>
            </div>
          )}

          {notice && <p className="knowledge-notice">{notice}</p>}
        </section>
      </section>
    </PortalLayout>
  );
}
