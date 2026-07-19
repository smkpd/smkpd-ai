"use client";

import {
  ChangeEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  readSingleModuleWorkbook,
} from "../lib/excel";

export default function DatabasePage() {
  const [tab, setTab] = useState<
    "summary" | "import" | "browser" | "cloud"
  >("summary");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [importModule, setImportModule] =
    useState<DataModule>("students");
  const [previewRows, setPreviewRows] = useState<
    Record<string, unknown>[]
  >([]);
  const [validationErrors, setValidationErrors] = useState<
    Array<{ row: number; message: string }>
  >([]);
  const [fileName, setFileName] = useState("");
  const [selectedModule, setSelectedModule] =
    useState<DataModule>("students");
  const [records, setRecords] = useState<
    Record<string, unknown>[]
  >([]);
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

  useEffect(() => {
    setPreviewRows([]);
    setValidationErrors([]);
    setFileName("");
    setNotice("");
  }, [importModule]);

  const totalRecords = useMemo(
    () => Object.values(counts).reduce(
      (sum, value) => sum + value,
      0
    ),
    [counts]
  );

  const importSchema = dataSchemas[importModule];
  const templateUrl =
    `/templates/items/${importSchema.sheetName}.xlsx`;

  async function selectFile(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const maxFileSize = 30 * 1024 * 1024;
    if (file.size > maxFileSize) {
      setPreviewRows([]);
      setValidationErrors([]);
      setFileName("");
      setNotice("Ukuran satu file Excel maksimal 30 MB.");
      event.target.value = "";
      return;
    }

    setBusy(true);
    setNotice(`Membaca data ${importSchema.label}...`);

    try {
      const parsed = await readSingleModuleWorkbook(
        file,
        importModule
      );
      const errors = validateRows(
        parsed.rows,
        importSchema
      );

      setPreviewRows(parsed.rows);
      setValidationErrors(errors);
      setFileName(file.name);

      setNotice(
        errors.length
          ? `${parsed.rows.length} baris dibaca, terdapat ${errors.length} kesalahan.`
          : `${parsed.rows.length} baris siap diimport.`
      );
    } catch (error) {
      setPreviewRows([]);
      setValidationErrors([]);
      setFileName("");
      setNotice(
        error instanceof Error
          ? error.message
          : "Excel gagal dibaca."
      );
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function importOneItem() {
    if (
      !previewRows.length ||
      validationErrors.length ||
      busy
    ) {
      return;
    }

    setBusy(true);

    try {
      const result = await dbUpsertMany(
        importModule,
        previewRows,
        "excel"
      );

      await saveImportLog({
        fileName,
        importedAt: new Date().toISOString(),
        totalRows: previewRows.length,
        inserted: result.inserted,
        updated: result.updated,
        rejected: 0,
        modules: [importModule],
      });

      setNotice(
        `${importSchema.label} selesai: ` +
          `${result.inserted} data baru dan ` +
          `${result.updated} data diperbarui.`
      );
      setPreviewRows([]);
      setValidationErrors([]);
      setFileName("");
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
      setNotice(
        error instanceof Error
          ? error.message
          : "Backup gagal."
      );
    } finally {
      setBusy(false);
    }
  }

  async function clearModule() {
    const schema = dataSchemas[selectedModule];
    if (!window.confirm(
      `Hapus seluruh data ${schema.label}?`
    )) return;

    await dbClear(selectedModule);
    await refresh();
    setNotice(`Data ${schema.label} dikosongkan.`);
  }

  async function pushCloud() {
    setBusy(true);
    try {
      const response = await fetch(
        "/api/cloud-db?action=push",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            records: await dbGetStoredRecords(),
          }),
        }
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Sinkronisasi gagal."
        );
      }

      setNotice(
        `${data.count} rekaman dikirim ke database online.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Sinkronisasi gagal."
      );
    } finally {
      setBusy(false);
    }
  }

  async function pullCloud() {
    if (!window.confirm(
      "Tarik data online dan perbarui database perangkat ini?"
    )) return;

    setBusy(true);

    try {
      const response = await fetch(
        "/api/cloud-db?action=pull"
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Pengambilan data gagal."
        );
      }

      for (const item of data.records || []) {
        await dbUpsertMany(
          item.module,
          [item.payload],
          "cloud"
        );
      }

      await refresh();
      setNotice(
        `${data.records?.length || 0} rekaman diterima.`
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Pengambilan data gagal."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <PortalLayout
      title="Database & Excel"
      subtitle="Kelola satu jenis data pada setiap proses agar validasi dan perbaikan lebih mudah."
      allowedRoles={["Admin", "Kepala Sekolah"]}
    >
      <div className="module-tabs database-tabs">
        <button
          className={tab === "summary" ? "active" : ""}
          onClick={() => setTab("summary")}
        >
          Ringkasan
        </button>
        <button
          className={tab === "import" ? "active" : ""}
          onClick={() => setTab("import")}
        >
          Import Satu Item
        </button>
        <button
          className={tab === "browser" ? "active" : ""}
          onClick={() => setTab("browser")}
        >
          Data Browser
        </button>
        <button
          className={tab === "cloud" ? "active" : ""}
          onClick={() => setTab("cloud")}
        >
          Backup & Online
        </button>
      </div>

      {tab === "summary" && (
        <>
          <section className="database-hero-card">
            <div>
              <p className="suite-eyebrow">
                STATUS DATABASE
              </p>
              <h2>{totalRecords} Rekaman Tersimpan</h2>
              <p>
                Setiap kategori data memiliki template dan
                proses import sendiri agar pekerjaan tidak
                bercampur.
              </p>
            </div>
            <button
              onClick={() => setTab("import")}
              className="database-start-import"
            >
              Import Data →
            </button>
          </section>

          <section className="database-module-grid">
            {schemaList
              .filter(
                (schema) =>
                  schema.module !== "documents"
              )
              .map((schema) => (
                <button
                  key={schema.module}
                  onClick={() => {
                    setImportModule(schema.module);
                    setTab("import");
                  }}
                >
                  <span>
                    {counts[schema.module] || 0}
                  </span>
                  <strong>{schema.label}</strong>
                  <small>
                    Kelola satu item
                  </small>
                </button>
              ))}
          </section>

          <section className="module-card">
            <div className="module-card-header">
              <div>
                <p className="suite-eyebrow">
                  RIWAYAT IMPORT
                </p>
                <h2>Proses Terbaru</h2>
              </div>
            </div>
            <div className="import-history-list">
              {logs.slice(0, 8).map((log) => (
                <article key={log.id}>
                  <strong>{log.fileName}</strong>
                  <span>
                    {log.importedAt
                      .slice(0, 19)
                      .replace("T", " ")}
                  </span>
                  <small>
                    {log.inserted} baru •{" "}
                    {log.updated} diperbarui
                  </small>
                </article>
              ))}
              {!logs.length && (
                <p>Belum ada riwayat import.</p>
              )}
            </div>
          </section>
        </>
      )}

      {tab === "import" && (
        <section className="single-import-layout">
          <article className="single-import-steps">
            <p className="suite-eyebrow">
              IMPORT DATA BERTAHAP
            </p>
            <h2>Satu jenis data per proses</h2>

            <label>
              1. Pilih jenis data
              <select
                value={importModule}
                onChange={(event) =>
                  setImportModule(
                    event.target.value as DataModule
                  )
                }
              >
                {schemaList
                  .filter(
                    (schema) =>
                      schema.module !== "documents"
                  )
                  .map((schema) => (
                    <option
                      key={schema.module}
                      value={schema.module}
                    >
                      {schema.label}
                    </option>
                  ))}
              </select>
            </label>

            <div className="single-import-summary">
              <span>Item aktif</span>
              <strong>{importSchema.label}</strong>
              <small>
                Kunci unik:{" "}
                {importSchema.uniqueFields.join(" + ")}
              </small>
            </div>

            <a href={templateUrl} download>
              2. Download Template{" "}
              {importSchema.label}
            </a>

            <label className="single-file-upload">
              3. Pilih satu file Excel (maksimal 30 MB)
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={selectFile}
                disabled={busy}
              />
            </label>

            <p>
              Isi hanya satu kategori data pada file.
              Maksimal 30 MB. Import berikutnya dapat dilakukan
              setelah item ini selesai.
            </p>
          </article>

          <section className="single-import-preview">
            <div className="module-card-header">
              <div>
                <p className="suite-eyebrow">
                  PRATINJAU DAN VALIDASI
                </p>
                <h2>{importSchema.label}</h2>
              </div>
              <button
                disabled={
                  busy ||
                  !previewRows.length ||
                  validationErrors.length > 0
                }
                onClick={importOneItem}
              >
                {busy
                  ? "Memproses..."
                  : "Simpan ke Database"}
              </button>
            </div>

            {fileName && (
              <div className="selected-import-file">
                <strong>{fileName}</strong>
                <span>
                  {previewRows.length} baris terbaca
                </span>
              </div>
            )}

            {validationErrors.length > 0 && (
              <div className="single-import-errors">
                <strong>
                  Perbaiki data sebelum import:
                </strong>
                <ul>
                  {validationErrors
                    .slice(0, 10)
                    .map((error) => (
                      <li
                        key={`${error.row}-${error.message}`}
                      >
                        Baris {error.row}:{" "}
                        {error.message}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {previewRows.length > 0 ? (
              <div className="responsive-table-wrap">
                <table className="school-table">
                  <thead>
                    <tr>
                      {importSchema.fields.map(
                        (field) => (
                          <th key={field}>{field}</th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows
                      .slice(0, 20)
                      .map((row, index) => (
                        <tr key={index}>
                          {importSchema.fields.map(
                            (field) => (
                              <td key={field}>
                                {String(
                                  row[field] ?? ""
                                )}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <img
                  src="/logo-smkpd-192.png"
                  alt=""
                />
                <p>
                  Pilih jenis data, download template,
                  lalu unggah satu file Excel.
                </p>
              </div>
            )}
          </section>
        </section>
      )}

      {tab === "browser" && (
        <section className="module-card">
          <div className="module-card-header database-browser-head">
            <div>
              <p className="suite-eyebrow">
                DATA BROWSER
              </p>
              <h2>
                {dataSchemas[selectedModule].label}
              </h2>
            </div>
            <select
              value={selectedModule}
              onChange={(event) =>
                setSelectedModule(
                  event.target.value as DataModule
                )
              }
            >
              {schemaList.map((schema) => (
                <option
                  key={schema.module}
                  value={schema.module}
                >
                  {schema.label}
                </option>
              ))}
            </select>
            <button onClick={clearModule}>
              Kosongkan Modul
            </button>
          </div>

          <div className="responsive-table-wrap">
            <table className="school-table">
              <thead>
                <tr>
                  {dataSchemas[
                    selectedModule
                  ].fields.map((field) => (
                    <th key={field}>{field}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records
                  .slice(0, 200)
                  .map((row, index) => (
                    <tr
                      key={String(
                        row.id || index
                      )}
                    >
                      {dataSchemas[
                        selectedModule
                      ].fields.map((field) => (
                        <td key={field}>
                          {String(row[field] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="database-limit-note">
            Menampilkan maksimal 200 baris.
            Total: {records.length}.
          </p>
        </section>
      )}

      {tab === "cloud" && (
        <section className="cloud-database-grid">
          <article className="module-card">
            <p className="suite-eyebrow">
              BACKUP DATABASE
            </p>
            <h2>Export Seluruh Data</h2>
            <p>
              Download seluruh database sebagai workbook
              Excel untuk arsip dan pemulihan.
            </p>
            <button
              disabled={busy}
              onClick={exportBackup}
            >
              ⬇ Export Backup Excel
            </button>
          </article>

          <article className="module-card">
            <p className="suite-eyebrow">
              DATABASE ONLINE
            </p>
            <h2>
              {cloudConfigured
                ? "Database Online Terhubung"
                : "Database Online Belum Diatur"}
            </h2>
            <p>
              Sinkronisasi memungkinkan data digunakan
              pada perangkat berbeda setelah konfigurasi
              server selesai.
            </p>
            <div className="cloud-actions">
              <button
                disabled={
                  !cloudConfigured || busy
                }
                onClick={pushCloud}
              >
                Kirim Data
              </button>
              <button
                disabled={
                  !cloudConfigured || busy
                }
                onClick={pullCloud}
              >
                Ambil Data
              </button>
            </div>
          </article>
        </section>
      )}

      {notice && (
        <p className="module-notice">{notice}</p>
      )}
    </PortalLayout>
  );
}
