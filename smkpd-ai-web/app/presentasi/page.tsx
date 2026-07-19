"use client";

import Link from "next/link";
import PortalLayout from "../components/PortalLayout";

const sprints = [
  {
    title: "Sprint 1 — Sistem Pengguna",
    icon: "🔐",
    features: [
      "Login 4 Role",
      "Dashboard Profesional",
      "Sidebar dan Navbar",
      "Session Login",
      "Hak Akses berbasis peran",
    ],
    link: "/dashboard",
    action: "Buka Dashboard",
  },
  {
    title: "Sprint 2 — Produktivitas Guru",
    icon: "📘",
    features: [
      "AI Chat Profesional",
      "Generator Surat",
      "Generator Soal",
      "Generator Modul Ajar",
      "CP, ATP, dan LKPD",
      "Ekspor Word dan PDF",
      "Tabel otomatis",
    ],
    link: "/dashboard",
    action: "Demo Generator",
  },
  {
    title: "Sprint 3 — Knowledge & Monitoring",
    icon: "📊",
    features: [
      "Upload dan analisis PDF",
      "AI Knowledge Base",
      "Tanya jawab berdasarkan dokumen",
      "Dashboard Kepala Sekolah",
      "Statistik penggunaan AI",
      "Arsip dokumen lokal",
    ],
    link: "/knowledge",
    action: "Demo Knowledge Base",
  },
  {
    title: "Sprint 4 — AI Maritim",
    icon: "⚓",
    features: [
      "AI Nautika",
      "AI Teknika",
      "Maritime English",
      "Input suara",
      "Pembaca jawaban AI",
      "Knowledge context",
    ],
    link: "/ai",
    action: "Demo AI Maritim",
  },
];

export default function PresentationPage() {
  async function fullscreen() {
    try {
      await document.documentElement.requestFullscreen();
    } catch {
      window.alert("Mode layar penuh belum diizinkan browser.");
    }
  }

  return (
    <PortalLayout
      title="Mode Presentasi"
      subtitle="Alur demonstrasi seluruh fitur SMKPD AI Professional."
    >
      <section className="presentation-hero">
        <img src="/logo-smkpd-192.png" alt="Logo SMK Pelayaran Demak" />
        <div>
          <p className="suite-eyebrow">PRESENTATION READY</p>
          <h2>SMKPD AI Professional Edition</h2>
          <p>
            Smart Maritime Education Platform untuk pembelajaran, administrasi,
            pengetahuan sekolah, monitoring, dan kecerdasan maritim.
          </p>
        </div>
        <button onClick={fullscreen}>⛶ Layar Penuh</button>
      </section>

      <section className="presentation-sprints">
        {sprints.map((sprint) => (
          <article key={sprint.title}>
            <div className="presentation-sprint-icon">{sprint.icon}</div>
            <h3>{sprint.title}</h3>
            <ul>
              {sprint.features.map((feature) => (
                <li key={feature}>✓ {feature}</li>
              ))}
            </ul>
            <Link href={sprint.link}>{sprint.action} →</Link>
          </article>
        ))}
      </section>

      <section className="demo-flow">
        <div>
          <p className="suite-eyebrow">ALUR DEMO 10 MENIT</p>
          <h2>Urutan presentasi yang disarankan</h2>
        </div>
        <ol>
          <li>
            <strong>Login sebagai Admin</strong>
            <span>Tunjukkan empat role dan dashboard profesional.</span>
          </li>
          <li>
            <strong>Buat Modul atau Soal</strong>
            <span>Pilih format tabel, hasilkan dokumen, lalu ekspor Word.</span>
          </li>
          <li>
            <strong>Upload PDF</strong>
            <span>Masukkan PDF kecil dan tunjukkan ringkasan serta tanya jawab.</span>
          </li>
          <li>
            <strong>AI Maritim dan Voice</strong>
            <span>Demo AI Nautika atau Maritime English menggunakan mikrofon.</span>
          </li>
          <li>
            <strong>Dashboard Kepala Sekolah</strong>
            <span>Tutup dengan statistik aktivitas dan manfaat strategis.</span>
          </li>
        </ol>
      </section>

      <section className="presentation-closing">
        <h2>Nilai Utama untuk Sekolah</h2>
        <div>
          <article><strong>Lebih Cepat</strong><span>Administrasi guru dan materi dibuat dalam hitungan menit.</span></article>
          <article><strong>Lebih Terarah</strong><span>AI spesialis sesuai kebutuhan pendidikan maritim.</span></article>
          <article><strong>Lebih Terukur</strong><span>Aktivitas dan dokumen dapat dipantau melalui dashboard.</span></article>
          <article><strong>Siap Dikembangkan</strong><span>Fondasi untuk database online dan integrasi sistem sekolah.</span></article>
        </div>
      </section>
    </PortalLayout>
  );
}
