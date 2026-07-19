import {
  DataModule,
  dataSchemas,
  normalizeRow,
} from "./schema";

declare global {
  interface Window {
    XLSX?: any;
  }
}

const SHEETJS_URL =
  "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";

export async function loadSheetJs() {
  if (window.XLSX) return window.XLSX;

  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SHEETJS_URL}"]`
    );

    if (existing) {
      if (window.XLSX) {
        resolve();
        return;
      }
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("Library Excel gagal dimuat.")),
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = SHEETJS_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(
        new Error(
          "Library Excel gagal dimuat. Pastikan perangkat terhubung ke internet."
        )
      );
    document.head.appendChild(script);
  });

  if (!window.XLSX) {
    throw new Error("Library Excel belum tersedia.");
  }

  return window.XLSX;
}

export async function readSingleModuleWorkbook(
  file: File,
  module: DataModule
) {
  const maxFileSize = 30 * 1024 * 1024;

  if (file.size > maxFileSize) {
    throw new Error(
      "Ukuran satu file Excel maksimal 30 MB."
    );
  }

  const XLSX = await loadSheetJs();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const schema = dataSchemas[module];
  const preferredNames = [
    "DATA",
    schema.sheetName,
    schema.sheetName.toUpperCase(),
  ];

  const selectedSheetName =
    preferredNames.find((name) => workbook.SheetNames.includes(name)) ||
    workbook.SheetNames.find(
      (name: string) =>
        !["PETUNJUK", "KREDIT"].includes(name.trim().toUpperCase())
    );

  if (!selectedSheetName) {
    throw new Error("File tidak memiliki sheet data yang dapat dibaca.");
  }

  const rawRows = XLSX.utils.sheet_to_json(
    workbook.Sheets[selectedSheetName],
    {
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    }
  ) as Record<string, unknown>[];

  const rows = rawRows
    .map((row) => normalizeRow(row, schema))
    .filter((row) =>
      Object.values(row).some(
        (value) =>
          value !== undefined &&
          value !== null &&
          String(value).trim() !== ""
      )
    );

  return {
    module,
    sheetName: selectedSheetName,
    rows,
  };
}

export async function exportDatabaseWorkbook(
  snapshot: Record<string, Record<string, unknown>[]>
) {
  const XLSX = await loadSheetJs();
  const workbook = XLSX.utils.book_new();

  Object.entries(snapshot).forEach(([module, rows]) => {
    const schema = dataSchemas[module as DataModule];
    if (!schema) return;

    const orderedRows = rows.map((row) => {
      const ordered: Record<string, unknown> = {};
      schema.fields.forEach((field) => {
        ordered[field] = row[field] ?? "";
      });
      return ordered;
    });

    const sheet = XLSX.utils.json_to_sheet(orderedRows, {
      header: schema.fields,
    });
    XLSX.utils.book_append_sheet(
      workbook,
      sheet,
      schema.sheetName
    );
  });

  XLSX.writeFile(
    workbook,
    `SMKPD_DATABASE_BACKUP_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  );
}
