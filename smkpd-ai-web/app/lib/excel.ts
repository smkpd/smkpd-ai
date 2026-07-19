import { DataModule, dataSchemas, normalizeRow, sheetToModule } from "./schema";

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
    throw new Error("SheetJS belum tersedia.");
  }

  return window.XLSX;
}

function normalizeExcelValue(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value;
}

export async function readDatabaseWorkbook(file: File) {
  const XLSX = await loadSheetJs();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
  });

  const result: Partial<Record<DataModule, Record<string, unknown>[]>> = {};
  const ignoredSheets: string[] = [];

  workbook.SheetNames.forEach((sheetName: string) => {
    const module = sheetToModule[sheetName.trim().toUpperCase()];
    if (!module) {
      if (!["PETUNJUK", "KREDIT"].includes(sheetName.toUpperCase())) {
        ignoredSheets.push(sheetName);
      }
      return;
    }

    const rawRows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
      defval: "",
      raw: false,
      dateNF: "yyyy-mm-dd",
    }) as Record<string, unknown>[];

    result[module] = rawRows
      .map((row) => {
        const normalized = normalizeRow(row, dataSchemas[module]);
        Object.entries(normalized).forEach(([key, value]) => {
          normalized[key] = normalizeExcelValue(value);
        });
        return normalized;
      })
      .filter((row) =>
        Object.values(row).some(
          (value) => value !== undefined && value !== null && String(value).trim()
        )
      );
  });

  return { modules: result, ignoredSheets };
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
    XLSX.utils.book_append_sheet(workbook, sheet, schema.sheetName);
  });

  XLSX.writeFile(
    workbook,
    `SMKPD_DATABASE_BACKUP_${new Date().toISOString().slice(0, 10)}.xlsx`
  );
}
