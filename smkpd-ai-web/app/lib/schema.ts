export type DataModule = "users" | "students" | "teachers" | "attendance" | "grades" | "spp" | "prala" | "mcu" | "alumni" | "ppdb" | "library" | "question_bank" | "schedule_classes" | "schedule_subjects" | "schedule_rooms" | "schedule_preferences" | "teaching_loads" | "schedule_entries" | "documents";

export type DataSchema = {
  module: DataModule;
  label: string;
  sheetName: string;
  uniqueFields: string[];
  requiredFields: string[];
  fields: string[];
};

export const dataSchemas: Record<DataModule, DataSchema> = {
  users: {
    module: "users",
    label: "Pengguna",
    sheetName: "PENGGUNA",
    uniqueFields: ["username"],
    requiredFields: ["nama", "username", "password", "role"],
    fields: ["nama", "username", "password", "role", "kelas_identitas", "status"],
  },
  students: {
    module: "students",
    label: "Taruna",
    sheetName: "TARUNA",
    uniqueFields: ["nit"],
    requiredFields: ["nit", "nama", "kelas", "program_keahlian"],
    fields: ["nit", "nama", "kelas", "program_keahlian", "jenis_kelamin", "tempat_lahir", "tanggal_lahir", "nama_wali", "telepon", "status"],
  },
  teachers: {
    module: "teachers",
    label: "Guru",
    sheetName: "GURU",
    uniqueFields: ["nip_kode"],
    requiredFields: ["nip_kode", "nama"],
    fields: ["nip_kode", "nama", "jabatan", "mata_pelajaran", "telepon", "email", "status"],
  },
  attendance: {
    module: "attendance",
    label: "Absensi",
    sheetName: "ABSENSI",
    uniqueFields: ["tanggal", "nit"],
    requiredFields: ["tanggal", "nit", "status"],
    fields: ["tanggal", "nit", "nama", "kelas", "status", "catatan"],
  },
  grades: {
    module: "grades",
    label: "Nilai / E-Raport",
    sheetName: "NILAI",
    uniqueFields: ["nit", "mata_pelajaran", "semester", "tahun_ajaran"],
    requiredFields: ["nit", "mata_pelajaran", "semester", "tahun_ajaran", "pengetahuan", "keterampilan"],
    fields: ["nit", "nama", "kelas", "mata_pelajaran", "semester", "tahun_ajaran", "pengetahuan", "keterampilan", "sikap", "catatan"],
  },
  spp: {
    module: "spp",
    label: "Pembayaran SPP",
    sheetName: "SPP",
    uniqueFields: ["nit", "bulan", "tahun"],
    requiredFields: ["nit", "bulan", "tahun", "tagihan", "status"],
    fields: ["nit", "nama", "kelas", "bulan", "tahun", "tagihan", "dibayar", "status", "tanggal_bayar", "catatan"],
  },
  prala: {
    module: "prala",
    label: "PRALA",
    sheetName: "PRALA",
    uniqueFields: ["nit", "tanggal_mulai"],
    requiredFields: ["nit", "status"],
    fields: ["nit", "nama", "kelas", "perusahaan", "kapal", "status", "tanggal_mulai", "tanggal_selesai", "pembimbing", "catatan"],
  },
  mcu: {
    module: "mcu",
    label: "MCU",
    sheetName: "MCU",
    uniqueFields: ["nit", "tanggal"],
    requiredFields: ["nit", "status"],
    fields: ["nit", "nama", "kelas", "fasilitas_kesehatan", "tanggal", "status", "catatan"],
  },
  alumni: {
    module: "alumni",
    label: "Alumni",
    sheetName: "ALUMNI",
    uniqueFields: ["nit"],
    requiredFields: ["nit", "nama", "tahun_lulus"],
    fields: ["nit", "nama", "tahun_lulus", "program_keahlian", "status", "perusahaan_institusi", "jabatan", "telepon", "catatan"],
  },
  ppdb: {
    module: "ppdb",
    label: "PPDB",
    sheetName: "PPDB",
    uniqueFields: ["nomor_pendaftaran"],
    requiredFields: ["nomor_pendaftaran", "nama", "status"],
    fields: ["nomor_pendaftaran", "nama", "asal_sekolah", "pilihan_program", "telepon", "status", "tanggal_daftar", "catatan"],
  },
  library: {
    module: "library",
    label: "Perpustakaan",
    sheetName: "PERPUSTAKAAN",
    uniqueFields: ["kode"],
    requiredFields: ["kode", "judul", "kategori"],
    fields: ["kode", "judul", "kategori", "tingkat", "deskripsi", "sumber_url", "status"],
  },
  question_bank: {
    module: "question_bank",
    label: "Bank Soal",
    sheetName: "BANK_SOAL",
    uniqueFields: ["kode"],
    requiredFields: ["kode", "mata_pelajaran", "soal", "jawaban"],
    fields: ["kode", "mata_pelajaran", "topik", "kelas", "jenis", "soal", "opsi_a", "opsi_b", "opsi_c", "opsi_d", "opsi_e", "jawaban", "pembahasan", "tingkat_kesulitan"],
  },
  schedule_classes: {
    module: "schedule_classes",
    label: "Kelas Jadwal",
    sheetName: "KELAS_JADWAL",
    uniqueFields: ["kode_kelas"],
    requiredFields: ["kode_kelas", "nama_kelas"],
    fields: ["kode_kelas", "nama_kelas", "tingkat", "program_keahlian", "kode_ruang", "status"],
  },
  schedule_subjects: {
    module: "schedule_subjects",
    label: "Mapel Jadwal",
    sheetName: "MAPEL_JADWAL",
    uniqueFields: ["kode_mapel"],
    requiredFields: ["kode_mapel", "nama_mapel"],
    fields: ["kode_mapel", "nama_mapel", "kelompok", "warna", "status"],
  },
  schedule_rooms: {
    module: "schedule_rooms",
    label: "Ruang Jadwal",
    sheetName: "RUANG_JADWAL",
    uniqueFields: ["kode_ruang"],
    requiredFields: ["kode_ruang", "nama_ruang"],
    fields: ["kode_ruang", "nama_ruang", "jenis", "kapasitas", "status"],
  },
  schedule_preferences: {
    module: "schedule_preferences",
    label: "Preferensi Guru",
    sheetName: "PREFERENSI_GURU",
    uniqueFields: ["kode_guru"],
    requiredFields: ["kode_guru", "hari_tersedia", "jp_awal", "jp_akhir"],
    fields: ["kode_guru", "hari_tersedia", "jp_awal", "jp_akhir", "hari_prioritas", "jp_prioritas", "mapel_prioritas", "max_jp_hari", "catatan"],
  },
  teaching_loads: {
    module: "teaching_loads",
    label: "Beban Mengajar",
    sheetName: "BEBAN_MENGAJAR",
    uniqueFields: ["kode_beban"],
    requiredFields: ["kode_beban", "kode_guru", "kode_mapel", "kelas", "jp_minggu"],
    fields: ["kode_beban", "kode_guru", "kode_mapel", "kelas", "jp_minggu", "blok_jp", "hari_prioritas", "jp_prioritas", "hari_hindari", "max_jp_hari", "kode_ruang", "prioritas", "status"],
  },
  schedule_entries: {
    module: "schedule_entries",
    label: "Hasil Jadwal",
    sheetName: "JADWAL_HASIL",
    uniqueFields: ["id"],
    requiredFields: ["id", "tahun_ajaran", "semester", "hari", "jp", "kode_guru", "kode_mapel", "kelas"],
    fields: ["id", "tahun_ajaran", "semester", "hari", "jp", "waktu", "kode_guru", "nama_guru", "kode_mapel", "nama_mapel", "kelas", "kode_ruang", "status", "batch_id", "block_id", "created_at"],
  },
  documents: {
    module: "documents",
    label: "Dokumen AI",
    sheetName: "DOKUMEN",
    uniqueFields: ["id"],
    requiredFields: ["id", "jenis", "judul"],
    fields: ["id", "jenis", "judul", "konten", "dibuat_oleh", "tanggal"],
  },
};

export const schemaList = Object.values(dataSchemas);

export const sheetToModule = schemaList.reduce<Record<string, DataModule>>(
  (result, schema) => {
    result[schema.sheetName.toUpperCase()] = schema.module;
    return result;
  },
  {}
);

export function normalizeColumnName(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function normalizeRow(
  row: Record<string, unknown>,
  schema: DataSchema
) {
  const normalized: Record<string, unknown> = {};
  Object.entries(row).forEach(([key, value]) => {
    const normalizedKey = normalizeColumnName(key);
    if (schema.fields.includes(normalizedKey)) {
      normalized[normalizedKey] = value;
    }
  });
  return normalized;
}

export function validateRows(
  rows: Record<string, unknown>[],
  schema: DataSchema
) {
  const errors: Array<{ row: number; message: string }> = [];

  rows.forEach((row, index) => {
    schema.requiredFields.forEach((field) => {
      const value = row[field];
      if (value === undefined || value === null || String(value).trim() === "") {
        errors.push({
          row: index + 2,
          message: `Kolom ${field} wajib diisi.`,
        });
      }
    });
  });

  return errors;
}
