"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { hasPermission } from "../lib/access";
import { createId, loadSession } from "../lib/client";
import { dbGetAll, dbPutOne } from "../lib/database";

type Tab = "analytics" | "eraport" | "attendance" | "cbt";

export default function AcademicPage() {
  const session = loadSession();
  const [tab, setTab] = useState<Tab>("analytics");
  const [grades, setGrades] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [notice, setNotice] = useState("");
  const [gradeForm, setGradeForm] = useState({
    nit: "NIT001",
    nama: "Taruna Contoh",
    kelas: "X Nautika",
    mata_pelajaran: "Dasar-Dasar Nautika",
    semester: "Ganjil",
    tahun_ajaran: "2026/2027",
    pengetahuan: "85",
    keterampilan: "88",
    sikap: "Baik",
    catatan: "",
  });
  const [attendanceForm, setAttendanceForm] = useState({
    tanggal: new Date().toISOString().slice(0,10),
    nit: "NIT001",
    nama: "Taruna Contoh",
    kelas: "X Nautika",
    status: "Hadir",
    catatan: "",
  });

  async function refresh() {
    setGrades(await dbGetAll("grades"));
    setAttendance(await dbGetAll("attendance"));
    setQuestions(await dbGetAll("question_bank"));
  }

  useEffect(() => { refresh(); }, []);

  const canManageGrades = session ? hasPermission(session.role, "manage_eraport") : false;
  const canManageAttendance = session ? hasPermission(session.role, "manage_attendance") : false;

  const average = useMemo(() => {
    if (!grades.length) return 0;
    return Math.round(grades.reduce((sum,item) => sum + (Number(item.pengetahuan || 0)+Number(item.keterampilan || 0))/2,0)/grades.length);
  }, [grades]);

  async function addGrade(event: FormEvent) {
    event.preventDefault();
    await dbPutOne("grades", {...gradeForm, id:createId(), pengetahuan:Number(gradeForm.pengetahuan), keterampilan:Number(gradeForm.keterampilan)});
    await refresh();
    setNotice("Nilai tersimpan ke database.");
  }

  async function addAttendance(event: FormEvent) {
    event.preventDefault();
    await dbPutOne("attendance", {...attendanceForm, id:createId()});
    await refresh();
    setNotice("Absensi tersimpan ke database.");
  }

  return (
    <PortalLayout title="Akademik & CBT" subtitle="Analisis hasil belajar, E-Raport, absensi, dan bank soal dalam satu alur.">
      <div className="module-tabs">
        <button className={tab==="analytics"?"active":""} onClick={()=>setTab("analytics")}>📊 Analisis</button>
        <button className={tab==="eraport"?"active":""} onClick={()=>setTab("eraport")}>📖 E-Raport</button>
        <button className={tab==="attendance"?"active":""} onClick={()=>setTab("attendance")}>📅 Absensi</button>
        <button className={tab==="cbt"?"active":""} onClick={()=>setTab("cbt")}>📝 Bank Soal CBT</button>
      </div>

      {tab==="analytics" && (
        <>
          <section className="module-stat-grid">
            <article><span>📘</span><strong>{grades.length}</strong><small>Data Nilai</small></article>
            <article><span>🎯</span><strong>{average}</strong><small>Rata-Rata</small></article>
            <article><span>📅</span><strong>{attendance.length}</strong><small>Absensi</small></article>
            <article><span>📝</span><strong>{questions.length}</strong><small>Bank Soal</small></article>
          </section>
          <section className="module-card"><div className="module-card-header"><div><p className="suite-eyebrow">ANALISIS</p><h2>Performa Taruna</h2></div></div>
            <div className="learning-bars">{grades.slice(0,10).map((item) => { const score=Math.round((Number(item.pengetahuan||0)+Number(item.keterampilan||0))/2); return <div key={item.id}><span>{item.nama} — {item.mata_pelajaran}</span><div><i style={{width:`${score}%`}}/></div><strong>{score}</strong></div>})}{!grades.length && <p>Belum ada nilai. Import melalui Database & Excel atau input pada E-Raport.</p>}</div>
          </section>
        </>
      )}

      {tab==="eraport" && (
        <section className="data-module-layout">
          {canManageGrades && <form className="data-entry-card" onSubmit={addGrade}><p className="suite-eyebrow">INPUT NILAI</p><h2>E-Raport</h2>
            {Object.entries(gradeForm).map(([key,value]) => <label key={key}>{key.replaceAll("_"," ")}<input type={["pengetahuan","keterampilan"].includes(key)?"number":"text"} value={value} onChange={(e)=>setGradeForm({...gradeForm,[key]:e.target.value})}/></label>)}
            <button>Simpan Nilai</button></form>}
          <section className="module-card"><div className="module-card-header"><div><p className="suite-eyebrow">DATABASE NILAI</p><h2>{grades.length} Rekaman</h2></div></div><div className="responsive-table-wrap"><table className="school-table"><thead><tr><th>NIT</th><th>Nama</th><th>Kelas</th><th>Mapel</th><th>Semester</th><th>Pengetahuan</th><th>Keterampilan</th><th>Rata-rata</th></tr></thead><tbody>{grades.map((item)=><tr key={item.id}><td>{item.nit}</td><td>{item.nama}</td><td>{item.kelas}</td><td>{item.mata_pelajaran}</td><td>{item.semester}</td><td>{item.pengetahuan}</td><td>{item.keterampilan}</td><td>{Math.round((Number(item.pengetahuan||0)+Number(item.keterampilan||0))/2)}</td></tr>)}</tbody></table></div></section>
        </section>
      )}

      {tab==="attendance" && (
        <section className="data-module-layout">
          {canManageAttendance && <form className="data-entry-card" onSubmit={addAttendance}><p className="suite-eyebrow">INPUT ABSENSI</p><h2>Kehadiran</h2>
            <label>Tanggal<input type="date" value={attendanceForm.tanggal} onChange={(e)=>setAttendanceForm({...attendanceForm,tanggal:e.target.value})}/></label>
            <label>NIT<input value={attendanceForm.nit} onChange={(e)=>setAttendanceForm({...attendanceForm,nit:e.target.value})}/></label>
            <label>Nama<input value={attendanceForm.nama} onChange={(e)=>setAttendanceForm({...attendanceForm,nama:e.target.value})}/></label>
            <label>Kelas<input value={attendanceForm.kelas} onChange={(e)=>setAttendanceForm({...attendanceForm,kelas:e.target.value})}/></label>
            <label>Status<select value={attendanceForm.status} onChange={(e)=>setAttendanceForm({...attendanceForm,status:e.target.value})}><option>Hadir</option><option>Sakit</option><option>Izin</option><option>Alpa</option></select></label>
            <label>Catatan<textarea value={attendanceForm.catatan} onChange={(e)=>setAttendanceForm({...attendanceForm,catatan:e.target.value})}/></label><button>Simpan Absensi</button></form>}
          <section className="module-card"><div className="module-card-header"><div><p className="suite-eyebrow">DATABASE ABSENSI</p><h2>{attendance.length} Rekaman</h2></div></div><div className="responsive-table-wrap"><table className="school-table"><thead><tr><th>Tanggal</th><th>NIT</th><th>Nama</th><th>Kelas</th><th>Status</th><th>Catatan</th></tr></thead><tbody>{attendance.map((item)=><tr key={item.id}><td>{item.tanggal}</td><td>{item.nit}</td><td>{item.nama}</td><td>{item.kelas}</td><td>{item.status}</td><td>{item.catatan}</td></tr>)}</tbody></table></div></section>
        </section>
      )}

      {tab==="cbt" && (
        <section className="module-card"><div className="module-card-header"><div><p className="suite-eyebrow">BANK SOAL CBT</p><h2>{questions.length} Soal Database</h2></div><a href="/maritime">Buka Generator CBT AI →</a></div>
          <div className="responsive-table-wrap"><table className="school-table"><thead><tr><th>Kode</th><th>Mapel</th><th>Topik</th><th>Kelas</th><th>Soal</th><th>Jawaban</th><th>Kesulitan</th></tr></thead><tbody>{questions.slice(0,200).map((item)=><tr key={item.id}><td>{item.kode}</td><td>{item.mata_pelajaran}</td><td>{item.topik}</td><td>{item.kelas}</td><td>{item.soal}</td><td>{item.jawaban}</td><td>{item.tingkat_kesulitan}</td></tr>)}</tbody></table></div>
        </section>
      )}
      {notice && <p className="module-notice">{notice}</p>}
    </PortalLayout>
  );
}
