"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authenticate, loadUsers } from "../lib/users";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function login(event: FormEvent) {
    event.preventDefault();
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    try {
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
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page product-login-page">
      <section className="login-shell">
        <div className="login-identity">
          <Link href="/" className="back-home">← Kembali ke halaman utama</Link>
          <img src="/logo-smkpd.png" alt="Logo SMK Pelayaran Demak" />
          <p className="login-kicker">PORTAL SISTEM TERPADU</p>
          <h1>SMKPD <span>AI</span></h1>
          <p>
            Akses pembelajaran maritim, akademik, administrasi, database, dan
            layanan sekolah sesuai wewenang akun Anda.
          </p>

          <div className="login-benefits">
            <div><b>✦</b><span><strong>AI Pembelajaran</strong><small>Nautika, Teknika, Maritime English</small></span></div>
            <div><b>📊</b><span><strong>Sistem Akademik</strong><small>E-Raport, absensi, analisis, dan CBT</small></span></div>
            <div><b>🗄️</b><span><strong>Database Sekolah</strong><small>Data terstruktur dan import Excel per item</small></span></div>
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span className="login-lock logo-lock">
              <img src="/logo-smkpd-64.png" alt="" />
            </span>
            <div>
              <p>AKSES PENGGUNA</p>
              <h2>Masuk ke Sistem</h2>
            </div>
          </div>

          <form onSubmit={login}>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder="Masukkan username"
                autoFocus
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Masukkan password"
              />
            </label>

            {error && <p className="login-error">{error}</p>}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Memeriksa akun..." : "Masuk Sistem →"}
            </button>
          </form>

          <div className="login-account-help">
            <strong>Belum memiliki akun?</strong>
            <p>
              Hubungi Admin atau Kepala Sekolah untuk pembuatan akun dan
              pengaturan password.
            </p>
          </div>

          <div className="creator-credit">
            Dibuat oleh <strong>Syaiful Bahri, M. Pd</strong><br />
            Contact: 082335339994
          </div>
        </div>
      </section>
    </main>
  );
}
