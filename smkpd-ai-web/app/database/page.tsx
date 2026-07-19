"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import {
  dbClear,
  dbCounts,
  dbGetAll,
  dbGetStoredRecords,
  dbSnapshot,
  dbUpsertMany,
  getImportLogs,
  ImportLog,
  saveImportLog,
} from "../lib/database";
import {
  DataModule,
  dataSchemas,
  schemaList,
  validateRows,
} from "../lib/schema";
import {
  exportDatabaseWorkbook,
  readDatabaseWorkbook,
} from "../lib/excel";

type PreviewModule = {
  module: DataModule;
  rows: Record<string, unknown>[];
  errors: Array<{ row: number; message: string }>;
  selected: boolean;
};

export default function DatabasePage() {
  const [tab, setTab] = useState<"summary" | "import" | "browser" | "cloud">("summary");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [preview, setPreview] = useState<PreviewModule[]>([]);
  const [fileName, setFileName] = useState("");
  const [ignoredSheets, setIgnoredSheets] = useState<string[]>([]);
  const [selectedModule, setSelectedModule] = useState<DataModule>("students");
  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [cloudConfigured, setCloudConfigured] = useState(false);

  async function refresh() {
    setCounts(await dbCounts());
    setLogs(await getImportLogs());
    setRecords(await dbGetAll(selectedModule));
  }

  useEffect(() => {
    refresh();
    fetch("/api/cloud-db?action=status")
      .then((response) => response.json())
      .then((data) => setCloudConfigured(Boolean(data.configured)))
      .catch(() => setCloudConfigured(false));
  }, []);

  useEffect(() => {
    dbGetAll(selectedModule).then(setRecords);
  }, [selectedModule]);

  const totalRecords = useMemo(
    () => Object.values(counts).reduce((sum, value) => sum + value, 0),
    [counts]
  );

  async function selectFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setNotice("Membaca workbook Excel...");
    try {
      const parsed = await readDatabaseWorkbook(file);
      const modules = Object.entries(parsed.modules).map(([module, rows]) => {
        const typedModule = module as DataModule;
        const typedRows = rows || [];
        return {
          module: typedModule,
          rows: typedRows,
          errors: validateRows(typedRows, dataSchemas[typedModule]),
          selected: true,
        };
      });
      setPreview(modules);
      setFileName(file.name);
      setIgnoredSheets(parsed.ignoredSheets);
      setNotice(`${modules.length} sheet database berhasil dibaca.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Excel gagal dibaca.");
    } finally {
      setBusy(false);
    }
  }

  async function importExcel() {
    const selected = preview.filter((item) => item.selected);
    if (!selected.length) return;
    setBusy(true);
    let inserted = 0;
    let updated = 0;
    let rejected = 0;
    const importedModules: string[] = [];

    try {
      for (const item of selected) {
        if (item.errors.length) {
          rejected += item.rows.length;
          continue;
        }
        const result = await dbUpsertMany(item.module, item.rows, "excel");
        inserted += result.inserted;
        updated += result.updated;
        importedModules.push(item.module);
      }

      await saveImportLog({
        fileName,
        importedAt: new Date().toISOString(),
        totalRows: selected.reduce((sum, item) => sum + item.rows.length, 0),
        inserted,
        updated,
        rejected,
        modules: importedModules,
      });

      setNotice(`Import selesai: ${inserted} baru, ${updated} diperbarui, ${rejected} ditolak.`);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function exportBackup() {
    setBusy(true);
    try {
      await exportDatabaseWorkbook(await dbSnapshot());
      setNotice("Backup Excel berhasil dibuat.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Backup gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function clearModule() {
    const schema = dataSchemas[selectedModule];
    if (!window.confirm(`Hapus seluruh data ${schema.label}?`)) return;
    await dbClear(selectedModule);
    await refresh();
    setNotice(`Data ${schema.label} dikosongkan.`);
  }

  async function pushCloud() {
    setBusy(true);
    try {
      const response = await fetch("/api/cloud-db?action=push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          records: await dbGetStoredRecords(),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sinkronisasi gagal.");
      setNotice(`Cloud sync selesai: ${data.count} rekaman dikirim.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Cloud sync gagal.");
    } finally {
      setBusy(false);
    }
  }

  async function pullCloud() {
    if (!window.confirm("Tarik data cloud dan upsert ke database lokal?")) return;
    setBusy(true);
    try {
      const response = await fetch("/api/cloud-db?action=pull");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Pengambilan gagal.");
      for (const item of data.records || []) {
        await dbUpsertMany(item.module, [item.payload], "cloud");
      }
      await refresh();
      setNotice(`${data.records?.length || 0} rekaman cloud diterima.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Cloud pull gagal.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalLayout
      title="Database & Import Excel"
      subtitle="Pusat data sekolah: impor massal, validasi, browser data, backup, dan cloud sync."
      allowedRoles={["Admin", "Kepala Sekolah"]}
    >
      <div className="module-tabs database-tabs">
        <button className={tab === "summary" ? "active" : ""} onClick={() => setTab("summary")}>Ringkasan</button>
        <button className={tab === "import" ? "active" : ""} onClick={() => setTab("import")}>Import Excel</button>
        <button className={tab === "browser" ? "active" : ""} onClick={() => setTab("browser")}>Data Browser</button>
        <button className={tab === "cloud" ? "active" : ""} onClick={() => setTab("cloud")}>Cloud & Backup</button>
      </div>

      {tab === "summary" && (
        <>
          <section className="database-hero-card">
            <div><p className="suite-eyebrow">DATABASE STATUS</p><h2>{totalRecords} Rekaman Tersimpan</h2><p>Database lokal menggunakan IndexedDB browser. Data lebih terstruktur dan mampu menampung impor massal.</p></div>
            <a href="/templates/SMKPD_TEMPLATE_IMPORT_DATABASE.xlsx" download>⬇ Download Template Excel</a>
          </section>
          <section className="database-module-grid">
            {schemaList.filter((schema) => schema.module !== "documents").map((schema) => (
              <button key={schema.module} onClick={() => { setSelectedModule(schema.module); setTab("browser"); }}>
                <span>{counts[schema.module] || 0}</span>
                <strong>{schema.label}</strong>
                <small>{schema.sheetName}</small>
              </button>
            ))}
          </section>
          <section className="module-card">
            <div className="module-card-header"><div><p className="suite-eyebrow">RIWAYAT IMPORT</p><h2>Import Terbaru</h2></div></div>
            <div className="import-history-list">
              {logs.slice(0, 8).map((log) => (
                <article key={log.id}><strong>{log.fileName}</strong><span>{log.importedAt.slice(0,19).replace("T"," ")}</span><small>{log.inserted} baru • {log.updated} update • {log.rejected} ditolak</small></article>
              ))}
              {!logs.length && <p>Belum ada riwayat import.</p>}
            </div>
          </section>
        </>
      )}

      {tab === "import" && (
        <section className="excel-import-layout">
          <article className="excel-upload-card">
            <img src="/logo-smkpd-192.png" alt=""/>
            <p className="suite-eyebrow">IMPORT MASSAL</p>
            <h2>Unggah Excel Database</h2>
            <p>Gunakan template resmi agar nama sheet dan kolom sesuai. Baris dengan kunci sama akan diperbarui.</p>
            <a href="/templates/SMKPD_TEMPLATE_IMPORT_DATABASE.xlsx" download>Download Template Excel</a>
            <label>Pilih file .xlsx<input type="file" accept=".xlsx,.xls" onChange={selectFile}/></label>
            {fileName && <strong>{fileName}</strong>}
            {ignoredSheets.length > 0 && <small>Sheet diabaikan: {ignoredSheets.join(", ")}</small>}
          </article>

          <section className="excel-preview-card">
            <div className="module-card-header"><div><p className="suite-eyebrow">VALIDASI</p><h2>Pratinjau Import</h2></div><button disabled={busy || !preview.length} onClick={importExcel}>{busy ? "Memproses..." : "Import Data"}</button></div>
            <div className="excel-sheet-list">
              {preview.map((item, index) => (
                <article className={item.errors.length ? "has-error" : ""} key={item.module}>
                  <input type="checkbox" checked={item.selected} onChange={(event) => setPreview(preview.map((current, currentIndex) => currentIndex === index ? {...current, selected:event.target.checked} : current))}/>
                  <div><strong>{dataSchemas[item.module].sheetName}</strong><span>{item.rows.length} baris</span><small>{item.errors.length ? `${item.errors.length} kesalahan` : "Siap diimport"}</small></div>
                  {item.errors.length > 0 && <ul>{item.errors.slice(0,4).map((error) => <li key={`${error.row}-${error.message}`}>Baris {error.row}: {error.message}</li>)}</ul>}
                </article>
              ))}
              {!preview.length && <div className="empty-state"><p>Belum ada file yang dipilih.</p></div>}
            </div>
          </section>
        </section>
      )}

      {tab === "browser" && (
        <section className="module-card">
          <div className="module-card-header database-browser-head">
            <div><p className="suite-eyebrow">DATA BROWSER</p><h2>{dataSchemas[selectedModule].label}</h2></div>
            <select value={selectedModule} onChange={(event) => setSelectedModule(event.target.value as DataModule)}>
              {schemaList.map((schema) => <option key={schema.module} value={schema.module}>{schema.label}</option>)}
            </select>
            <button onClick={clearModule}>Kosongkan Modul</button>
          </div>
          <div className="responsive-table-wrap">
            <table className="school-table">
              <thead><tr>{dataSchemas[selectedModule].fields.map((field) => <th key={field}>{field}</th>)}</tr></thead>
              <tbody>
                {records.slice(0,200).map((row, index) => (
                  <tr key={String(row.id || index)}>
                    {dataSchemas[selectedModule].fields.map((field) => <td key={field}>{String(row[field] ?? "")}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="database-limit-note">Menampilkan maksimal 200 baris. Total: {records.length}.</p>
        </section>
      )}

      {tab === "cloud" && (
        <section className="cloud-database-grid">
          <article className="module-card">
            <p className="suite-eyebrow">BACKUP LOKAL</p>
            <h2>Export Database ke Excel</h2>
            <p>Unduh seluruh data database dalam workbook Excel terpisah per modul.</p>
            <button disabled={busy} onClick={exportBackup}>⬇ Export Backup Excel</button>
          </article>
          <article className="module-card">
            <p className="suite-eyebrow">DATABASE ONLINE</p>
            <h2>{cloudConfigured ? "Supabase Terhubung" : "Supabase Belum Diatur"}</h2>
            <p>Cloud database memungkinkan data diakses dari perangkat berbeda. Kunci rahasia hanya disimpan pada Vercel.</p>
            <div className="cloud-actions"><button disabled={!cloudConfigured || busy} onClick={pushCloud}>Kirim ke Cloud</button><button disabled={!cloudConfigured || busy} onClick={pullCloud}>Tarik dari Cloud</button></div>
            {!cloudConfigured && <small>Tambahkan SUPABASE_URL dan SUPABASE_SECRET_KEY pada Environment Variables, lalu jalankan SQL yang disertakan.</small>}
          </article>
        </section>
      )}

      {notice && <p className="module-notice">{notice}</p>}
    </PortalLayout>
  );
}
