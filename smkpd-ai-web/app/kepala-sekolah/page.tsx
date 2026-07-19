"use client";

import { useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import {
  formatDate,
  KnowledgeRecord,
  loadArray,
  UsageLog,
} from "../lib/client";

type DocumentRecord = {
  id: string;
  tool: string;
  toolTitle: string;
  title: string;
  mapel: string;
  kelas: string;
  createdAt: string;
};

const modeLabels: Record<string, string> = {
  umum: "AI Umum",
  nautika: "AI Nautika",
  teknika: "AI Teknika",
  english: "Maritime English",
  knowledge: "Tanya PDF",
  pdf: "Upload PDF",
  modul: "Modul Ajar",
  cp: "CP",
  atp: "ATP",
  lkpd: "LKPD",
  soal: "Soal",
  surat: "Surat",
};

export default function PrincipalDashboard() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeRecord[]>([]);
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [refreshedAt, setRefreshedAt] = useState("");

  function refresh() {
    setDocuments(loadArray<DocumentRecord>("smkpd_documents"));
    setKnowledge(loadArray<KnowledgeRecord>("smkpd_knowledge"));
    setLogs(loadArray<UsageLog>("smkpd_ai_logs"));
    setRefreshedAt(new Date().toISOString());
  }

  useEffect(() => {
    refresh();
  }, []);

  const today = new Date().toDateString();
  const activityToday = logs.filter(
    (log) => new Date(log.createdAt).toDateString() === today
  ).length;

  const modes = useMemo(() => {
    const counter: Record<string, number> = {};
    logs.forEach((log) => {
      counter[log.mode] = (counter[log.mode] || 0) + 1;
    });
    return Object.entries(counter)
      .map(([mode, count]) => ({
        mode,
        label: modeLabels[mode] || mode,
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [logs]);

  const documentTypes = useMemo(() => {
    const counter: Record<string, number> = {};
    documents.forEach((document) => {
      const label = document.toolTitle || document.tool;
      counter[label] = (counter[label] || 0) + 1;
    });
    return Object.entries(counter)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }, [documents]);

  const maxMode = Math.max(1, ...modes.map((item) => item.count));
  const maxDocument = Math.max(1, ...documentTypes.map((item) => item.count));
  const totalOutputChars = logs.reduce(
    (total, log) => total + (log.outputChars || 0),
    0
  );

  function printReport() {
    window.print();
  }

  return (
    <PortalLayout
      title="Dashboard Kepala Sekolah"
      subtitle="Ringkasan penggunaan AI, dokumen, Knowledge Base, dan aktivitas layanan."
      allowedRoles={["Kepala Sekolah", "Admin"]}
    >
      <section className="principal-hero">
        <div>
          <p className="suite-eyebrow">EXECUTIVE OVERVIEW</p>
          <h2>Monitoring Transformasi Digital SMKPD</h2>
          <p>
            Statistik ini dihitung dari penggunaan pada browser dan perangkat yang
            sedang dibuka untuk kebutuhan demonstrasi.
          </p>
        </div>
        <div className="principal-actions">
          <button onClick={refresh}>↻ Perbarui Data</button>
          <button onClick={printReport}>🖨️ Cetak Laporan</button>
        </div>
      </section>

      <section className="principal-stats">
        <article>
          <span>🗂️</span>
          <div><strong>{documents.length}</strong><small>Dokumen Generator</small></div>
        </article>
        <article>
          <span>📂</span>
          <div><strong>{knowledge.length}</strong><small>Knowledge PDF</small></div>
        </article>
        <article>
          <span>✦</span>
          <div><strong>{logs.length}</strong><small>Aktivitas AI</small></div>
        </article>
        <article>
          <span>📅</span>
          <div><strong>{activityToday}</strong><small>Aktivitas Hari Ini</small></div>
        </article>
        <article>
          <span>📝</span>
          <div><strong>{Math.round(totalOutputChars / 1000)}K</strong><small>Karakter Dihasilkan</small></div>
        </article>
      </section>

      <section className="principal-grid">
        <article className="analytics-card">
          <header>
            <div>
              <p className="suite-eyebrow">LAYANAN AI</p>
              <h3>Penggunaan Berdasarkan Mode</h3>
            </div>
          </header>
          <div className="analytics-bars">
            {modes.length > 0 ? (
              modes.map((item) => (
                <div className="analytics-row" key={item.mode}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="analytics-track">
                    <i style={{ width: `${(item.count / maxMode) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="analytics-empty">Belum ada aktivitas AI.</p>
            )}
          </div>
        </article>

        <article className="analytics-card">
          <header>
            <div>
              <p className="suite-eyebrow">ADMINISTRASI</p>
              <h3>Dokumen Berdasarkan Jenis</h3>
            </div>
          </header>
          <div className="analytics-bars document-bars">
            {documentTypes.length > 0 ? (
              documentTypes.map((item) => (
                <div className="analytics-row" key={item.label}>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.count}</strong>
                  </div>
                  <div className="analytics-track">
                    <i style={{ width: `${(item.count / maxDocument) * 100}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <p className="analytics-empty">Belum ada dokumen generator.</p>
            )}
          </div>
        </article>
      </section>

      <section className="principal-grid">
        <article className="analytics-card recent-card">
          <header>
            <div>
              <p className="suite-eyebrow">AKTIVITAS TERBARU</p>
              <h3>Riwayat Penggunaan AI</h3>
            </div>
          </header>
          <div className="recent-activity">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id}>
                <span>
                  {log.type === "knowledge" ? "📂" : log.type === "voice" ? "🎤" : "✦"}
                </span>
                <div>
                  <strong>{log.title}</strong>
                  <small>
                    {modeLabels[log.mode] || log.mode} • {log.role} • {formatDate(log.createdAt)}
                  </small>
                </div>
              </div>
            ))}
            {logs.length === 0 && (
              <p className="analytics-empty">Belum ada aktivitas yang tercatat.</p>
            )}
          </div>
        </article>

        <article className="analytics-card recent-card">
          <header>
            <div>
              <p className="suite-eyebrow">KNOWLEDGE BASE</p>
              <h3>Dokumen PDF Terbaru</h3>
            </div>
          </header>
          <div className="recent-activity">
            {knowledge.slice(0, 8).map((record) => (
              <div key={record.id}>
                <span>📄</span>
                <div>
                  <strong>{record.title}</strong>
                  <small>
                    {record.createdBy} • {formatDate(record.createdAt)}
                  </small>
                </div>
              </div>
            ))}
            {knowledge.length === 0 && (
              <p className="analytics-empty">Belum ada PDF pada Knowledge Base.</p>
            )}
          </div>
        </article>
      </section>

      <p className="principal-refresh">
        Data terakhir dimuat: {refreshedAt ? formatDate(refreshedAt) : "-"}
      </p>
    </PortalLayout>
  );
}
