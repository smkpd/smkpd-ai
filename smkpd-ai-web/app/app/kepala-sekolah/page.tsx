"use client";

import { useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { loadArray, UsageLog } from "../lib/client";
import { dbCounts, dbGetAll } from "../lib/database";
import { dataSchemas } from "../lib/schema";

export default function PrincipalDashboard() {
  const [counts,setCounts]=useState<Record<string,number>>({});
  const [grades,setGrades]=useState<any[]>([]);
  const [attendance,setAttendance]=useState<any[]>([]);
  const [logs,setLogs]=useState<UsageLog[]>([]);

  async function refresh(){
    setCounts(await dbCounts());
    setGrades(await dbGetAll("grades"));
    setAttendance(await dbGetAll("attendance"));
    setLogs(loadArray<UsageLog>("smkpd_ai_logs"));
  }
  useEffect(()=>{refresh();},[]);

  const avg=useMemo(()=>grades.length?Math.round(grades.reduce((sum,item)=>sum+(Number(item.pengetahuan||0)+Number(item.keterampilan||0))/2,0)/grades.length):0,[grades]);
  const total=Object.values(counts).reduce((a,b)=>a+b,0);

  return <PortalLayout title="Dashboard Eksekutif" subtitle="Monitoring database, akademik, layanan, dan aktivitas AI." requiredPermission="executive_dashboard">
    <section className="principal-hero"><div><p className="suite-eyebrow">EXECUTIVE OVERVIEW</p><h2>Monitoring SMK Pelayaran Demak</h2><p>Ringkasan bersumber dari database terstruktur pada perangkat ini dan dapat disinkronkan ke Supabase.</p></div><div className="principal-actions"><button onClick={refresh}>↻ Perbarui</button><button onClick={()=>window.print()}>🖨️ Cetak</button></div></section>
    <section className="principal-stats"><article><span>🗄️</span><div><strong>{total}</strong><small>Total Rekaman</small></div></article><article><span>🎯</span><div><strong>{avg}</strong><small>Rata-rata Nilai</small></div></article><article><span>📅</span><div><strong>{attendance.length}</strong><small>Absensi</small></div></article><article><span>✦</span><div><strong>{logs.length}</strong><small>Aktivitas AI</small></div></article><article><span>👥</span><div><strong>{counts.users||0}</strong><small>Pengguna</small></div></article></section>
    <section className="database-module-grid executive-module-grid">{Object.entries(counts).map(([module,count])=><article key={module}><span>{count}</span><strong>{(dataSchemas as any)[module]?.label||module}</strong></article>)}</section>
    <section className="principal-grid"><article className="analytics-card"><header><div><p className="suite-eyebrow">AKADEMIK</p><h3>Nilai Terbaru</h3></div></header><div className="recent-activity">{grades.slice(0,8).map(item=><div key={item.id}><span>📘</span><div><strong>{item.nama} — {item.mata_pelajaran}</strong><small>{item.kelas} • Rata-rata {Math.round((Number(item.pengetahuan||0)+Number(item.keterampilan||0))/2)}</small></div></div>)}{!grades.length&&<p>Belum ada nilai.</p>}</div></article><article className="analytics-card"><header><div><p className="suite-eyebrow">AKTIVITAS AI</p><h3>Penggunaan Terbaru</h3></div></header><div className="recent-activity">{logs.slice(0,8).map(log=><div key={log.id}><span>✦</span><div><strong>{log.title}</strong><small>{log.mode} • {log.role}</small></div></div>)}{!logs.length&&<p>Belum ada aktivitas.</p>}</div></article></section>
  </PortalLayout>
}
