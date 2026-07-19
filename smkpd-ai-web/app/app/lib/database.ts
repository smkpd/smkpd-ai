import { createId } from "./client";
import { DataModule, dataSchemas } from "./schema";

const DB_NAME = "smkpd_ai_database";
const DB_VERSION = 1;
const RECORD_STORE = "records";
const IMPORT_STORE = "import_logs";

export type StoredRecord<T = Record<string, unknown>> = {
  key: string;
  id: string;
  module: DataModule;
  uniqueKey: string;
  data: T;
  source: "manual" | "excel" | "legacy" | "cloud";
  createdAt: string;
  updatedAt: string;
};

export type ImportLog = {
  id: string;
  fileName: string;
  importedAt: string;
  totalRows: number;
  inserted: number;
  updated: number;
  rejected: number;
  modules: string[];
};

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(RECORD_STORE)) {
        const store = database.createObjectStore(RECORD_STORE, {
          keyPath: "key",
        });
        store.createIndex("module", "module", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }

      if (!database.objectStoreNames.contains(IMPORT_STORE)) {
        database.createObjectStore(IMPORT_STORE, {
          keyPath: "id",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function valueForKey(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value ?? "").trim().toLowerCase();
}

function buildUniqueKey(
  module: DataModule,
  data: Record<string, unknown>,
  uniqueFields = dataSchemas[module].uniqueFields
) {
  const values = uniqueFields.map((field) => valueForKey(data[field]));
  if (values.every((value) => !value)) {
    return String(data.id || createId());
  }
  return values.join("::");
}

export async function dbGetAll<T = Record<string, unknown>>(
  module: DataModule
): Promise<T[]> {
  const database = await openDatabase();
  const transaction = database.transaction(RECORD_STORE, "readonly");
  const done = transactionDone(transaction);
  const index = transaction.objectStore(RECORD_STORE).index("module");
  const records = await requestToPromise(
    index.getAll(IDBKeyRange.only(module))
  );
  await done;
  database.close();

  return (records as StoredRecord<T>[])
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map((record) => ({
      ...record.data,
      id: (record.data as any)?.id || record.id,
    }));
}

export async function dbGetStoredRecords(
  module?: DataModule
): Promise<StoredRecord[]> {
  const database = await openDatabase();
  const transaction = database.transaction(RECORD_STORE, "readonly");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(RECORD_STORE);
  const records = module
    ? await requestToPromise(
        store.index("module").getAll(IDBKeyRange.only(module))
      )
    : await requestToPromise(store.getAll());
  await done;
  database.close();
  return records as StoredRecord[];
}

export async function dbUpsertMany(
  module: DataModule,
  rows: Record<string, unknown>[],
  source: StoredRecord["source"] = "manual"
) {
  const existingRecords = await dbGetStoredRecords(module);
  const existingByKey = new Map(
    existingRecords.map((record) => [record.key, record])
  );

  const database = await openDatabase();
  const transaction = database.transaction(RECORD_STORE, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(RECORD_STORE);
  let inserted = 0;
  let updated = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    const generatedId = String(row.id || createId());
    const uniqueKey = buildUniqueKey(module, row);
    const key = `${module}::${uniqueKey}`;
    const existing = existingByKey.get(key);

    const record: StoredRecord = {
      key,
      id: existing?.id || generatedId,
      module,
      uniqueKey,
      data: {
        ...existing?.data,
        ...row,
        id: existing?.id || generatedId,
      },
      source,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    store.put(record);
    existingByKey.set(key, record);
    if (existing) updated += 1;
    else inserted += 1;
  }

  await done;
  database.close();
  return { inserted, updated };
}

export async function dbPutOne(
  module: DataModule,
  row: Record<string, unknown>,
  source: StoredRecord["source"] = "manual"
) {
  return dbUpsertMany(module, [row], source);
}

export async function dbDelete(module: DataModule, row: Record<string, unknown>) {
  const database = await openDatabase();
  const transaction = database.transaction(RECORD_STORE, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(RECORD_STORE);
  const uniqueKey = buildUniqueKey(module, row);
  store.delete(`${module}::${uniqueKey}`);
  await done;
  database.close();
}

export async function dbClear(module: DataModule) {
  const records = await dbGetStoredRecords(module);
  const database = await openDatabase();
  const transaction = database.transaction(RECORD_STORE, "readwrite");
  const done = transactionDone(transaction);
  const store = transaction.objectStore(RECORD_STORE);
  records.forEach((record) => store.delete(record.key));
  await done;
  database.close();
}

export async function dbCounts() {
  const records = await dbGetStoredRecords();
  const counts: Record<string, number> = {};
  records.forEach((record) => {
    counts[record.module] = (counts[record.module] || 0) + 1;
  });
  return counts;
}

export async function dbSnapshot() {
  const records = await dbGetStoredRecords();
  const grouped: Record<string, Record<string, unknown>[]> = {};

  records.forEach((record) => {
    grouped[record.module] ||= [];
    grouped[record.module].push({
      ...record.data,
      id: (record.data as any)?.id || record.id,
    });
  });

  return grouped;
}

export async function dbReplaceModule(
  module: DataModule,
  rows: Record<string, unknown>[],
  source: StoredRecord["source"] = "manual"
) {
  await dbClear(module);
  return dbUpsertMany(module, rows, source);
}

export async function saveImportLog(log: Omit<ImportLog, "id">) {
  const database = await openDatabase();
  const transaction = database.transaction(IMPORT_STORE, "readwrite");
  const done = transactionDone(transaction);
  transaction.objectStore(IMPORT_STORE).put({
    ...log,
    id: createId(),
  });
  await done;
  database.close();
}

export async function getImportLogs(): Promise<ImportLog[]> {
  const database = await openDatabase();
  const transaction = database.transaction(IMPORT_STORE, "readonly");
  const done = transactionDone(transaction);
  const logs = await requestToPromise(
    transaction.objectStore(IMPORT_STORE).getAll()
  );
  await done;
  database.close();
  return (logs as ImportLog[]).sort((a, b) =>
    b.importedAt.localeCompare(a.importedAt)
  );
}

export async function migrateLegacyData() {
  const migrations: Array<{
    localKey: string;
    module: DataModule;
    transform?: (value: any) => Record<string, unknown>[];
  }> = [
    {
      localKey: "smkpd_users",
      module: "users",
      transform: (values) =>
        values.map((value: any) => ({
          nama: value.name,
          username: value.username,
          password: value.password,
          role: value.role,
          kelas_identitas: value.className || "",
          status: value.isActive === false ? "Nonaktif" : "Aktif",
          id: value.id,
        })),
    },
    {
      localKey: "smkpd_grades",
      module: "grades",
      transform: (values) =>
        values.map((value: any) => ({
          nit: value.nit || value.student,
          nama: value.student || value.name,
          kelas: value.className,
          mata_pelajaran: value.subject,
          semester: value.semester,
          tahun_ajaran: value.schoolYear || "2026/2027",
          pengetahuan: value.knowledge,
          keterampilan: value.skill,
          sikap: value.attitude,
          catatan: value.note || "",
          id: value.id,
        })),
    },
    {
      localKey: "smkpd_attendance",
      module: "attendance",
      transform: (values) =>
        values.map((value: any) => ({
          tanggal: value.date,
          nit: value.nit || value.student,
          nama: value.student || value.name,
          kelas: value.className,
          status: value.status,
          catatan: value.note || "",
          id: value.id,
        })),
    },
    {
      localKey: "smkpd_library",
      module: "library",
      transform: (values) =>
        values.map((value: any, index: number) => ({
          kode: value.code || value.id || `LIB-${index + 1}`,
          judul: value.title,
          kategori: value.category,
          tingkat: value.level,
          deskripsi: value.description,
          sumber_url: value.sourceUrl || "",
          status: "Aktif",
          id: value.id,
        })),
    },
  ];

  for (const migration of migrations) {
    const raw = localStorage.getItem(migration.localKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || !parsed.length) continue;
      const existing = await dbGetAll(migration.module);
      if (existing.length) continue;
      const rows = migration.transform ? migration.transform(parsed) : parsed;
      await dbUpsertMany(migration.module, rows, "legacy");
    } catch {
      // Keep the app usable even if legacy data is malformed.
    }
  }

  const serviceRaw = localStorage.getItem("smkpd_services");
  if (serviceRaw) {
    try {
      const parsed = JSON.parse(serviceRaw);
      if (Array.isArray(parsed)) {
        for (const module of ["spp", "prala", "mcu", "alumni", "ppdb"] as DataModule[]) {
          const existing = await dbGetAll(module);
          if (existing.length) continue;
          const rows = parsed
            .filter((item: any) => item.module === module)
            .map((item: any) => ({
              ...item,
              nama: item.name,
              status: item.status,
              catatan: item.note || "",
            }));
          if (rows.length) await dbUpsertMany(module, rows, "legacy");
        }
      }
    } catch {
      // Ignore malformed legacy service data.
    }
  }
}
