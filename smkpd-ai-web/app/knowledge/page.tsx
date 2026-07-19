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
import {
  dbDelete,
  dbGetAll,
  dbPutOne,
} from "../lib/database";

const MAX_FILE_SIZE = 30 * 1024 * 1024;

function fromDatabaseRecord(value: any): KnowledgeRecord | null {
  if (
    String(value.kategori || "") !== "PDF Knowledge" ||
    !value.content
  ) {
    return null;
  }

  let suggestedQuestions: string[] = [];
  try {
    suggestedQuestions = Array.isArray(value.suggested_questions)
      ? value.suggested_questions
      : JSON.parse(String(value.suggested_questions || "[]"));
  } catch {
    suggestedQuestions = [];
  }

  return {
    id: String(value.id || value.kode),
    fileName: String(value.file_name || value.judul || "dokumen.pdf"),
    title: String(value.judul || "Dokumen"),
    summary: String(value.summary || value.deskripsi || ""),
    content: String(value.content || ""),
    suggestedQuestions: suggestedQuestions.map(String),
    size: Number(value.size || 0),
    createdAt: String(value.created_at || new Date().toISOString()),
    createdBy: String(value.created_by || "Pengguna SMKPD"),
    createdByRole: String(value.created_by_role || ""),
    visibility: "all",
    fileUri: String(value.file_uri || ""),
  };
}

function toDatabaseRecord(record: KnowledgeRecord) {
  return {
    id: record.id,
    kode: record.id,
    judul: record.title,
    kategori: "PDF Knowledge",
    tingkat: "Sekolah",
    deskripsi: record.summary.slice(0, 800),
    sumber_url: "",
    status: "Aktif",
    file_name: record.fileName,
    summary: record.summary,
    content: record.content,
    suggested_questions: record.suggestedQuestions,
    size: record.size,
    created_at: record.createdAt,
    created_by: record.createdBy,
    created_by_role: record.createdByRole || "",
    visibility: "all",
    file_uri: record.fileUri || "",
  };
}

export default function KnowledgePage() {
  const [records, setRecords] = useState<KnowledgeRecord[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [asking, setAsking] = useState(false);
  const [notice, setNotice] = useState("");
  const [role, setRole] = useState("");
  const [userName, setUserName] = useState("");

  async function loadSharedDocuments() {
    const databaseRows = await dbGetAll<any>("library");
    const databaseRecords = databaseRows
      .map(fromDatabaseRecord)
      .filter(
        (item): item is KnowledgeRecord => item !== null
      );

    // Migrate records from the older localStorage archive once.
    const legacy = loadArray<KnowledgeRecord>("smkpd_knowledge");
    const existingIds = new Set(
      databaseRecords.map((record) => record.id)
    );

    for (const record of legacy) {
      if (!existingIds.has(record.id)) {
        await dbPutOne(
          "library",
          toDatabaseRecord({
            ...record,
            createdByRole: record.createdByRole || "Legacy",
            visibility: "all",
          }),
          "legacy"
        );
      }
    }

    const refreshedRows = await dbGetAll<any>("library");
    const refreshed = refreshedRows
      .map(fromDatabaseRecord)
      .filter(
        (item): item is KnowledgeRecord => item !== null
      )
      .sort(
        (a, b) => b.createdAt.localeCompare(a.createdAt)
      );

    setRecords(refreshed);
    setSelectedId((current) =>
      refreshed.some((record) => record.id === current)
        ? current
        : refreshed[0]?.id || ""
    );
  }

  useEffect(() => {
    const session = loadSession();
    setRole(session?.role || "");
    setUserName(session?.name || "");
    loadSharedDocuments();
  }, []);

  const selected = useMemo(
    () => records.find((record) => record.id === selectedId),
    [records, selectedId]
  );

  const canUpload =
    role === "Admin" ||
    role === "Kepala Sekolah" ||
    role === "Guru";

  const canDeleteSelected =
    Boolean(selected) &&
    (
      role === "Admin" ||
      role === "Kepala Sekolah" ||
      (
        role === "Guru" &&
        selected?.createdBy === userName
      )
    );

  function chooseFile(nextFile: File | null) {
    setNotice("");
    setUploadProgress(0);

    if (!nextFile) {
      setFile(null);
      return;
    }

    if (
      nextFile.type !== "application/pdf" &&
      !nextFile.name.toLowerCase().endsWith(".pdf")
    ) {
      setFile(null);
      setNotice("Pilih dokumen dengan format PDF.");
      return;
    }

    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setNotice("Ukuran satu dokumen PDF maksimal 30 MB.");
      return;
    }

    setFile(nextFile);
  }

  async function uploadPdf(event: FormEvent) {
    event.preventDefault();
    if (!file || uploading || !canUpload) return;

    const session = loadSession();
    if (!session) return;

    setUploading(true);
    setUploadProgress(8);
    setNotice("Menyiapkan upload aman ke Gemini...");
    setAnswer("");

    try {
      const startResponse = await fetch(
        "/api/document?action=start-upload",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: "application/pdf",
            fileSize: file.size,
          }),
        }
      );

      const startData = await startResponse.json();
      if (!startResponse.ok) {
        throw new Error(
          startData.error || "Sesi upload belum berhasil dibuat."
        );
      }

      setUploadProgress(25);
      setNotice("Mengunggah satu dokumen PDF...");

      const uploadResponse = await fetch(startData.uploadUrl, {
        method: "POST",
        headers: {
          "X-Goog-Upload-Offset": "0",
          "X-Goog-Upload-Command": "upload, finalize",
          "Content-Type": "application/pdf",
        },
        body: file,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        throw new Error(
          uploadData?.error?.message ||
            "Dokumen belum berhasil diunggah."
        );
      }

      const uploadedFile = uploadData.file || uploadData;

      if (!uploadedFile?.uri || !uploadedFile?.name) {
        throw new Error(
          "Informasi file Gemini belum lengkap."
        );
      }

      setUploadProgress(65);
      setNotice("AI sedang membaca dan merangkum dokumen...");

      const analyzeResponse = await fetch(
        "/api/document?action=analyze",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileUri: uploadedFile.uri,
            resourceName: uploadedFile.name,
            mimeType:
              uploadedFile.mimeType ||
              uploadedFile.mime_type ||
              "application/pdf",
            fileName: file.name,
          }),
        }
      );

      const data = await analyzeResponse.json();

      if (!analyzeResponse.ok) {
        throw new Error(
          data.error || "PDF belum berhasil dianalisis."
        );
      }

      setUploadProgress(90);

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
        createdByRole: session.role,
        visibility: "all",
      };

      await dbPutOne(
        "library",
        toDatabaseRecord(record),
        "manual"
      );

      await loadSharedDocuments();
      setSelectedId(record.id);
      setFile(null);
      setUploadProgress(100);
      setNotice(
        "Dokumen selesai disimpan dan dapat dibaca seluruh role pada sistem ini."
      );

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

      saveArray(
        "smkpd_ai_logs",
        [
          log,
          ...loadArray<UsageLog>("smkpd_ai_logs"),
        ],
        200
      );
    } catch (error) {
      setUploadProgress(0);
      setNotice(
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat membaca PDF."
      );
    } finally {
      setUploading(false);
    }
  }

  async function askDocument(
    event?: FormEvent,
    suggested?: string
  ) {
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
${selected.content.slice(0, 24000)}

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

      if (!response.ok) {
        throw new Error(
          data.error || "Pertanyaan belum terjawab."
        );
      }

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

      saveArray(
        "smkpd_ai_logs",
        [
          log,
          ...loadArray<UsageLog>("smkpd_ai_logs"),
        ],
        200
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Terjadi kendala."
      );
    } finally {
      setAsking(false);
    }
  }

  async function removeRecord(record: KnowledgeRecord) {
    if (!canDeleteSelected) return;

    const confirmed = window.confirm(
      `Hapus "${record.title}" dari Perpustakaan AI?`
    );
    if (!confirmed) return;

    await dbDelete(
      "library",
      toDatabaseRecord(record)
    );

    await loadSharedDocuments();
    setAnswer("");
    setNotice("Dokumen berhasil dihapus.");
  }

  return (
    <PortalLayout
      title="Perpustakaan AI Maritim"
      subtitle="Dokumen yang diunggah Admin, Kepala Sekolah, atau Guru dapat dibaca seluruh role."
    >
      <section className="knowledge-layout">
        <aside className="knowledge-sidebar">
          {canUpload ? (
            <form
              className="pdf-upload-card"
              onSubmit={uploadPdf}
            >
              <img
                src="/logo-smkpd-192.png"
                alt=""
              />
              <p className="suite-eyebrow">
                UPLOAD SATU DOKUMEN
              </p>
              <h2>Masukkan PDF Sekolah</h2>
              <p>
                Selesaikan satu dokumen terlebih dahulu.
                Setelah tersimpan, lanjutkan ke dokumen berikutnya.
              </p>

              <div className="shared-library-status">
                <strong>Visibilitas: Semua Pengguna</strong>
                <span>
                  Admin, Kepala Sekolah, Guru, Taruna, dan Wali Taruna dapat membaca hasilnya.
                </span>
              </div>

              <label>
                Pilih satu PDF maksimal 30 MB
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(event) =>
                    chooseFile(
                      event.target.files?.[0] || null
                    )
                  }
                />
              </label>

              {file && (
                <div className="selected-pdf">
                  <strong>{file.name}</strong>
                  <span>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
              )}

              {uploading && (
                <div
                  className="upload-progress"
                  aria-label={`Progres ${uploadProgress}%`}
                >
                  <i
                    style={{
                      width: `${uploadProgress}%`,
                    }}
                  />
                </div>
              )}

              <button
                disabled={!file || uploading}
              >
                {uploading
                  ? "Memproses Dokumen..."
                  : "📂 Upload dan Analisis"}
              </button>

              <span className="file-limit-note">
                📎 PDF diproses satu per satu • Maksimal 30 MB
              </span>
            </form>
          ) : (
            <div className="pdf-upload-card viewer">
              <img
                src="/logo-smkpd-192.png"
                alt=""
              />
              <p className="suite-eyebrow">
                AKSES PEMBACA
              </p>
              <h2>Perpustakaan Bersama</h2>
              <p>
                Anda dapat membaca dan bertanya pada semua dokumen sekolah yang telah diterbitkan oleh Admin, Kepala Sekolah, atau Guru.
              </p>
              <span className="visibility-badge">
                Dapat dibaca semua role
              </span>
            </div>
          )}

          <div className="knowledge-list-card">
            <div className="knowledge-list-heading">
              <div>
                <p className="suite-eyebrow">
                  DOKUMEN BERSAMA
                </p>
                <h3>{records.length} Dokumen</h3>
              </div>
            </div>

            <div className="knowledge-list">
              {records.map((record) => (
                <button
                  key={record.id}
                  className={
                    selectedId === record.id
                      ? "active"
                      : ""
                  }
                  onClick={() => {
                    setSelectedId(record.id);
                    setAnswer("");
                    setQuestion("");
                  }}
                >
                  <span>📄</span>
                  <div>
                    <strong>{record.title}</strong>
                    <small>
                      {formatDate(record.createdAt)}
                    </small>
                  </div>
                </button>
              ))}

              {records.length === 0 && (
                <div className="knowledge-empty-small">
                  Belum ada dokumen sekolah.
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
                  <p className="suite-eyebrow">
                    DOKUMEN AKTIF
                  </p>
                  <h2>{selected.title}</h2>
                  <span>
                    {selected.fileName} •{" "}
                    {(selected.size / 1024 / 1024).toFixed(2)} MB
                    {" "}• Oleh {selected.createdBy}
                    {selected.createdByRole
                      ? ` (${selected.createdByRole})`
                      : ""}
                  </span>
                </div>

                <div>
                  <span className="visibility-badge">
                    Semua Pengguna
                  </span>
                  {canDeleteSelected && (
                    <button
                      onClick={() =>
                        removeRecord(selected)
                      }
                    >
                      Hapus PDF
                    </button>
                  )}
                </div>
              </header>

              <article className="knowledge-summary">
                <h3>Ringkasan AI</h3>
                <RichText text={selected.summary} />
              </article>

              <div className="suggested-questions">
                <strong>
                  Pertanyaan yang disarankan
                </strong>
                <div>
                  {selected.suggestedQuestions.map(
                    (item) => (
                      <button
                        key={item}
                        onClick={() =>
                          askDocument(undefined, item)
                        }
                      >
                        {item}
                      </button>
                    )
                  )}
                </div>
              </div>

              <form
                className="knowledge-question"
                onSubmit={askDocument}
              >
                <textarea
                  value={question}
                  onChange={(event) =>
                    setQuestion(event.target.value)
                  }
                  rows={3}
                  placeholder="Tanyakan isi dokumen ini..."
                />
                <button
                  disabled={
                    !question.trim() || asking
                  }
                >
                  {asking
                    ? "Mencari jawaban..."
                    : "Tanyakan Dokumen →"}
                </button>
              </form>

              {answer && (
                <article className="knowledge-answer">
                  <div className="knowledge-answer-title">
                    <img
                      src="/logo-smkpd-64.png"
                      alt=""
                    />
                    <strong>
                      Jawaban berdasarkan dokumen
                    </strong>
                  </div>
                  <RichText text={answer} />
                </article>
              )}
            </>
          ) : (
            <div className="knowledge-empty">
              <img
                src="/logo-smkpd-192.png"
                alt=""
              />
              <h2>
                Perpustakaan belum berisi dokumen
              </h2>
              <p>
                Admin, Kepala Sekolah, atau Guru dapat
                mengunggah PDF pertama.
              </p>
            </div>
          )}

          {notice && (
            <p className="module-notice">
              {notice}
            </p>
          )}
        </section>
      </section>
    </PortalLayout>
  );
}
