"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { hasPermission } from "../lib/access";
import { createId, loadSession } from "../lib/client";
import {
  dbDelete,
  dbGetAll,
  dbPutOne,
  dbReplaceModule,
  dbUpsertMany,
} from "../lib/database";
import { loadSheetJs } from "../lib/excel";
import {
  DAYS,
  DEFAULT_CLASSES,
  DEFAULT_SUBJECTS,
  DEFAULT_TEACHERS,
  DayName,
  GenerationResult,
  ScheduleClass,
  ScheduleEntry,
  SchedulePreference,
  ScheduleRoom,
  ScheduleSubject,
  ScheduleTeacher,
  TeachingLoad,
  generateAntiConflictSchedule,
  parseCsv,
  parseDays,
  parseNumbers,
  slotsForDay,
  timeForSlot,
  validateSchedule,
} from "../lib/schedule";

type Tab =
  | "overview"
  | "master"
  | "preferences"
  | "loads"
  | "generate"
  | "results";

type ViewMode = "school" | "teacher" | "class" | "student";

type StudentRecord = {
  id?: string;
  nit: string;
  nama: string;
  kelas: string;
};

type TeacherDb = {
  id?: string;
  nip_kode: string;
  nama: string;
  mata_pelajaran?: string;
  status?: string;
};

type ClassDb = {
  id?: string;
  kode_kelas: string;
  nama_kelas: string;
  tingkat?: string;
  program_keahlian?: string;
  kode_ruang?: string;
  status?: string;
};

type SubjectDb = {
  id?: string;
  kode_mapel: string;
  nama_mapel: string;
  kelompok?: string;
  warna?: string;
  status?: string;
};

type RoomDb = {
  id?: string;
  kode_ruang: string;
  nama_ruang: string;
  jenis?: string;
  kapasitas?: number | string;
  status?: string;
};

type PreferenceDb = {
  id?: string;
  kode_guru: string;
  hari_tersedia: string;
  jp_awal: number | string;
  jp_akhir: number | string;
  hari_prioritas?: string;
  jp_prioritas?: string;
  mapel_prioritas?: string;
  max_jp_hari?: number | string;
  catatan?: string;
};

type LoadDb = {
  id?: string;
  kode_beban: string;
  kode_guru: string;
  kode_mapel: string;
  kelas: string;
  jp_minggu: number | string;
  blok_jp?: number | string;
  hari_prioritas?: string;
  jp_prioritas?: string;
  hari_hindari?: string;
  max_jp_hari?: number | string;
  kode_ruang?: string;
  prioritas?: number | string;
  status?: string;
};

type EntryDb = {
  id: string;
  tahun_ajaran: string;
  semester: string;
  hari: DayName;
  jp: number | string;
  waktu: string;
  kode_guru: string;
  nama_guru?: string;
  kode_mapel: string;
  nama_mapel?: string;
  kelas: string;
  kode_ruang?: string;
  status?: string;
  batch_id?: string;
  block_id?: string;
  created_at?: string;
};

const defaultTeacherForm = {
  nip_kode: "",
  nama: "",
  mata_pelajaran: "",
  status: "Aktif",
};

const defaultClassForm = {
  kode_kelas: "",
  nama_kelas: "",
  tingkat: "X",
  program_keahlian: "Nautika Kapal Niaga",
  kode_ruang: "",
  status: "Aktif",
};

const defaultSubjectForm = {
  kode_mapel: "",
  nama_mapel: "",
  kelompok: "Umum",
  warna: "#DCEAF5",
  status: "Aktif",
};

const defaultRoomForm = {
  kode_ruang: "",
  nama_ruang: "",
  jenis: "Kelas",
  kapasitas: "36",
  status: "Aktif",
};

const defaultPreferenceForm = {
  kode_guru: "",
  hari_tersedia: "Senin,Selasa,Rabu,Kamis,Jumat,Sabtu",
  jp_awal: "1",
  jp_akhir: "9",
  hari_prioritas: "",
  jp_prioritas: "",
  mapel_prioritas: "",
  max_jp_hari: "8",
  catatan: "",
};

const defaultLoadForm = {
  kode_beban: "",
  kode_guru: "",
  kode_mapel: "",
  kelas: "",
  jp_minggu: "2",
  blok_jp: "2",
  hari_prioritas: "",
  jp_prioritas: "",
  hari_hindari: "",
  max_jp_hari: "6",
  kode_ruang: "",
  prioritas: "5",
  status: "Aktif",
};

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "-");
}

function entryFromDb(value: EntryDb): ScheduleEntry {
  return {
    id: value.id,
    schoolYear: value.tahun_ajaran,
    semester: value.semester,
    day: value.hari,
    slot: Number(value.jp),
    time: value.waktu,
    teacherCode: value.kode_guru,
    teacherName: value.nama_guru || value.kode_guru,
    subjectCode: value.kode_mapel,
    subjectName: value.nama_mapel || value.kode_mapel,
    classes: parseCsv(value.kelas),
    roomCode: value.kode_ruang || undefined,
    status: value.status === "Terbit" ? "Terbit" : "Draft",
    batchId: value.batch_id || "",
    blockId: value.block_id || "",
    createdAt: value.created_at || new Date().toISOString(),
  };
}

function entryToDb(value: ScheduleEntry, published: boolean): EntryDb {
  return {
    id: value.id,
    tahun_ajaran: value.schoolYear,
    semester: value.semester,
    hari: value.day,
    jp: value.slot,
    waktu: value.time,
    kode_guru: value.teacherCode,
    nama_guru: value.teacherName,
    kode_mapel: value.subjectCode,
    nama_mapel: value.subjectName,
    kelas: value.classes.join(", "),
    kode_ruang: value.roomCode || "",
    status: published ? "Terbit" : "Draft",
    batch_id: value.batchId,
    block_id: value.blockId,
    created_at: value.createdAt,
  };
}

function htmlEscape(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getEntryForClass(
  entries: ScheduleEntry[],
  day: DayName,
  slot: number,
  className: string
) {
  return entries.find(
    (entry) =>
      entry.day === day &&
      entry.slot === slot &&
      entry.classes.includes(className)
  );
}

function scheduleCell(entry?: ScheduleEntry) {
  if (!entry) return "";
  return `${entry.subjectCode}\n(${entry.teacherCode})`;
}

function scheduleRowsFor(
  entries: ScheduleEntry[],
  mode: ViewMode,
  selectedCode: string,
  student?: StudentRecord
) {
  return entries.filter((entry) => {
    if (mode === "school") return true;
    if (mode === "teacher") return entry.teacherCode === selectedCode;
    if (mode === "class") return entry.classes.includes(selectedCode);
    if (mode === "student") {
      return student ? entry.classes.includes(student.kelas) : false;
    }
    return true;
  });
}

export default function SchedulePage() {
  const session = loadSession();
  const [tab, setTab] = useState<Tab>("overview");
  const [teachers, setTeachers] = useState<TeacherDb[]>([]);
  const [classes, setClasses] = useState<ClassDb[]>([]);
  const [subjects, setSubjects] = useState<SubjectDb[]>([]);
  const [rooms, setRooms] = useState<RoomDb[]>([]);
  const [preferences, setPreferences] = useState<PreferenceDb[]>([]);
  const [loads, setLoads] = useState<LoadDb[]>([]);
  const [publishedEntries, setPublishedEntries] = useState<ScheduleEntry[]>([]);
  const [draftResult, setDraftResult] = useState<GenerationResult | null>(null);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const [teacherForm, setTeacherForm] = useState(defaultTeacherForm);
  const [classForm, setClassForm] = useState(defaultClassForm);
  const [subjectForm, setSubjectForm] = useState(defaultSubjectForm);
  const [roomForm, setRoomForm] = useState(defaultRoomForm);
  const [preferenceForm, setPreferenceForm] = useState(defaultPreferenceForm);
  const [loadForm, setLoadForm] = useState(defaultLoadForm);

  const [schoolYear, setSchoolYear] = useState("2026/2027");
  const [semester, setSemester] = useState("Ganjil");
  const [attempts, setAttempts] = useState("120");

  const [viewMode, setViewMode] = useState<ViewMode>("school");
  const [viewTeacher, setViewTeacher] = useState("");
  const [viewClass, setViewClass] = useState("");
  const [viewStudent, setViewStudent] = useState("");
  const [viewDay, setViewDay] = useState<DayName>("Senin");

  const canManage = session
    ? hasPermission(session.role, "manage_schedule")
    : false;
  const canSubmitPreferences = session
    ? hasPermission(session.role, "submit_schedule_preferences")
    : false;

  async function refresh() {
    const [
      teacherRows,
      classRows,
      subjectRows,
      roomRows,
      preferenceRows,
      loadRows,
      entryRows,
      studentRows,
    ] = await Promise.all([
      dbGetAll<TeacherDb>("teachers"),
      dbGetAll<ClassDb>("schedule_classes"),
      dbGetAll<SubjectDb>("schedule_subjects"),
      dbGetAll<RoomDb>("schedule_rooms"),
      dbGetAll<PreferenceDb>("schedule_preferences"),
      dbGetAll<LoadDb>("teaching_loads"),
      dbGetAll<EntryDb>("schedule_entries"),
      dbGetAll<StudentRecord>("students"),
    ]);

    setTeachers(
      teacherRows
        .filter((item) => item.status !== "Nonaktif")
        .sort((a, b) => a.nip_kode.localeCompare(b.nip_kode))
    );
    setClasses(
      classRows
        .filter((item) => item.status !== "Nonaktif")
        .sort((a, b) => a.nama_kelas.localeCompare(b.nama_kelas))
    );
    setSubjects(
      subjectRows
        .filter((item) => item.status !== "Nonaktif")
        .sort((a, b) => a.kode_mapel.localeCompare(b.kode_mapel))
    );
    setRooms(
      roomRows
        .filter((item) => item.status !== "Nonaktif")
        .sort((a, b) => a.kode_ruang.localeCompare(b.kode_ruang))
    );
    setPreferences(preferenceRows);
    setLoads(loadRows);
    setPublishedEntries(
      entryRows
        .filter((item) => item.status === "Terbit")
        .map(entryFromDb)
    );
    setStudents(studentRows);

    if (!viewTeacher && teacherRows[0]?.nip_kode) {
      setViewTeacher(teacherRows[0].nip_kode);
    }
    if (!viewClass && classRows[0]?.nama_kelas) {
      setViewClass(classRows[0].nama_kelas);
    }
    if (!viewStudent && studentRows[0]?.nit) {
      setViewStudent(studentRows[0].nit);
    }
    if (!preferenceForm.kode_guru && teacherRows[0]?.nip_kode) {
      setPreferenceForm((current) => ({
        ...current,
        kode_guru: teacherRows[0].nip_kode,
      }));
    }
    if (!loadForm.kode_guru && teacherRows[0]?.nip_kode) {
      setLoadForm((current) => ({
        ...current,
        kode_guru: teacherRows[0].nip_kode,
      }));
    }
    if (!loadForm.kode_mapel && subjectRows[0]?.kode_mapel) {
      setLoadForm((current) => ({
        ...current,
        kode_mapel: subjectRows[0].kode_mapel,
      }));
    }
  }

  useEffect(() => {
    refresh().catch(() => setNotice("Data jadwal belum dapat dimuat."));
  }, []);

  const activeEntries = draftResult?.entries.length
    ? draftResult.entries
    : publishedEntries;

  const selectedStudent = useMemo(
    () => students.find((student) => student.nit === viewStudent),
    [students, viewStudent]
  );

  const filteredEntries = useMemo(
    () =>
      scheduleRowsFor(
        activeEntries,
        viewMode,
        viewMode === "teacher" ? viewTeacher : viewClass,
        selectedStudent
      ),
    [
      activeEntries,
      selectedStudent,
      viewClass,
      viewMode,
      viewTeacher,
    ]
  );

  const currentConflicts = useMemo(
    () => validateSchedule(activeEntries),
    [activeEntries]
  );

  const visibleTabs: Array<{ id: Tab; label: string }> = [
    { id: "overview", label: "Ringkasan" },
    ...(canManage
      ? [
          { id: "master" as Tab, label: "Master Data" },
          { id: "loads" as Tab, label: "Beban Mengajar" },
          { id: "generate" as Tab, label: "Generate & Validasi" },
        ]
      : []),
    ...(canSubmitPreferences
      ? [{ id: "preferences" as Tab, label: "Preferensi Guru" }]
      : []),
    { id: "results", label: "Hasil Jadwal" },
  ];

  async function seedSchoolStructure() {
    if (!canManage) return;
    setBusy(true);
    try {
      await dbUpsertMany(
        "teachers",
        DEFAULT_TEACHERS.map((teacher) => ({
          id: createId(),
          nip_kode: teacher.code,
          nama: teacher.name,
          jabatan: "Guru",
          mata_pelajaran: "",
          telepon: "",
          email: "",
          status: "Aktif",
        }))
      );
      await dbUpsertMany(
        "schedule_classes",
        DEFAULT_CLASSES.map((item) => ({
          id: createId(),
          kode_kelas: item.code,
          nama_kelas: item.name,
          tingkat: item.name.split(" ")[0],
          program_keahlian: item.program || "",
          kode_ruang: item.roomCode || "",
          status: "Aktif",
        }))
      );
      await dbUpsertMany(
        "schedule_subjects",
        DEFAULT_SUBJECTS.map((item) => ({
          id: createId(),
          kode_mapel: item.code,
          nama_mapel: item.name,
          kelompok: "SMK",
          warna: item.color || "#DCEAF5",
          status: "Aktif",
        }))
      );
      await dbUpsertMany(
        "schedule_rooms",
        DEFAULT_CLASSES.map((item) => ({
          id: createId(),
          kode_ruang: item.roomCode || `R-${item.code}`,
          nama_ruang: `Ruang ${item.name}`,
          jenis: "Kelas",
          kapasitas: 36,
          status: "Aktif",
        }))
      );
      await refresh();
      setNotice(
        "Struktur awal SMKPD berhasil dipasang. Lanjutkan dengan beban mengajar dan preferensi guru."
      );
    } finally {
      setBusy(false);
    }
  }

  async function addTeacher(event: FormEvent) {
    event.preventDefault();
    const code = normalizeCode(teacherForm.nip_kode);
    if (!code || !teacherForm.nama.trim()) return;
    await dbPutOne("teachers", {
      id: createId(),
      ...teacherForm,
      nip_kode: code,
      nama: teacherForm.nama.trim(),
    });
    setTeacherForm(defaultTeacherForm);
    await refresh();
    setNotice("Guru dan kode guru berhasil disimpan.");
  }

  async function addClass(event: FormEvent) {
    event.preventDefault();
    const code = normalizeCode(classForm.kode_kelas);
    if (!code || !classForm.nama_kelas.trim()) return;
    await dbPutOne("schedule_classes", {
      id: createId(),
      ...classForm,
      kode_kelas: code,
      nama_kelas: classForm.nama_kelas.trim(),
    });
    setClassForm(defaultClassForm);
    await refresh();
    setNotice("Kelas jadwal berhasil disimpan.");
  }

  async function addSubject(event: FormEvent) {
    event.preventDefault();
    const code = normalizeCode(subjectForm.kode_mapel);
    if (!code || !subjectForm.nama_mapel.trim()) return;
    await dbPutOne("schedule_subjects", {
      id: createId(),
      ...subjectForm,
      kode_mapel: code,
      nama_mapel: subjectForm.nama_mapel.trim(),
    });
    setSubjectForm(defaultSubjectForm);
    await refresh();
    setNotice("Mata pelajaran dan kode mapel berhasil disimpan.");
  }

  async function addRoom(event: FormEvent) {
    event.preventDefault();
    const code = normalizeCode(roomForm.kode_ruang);
    if (!code || !roomForm.nama_ruang.trim()) return;
    await dbPutOne("schedule_rooms", {
      id: createId(),
      ...roomForm,
      kode_ruang: code,
      kapasitas: Number(roomForm.kapasitas || 0),
    });
    setRoomForm(defaultRoomForm);
    await refresh();
    setNotice("Ruang berhasil disimpan.");
  }

  async function savePreference(event: FormEvent) {
    event.preventDefault();
    if (!preferenceForm.kode_guru) return;
    await dbPutOne("schedule_preferences", {
      id: createId(),
      ...preferenceForm,
      jp_awal: Number(preferenceForm.jp_awal),
      jp_akhir: Number(preferenceForm.jp_akhir),
      max_jp_hari: Number(preferenceForm.max_jp_hari),
    });
    await refresh();
    setNotice(
      "Preferensi hari, jam, dan mapel guru berhasil disimpan."
    );
  }

  function togglePreferenceDay(field: "hari_tersedia" | "hari_prioritas", day: DayName) {
    const current = new Set(parseCsv(preferenceForm[field]));
    if (current.has(day)) current.delete(day);
    else current.add(day);
    setPreferenceForm({
      ...preferenceForm,
      [field]: DAYS.filter((item) => current.has(item)).join(","),
    });
  }

  function togglePreferenceSubject(code: string) {
    const current = new Set(parseCsv(preferenceForm.mapel_prioritas));
    if (current.has(code)) current.delete(code);
    else current.add(code);
    setPreferenceForm({
      ...preferenceForm,
      mapel_prioritas: subjects
        .map((item) => item.kode_mapel)
        .filter((item) => current.has(item))
        .join(","),
    });
  }

  function toggleLoadClass(name: string) {
    const current = new Set(parseCsv(loadForm.kelas));
    if (current.has(name)) current.delete(name);
    else current.add(name);
    setLoadForm({
      ...loadForm,
      kelas: classes
        .map((item) => item.nama_kelas)
        .filter((item) => current.has(item))
        .join(", "),
    });
  }

  async function saveLoad(event: FormEvent) {
    event.preventDefault();
    if (
      !loadForm.kode_guru ||
      !loadForm.kode_mapel ||
      !parseCsv(loadForm.kelas).length
    ) {
      setNotice("Pilih kode guru, kode mapel, dan minimal satu kelas.");
      return;
    }
    const code =
      normalizeCode(loadForm.kode_beban) ||
      `${loadForm.kode_guru}-${loadForm.kode_mapel}-${parseCsv(loadForm.kelas)
        .join("-")
        .replace(/\s+/g, "")}`;
    await dbPutOne("teaching_loads", {
      id: createId(),
      ...loadForm,
      kode_beban: code,
      jp_minggu: Number(loadForm.jp_minggu),
      blok_jp: Number(loadForm.blok_jp),
      max_jp_hari: Number(loadForm.max_jp_hari),
      prioritas: Number(loadForm.prioritas),
    });
    setLoadForm({
      ...defaultLoadForm,
      kode_guru: loadForm.kode_guru,
      kode_mapel: loadForm.kode_mapel,
    });
    await refresh();
    setNotice("Beban mengajar berhasil disimpan.");
  }

  async function deleteRow(
    module:
      | "teachers"
      | "schedule_classes"
      | "schedule_subjects"
      | "schedule_rooms"
      | "schedule_preferences"
      | "teaching_loads",
    row: Record<string, unknown>
  ) {
    if (!window.confirm("Hapus data ini?")) return;
    await dbDelete(module, row);
    await refresh();
    setNotice("Data berhasil dihapus.");
  }

  function mapPreferences(): SchedulePreference[] {
    return preferences.map((item) => ({
      teacherCode: item.kode_guru,
      availableDays: parseDays(item.hari_tersedia),
      earliestSlot: Number(item.jp_awal || 1),
      latestSlot: Number(item.jp_akhir || 9),
      preferredDays: parseDays(item.hari_prioritas),
      preferredSlots: parseNumbers(item.jp_prioritas),
      preferredSubjects: parseCsv(item.mapel_prioritas),
      maxPeriodsPerDay: Number(item.max_jp_hari || 8),
      notes: item.catatan || "",
    }));
  }

  function mapLoads(): TeachingLoad[] {
    return loads.map((item) => ({
      id: item.kode_beban,
      teacherCode: item.kode_guru,
      subjectCode: item.kode_mapel,
      classes: parseCsv(item.kelas),
      weeklyPeriods: Number(item.jp_minggu || 0),
      blockSize: Number(item.blok_jp || 1),
      preferredDays: parseDays(item.hari_prioritas),
      preferredSlots: parseNumbers(item.jp_prioritas),
      avoidDays: parseDays(item.hari_hindari),
      maxPeriodsPerDay: Number(item.max_jp_hari || 8),
      roomCode: item.kode_ruang || undefined,
      priority: Number(item.prioritas || 5),
      active: item.status !== "Nonaktif",
    }));
  }

  function mapTeachers(): ScheduleTeacher[] {
    return teachers.map((item) => ({
      code: item.nip_kode,
      name: item.nama,
    }));
  }

  function mapSubjects(): ScheduleSubject[] {
    return subjects.map((item) => ({
      code: item.kode_mapel,
      name: item.nama_mapel,
      color: item.warna,
    }));
  }

  function generate() {
    if (!loads.length) {
      setNotice("Beban mengajar masih kosong.");
      return;
    }
    setBusy(true);
    try {
      const result = generateAntiConflictSchedule({
        loads: mapLoads(),
        preferences: mapPreferences(),
        teachers: mapTeachers(),
        subjects: mapSubjects(),
        schoolYear,
        semester,
        attempts: Number(attempts || 120),
      });
      setDraftResult(result);
      setNotice(
        result.unplaced.length
          ? `${result.placedPeriods}/${result.requiredPeriods} JP berhasil ditempatkan. Periksa ${result.unplaced.length} sesi yang belum masuk.`
          : `Seluruh ${result.requiredPeriods} JP berhasil dijadwalkan tanpa benturan.`
      );
    } finally {
      setBusy(false);
    }
  }

  async function publishSchedule() {
    if (!draftResult?.entries.length || draftResult.conflicts.length) return;
    if (
      !window.confirm(
        "Terbitkan jadwal ini? Jadwal terbit sebelumnya akan diganti."
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      await dbReplaceModule(
        "schedule_entries",
        draftResult.entries.map((entry) => entryToDb(entry, true))
      );
      await refresh();
      setDraftResult(null);
      setTab("results");
      setNotice("Jadwal berhasil diterbitkan dan dapat dilihat semua pengguna.");
    } finally {
      setBusy(false);
    }
  }

  async function exportExcel() {
    if (!filteredEntries.length) {
      setNotice("Belum ada jadwal untuk diekspor.");
      return;
    }
    const XLSX = await loadSheetJs();
    const workbook = XLSX.utils.book_new();
    const exportTitle =
      viewMode === "teacher"
        ? `Guru ${viewTeacher}`
        : viewMode === "class"
          ? `Kelas ${viewClass}`
          : viewMode === "student"
            ? `${selectedStudent?.nama || "Taruna"} (${selectedStudent?.kelas || ""})`
            : "Jadwal Induk Sekolah";

    if (viewMode === "school") {
      DAYS.forEach((day) => {
        const aoa: Array<Array<string | number>> = [
          ["SMK PELAYARAN DEMAK BOARDING SCHOOL"],
          [`JADWAL INDUK ${semester.toUpperCase()} ${schoolYear}`],
          [`${day}`],
          ["JP", "Waktu", ...classes.map((item) => item.nama_kelas)],
        ];
        slotsForDay(day).forEach((slot) => {
          aoa.push([
            `JP ${slot}`,
            timeForSlot(day, slot),
            ...classes.map((item) =>
              scheduleCell(
                getEntryForClass(filteredEntries, day, slot, item.nama_kelas)
              )
            ),
          ]);
        });
        const sheet = XLSX.utils.aoa_to_sheet(aoa);
        sheet["!cols"] = [
          { wch: 9 },
          { wch: 15 },
          ...classes.map(() => ({ wch: 22 })),
        ];
        XLSX.utils.book_append_sheet(workbook, sheet, day);
      });

      const teacherRows = filteredEntries
        .slice()
        .sort(
          (a, b) =>
            a.teacherCode.localeCompare(b.teacherCode) ||
            DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
            a.slot - b.slot
        )
        .map((entry) => ({
          "Kode Guru": entry.teacherCode,
          "Nama Guru": entry.teacherName,
          Hari: entry.day,
          JP: entry.slot,
          Waktu: entry.time,
          "Kode Mapel": entry.subjectCode,
          "Mata Pelajaran": entry.subjectName,
          Kelas: entry.classes.join(", "),
          Ruang: entry.roomCode || "",
        }));
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(teacherRows),
        "Rekap Guru"
      );
    } else {
      const rows = filteredEntries
        .slice()
        .sort(
          (a, b) =>
            DAYS.indexOf(a.day) - DAYS.indexOf(b.day) || a.slot - b.slot
        )
        .map((entry) => ({
          Hari: entry.day,
          JP: entry.slot,
          Waktu: entry.time,
          "Kode Mapel": entry.subjectCode,
          "Mata Pelajaran": entry.subjectName,
          "Kode Guru": entry.teacherCode,
          "Nama Guru": entry.teacherName,
          Kelas: entry.classes.join(", "),
          Ruang: entry.roomCode || "",
        }));
      const sheet = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(workbook, sheet, "Jadwal");
    }

    XLSX.writeFile(
      workbook,
      `${exportTitle.replace(/[^a-z0-9]+/gi, "-")}-${semester}-${schoolYear.replace("/", "-")}.xlsx`
    );
  }

  function exportPdf() {
    if (!filteredEntries.length) {
      setNotice("Belum ada jadwal untuk dicetak.");
      return;
    }
    const win = window.open("", "_blank");
    if (!win) {
      setNotice("Izinkan pop-up browser untuk mencetak PDF.");
      return;
    }

    const title =
      viewMode === "teacher"
        ? `Jadwal Guru ${viewTeacher}`
        : viewMode === "class"
          ? `Jadwal Kelas ${viewClass}`
          : viewMode === "student"
            ? `Jadwal Taruna ${selectedStudent?.nama || ""} — ${selectedStudent?.kelas || ""}`
            : "Jadwal Induk Sekolah";

    const sections =
      viewMode === "school"
        ? DAYS.map((day) => {
            const rows = slotsForDay(day)
              .map(
                (slot) => `<tr>
                  <td>JP ${slot}</td>
                  <td>${htmlEscape(timeForSlot(day, slot))}</td>
                  ${classes
                    .map((item) => {
                      const entry = getEntryForClass(
                        filteredEntries,
                        day,
                        slot,
                        item.nama_kelas
                      );
                      return `<td>${
                        entry
                          ? `<b>${htmlEscape(entry.subjectCode)}</b><br><small>(${htmlEscape(entry.teacherCode)})</small>`
                          : ""
                      }</td>`;
                    })
                    .join("")}
                </tr>`
              )
              .join("");
            return `<h2>${day}</h2><table><thead><tr><th>JP</th><th>Waktu</th>${classes
              .map((item) => `<th>${htmlEscape(item.nama_kelas)}</th>`)
              .join("")}</tr></thead><tbody>${rows}</tbody></table>`;
          }).join("")
        : `<table><thead><tr>
            <th>Hari</th><th>JP</th><th>Waktu</th><th>Mapel</th><th>Guru</th><th>Kelas</th><th>Ruang</th>
          </tr></thead><tbody>${filteredEntries
            .slice()
            .sort(
              (a, b) =>
                DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
                a.slot - b.slot
            )
            .map(
              (entry) => `<tr>
                <td>${entry.day}</td>
                <td>JP ${entry.slot}</td>
                <td>${entry.time}</td>
                <td>${htmlEscape(entry.subjectCode)} — ${htmlEscape(entry.subjectName)}</td>
                <td>${htmlEscape(entry.teacherCode)} — ${htmlEscape(entry.teacherName)}</td>
                <td>${htmlEscape(entry.classes.join(", "))}</td>
                <td>${htmlEscape(entry.roomCode || "-")}</td>
              </tr>`
            )
            .join("")}</tbody></table>`;

    win.document.write(`<!doctype html>
      <html><head><title>${htmlEscape(title)}</title>
      <style>
        @page{size:A4 landscape;margin:10mm}
        body{font-family:Arial,sans-serif;color:#10283d}
        h1{text-align:center;font-size:18px;margin:0}
        .sub{text-align:center;margin:5px 0 16px;font-size:11px}
        h2{margin:14px 0 5px;font-size:13px;color:#08385f}
        table{width:100%;border-collapse:collapse;page-break-inside:avoid;margin-bottom:12px}
        th,td{border:1px solid #526a7d;padding:5px;text-align:center;font-size:8px;vertical-align:middle}
        th{background:#0a355c;color:white}
        small{font-size:7px}
        .credit{margin-top:12px;text-align:right;font-size:8px}
      </style></head><body>
      <h1>SMK PELAYARAN DEMAK BOARDING SCHOOL</h1>
      <div class="sub">${htmlEscape(title)} • Semester ${htmlEscape(semester)} • ${htmlEscape(schoolYear)}</div>
      ${sections}
      <div class="credit">Dibuat melalui SMKPD AI • Syaiful Bahri, M. Pd • 082335339994</div>
      <script>window.onload=()=>setTimeout(()=>window.print(),300)</script>
      </body></html>`);
    win.document.close();
  }

  const currentTeacherPreference = preferences.find(
    (item) => item.kode_guru === preferenceForm.kode_guru
  );

  useEffect(() => {
    if (!currentTeacherPreference) return;
    setPreferenceForm({
      kode_guru: currentTeacherPreference.kode_guru,
      hari_tersedia: currentTeacherPreference.hari_tersedia,
      jp_awal: String(currentTeacherPreference.jp_awal || 1),
      jp_akhir: String(currentTeacherPreference.jp_akhir || 9),
      hari_prioritas: currentTeacherPreference.hari_prioritas || "",
      jp_prioritas: currentTeacherPreference.jp_prioritas || "",
      mapel_prioritas: currentTeacherPreference.mapel_prioritas || "",
      max_jp_hari: String(currentTeacherPreference.max_jp_hari || 8),
      catatan: currentTeacherPreference.catatan || "",
    });
  }, [preferenceForm.kode_guru, currentTeacherPreference?.id]);

  return (
    <PortalLayout
      title="Jadwal Otomatis Anti Bentrok"
      subtitle="Kode guru dan kode mapel, preferensi mengajar, generator otomatis, validasi, serta cetak per sekolah, guru, kelas, dan taruna."
      requiredPermission="view_schedule"
    >
      <div className="module-tabs schedule-tabs">
        {visibleTabs.map((item) => (
          <button
            key={item.id}
            className={tab === item.id ? "active" : ""}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <section className="schedule-hero">
            <div>
              <p className="suite-eyebrow">SISTEM PENJADWALAN SMKPD</p>
              <h2>Jadwal otomatis yang tetap mengikuti pilihan guru</h2>
              <p>
                Sistem mencegah guru, kelas, dan ruang berada pada dua kegiatan
                dalam waktu yang sama. Jadwal Senin–Kamis memakai 9 JP dan
                Jumat–Sabtu 7 JP sesuai pola SMK Pelayaran Demak.
              </p>
            </div>
            <div className="schedule-status-grid">
              <article><strong>{teachers.length}</strong><span>Guru</span></article>
              <article><strong>{subjects.length}</strong><span>Mapel</span></article>
              <article><strong>{classes.length}</strong><span>Kelas</span></article>
              <article><strong>{loads.length}</strong><span>Beban</span></article>
              <article><strong>{publishedEntries.length}</strong><span>JP Terbit</span></article>
              <article><strong>{currentConflicts.length}</strong><span>Benturan</span></article>
            </div>
          </section>

          <section className="schedule-workflow">
            <article><span>1</span><h3>Master Data</h3><p>Kode guru, kode mapel, kelas, dan ruang.</p></article>
            <article><span>2</span><h3>Preferensi Guru</h3><p>Pilih hari, rentang JP, jam prioritas, dan mapel.</p></article>
            <article><span>3</span><h3>Beban Mengajar</h3><p>Tentukan kelas, JP mingguan, blok, dan prioritas.</p></article>
            <article><span>4</span><h3>Generate</h3><p>Sistem mencari kombinasi tanpa benturan.</p></article>
            <article><span>5</span><h3>Terbit & Cetak</h3><p>Excel/PDF per sekolah, guru, kelas, atau taruna.</p></article>
          </section>

          {canManage && (
            <section className="module-card schedule-setup-card">
              <div>
                <p className="suite-eyebrow">PERSIAPAN CEPAT</p>
                <h2>Struktur Awal SMK Pelayaran Demak</h2>
                <p>
                  Memasukkan 6 rombel, kode guru, kode mapel maritim, dan ruang
                  dasar. Data yang sudah ada akan diperbarui, bukan digandakan.
                </p>
              </div>
              <button disabled={busy} onClick={seedSchoolStructure}>
                Pasang Struktur Awal
              </button>
            </section>
          )}
        </>
      )}

      {tab === "master" && canManage && (
        <section className="schedule-master-grid">
          <form className="schedule-form-card" onSubmit={addTeacher}>
            <p className="suite-eyebrow">KODE GURU</p>
            <h2>Tambah Guru</h2>
            <label>Kode Guru<input value={teacherForm.nip_kode} onChange={(e) => setTeacherForm({...teacherForm,nip_kode:e.target.value})} placeholder="RA"/></label>
            <label>Nama Guru<input value={teacherForm.nama} onChange={(e) => setTeacherForm({...teacherForm,nama:e.target.value})}/></label>
            <label>Mapel Utama<input value={teacherForm.mata_pelajaran} onChange={(e) => setTeacherForm({...teacherForm,mata_pelajaran:e.target.value})}/></label>
            <button>Simpan Guru</button>
            <div className="schedule-mini-list">
              {teachers.slice(0,12).map((item) => (
                <div key={item.nip_kode}><b>{item.nip_kode}</b><span>{item.nama}</span><button type="button" onClick={() => deleteRow("teachers", item)}>×</button></div>
              ))}
            </div>
          </form>

          <form className="schedule-form-card" onSubmit={addSubject}>
            <p className="suite-eyebrow">KODE MAPEL</p>
            <h2>Tambah Mata Pelajaran</h2>
            <label>Kode Mapel<input value={subjectForm.kode_mapel} onChange={(e) => setSubjectForm({...subjectForm,kode_mapel:e.target.value})} placeholder="BIN"/></label>
            <label>Nama Mapel<input value={subjectForm.nama_mapel} onChange={(e) => setSubjectForm({...subjectForm,nama_mapel:e.target.value})}/></label>
            <label>Kelompok<input value={subjectForm.kelompok} onChange={(e) => setSubjectForm({...subjectForm,kelompok:e.target.value})}/></label>
            <button>Simpan Mapel</button>
            <div className="schedule-mini-list">
              {subjects.slice(0,12).map((item) => (
                <div key={item.kode_mapel}><b>{item.kode_mapel}</b><span>{item.nama_mapel}</span><button type="button" onClick={() => deleteRow("schedule_subjects", item)}>×</button></div>
              ))}
            </div>
          </form>

          <form className="schedule-form-card" onSubmit={addClass}>
            <p className="suite-eyebrow">ROMBEL</p>
            <h2>Tambah Kelas</h2>
            <label>Kode Kelas<input value={classForm.kode_kelas} onChange={(e) => setClassForm({...classForm,kode_kelas:e.target.value})} placeholder="X-NKN"/></label>
            <label>Nama Kelas<input value={classForm.nama_kelas} onChange={(e) => setClassForm({...classForm,nama_kelas:e.target.value})} placeholder="X NKN"/></label>
            <label>Program Keahlian<input value={classForm.program_keahlian} onChange={(e) => setClassForm({...classForm,program_keahlian:e.target.value})}/></label>
            <label>Kode Ruang<input value={classForm.kode_ruang} onChange={(e) => setClassForm({...classForm,kode_ruang:e.target.value})}/></label>
            <button>Simpan Kelas</button>
            <div className="schedule-mini-list">
              {classes.map((item) => (
                <div key={item.kode_kelas}><b>{item.kode_kelas}</b><span>{item.nama_kelas}</span><button type="button" onClick={() => deleteRow("schedule_classes", item)}>×</button></div>
              ))}
            </div>
          </form>

          <form className="schedule-form-card" onSubmit={addRoom}>
            <p className="suite-eyebrow">RUANG</p>
            <h2>Tambah Ruang</h2>
            <label>Kode Ruang<input value={roomForm.kode_ruang} onChange={(e) => setRoomForm({...roomForm,kode_ruang:e.target.value})} placeholder="LAB-BRIDGE"/></label>
            <label>Nama Ruang<input value={roomForm.nama_ruang} onChange={(e) => setRoomForm({...roomForm,nama_ruang:e.target.value})}/></label>
            <label>Jenis<input value={roomForm.jenis} onChange={(e) => setRoomForm({...roomForm,jenis:e.target.value})}/></label>
            <label>Kapasitas<input type="number" value={roomForm.kapasitas} onChange={(e) => setRoomForm({...roomForm,kapasitas:e.target.value})}/></label>
            <button>Simpan Ruang</button>
            <div className="schedule-mini-list">
              {rooms.slice(0,12).map((item) => (
                <div key={item.kode_ruang}><b>{item.kode_ruang}</b><span>{item.nama_ruang}</span><button type="button" onClick={() => deleteRow("schedule_rooms", item)}>×</button></div>
              ))}
            </div>
          </form>

          <section className="module-card schedule-template-card">
            <div>
              <p className="suite-eyebrow">IMPORT EXCEL</p>
              <h2>Template Data Jadwal</h2>
              <p>Data dapat dimasukkan satu per satu melalui Database & Excel.</p>
            </div>
            <div>
              <a href="/templates/items/KELAS_JADWAL.xlsx" download>Kelas</a>
              <a href="/templates/items/MAPEL_JADWAL.xlsx" download>Mapel</a>
              <a href="/templates/items/RUANG_JADWAL.xlsx" download>Ruang</a>
              <a href="/templates/items/PREFERENSI_GURU.xlsx" download>Preferensi</a>
              <a href="/templates/items/BEBAN_MENGAJAR.xlsx" download>Beban Mengajar</a>
            </div>
          </section>
        </section>
      )}

      {tab === "preferences" && canSubmitPreferences && (
        <section className="schedule-preference-layout">
          <form className="schedule-preference-form" onSubmit={savePreference}>
            <p className="suite-eyebrow">PILIHAN MENGAJAR GURU</p>
            <h2>Hari, Jam, dan Mata Pelajaran</h2>
            <label>
              Kode Guru
              <select
                value={preferenceForm.kode_guru}
                onChange={(e) => setPreferenceForm({...preferenceForm,kode_guru:e.target.value})}
              >
                <option value="">Pilih guru</option>
                {teachers.map((item) => <option key={item.nip_kode} value={item.nip_kode}>{item.nip_kode} — {item.nama}</option>)}
              </select>
            </label>

            <fieldset>
              <legend>Hari tersedia</legend>
              <div className="schedule-checkbox-grid">
                {DAYS.map((day) => (
                  <label key={day}><input type="checkbox" checked={parseCsv(preferenceForm.hari_tersedia).includes(day)} onChange={() => togglePreferenceDay("hari_tersedia", day)}/>{day}</label>
                ))}
              </div>
            </fieldset>

            <div className="schedule-two-cols">
              <label>JP Paling Awal<select value={preferenceForm.jp_awal} onChange={(e) => setPreferenceForm({...preferenceForm,jp_awal:e.target.value})}>{Array.from({length:9},(_,i)=>i+1).map((jp)=><option key={jp}>{jp}</option>)}</select></label>
              <label>JP Paling Akhir<select value={preferenceForm.jp_akhir} onChange={(e) => setPreferenceForm({...preferenceForm,jp_akhir:e.target.value})}>{Array.from({length:9},(_,i)=>i+1).map((jp)=><option key={jp}>{jp}</option>)}</select></label>
            </div>

            <fieldset>
              <legend>Hari yang diprioritaskan</legend>
              <div className="schedule-checkbox-grid">
                {DAYS.map((day) => (
                  <label key={day}><input type="checkbox" checked={parseCsv(preferenceForm.hari_prioritas).includes(day)} onChange={() => togglePreferenceDay("hari_prioritas", day)}/>{day}</label>
                ))}
              </div>
            </fieldset>

            <label>JP Prioritas<input value={preferenceForm.jp_prioritas} onChange={(e) => setPreferenceForm({...preferenceForm,jp_prioritas:e.target.value})} placeholder="Contoh: 1,2,3,4"/></label>

            <fieldset>
              <legend>Mapel yang diprioritaskan</legend>
              <div className="schedule-subject-checks">
                {subjects.map((item) => (
                  <label key={item.kode_mapel}><input type="checkbox" checked={parseCsv(preferenceForm.mapel_prioritas).includes(item.kode_mapel)} onChange={() => togglePreferenceSubject(item.kode_mapel)}/><b>{item.kode_mapel}</b> {item.nama_mapel}</label>
                ))}
              </div>
            </fieldset>

            <label>Maksimal JP per Hari<input type="number" min="1" max="9" value={preferenceForm.max_jp_hari} onChange={(e) => setPreferenceForm({...preferenceForm,max_jp_hari:e.target.value})}/></label>
            <label>Catatan<textarea rows={3} value={preferenceForm.catatan} onChange={(e) => setPreferenceForm({...preferenceForm,catatan:e.target.value})} placeholder="Contoh: tidak dapat mengajar setelah JP 6 pada Kamis."/></label>
            <button>Simpan Preferensi</button>
          </form>

          <section className="module-card">
            <div className="module-card-header">
              <div><p className="suite-eyebrow">PREFERENSI TERSIMPAN</p><h2>{preferences.length} Guru</h2></div>
            </div>
            <div className="responsive-table-wrap">
              <table className="school-table">
                <thead><tr><th>Guru</th><th>Hari Tersedia</th><th>Rentang JP</th><th>Hari Prioritas</th><th>JP Prioritas</th><th>Mapel Prioritas</th><th>Maks/Har</th>{canManage&&<th>Aksi</th>}</tr></thead>
                <tbody>
                  {preferences.map((item) => (
                    <tr key={item.kode_guru}>
                      <td><b>{item.kode_guru}</b><br/><small>{teachers.find((t)=>t.nip_kode===item.kode_guru)?.nama||""}</small></td>
                      <td>{item.hari_tersedia}</td>
                      <td>JP {item.jp_awal}–{item.jp_akhir}</td>
                      <td>{item.hari_prioritas||"-"}</td>
                      <td>{item.jp_prioritas||"-"}</td>
                      <td>{item.mapel_prioritas||"-"}</td>
                      <td>{item.max_jp_hari||"-"}</td>
                      {canManage&&<td><button className="table-delete-button" onClick={()=>deleteRow("schedule_preferences",item)}>Hapus</button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {tab === "loads" && canManage && (
        <section className="schedule-load-layout">
          <form className="schedule-load-form" onSubmit={saveLoad}>
            <p className="suite-eyebrow">ALOKASI JAM</p>
            <h2>Beban Mengajar</h2>
            <label>Kode Beban<input value={loadForm.kode_beban} onChange={(e)=>setLoadForm({...loadForm,kode_beban:e.target.value})} placeholder="Otomatis bila kosong"/></label>
            <div className="schedule-two-cols">
              <label>Kode Guru<select value={loadForm.kode_guru} onChange={(e)=>setLoadForm({...loadForm,kode_guru:e.target.value})}><option value="">Pilih</option>{teachers.map((item)=><option key={item.nip_kode} value={item.nip_kode}>{item.nip_kode} — {item.nama}</option>)}</select></label>
              <label>Kode Mapel<select value={loadForm.kode_mapel} onChange={(e)=>setLoadForm({...loadForm,kode_mapel:e.target.value})}><option value="">Pilih</option>{subjects.map((item)=><option key={item.kode_mapel} value={item.kode_mapel}>{item.kode_mapel} — {item.nama_mapel}</option>)}</select></label>
            </div>
            <fieldset>
              <legend>Kelas / Kelas Gabungan</legend>
              <div className="schedule-checkbox-grid">
                {classes.map((item)=><label key={item.kode_kelas}><input type="checkbox" checked={parseCsv(loadForm.kelas).includes(item.nama_kelas)} onChange={()=>toggleLoadClass(item.nama_kelas)}/>{item.nama_kelas}</label>)}
              </div>
            </fieldset>
            <div className="schedule-three-cols">
              <label>JP/Minggu<input type="number" min="1" max="30" value={loadForm.jp_minggu} onChange={(e)=>setLoadForm({...loadForm,jp_minggu:e.target.value})}/></label>
              <label>Blok JP<input type="number" min="1" max="4" value={loadForm.blok_jp} onChange={(e)=>setLoadForm({...loadForm,blok_jp:e.target.value})}/></label>
              <label>Prioritas<input type="number" min="1" max="10" value={loadForm.prioritas} onChange={(e)=>setLoadForm({...loadForm,prioritas:e.target.value})}/></label>
            </div>
            <label>Hari Prioritas<input value={loadForm.hari_prioritas} onChange={(e)=>setLoadForm({...loadForm,hari_prioritas:e.target.value})} placeholder="Senin,Kamis"/></label>
            <label>JP Prioritas<input value={loadForm.jp_prioritas} onChange={(e)=>setLoadForm({...loadForm,jp_prioritas:e.target.value})} placeholder="1,2,3,4"/></label>
            <label>Hari Dihindari<input value={loadForm.hari_hindari} onChange={(e)=>setLoadForm({...loadForm,hari_hindari:e.target.value})} placeholder="Sabtu"/></label>
            <div className="schedule-two-cols">
              <label>Maks JP/Hari<input type="number" min="1" max="9" value={loadForm.max_jp_hari} onChange={(e)=>setLoadForm({...loadForm,max_jp_hari:e.target.value})}/></label>
              <label>Ruang<select value={loadForm.kode_ruang} onChange={(e)=>setLoadForm({...loadForm,kode_ruang:e.target.value})}><option value="">Otomatis/Tanpa Batas</option>{rooms.map((item)=><option key={item.kode_ruang} value={item.kode_ruang}>{item.kode_ruang} — {item.nama_ruang}</option>)}</select></label>
            </div>
            <button>Simpan Beban Mengajar</button>
          </form>

          <section className="module-card">
            <div className="module-card-header">
              <div><p className="suite-eyebrow">SPEKTRUM DAN ALOKASI</p><h2>{loads.length} Beban</h2></div>
              <a href="/templates/items/BEBAN_MENGAJAR.xlsx" download>Template Excel</a>
            </div>
            <div className="responsive-table-wrap">
              <table className="school-table">
                <thead><tr><th>Kode</th><th>Guru</th><th>Mapel</th><th>Kelas</th><th>JP</th><th>Blok</th><th>Prioritas</th><th>Ruang</th><th>Aksi</th></tr></thead>
                <tbody>
                  {loads.map((item)=>(
                    <tr key={item.kode_beban}>
                      <td>{item.kode_beban}</td><td>{item.kode_guru}</td><td>{item.kode_mapel}</td><td>{item.kelas}</td><td>{item.jp_minggu}</td><td>{item.blok_jp||1}</td><td>{item.prioritas||5}</td><td>{item.kode_ruang||"-"}</td>
                      <td><button className="table-delete-button" onClick={()=>deleteRow("teaching_loads",item)}>Hapus</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {tab === "generate" && canManage && (
        <section className="schedule-generate-layout">
          <article className="schedule-generate-card">
            <p className="suite-eyebrow">MESIN ANTI BENTROK</p>
            <h2>Generate Jadwal Otomatis</h2>
            <label>Tahun Ajaran<input value={schoolYear} onChange={(e)=>setSchoolYear(e.target.value)}/></label>
            <label>Semester<select value={semester} onChange={(e)=>setSemester(e.target.value)}><option>Ganjil</option><option>Genap</option></select></label>
            <label>Jumlah Percobaan Algoritma<input type="number" min="20" max="240" value={attempts} onChange={(e)=>setAttempts(e.target.value)}/></label>
            <div className="schedule-rule-list">
              <span>✓ Guru tidak mengajar di dua kelas sekaligus</span>
              <span>✓ Kelas tidak menerima dua mapel sekaligus</span>
              <span>✓ Ruang tidak dipakai bersamaan</span>
              <span>✓ Blok JP tidak melewati waktu istirahat</span>
              <span>✓ Preferensi guru dan prioritas mapel dinilai</span>
            </div>
            <button disabled={busy||!loads.length} onClick={generate}>{busy?"Menyusun Jadwal...":"Generate Anti Bentrok"}</button>
          </article>

          <section className="schedule-generation-result">
            <div className="module-card-header">
              <div><p className="suite-eyebrow">HASIL GENERATE</p><h2>{draftResult?"Jadwal Draft":"Belum Digenerate"}</h2></div>
              <button disabled={!draftResult?.entries.length||Boolean(draftResult?.conflicts.length)||busy} onClick={publishSchedule}>Terbitkan Jadwal</button>
            </div>
            {draftResult ? (
              <>
                <div className="schedule-result-stats">
                  <article><strong>{draftResult.placedPeriods}</strong><span>JP Terpasang</span></article>
                  <article><strong>{draftResult.requiredPeriods}</strong><span>JP Dibutuhkan</span></article>
                  <article><strong>{draftResult.unplaced.length}</strong><span>Sesi Belum Masuk</span></article>
                  <article><strong>{draftResult.conflicts.length}</strong><span>Benturan</span></article>
                </div>
                {draftResult.unplaced.length>0&&(
                  <div className="schedule-warning-list">
                    <strong>Sesi yang belum dapat ditempatkan</strong>
                    {draftResult.unplaced.map((item,index)=><p key={`${item.loadId}-${index}`}><b>{item.teacherCode} / {item.subjectCode}</b> — {item.classes.join(", ")} — {item.periods} JP<br/><small>{item.reason}</small></p>)}
                  </div>
                )}
                {!draftResult.conflicts.length&&<div className="schedule-valid-banner">✓ Validasi selesai: tidak ada benturan guru, kelas, atau ruang.</div>}
              </>
            ):(
              <div className="empty-state"><img src="/logo-smkpd-192.png" alt=""/><p>Lengkapi beban mengajar dan tekan Generate Anti Bentrok.</p></div>
            )}
          </section>
        </section>
      )}

      {tab === "results" && (
        <section className="schedule-results-section">
          <div className="schedule-view-controls">
            <label>
              Tampilan
              <select value={viewMode} onChange={(e)=>setViewMode(e.target.value as ViewMode)}>
                <option value="school">Jadwal Induk Sekolah</option>
                <option value="teacher">Per Guru</option>
                <option value="class">Per Kelas / Siswa</option>
                <option value="student">Per Taruna</option>
              </select>
            </label>
            {viewMode==="teacher"&&<label>Guru<select value={viewTeacher} onChange={(e)=>setViewTeacher(e.target.value)}>{teachers.map((item)=><option key={item.nip_kode} value={item.nip_kode}>{item.nip_kode} — {item.nama}</option>)}</select></label>}
            {viewMode==="class"&&<label>Kelas<select value={viewClass} onChange={(e)=>setViewClass(e.target.value)}>{classes.map((item)=><option key={item.kode_kelas} value={item.nama_kelas}>{item.nama_kelas}</option>)}</select></label>}
            {viewMode==="student"&&<label>Taruna<select value={viewStudent} onChange={(e)=>setViewStudent(e.target.value)}>{students.map((item)=><option key={item.nit} value={item.nit}>{item.nit} — {item.nama} ({item.kelas})</option>)}</select></label>}
            <label>Hari<select value={viewDay} onChange={(e)=>setViewDay(e.target.value as DayName)}>{DAYS.map((day)=><option key={day}>{day}</option>)}</select></label>
            <div>
              <button onClick={exportExcel}>Export Excel</button>
              <button onClick={exportPdf}>Cetak / PDF</button>
            </div>
          </div>

          {activeEntries.length ? (
            viewMode==="school" ? (
              <div className="schedule-master-table-wrap">
                <div className="schedule-print-heading">
                  <h2>Jadwal Induk — {viewDay}</h2>
                  <span>{semester} • {schoolYear} • Kode mapel (kode guru)</span>
                </div>
                <table className="schedule-master-table">
                  <thead><tr><th>JP</th><th>Waktu</th>{classes.map((item)=><th key={item.kode_kelas}>{item.nama_kelas}</th>)}</tr></thead>
                  <tbody>
                    {slotsForDay(viewDay).map((slot)=>(
                      <tr key={slot}>
                        <th>JP {slot}</th><td>{timeForSlot(viewDay,slot)}</td>
                        {classes.map((item)=>{
                          const entry=getEntryForClass(filteredEntries,viewDay,slot,item.nama_kelas);
                          return <td key={item.kode_kelas} className={entry?"filled":""}>{entry&&<><b>{entry.subjectCode}</b><span>{entry.subjectName}</span><small>({entry.teacherCode}) {entry.roomCode?`• ${entry.roomCode}`:""}</small></>}</td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ):(
              <div className="schedule-list-view">
                <div className="schedule-print-heading">
                  <h2>{viewMode==="teacher"?`Jadwal Guru ${viewTeacher}`:viewMode==="student"?`Jadwal ${selectedStudent?.nama||""}`:`Jadwal ${viewClass}`}</h2>
                  <span>{semester} • {schoolYear}</span>
                </div>
                <div className="responsive-table-wrap">
                  <table className="school-table">
                    <thead><tr><th>Hari</th><th>JP</th><th>Waktu</th><th>Mapel</th><th>Guru</th><th>Kelas</th><th>Ruang</th></tr></thead>
                    <tbody>
                      {filteredEntries.slice().sort((a,b)=>DAYS.indexOf(a.day)-DAYS.indexOf(b.day)||a.slot-b.slot).map((entry)=>(
                        <tr key={entry.id}><td>{entry.day}</td><td>JP {entry.slot}</td><td>{entry.time}</td><td><b>{entry.subjectCode}</b><br/><small>{entry.subjectName}</small></td><td><b>{entry.teacherCode}</b><br/><small>{entry.teacherName}</small></td><td>{entry.classes.join(", ")}</td><td>{entry.roomCode||"-"}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          ):(
            <div className="module-card empty-state"><img src="/logo-smkpd-192.png" alt=""/><p>Belum ada jadwal terbit. Admin, Kepala Sekolah, atau Waka Kurikulum perlu membuat dan menerbitkan jadwal.</p></div>
          )}
        </section>
      )}

      {notice&&<p className="module-notice">{notice}</p>}
    </PortalLayout>
  );
}
