"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { loadSession, Role, Session } from "../lib/client";
import { hasPermission, Permission } from "../lib/access";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  allowedRoles?: Role[];
  requiredPermission?: Permission;
};

type NavItem = {
  href: string;
  label: string;
  icon: string;
  permission?: Permission;
  roles?: Role[];
};

const navigation: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/ai", label: "AI Profesional", icon: "✦" },
  { href: "/maritime", label: "Maritime Learning", icon: "⚓" },
  { href: "/academic", label: "Akademik", icon: "📖" },
  { href: "/services", label: "Layanan Sekolah", icon: "🏫" },
  { href: "/knowledge", label: "PDF & Knowledge", icon: "📂" },
  {
    href: "/users",
    label: "Manajemen Pengguna",
    icon: "👥",
    permission: "manage_users",
  },
  {
    href: "/kepala-sekolah",
    label: "Dashboard Eksekutif",
    icon: "📊",
    permission: "executive_dashboard",
  },
  { href: "/presentasi", label: "Mode Presentasi", icon: "▶" },
];

export default function PortalLayout({
  title,
  subtitle,
  children,
  allowedRoles,
  requiredPermission,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const activeSession = loadSession();

    if (!activeSession) {
      router.replace("/login");
      return;
    }

    if (allowedRoles && !allowedRoles.includes(activeSession.role)) {
      router.replace("/dashboard");
      return;
    }

    if (
      requiredPermission &&
      !hasPermission(activeSession.role, requiredPermission)
    ) {
      router.replace("/dashboard");
      return;
    }

    setSession(activeSession);
    setReady(true);
  }, [allowedRoles, requiredPermission, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const visibleNavigation = useMemo(() => {
    if (!session) return [];
    return navigation.filter((item) => {
      if (item.roles && !item.roles.includes(session.role)) return false;
      if (item.permission && !hasPermission(session.role, item.permission)) {
        return false;
      }
      return true;
    });
  }, [session]);

  function logout() {
    localStorage.removeItem("smkpd_session");
    localStorage.removeItem("smkpd_current_user_id");
    router.push("/login");
  }

  if (!ready || !session) {
    return (
      <main className="suite-loading">
        <img src="/logo-smkpd-192.png" alt="Logo SMK Pelayaran Demak" />
        <p>Menyiapkan SMKPD AI...</p>
      </main>
    );
  }

  return (
    <main className="suite-page">
      <button
        className={`suite-overlay ${menuOpen ? "show" : ""}`}
        aria-label="Tutup menu"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`suite-sidebar ${menuOpen ? "open" : ""}`}>
        <div className="suite-sidebar-mobile-head">
          <span>Menu Utama</span>
          <button onClick={() => setMenuOpen(false)}>×</button>
        </div>

        <Link href="/" className="suite-brand">
          <img src="/logo-smkpd-192.png" alt="Logo SMKPD" />
          <div>
            <strong>SMKPD AI</strong>
            <span>School Super App v4.0</span>
          </div>
        </Link>

        <div className="suite-profile">
          <span>
            {session.role === "Admin"
              ? "👨‍💼"
              : session.role === "Kepala Sekolah"
                ? "👩‍💼"
                : session.role === "Guru"
                  ? "👨‍🏫"
                  : session.role === "Taruna"
                    ? "👨‍🎓"
                    : "👨‍👩‍👦"}
          </span>
          <div>
            <strong>{session.name}</strong>
            <small>{session.role}</small>
          </div>
        </div>

        <nav className="suite-nav">
          {visibleNavigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? "active" : ""}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.icon}</span>{item.label}
            </Link>
          ))}
        </nav>

        <div className="suite-specialists">
          <p>AI SPESIALIS</p>
          <a href="/ai?mode=nautika">⚓ AI Nautika</a>
          <a href="/ai?mode=teknika">⚙️ AI Teknika</a>
          <a href="/ai?mode=english">📚 Maritime English</a>
        </div>

        <button className="suite-logout" onClick={logout}>
          Keluar dari Akun
        </button>
      </aside>

      <section className="suite-main">
        <header className="suite-topbar">
          <button
            className="suite-menu-toggle"
            onClick={() => setMenuOpen(true)}
          >
            ☰
          </button>
          <div className="suite-topbar-title">
            <p>SMK PELAYARAN DEMAK BOARDING SCHOOL</p>
            <h1>{title}</h1>
            <span>{subtitle}</span>
          </div>
          <div className="suite-top-actions">
            <Link href="/presentasi">▶ Presentasi</Link>
            <Link href="/">Beranda</Link>
          </div>
        </header>

        <div className="suite-body">{children}</div>
      </section>
    </main>
  );
}
