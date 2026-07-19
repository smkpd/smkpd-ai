"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PortalLayout from "../components/PortalLayout";
import { loadSession, Role } from "../lib/client";
import { dbCounts } from "../lib/database";

type DashboardCard = {
  title: string;
  description: string;
  icon: string;
  href: string;
  accent: string;
};

const scheduleCard: DashboardCard = {
  title: "Jadwal Otomatis",
  description:
    "Preferensi guru, beban mengajar, anti bentrok, serta ekspor per sekolah, guru, kelas, dan taruna.",
  icon: "🗓️",
  href: "/schedule",
  accent: "blue",
};

const cardsByRole: Record<Role, DashboardCard[]> = {
  Admin: [
    scheduleCard,
    {
      title: "Database & Import Excel",
      description:
        "Import data satu per satu, backup, browser data, dan sinkronisasi.",
      icon: "🗄️",
      href: "/database",
      accent: "purple",
    },
    {
      title: "Pengguna & Hak Akses",
      description:
        "Tambah akun, reset password, aktif/nonaktif, dan pembagian role.",
      icon: "👥",
      href: "/users",
      accent: "gold",
    },
    {
      title: "Generator Dokumen",
      description:
        "Modul, CP, ATP, LKPD, soal, dan surat resmi.",
      icon: "📄",
      href: "/generator",
      accent: "green",
    },
  ],
  "Kepala Sekolah": [
    scheduleCard,
    {
      title: "Dashboard Eksekutif",
      description:
        "Ringkasan akademik, layanan, database, dan aktivitas AI.",
      icon: "📊",
      href: "/kepala-sekolah",
      accent: "purple",
    },
    {
      title: "Database & Import Excel",
      description:
        "Validasi dan import data sekolah secara terstruktur.",
      icon: "🗄️",
      href: "/database",
      accent: "gold",
    },
    {
      title: "Pengguna & Hak Akses",
      description:
        "Menambah user dan mengatur password pengguna.",
      icon: "👥",
      href: "/users",
      accent: "green",
    },
  ],
  "Waka Kurikulum": [
    scheduleCard,
    {
      title: "Akademik & CBT",
      description:
        "Nilai, absensi, analisis belajar, dan bank soal.",
      icon: "📖",
      href: "/academic",
      accent: "purple",
    },
    {
      title: "Generator Dokumen",
      description:
        "Perangkat ajar, asesmen, dan administrasi kurikulum.",
      icon: "📄",
      href: "/generator",
      accent: "gold",
    },
    {
      title: "Perpustakaan AI",
      description:
        "PDF sekolah dan materi maritim berbasis AI.",
      icon: "📚",
      href: "/knowledge",
      accent: "green",
    },
  ],
  Guru: [
    scheduleCard,
    {
      title: "Generator Dokumen",
      description:
        "Buat perangkat ajar dan administrasi guru.",
      icon: "📄",
      href: "/generator",
      accent: "gold",
    },
    {
      title: "Akademik & CBT",
      description:
        "Nilai, absensi, analisis belajar, dan bank soal.",
      icon: "📖",
      href: "/academic",
      accent: "purple",
    },
    {
      title: "AI Pembelajaran",
      description:
        "AI umum, Nautika, Teknika, dan Maritime English.",
      icon: "✦",
      href: "/ai",
      accent: "green",
    },
  ],
  Taruna: [
    scheduleCard,
    {
      title: "AI Pembelajaran",
      description:
        "Belajar dengan AI Nautika, Teknika, dan Maritime English.",
      icon: "✦",
      href: "/ai",
      accent: "purple",
    },
    {
      title: "Simulator Maritim",
      description:
        "Virtual Ship Tour, Bridge, Engine Room, dan SMCP.",
      icon: "⚓",
      href: "/maritime",
      accent: "blue",
    },
    {
      title: "Akademik & CBT",
      description:
        "Latihan CBT serta melihat nilai dan absensi.",
      icon: "📖",
      href: "/academic",
      accent: "gold",
    },
  ],
  "Wali Taruna": [
    scheduleCard,
    {
      title: "Akademik Taruna",
      description:
        "Melihat E-Raport dan absensi.",
      icon: "📖",
      href: "/academic",
      accent: "blue",
    },
    {
      title: "Layanan Taruna",
      description:
        "Melihat status SPP, PRALA, dan MCU.",
      icon: "🏫",
      href: "/services",
      accent: "green",
    },
    {
      title: "Perpustakaan Informasi",
      description:
        "Membaca dokumen dan informasi sekolah.",
      icon: "📚",
      href: "/knowledge",
      accent: "gold",
    },
  ],
};

export default function DashboardPage() {
  const session = loadSession();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    dbCounts().then(setCounts).catch(() => setCounts({}));
  }, []);

  const cards = useMemo(
    () => (session ? cardsByRole[session.role] : []),
    [session]
  );

  return (
    <PortalLayout
      title="Dashboard"
      subtitle="Pilih pekerjaan utama sesuai peran. Setiap fungsi ditempatkan pada satu menu yang jelas."
    >
      <section className="clean-dashboard-hero">
        <div>
          <p className="suite-eyebrow">SELAMAT DATANG</p>
          <h2>{session?.name}</h2>
          <p>
            Role aktif: <strong>{session?.role}</strong>. Gunakan kartu di
            bawah sesuai pekerjaan yang akan dilakukan.
          </p>
        </div>
        <img src="/logo-smkpd-192.png" alt="" />
      </section>

      <section className="clean-dashboard-grid">
        {cards.map((card) => (
          <Link
            key={card.title}
            href={card.href}
            className={`clean-dashboard-card ${card.accent}`}
          >
            <span>{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <strong>Buka menu →</strong>
          </Link>
        ))}
      </section>

      <section className="database-summary-card">
        <div>
          <p className="suite-eyebrow">
            RINGKASAN DATABASE PERANGKAT INI
          </p>
          <h2>
            {Object.values(counts).reduce((a, b) => a + b, 0)} Rekaman
          </h2>
        </div>
        <div className="database-count-chips">
          {Object.entries(counts)
            .slice(0, 10)
            .map(([module, count]) => (
              <span key={module}>
                {module}: <b>{count}</b>
              </span>
            ))}
          {!Object.keys(counts).length && (
            <span>Database belum berisi data.</span>
          )}
        </div>
      </section>

      <section className="workflow-card">
        <p className="suite-eyebrow">ALUR PENJADWALAN</p>
        <ol>
          <li>
            <b>Admin/Kepala Sekolah/Waka Kurikulum:</b> lengkapi kode guru,
            kode mapel, kelas, dan ruang.
          </li>
          <li>
            <b>Guru:</b> pilih hari, rentang jam, dan mapel yang
            diprioritaskan.
          </li>
          <li>
            <b>Waka Kurikulum:</b> lengkapi beban mengajar dan generate
            jadwal anti bentrok.
          </li>
          <li>
            <b>Semua pengguna:</b> melihat jadwal sesuai guru, kelas, atau
            taruna dan mencetaknya.
          </li>
        </ol>
      </section>
    </PortalLayout>
  );
}
