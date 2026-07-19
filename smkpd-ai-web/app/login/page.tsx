"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Role = "Admin" | "Guru" | "Taruna" | "Wali Taruna";

const accounts: Record<Role, { username: string; password: string; name: string }> = {
  Admin: { username: "admin", password: "smkpd2026", name: "Administrator SMKPD" },
  Guru: { username: "guru", password: "guru2026", name: "Guru SMKPD" },
  Taruna: { username: "taruna", password: "taruna2026", name: "Taruna SMKPD" },
  "Wali Taruna": { username: "wali", password: "wali2026", name: "Wali Taruna" },
};

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role>("Guru");
  const [username, setUsername] = useState("guru");
  const [password, setPassword] = useState("guru2026");
  const [error, setError] = useState("");

  useEffect(() => {
    const account = accounts[role];
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  }, [role]);

  function login(event: FormEvent) {
    event.preventDefault();
    const account = accounts[role];

    if (username.trim() !== account.username || password !== account.password) {
      setError("Username atau password demo belum sesuai.");
      return;
    }

    localStorage.setItem(
      "smkpd_session",
      JSON.stringify({
        role,
        name: account.name,
        loginAt: new Date().toISOString(),
      })
    );
    router.push("/dashboard");
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-identity">
          <Link href="/" className="back-home">← Kembali ke beranda</Link>
          <img src="/logo-smkpd.png" alt="Logo SMK Pelayaran Demak" />
          <p className="login-kicker">SMART MARITIME EDUCATION PLATFORM</p>
          <h1>SMKPD <span>AI</span></h1>
          <p>
            Portal terpadu pembelajaran, administrasi guru, generator soal,
            surat resmi, serta asistensi kecerdasan buatan maritim.
          </p>

          <div className="login-benefits">
            <div><b>⚓</b><span><strong>AI Maritim</strong><small>Nautika, Teknika, dan Maritime English</small></span></div>
            <div><b>📘</b><span><strong>Perangkat Ajar</strong><small>Modul, CP, ATP, LKPD, dan asesmen</small></span></div>
            <div><b>📄</b><span><strong>Administrasi Cepat</strong><small>Surat resmi dan ekspor dokumen</small></span></div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span className="login-lock logo-lock"><img src="/logo-smkpd-64.png" alt="" /></span>
            <div>
              <p>PORTAL PENGGUNA</p>
              <h2>Masuk ke Dashboard</h2>
            </div>
          </div>

          <form onSubmit={login}>
            <label>
              Peran Pengguna
              <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                <option>Admin</option>
                <option>Guru</option>
                <option>Taruna</option>
                <option>Wali Taruna</option>
              </select>
            </label>

            <label>
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>

            {error && <p className="login-error">{error}</p>}

            <button type="submit" className="login-submit">Masuk Sekarang →</button>
          </form>

          <div className="demo-credentials">
            <strong>Akun Demo Aktif</strong>
            <p>Admin: admin / smkpd2026</p>
            <p>Guru: guru / guru2026</p>
            <p>Taruna: taruna / taruna2026</p>
            <p>Wali: wali / wali2026</p>
          </div>

          <p className="login-warning">
            Versi cepat untuk demonstrasi. Autentikasi database yang aman akan
            ditambahkan pada pengembangan produksi.
          </p>
        </div>
      </section>
    </main>
  );
}
