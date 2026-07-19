"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { hasPermission, Permission } from "../lib/access";
import {
  createId,
  loadArray,
  loadSession,
  saveArray,
} from "../lib/client";

type Tab = "spp" | "prala" | "mcu" | "alumni" | "ppdb";

type ServiceRecord = {
  id: string;
  module: Tab;
  name: string;
  identity: string;
  status: string;
  amount?: number;
  date?: string;
  institution?: string;
  note?: string;
  createdAt: string;
};

const moduleConfig: Record<
  Tab,
  {
    title: string;
    icon: string;
    identityLabel: string;
    statusOptions: string[];
    permissionManage: Permission;
  }
> = {
  spp: {
    title: "Pembayaran SPP",
    icon: "💰",
    identityLabel: "Kelas / NIT",
    statusOptions: ["Lunas", "Belum Lunas", "Cicilan"],
    permissionManage: "manage_spp",
  },
  prala: {
    title: "Praktik Laut (PRALA)",
    icon: "🚢",
    identityLabel: "Kelas / NIT",
    statusOptions: ["Persiapan", "Pengajuan", "Diterima", "On Board", "Selesai"],
    permissionManage: "manage_prala",
  },
  mcu: {
    title: "Medical Check Up",
    icon: "📋",
    identityLabel: "Kelas / NIT",
    statusOptions: ["Belum MCU", "Terjadwal", "Fit", "Fit with Note", "Unfit"],
    permissionManage: "manage_mcu",
  },
  alumni: {
    title: "Database Alumni",
    icon: "🎓",
    identityLabel: "Tahun Lulus / Jurusan",
    statusOptions: ["Bekerja", "Berlayar", "Kuliah", "Wirausaha", "Belum Terdata"],
    permissionManage: "manage_alumni",
  },
  ppdb: {
    title: "PPDB",
    icon: "📢",
    identityLabel: "Asal Sekolah / No. Pendaftaran",
    statusOptions: ["Pendaftar", "Berkas Lengkap", "Tes", "Lulus", "Daftar Ulang"],
    permissionManage: "manage_ppdb",
  },
};

export default function ServicesPage() {
  const session = loadSession();
  const [tab, setTab] = useState<Tab>("spp");
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "Taruna Demo",
    identity: "X Nautika / NIT 001",
    status: "Lunas",
    amount: "500000",
    date: new Date().toISOString().slice(0, 10),
    institution: "",
    note: "",
  });

  useEffect(() => {
    setRecords(loadArray<ServiceRecord>("smkpd_services"));
  }, []);

  useEffect(() => {
    const config = moduleConfig[tab];
    setForm((previous) => ({
      ...previous,
      status: config.statusOptions[0],
      amount: tab === "spp" ? previous.amount || "500000" : "",
    }));
  }, [tab]);

  const config = moduleConfig[tab];
  const canManage =
    session ? hasPermission(session.role, config.permissionManage) : false;

  const visibleRecords = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return records.filter(
      (record) =>
        record.module === tab &&
        [record.name, record.identity, record.status, record.institution || ""]
          .join(" ")
          .toLowerCase()
          .includes(keyword)
    );
  }, [records, search, tab]);

  function addRecord(event: FormEvent) {
    event.preventDefault();
    const record: ServiceRecord = {
      id: createId(),
      module: tab,
      name: form.name,
      identity: form.identity,
      status: form.status,
      amount: form.amount ? Number(form.amount) : undefined,
      date: form.date,
      institution: form.institution,
      note: form.note,
      createdAt: new Date().toISOString(),
    };
    const next = [record, ...records];
    setRecords(next);
    saveArray("smkpd_services", next, 1000);
    setNotice(`${config.title} berhasil disimpan.`);
  }

  function removeRecord(record: ServiceRecord) {
    if (!window.confirm(`Hapus data ${record.name}?`)) return;
    const next = records.filter((item) => item.id !== record.id);
    setRecords(next);
    saveArray("smkpd_services", next, 1000);
  }

  const summary = visibleRecords.reduce<Record<string, number>>((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, {});

  return (
    <PortalLayout
      title="Layanan Sekolah"
      subtitle="SPP, PRALA, MCU, Alumni, dan PPDB dalam satu portal."
    >
      <div className="module-tabs">
        {(Object.keys(moduleConfig) as Tab[]).map((id) => (
          <button
            key={id}
            className={tab === id ? "active" : ""}
            onClick={() => setTab(id)}
          >
            {moduleConfig[id].icon} {moduleConfig[id].title}
          </button>
        ))}
      </div>

      <section className="module-stat-grid service-stat-grid">
        <article>
          <span>{config.icon}</span>
          <strong>{visibleRecords.length}</strong>
          <small>Total Data</small>
        </article>
        {Object.entries(summary).slice(0, 4).map(([label, count]) => (
          <article key={label}>
            <span>●</span>
            <strong>{count}</strong>
            <small>{label}</small>
          </article>
        ))}
      </section>

      <section className="data-module-layout">
        {canManage && (
          <form className="data-entry-card" onSubmit={addRecord}>
            <p className="suite-eyebrow">INPUT DATA</p>
            <h2>{config.icon} {config.title}</h2>
            <label>
              Nama
              <input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              {config.identityLabel}
              <input
                value={form.identity}
                onChange={(event) =>
                  setForm({ ...form, identity: event.target.value })
                }
              />
            </label>
            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  setForm({ ...form, status: event.target.value })
                }
              >
                {config.statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            {tab === "spp" && (
              <label>
                Nominal
                <input
                  type="number"
                  value={form.amount}
                  onChange={(event) =>
                    setForm({ ...form, amount: event.target.value })
                  }
                />
              </label>
            )}
            <label>
              Tanggal
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm({ ...form, date: event.target.value })}
              />
            </label>
            {(tab === "prala" || tab === "mcu" || tab === "alumni") && (
              <label>
                {tab === "prala"
                  ? "Perusahaan / Kapal"
                  : tab === "mcu"
                    ? "Klinik / Rumah Sakit"
                    : "Perusahaan / Institusi"}
                <input
                  value={form.institution}
                  onChange={(event) =>
                    setForm({ ...form, institution: event.target.value })
                  }
                />
              </label>
            )}
            <label>
              Catatan
              <textarea
                rows={3}
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
              />
            </label>
            <button>Simpan Data</button>
          </form>
        )}

        <section className="module-card">
          <div className="module-card-header">
            <div>
              <p className="suite-eyebrow">DATA {config.title.toUpperCase()}</p>
              <h2>{visibleRecords.length} Data</h2>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari data..."
            />
          </div>

          <div className="responsive-table-wrap">
            <table className="school-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Identitas</th>
                  <th>Status</th>
                  {tab === "spp" && <th>Nominal</th>}
                  <th>Tanggal</th>
                  <th>Instansi</th>
                  <th>Catatan</th>
                  {canManage && <th>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {visibleRecords.map((record) => (
                  <tr key={record.id}>
                    <td>{record.name}</td>
                    <td>{record.identity}</td>
                    <td>{record.status}</td>
                    {tab === "spp" && (
                      <td>
                        Rp {(record.amount || 0).toLocaleString("id-ID")}
                      </td>
                    )}
                    <td>{record.date || "-"}</td>
                    <td>{record.institution || "-"}</td>
                    <td>{record.note || "-"}</td>
                    {canManage && (
                      <td>
                        <button
                          className="table-delete-button"
                          onClick={() => removeRecord(record)}
                        >
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {notice && <p className="module-notice">{notice}</p>}
    </PortalLayout>
  );
}
