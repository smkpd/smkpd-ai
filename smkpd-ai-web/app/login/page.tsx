"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticate, loadUsers } from "../lib/users";

const demoAccounts = [
  { role: "Admin", username: "admin", password: "smkpd2026" },
  { role: "Kepala Sekolah", username: "kepala", password: "kepala2026" },
  { role: "Guru", username: "guru", password: "guru2026" },
  { role: "Taruna", username: "taruna", password: "taruna2026" },
  { role: "Wali Taruna", username: "wali", password: "wali2026" },
];

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("smkpd2026");
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    const account = await authenticate(username, password);

    if (!account) {
      setError("Username, password, atau status akun tidak sesuai.");
      return;
    }

    localStorage.setItem(
      "smkpd_session",
      JSON.stringify({
        role: account.role,
        name: account.name,
        loginAt: new Date().toISOString(),
      })
    );
    localStorage.setItem("smkpd_current_user_id", account.id);
    router.push(
      account.role === "Kepala Sekolah"
        ? "/kepala-sekolah"
        : "/dashboard"
    );
  }

  function useDemo(usernameValue: string, passwordValue: string) {
    setUsername(usernameValue);
    setPassword(passwordValue);
    setError("");
  }

  return (
    <main className="login-page">
      <section className="login-shell">
        <div className="login-identity">
          <Link href="/" className="back-home">← Kembali ke beranda</Link>
          <img src="/logo-smkpd.png" alt="Logo SMK Pelayaran Demak" />
          <p className="login-kicker">SCHOOL SUPER APP</p>
          <h1>SMKPD <span>AI</span></h1>
          <p>
            Platform terpadu pembelajaran maritim, akademik, administrasi,
            layanan taruna, dan monitoring kepala sekolah.
          </p>

          <div className="login-benefits">
            <div><b>⚓</b><span><strong>Maritime Learning</strong><small>AI, simulator dasar, SMCP, dan CBT</small></span></div>
            <div><b>📊</b><span><strong>Academic System</strong><small>E-Raport, absensi, dan analisis belajar</small></span></div>
            <div><b>🏫</b><span><strong>School Services</strong><small>SPP, PRALA, MCU, Alumni, dan PPDB</small></span></div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span className="login-lock logo-lock">
              <img src="/logo-smkpd-64.png" alt="" />
            </span>
            <div>
              <p>PORTAL PENGGUNA</p>
              <h2>Masuk ke SMKPD AI</h2>
            </div>
          </div>

          <form onSubmit={login}>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            </label>

            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-submit">Masuk Sekarang →</button>
          </form>

          <div className="demo-credentials role-demo-list">
            <strong>Akun Demo</strong>
            {demoAccounts.map((account) => (
              <button
                key={account.role}
                onClick={() => useDemo(account.username, account.password)}
              >
                <span>{account.role}</span>
                <small>{account.username} / {account.password}</small>
              </button>
            ))}
          </div>

          <p className="login-warning">
            Database Edition menyimpan data lokal pada browser dan dapat
            disinkronkan ke database cloud setelah konfigurasi.
          </p>
          <div className="creator-credit">
            Dibuat oleh <strong>Syaiful Bahri, M. Pd</strong><br/>
            Contact: 082335339994
          </div>
        </div>
      </section>
    </main>
  );
}
