"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { hasPermission, Permission } from "../lib/access";
import { createId, loadSession } from "../lib/client";
import { DataModule } from "../lib/schema";
import { dbDelete, dbGetAll, dbPutOne } from "../lib/database";

type Tab = "spp" | "prala" | "mcu" | "alumni" | "ppdb";

const config: Record<Tab,{title:string;icon:string;permission:Permission;fields:string[]}> = {
  spp:{title:"Pembayaran SPP",icon:"💰",permission:"manage_spp",fields:["nit","nama","kelas","bulan","tahun","tagihan","dibayar","status","tanggal_bayar","catatan"]},
  prala:{title:"PRALA",icon:"🚢",permission:"manage_prala",fields:["nit","nama","kelas","perusahaan","kapal","status","tanggal_mulai","tanggal_selesai","pembimbing","catatan"]},
  mcu:{title:"MCU",icon:"📋",permission:"manage_mcu",fields:["nit","nama","kelas","fasilitas_kesehatan","tanggal","status","catatan"]},
  alumni:{title:"Alumni",icon:"🎓",permission:"manage_alumni",fields:["nit","nama","tahun_lulus","program_keahlian","status","perusahaan_institusi","jabatan","telepon","catatan"]},
  ppdb:{title:"PPDB",icon:"📢",permission:"manage_ppdb",fields:["nomor_pendaftaran","nama","asal_sekolah","pilihan_program","telepon","status","tanggal_daftar","catatan"]},
};

export default function ServicesPage() {
  const session=loadSession();
  const [tab,setTab]=useState<Tab>("spp");
  const [records,setRecords]=useState<any[]>([]);
  const [notice,setNotice]=useState("");
  const [form,setForm]=useState<Record<string,string>>({nit:"NIT001",nama:"Taruna Contoh",kelas:"X Nautika",status:"Lunas",bulan:"Juli",tahun:"2026",tagihan:"500000",dibayar:"500000",tanggal_bayar:new Date().toISOString().slice(0,10),catatan:""});

  async function refresh(){ setRecords(await dbGetAll(tab as DataModule));}
  useEffect(()=>{refresh();},[tab]);

  const active=config[tab];
  const canManage=session?hasPermission(session.role,active.permission):false;

  useEffect(()=>{ const next:Record<string,string>={}; active.fields.forEach(field=>next[field]=form[field]||""); if(active.fields.includes("status")) next.status=next.status||"Aktif"; setForm(next);},[tab]);

  async function submit(event:FormEvent){event.preventDefault(); await dbPutOne(tab as DataModule,{...form,id:createId(),tagihan:Number(form.tagihan||0),dibayar:Number(form.dibayar||0),tahun:Number(form.tahun||0)}); await refresh(); setNotice(`${active.title} tersimpan ke database.`);}
  async function remove(item:any){if(!window.confirm("Hapus data ini?"))return; await dbDelete(tab as DataModule,item); await refresh();}

  const summaries=useMemo(()=>{const result:Record<string,number>={}; records.forEach(item=>result[item.status||"Tanpa Status"]=(result[item.status||"Tanpa Status"]||0)+1); return result;},[records]);

  return <PortalLayout title="Layanan Taruna" subtitle="SPP, PRALA, MCU, Alumni, dan PPDB — data tersimpan dalam database terpusat.">
    <div className="module-tabs">{(Object.keys(config) as Tab[]).map(id=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}>{config[id].icon} {config[id].title}</button>)}</div>
    <section className="module-stat-grid"><article><span>{active.icon}</span><strong>{records.length}</strong><small>Total Data</small></article>{Object.entries(summaries).slice(0,3).map(([label,count])=><article key={label}><span>●</span><strong>{count}</strong><small>{label}</small></article>)}</section>
    <section className="data-module-layout">
      {canManage && <form className="data-entry-card" onSubmit={submit}><p className="suite-eyebrow">INPUT DATA</p><h2>{active.icon} {active.title}</h2>{active.fields.map(field=><label key={field}>{field.replaceAll("_"," ")}<input type={field.includes("tanggal")?"date":field==="tagihan"||field==="dibayar"||field==="tahun"?"number":"text"} value={form[field]||""} onChange={e=>setForm({...form,[field]:e.target.value})}/></label>)}<button>Simpan Data</button></form>}
      <section className="module-card"><div className="module-card-header"><div><p className="suite-eyebrow">DATABASE</p><h2>{active.title}</h2></div><a href="/database">Import Massal Excel →</a></div><div className="responsive-table-wrap"><table className="school-table"><thead><tr>{active.fields.map(field=><th key={field}>{field}</th>)}{canManage&&<th>Aksi</th>}</tr></thead><tbody>{records.slice(0,200).map((item,index)=><tr key={item.id||index}>{active.fields.map(field=><td key={field}>{String(item[field]??"")}</td>)}{canManage&&<td><button className="table-delete-button" onClick={()=>remove(item)}>Hapus</button></td>}</tr>)}</tbody></table></div></section>
    </section>
    {notice&&<p className="module-notice">{notice}</p>}
  </PortalLayout>
}
