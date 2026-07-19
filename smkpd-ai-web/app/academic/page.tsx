"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { hasPermission } from "../lib/access";
import {
  createId,
  formatDate,
  loadArray,
  loadSession,
  saveArray,
  UsageLog,
} from "../lib/client";

type Tab = "analytics" | "eraport" | "attendance";

type Grade = {
  id: string;
  student: string;
  className: string;
  subject: string;
  knowledge: number;
  skill: number;
  attitude: string;
  semester: string;
  createdAt: string;
};

type Attendance = {
  id: string;
  date: string;
  student: string;
  className: string;
  status: "Hadir" | "Sakit" | "Izin" | "Alpa";
  note: string;
};

export default function AcademicPage() {
  const session = loadSession();
  const [tab, setTab] = useState<Tab>("analytics");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [notice, setNotice] = useState("");
  const [gradeForm, setGradeForm] = useState({
    student: "Taruna Demo",
    className: "X Nautika",
    subject: "Dasar-Dasar Nautika Kapal Niaga",
    knowledge: "85",
    skill: "88",
    attitude: "Baik",
    semester: "Ganjil",
  });
  const [attendanceForm, setAttendanceForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    student: "Taruna Demo",
    className: "X Nautika",
    status: "Hadir" as Attendance["status"],
    note: "",
  });

  useEffect(() => {
    setGrades(loadArray<Grade>("smkpd_grades"));
    setAttendance(loadArray<Attendance>("smkpd_attendance"));
  }, []);

  const canManageGrades =
    session ? hasPermission(session.role, "manage_eraport") : false;
  const canManageAttendance =
    session ? hasPermission(session.role, "manage_attendance") : false;

  const average = useMemo(() => {
    if (!grades.length) return 0;
    return Math.round(
      grades.reduce(
        (total, item) => total + (item.knowledge + item.skill) / 2,
        0
      ) / grades.length
    );
  }, [grades]);

  const attendanceSummary = useMemo(() => {
    const result = { Hadir: 0, Sakit: 0, Izin: 0, Alpa: 0 };
    attendance.forEach((item) => {
      result[item.status] += 1;
    });
    return result;
  }, [attendance]);

  const aiLogs = loadArray<UsageLog>("smkpd_ai_logs");
  const cbtLogs = aiLogs.filter((log) => log.mode === "cbt");

  function addGrade(event: FormEvent) {
    event.preventDefault();
    const item: Grade = {
      id: createId(),
      student: gradeForm.student,
      className: gradeForm.className,
      subject: gradeForm.subject,
      knowledge: Number(gradeForm.knowledge),
      skill: Number(gradeForm.skill),
      attitude: gradeForm.attitude,
      semester: gradeForm.semester,
      createdAt: new Date().toISOString(),
    };
    const next = [item, ...grades];
    setGrades(next);
    saveArray("smkpd_grades", next, 500);
    setNotice("Nilai E-Raport berhasil disimpan.");
  }

  function addAttendance(event: FormEvent) {
    event.preventDefault();
    const item: Attendance = {
      id: createId(),
      ...attendanceForm,
    };
    const next = [item, ...attendance];
    setAttendance(next);
    saveArray("smkpd_attendance", next, 1000);
    setNotice("Absensi berhasil disimpan.");
  }

  return (
    <PortalLayout
      title="Sistem Akademik"
      subtitle="Analisis hasil belajar, E-Raport, dan absensi taruna."
    >
      <div className="module-tabs">
        <button
          className={tab === "analytics" ? "active" : ""}
          onClick={() => setTab("analytics")}
        >
          📊 Analisis Belajar
        </button>
        <button
          className={tab === "eraport" ? "active" : ""}
          onClick={() => setTab("eraport")}
        >
          📖 E-Raport
        </button>
        <button
          className={tab === "attendance" ? "active" : ""}
          onClick={() => setTab("attendance")}
        >
          📅 Absensi
        </button>
      </div>

      {tab === "analytics" && (
        <>
          <section className="module-stat-grid">
            <article><span>📘</span><strong>{grades.length}</strong><small>Data Nilai</small></article>
            <article><span>🎯</span><strong>{average}</strong><small>Rata-Rata</small></article>
            <article><span>📝</span><strong>{cbtLogs.length}</strong><small>Aktivitas CBT</small></article>
            <article><span>✅</span><strong>{attendanceSummary.Hadir}</strong><small>Kehadiran</small></article>
            <article><span>⚠️</span><strong>{attendanceSummary.Alpa}</strong><small>Alpa</small></article>
          </section>

          <section className="module-card analytics-learning">
            <div className="module-card-header">
              <div>
                <p className="suite-eyebrow">LEARNING ANALYTICS</p>
                <h2>Ringkasan Hasil Belajar</h2>
              </div>
            </div>
            <div className="learning-bars">
              {grades.slice(0, 10).map((grade) => {
                const score = Math.round((grade.knowledge + grade.skill) / 2);
                return (
                  <div key={grade.id}>
                    <span>{grade.student} — {grade.subject}</span>
                    <div><i style={{ width: `${score}%` }} /></div>
                    <strong>{score}</strong>
                  </div>
                );
              })}
              {!grades.length && <p>Belum ada data nilai untuk dianalisis.</p>}
            </div>
          </section>
        </>
      )}

      {tab === "eraport" && (
        <section className="data-module-layout">
          {canManageGrades && (
            <form className="data-entry-card" onSubmit={addGrade}>
              <p className="suite-eyebrow">INPUT NILAI</p>
              <h2>E-Raport Taruna</h2>
              {Object.entries({
                student: "Nama Taruna",
                className: "Kelas",
                subject: "Mata Pelajaran",
                knowledge: "Nilai Pengetahuan",
                skill: "Nilai Keterampilan",
                attitude: "Sikap",
                semester: "Semester",
              }).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    type={key === "knowledge" || key === "skill" ? "number" : "text"}
                    value={(gradeForm as any)[key]}
                    onChange={(event) =>
                      setGradeForm({ ...gradeForm, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
              <button>Simpan Nilai</button>
            </form>
          )}

          <section className="module-card">
            <div className="module-card-header">
              <div>
                <p className="suite-eyebrow">E-RAPORT</p>
                <h2>Daftar Nilai</h2>
              </div>
              <button onClick={() => window.print()}>Cetak</button>
            </div>
            <div className="responsive-table-wrap">
              <table className="school-table">
                <thead>
                  <tr>
                    <th>Taruna</th>
                    <th>Kelas</th>
                    <th>Mapel</th>
                    <th>Pengetahuan</th>
                    <th>Keterampilan</th>
                    <th>Rata-Rata</th>
                    <th>Sikap</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade) => (
                    <tr key={grade.id}>
                      <td>{grade.student}</td>
                      <td>{grade.className}</td>
                      <td>{grade.subject}</td>
                      <td>{grade.knowledge}</td>
                      <td>{grade.skill}</td>
                      <td>{Math.round((grade.knowledge + grade.skill) / 2)}</td>
                      <td>{grade.attitude}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {tab === "attendance" && (
        <section className="data-module-layout">
          {canManageAttendance && (
            <form className="data-entry-card" onSubmit={addAttendance}>
              <p className="suite-eyebrow">INPUT ABSENSI</p>
              <h2>Kehadiran Taruna</h2>
              <label>
                Tanggal
                <input
                  type="date"
                  value={attendanceForm.date}
                  onChange={(event) =>
                    setAttendanceForm({ ...attendanceForm, date: event.target.value })
                  }
                />
              </label>
              <label>
                Nama Taruna
                <input
                  value={attendanceForm.student}
                  onChange={(event) =>
                    setAttendanceForm({ ...attendanceForm, student: event.target.value })
                  }
                />
              </label>
              <label>
                Kelas
                <input
                  value={attendanceForm.className}
                  onChange={(event) =>
                    setAttendanceForm({ ...attendanceForm, className: event.target.value })
                  }
                />
              </label>
              <label>
                Status
                <select
                  value={attendanceForm.status}
                  onChange={(event) =>
                    setAttendanceForm({
                      ...attendanceForm,
                      status: event.target.value as Attendance["status"],
                    })
                  }
                >
                  <option>Hadir</option>
                  <option>Sakit</option>
                  <option>Izin</option>
                  <option>Alpa</option>
                </select>
              </label>
              <label>
                Catatan
                <textarea
                  rows={3}
                  value={attendanceForm.note}
                  onChange={(event) =>
                    setAttendanceForm({ ...attendanceForm, note: event.target.value })
                  }
                />
              </label>
              <button>Simpan Absensi</button>
            </form>
          )}

          <section className="module-card">
            <div className="module-card-header">
              <div>
                <p className="suite-eyebrow">REKAP ABSENSI</p>
                <h2>{attendance.length} Catatan</h2>
              </div>
            </div>
            <div className="responsive-table-wrap">
              <table className="school-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Taruna</th>
                    <th>Kelas</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((item) => (
                    <tr key={item.id}>
                      <td>{item.date}</td>
                      <td>{item.student}</td>
                      <td>{item.className}</td>
                      <td>{item.status}</td>
                      <td>{item.note || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      )}

      {notice && <p className="module-notice">{notice}</p>}
    </PortalLayout>
  );
}
