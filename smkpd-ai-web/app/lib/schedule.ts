import { createId } from "./client";

export const DAYS = [
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const;

export type DayName = (typeof DAYS)[number];

export type ScheduleTeacher = {
  code: string;
  name: string;
};

export type ScheduleSubject = {
  code: string;
  name: string;
  color?: string;
};

export type ScheduleClass = {
  code: string;
  name: string;
  program?: string;
  roomCode?: string;
};

export type ScheduleRoom = {
  code: string;
  name: string;
};

export type SchedulePreference = {
  teacherCode: string;
  availableDays: DayName[];
  earliestSlot: number;
  latestSlot: number;
  preferredDays: DayName[];
  preferredSlots: number[];
  preferredSubjects: string[];
  maxPeriodsPerDay: number;
  notes?: string;
};

export type TeachingLoad = {
  id: string;
  teacherCode: string;
  subjectCode: string;
  classes: string[];
  weeklyPeriods: number;
  blockSize: number;
  preferredDays: DayName[];
  preferredSlots: number[];
  avoidDays: DayName[];
  maxPeriodsPerDay: number;
  roomCode?: string;
  priority: number;
  active: boolean;
};

export type ScheduleEntry = {
  id: string;
  schoolYear: string;
  semester: string;
  day: DayName;
  slot: number;
  time: string;
  teacherCode: string;
  teacherName: string;
  subjectCode: string;
  subjectName: string;
  classes: string[];
  roomCode?: string;
  status: "Draft" | "Terbit";
  batchId: string;
  blockId: string;
  createdAt: string;
};

export type ScheduleConflict = {
  type: "Guru" | "Kelas" | "Ruang";
  day: DayName;
  slot: number;
  code: string;
  message: string;
};

export type UnplacedSession = {
  loadId: string;
  teacherCode: string;
  subjectCode: string;
  classes: string[];
  periods: number;
  reason: string;
};

export type GenerationResult = {
  entries: ScheduleEntry[];
  unplaced: UnplacedSession[];
  conflicts: ScheduleConflict[];
  placedPeriods: number;
  requiredPeriods: number;
  attempts: number;
};

type InternalSession = {
  id: string;
  load: TeachingLoad;
  periods: number;
  order: number;
};

type Candidate = {
  day: DayName;
  start: number;
  slots: number[];
  score: number;
};

const WEEKDAY_TIMES: Record<number, string> = {
  1: "07.00–07.40",
  2: "07.40–08.20",
  3: "08.20–09.00",
  4: "09.30–10.10",
  5: "10.10–10.50",
  6: "10.50–11.30",
  7: "12.00–12.40",
  8: "12.40–13.20",
  9: "13.20–14.00",
};

const SHORT_DAY_TIMES: Record<number, string> = {
  1: "07.00–07.35",
  2: "07.35–08.10",
  3: "08.10–08.45",
  4: "08.45–09.20",
  5: "09.45–10.20",
  6: "10.20–10.55",
  7: "10.55–11.30",
};

export function parseCsv(value: unknown) {
  return String(value ?? "")
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseDays(value: unknown): DayName[] {
  const values = new Set(parseCsv(value));
  return DAYS.filter((day) => values.has(day));
}

export function parseNumbers(value: unknown) {
  return parseCsv(value)
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);
}

export function slotsForDay(day: DayName) {
  return day === "Jumat" || day === "Sabtu"
    ? [1, 2, 3, 4, 5, 6, 7]
    : [1, 2, 3, 4, 5, 6, 7, 8, 9];
}

export function timeForSlot(day: DayName, slot: number) {
  return (day === "Jumat" || day === "Sabtu"
    ? SHORT_DAY_TIMES
    : WEEKDAY_TIMES)[slot] || `JP ${slot}`;
}

function segmentForSlot(day: DayName, slot: number) {
  if (day === "Jumat" || day === "Sabtu") {
    if (slot <= 4) return 1;
    return 2;
  }
  if (slot <= 3) return 1;
  if (slot <= 6) return 2;
  return 3;
}

function canFormBlock(day: DayName, start: number, periods: number) {
  const allowed = slotsForDay(day);
  const slots = Array.from({ length: periods }, (_, index) => start + index);
  if (slots.some((slot) => !allowed.includes(slot))) return false;
  return slots.every(
    (slot) => segmentForSlot(day, slot) === segmentForSlot(day, start)
  );
}

function key(...parts: Array<string | number>) {
  return parts.join("|");
}

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function splitSessions(loads: TeachingLoad[]) {
  const sessions: InternalSession[] = [];
  loads
    .filter((load) => load.active && load.weeklyPeriods > 0)
    .forEach((load) => {
      let remaining = load.weeklyPeriods;
      let order = 1;
      const block = Math.max(1, Math.min(4, load.blockSize || 1));
      while (remaining > 0) {
        const periods = Math.min(block, remaining);
        sessions.push({
          id: `${load.id}-${order}`,
          load,
          periods,
          order,
        });
        remaining -= periods;
        order += 1;
      }
    });
  return sessions;
}

export function validateSchedule(entries: ScheduleEntry[]) {
  const conflicts: ScheduleConflict[] = [];
  const teacherMap = new Map<string, ScheduleEntry[]>();
  const classMap = new Map<string, ScheduleEntry[]>();
  const roomMap = new Map<string, ScheduleEntry[]>();

  entries.forEach((entry) => {
    const teacherKey = key(entry.day, entry.slot, entry.teacherCode);
    teacherMap.set(teacherKey, [...(teacherMap.get(teacherKey) || []), entry]);

    entry.classes.forEach((className) => {
      const classKey = key(entry.day, entry.slot, className);
      classMap.set(classKey, [...(classMap.get(classKey) || []), entry]);
    });

    if (entry.roomCode) {
      const roomKey = key(entry.day, entry.slot, entry.roomCode);
      roomMap.set(roomKey, [...(roomMap.get(roomKey) || []), entry]);
    }
  });

  teacherMap.forEach((items) => {
    if (items.length > 1) {
      const item = items[0];
      conflicts.push({
        type: "Guru",
        day: item.day,
        slot: item.slot,
        code: item.teacherCode,
        message: `${item.teacherCode} mengajar lebih dari satu kelas pada waktu yang sama.`,
      });
    }
  });

  classMap.forEach((items, mapKey) => {
    if (items.length > 1) {
      const item = items[0];
      conflicts.push({
        type: "Kelas",
        day: item.day,
        slot: item.slot,
        code: mapKey.split("|")[2] || "",
        message: `Kelas memiliki lebih dari satu pelajaran pada waktu yang sama.`,
      });
    }
  });

  roomMap.forEach((items) => {
    if (items.length > 1) {
      const item = items[0];
      conflicts.push({
        type: "Ruang",
        day: item.day,
        slot: item.slot,
        code: item.roomCode || "",
        message: `Ruang ${item.roomCode} digunakan lebih dari satu kegiatan.`,
      });
    }
  });

  return conflicts;
}

export function generateAntiConflictSchedule(input: {
  loads: TeachingLoad[];
  preferences: SchedulePreference[];
  teachers: ScheduleTeacher[];
  subjects: ScheduleSubject[];
  schoolYear: string;
  semester: string;
  attempts?: number;
}): GenerationResult {
  const sessions = splitSessions(input.loads);
  const requiredPeriods = sessions.reduce(
    (sum, session) => sum + session.periods,
    0
  );
  const preferenceMap = new Map(
    input.preferences.map((item) => [item.teacherCode, item])
  );
  const teacherMap = new Map(
    input.teachers.map((item) => [item.code, item.name])
  );
  const subjectMap = new Map(
    input.subjects.map((item) => [item.code, item.name])
  );
  const attemptCount = Math.max(20, Math.min(240, input.attempts || 100));

  let bestEntries: ScheduleEntry[] = [];
  let bestUnplaced: UnplacedSession[] = sessions.map((session) => ({
    loadId: session.load.id,
    teacherCode: session.load.teacherCode,
    subjectCode: session.load.subjectCode,
    classes: session.load.classes,
    periods: session.periods,
    reason: "Belum diproses.",
  }));
  let bestScore = Number.NEGATIVE_INFINITY;

  for (let attempt = 0; attempt < attemptCount; attempt += 1) {
    const random = seededRandom(20260720 + attempt * 97);
    const teacherBusy = new Set<string>();
    const classBusy = new Set<string>();
    const roomBusy = new Set<string>();
    const teacherDayPeriods = new Map<string, number>();
    const classDayPeriods = new Map<string, number>();
    const subjectDaySessions = new Map<string, number>();
    const entries: ScheduleEntry[] = [];
    const unplaced: UnplacedSession[] = [];
    let totalScore = 0;

    const ordered = [...sessions].sort((a, b) => {
      const prefA = preferenceMap.get(a.load.teacherCode);
      const prefB = preferenceMap.get(b.load.teacherCode);
      const daysA = prefA?.availableDays.length || DAYS.length;
      const daysB = prefB?.availableDays.length || DAYS.length;
      const constraintA =
        daysA * 10 -
        a.periods * 3 -
        a.load.classes.length * 2 -
        a.load.priority;
      const constraintB =
        daysB * 10 -
        b.periods * 3 -
        b.load.classes.length * 2 -
        b.load.priority;
      return constraintA - constraintB || random() - 0.5;
    });

    ordered.forEach((session) => {
      const load = session.load;
      const preference = preferenceMap.get(load.teacherCode);
      const availableDays =
        preference && preference.availableDays.length
          ? preference.availableDays
          : [...DAYS];
      const earliest = Math.max(1, preference?.earliestSlot || 1);
      const latest = Math.max(
        earliest,
        Math.min(9, preference?.latestSlot || 9)
      );
      const teacherMax = Math.max(
        1,
        load.maxPeriodsPerDay ||
          preference?.maxPeriodsPerDay ||
          9
      );

      const candidates: Candidate[] = [];

      DAYS.forEach((day) => {
        if (!availableDays.includes(day)) return;
        if (load.avoidDays.includes(day)) return;

        slotsForDay(day).forEach((start) => {
          if (start < earliest) return;
          const end = start + session.periods - 1;
          if (end > latest) return;
          if (!canFormBlock(day, start, session.periods)) return;

          const slots = Array.from(
            { length: session.periods },
            (_, index) => start + index
          );

          const hasTeacherConflict = slots.some((slot) =>
            teacherBusy.has(key(day, slot, load.teacherCode))
          );
          if (hasTeacherConflict) return;

          const hasClassConflict = slots.some((slot) =>
            load.classes.some((className) =>
              classBusy.has(key(day, slot, className))
            )
          );
          if (hasClassConflict) return;

          if (
            load.roomCode &&
            slots.some((slot) =>
              roomBusy.has(key(day, slot, load.roomCode || ""))
            )
          ) {
            return;
          }

          const currentTeacherDay =
            teacherDayPeriods.get(key(day, load.teacherCode)) || 0;
          if (currentTeacherDay + session.periods > teacherMax) return;

          const classDayMaximum = Math.max(
            ...load.classes.map(
              (className) =>
                classDayPeriods.get(key(day, className)) || 0
            ),
            0
          );

          let score = load.priority * 9;
          if (load.preferredDays.includes(day)) score += 42;
          if (preference?.preferredDays.includes(day)) score += 24;
          if (
            preference?.preferredSubjects.includes(load.subjectCode)
          ) {
            score += 22;
          }

          slots.forEach((slot) => {
            if (load.preferredSlots.includes(slot)) score += 12;
            if (preference?.preferredSlots.includes(slot)) score += 8;
          });

          score -= currentTeacherDay * 6;
          score -= classDayMaximum * 4;
          score -= start * 0.6;
          score -=
            (subjectDaySessions.get(
              key(day, load.teacherCode, load.subjectCode)
            ) || 0) * 16;
          score += random() * 9;

          candidates.push({ day, start, slots, score });
        });
      });

      candidates.sort((a, b) => b.score - a.score);
      const selected = candidates[0];

      if (!selected) {
        unplaced.push({
          loadId: load.id,
          teacherCode: load.teacherCode,
          subjectCode: load.subjectCode,
          classes: load.classes,
          periods: session.periods,
          reason:
            "Tidak tersedia blok waktu yang memenuhi preferensi dan aturan anti bentrok.",
        });
        return;
      }

      const batchId = `SCH-${input.schoolYear.replace(/\W/g, "")}-${input.semester}`;
      const blockId = `${batchId}-${session.id}-${attempt}`;
      const createdAt = new Date().toISOString();

      selected.slots.forEach((slot) => {
        entries.push({
          id: createId(),
          schoolYear: input.schoolYear,
          semester: input.semester,
          day: selected.day,
          slot,
          time: timeForSlot(selected.day, slot),
          teacherCode: load.teacherCode,
          teacherName: teacherMap.get(load.teacherCode) || load.teacherCode,
          subjectCode: load.subjectCode,
          subjectName: subjectMap.get(load.subjectCode) || load.subjectCode,
          classes: [...load.classes],
          roomCode: load.roomCode,
          status: "Draft",
          batchId,
          blockId,
          createdAt,
        });

        teacherBusy.add(key(selected.day, slot, load.teacherCode));
        load.classes.forEach((className) =>
          classBusy.add(key(selected.day, slot, className))
        );
        if (load.roomCode) {
          roomBusy.add(key(selected.day, slot, load.roomCode));
        }
      });

      teacherDayPeriods.set(
        key(selected.day, load.teacherCode),
        (teacherDayPeriods.get(key(selected.day, load.teacherCode)) || 0) +
          session.periods
      );
      load.classes.forEach((className) => {
        classDayPeriods.set(
          key(selected.day, className),
          (classDayPeriods.get(key(selected.day, className)) || 0) +
            session.periods
        );
      });
      subjectDaySessions.set(
        key(selected.day, load.teacherCode, load.subjectCode),
        (subjectDaySessions.get(
          key(selected.day, load.teacherCode, load.subjectCode)
        ) || 0) + 1
      );
      totalScore += selected.score;
    });

    const placedPeriods = entries.length;
    const quality =
      placedPeriods * 10000 -
      unplaced.length * 100000 +
      totalScore;

    if (
      unplaced.length < bestUnplaced.length ||
      (unplaced.length === bestUnplaced.length && quality > bestScore)
    ) {
      bestEntries = entries;
      bestUnplaced = unplaced;
      bestScore = quality;
    }

    if (bestUnplaced.length === 0) break;
  }

  const conflicts = validateSchedule(bestEntries);

  return {
    entries: bestEntries.sort(
      (a, b) =>
        DAYS.indexOf(a.day) - DAYS.indexOf(b.day) ||
        a.slot - b.slot ||
        a.classes.join(",").localeCompare(b.classes.join(","))
    ),
    unplaced: bestUnplaced,
    conflicts,
    placedPeriods: bestEntries.length,
    requiredPeriods,
    attempts: attemptCount,
  };
}

export const DEFAULT_CLASSES: ScheduleClass[] = [
  { code: "X-NKN", name: "X NKN", program: "Nautika Kapal Niaga", roomCode: "R-XNKN" },
  { code: "X-TKN", name: "X TKN", program: "Teknika Kapal Niaga", roomCode: "R-XTKN" },
  { code: "XI-NKN", name: "XI NKN", program: "Nautika Kapal Niaga", roomCode: "R-XINKN" },
  { code: "XI-TKN", name: "XI TKN", program: "Teknika Kapal Niaga", roomCode: "R-XITKN" },
  { code: "XII-NKN", name: "XII NKN", program: "Nautika Kapal Niaga", roomCode: "R-XIINKN" },
  { code: "XII-TKN", name: "XII TKN", program: "Teknika Kapal Niaga", roomCode: "R-XIITKN" },
];

export const DEFAULT_TEACHERS: ScheduleTeacher[] = [
  { code: "LI", name: "Lilis Indarningsih, S.Pd." },
  { code: "SB", name: "Syaiful Bahri, M.Pd." },
  { code: "RA", name: "Rizka Ainul Aliya, S.Pd." },
  { code: "NA", name: "Nur Ainiyah, S.Pd." },
  { code: "UA", name: "Ubaedah Afiyah, M.Pd." },
  { code: "ZS", name: "Solechatuz Zahro, S.S." },
  { code: "EU", name: "Elly Utami, S.Kom." },
  { code: "NN", name: "Nurun Nayyiroh, S.Pd." },
  { code: "PT", name: "Abdullah Adib, S.SiT., ATT II" },
  { code: "AN", name: "Ahmad Anas Seri, A.Md., ANT III" },
  { code: "PN", name: "Maskur, ANT I" },
];

export const DEFAULT_SUBJECTS: ScheduleSubject[] = [
  { code: "PABP", name: "Pendidikan Agama Islam dan Budi Pekerti" },
  { code: "BTQ", name: "Baca Tulis Al-Qur'an" },
  { code: "PKN", name: "Pendidikan Pancasila" },
  { code: "BIN", name: "Bahasa Indonesia" },
  { code: "BJW", name: "Bahasa Jawa" },
  { code: "MAT", name: "Matematika" },
  { code: "BIG", name: "Bahasa Inggris" },
  { code: "BIM", name: "Bahasa Inggris Maritim" },
  { code: "INF", name: "Informatika" },
  { code: "KAI", name: "Koding dan Kecerdasan Artifisial" },
  { code: "IPAS", name: "IPAS" },
  { code: "SEJ", name: "Sejarah Indonesia" },
  { code: "PJK", name: "Penjasorkes" },
  { code: "PKK", name: "Projek Kreatif dan Kewirausahaan" },
  { code: "IPD", name: "Ilmu Pelayaran Datar" },
  { code: "P2TL", name: "P2TL dan Dinas Jaga" },
  { code: "OMG", name: "Olah Gerak dan Pengendalian Kapal" },
  { code: "KOM", name: "Komunikasi dan Isyarat" },
  { code: "SKK", name: "Sistem Kemudi Kompas" },
  { code: "MET", name: "Meteorologi" },
  { code: "KB", name: "Kecakapan Bahari" },
  { code: "MPU", name: "Mesin Penggerak Utama" },
  { code: "PB", name: "Permesinan Bantu" },
  { code: "SKL", name: "Sistem Kelistrikan Kapal" },
  { code: "DJM", name: "Dinas Jaga Mesin" },
  { code: "MEK", name: "Mekatronika" },
  { code: "DG", name: "Desain Gambar" },
  { code: "IB", name: "Ilmu Bahan" },
  { code: "LTW", name: "Leadership dan Teamwork" },
];
