"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { loadSession, Role, Session } from "../lib/client";
import { hasPermission, Permission } from "../lib/access";
import { migrateLegacyData } from "../lib/database";

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

type NavGroup = {
  title: string;
  items: NavItem[];
};

const groups: NavGroup[] = [
  {
    title: "UTAMA",
    items: [{ href: "/dashboard", label: "Dashboard", icon: "▦" }],
  },
  {
    title: "PEMBELAJARAN",
    items: [
      { href: "/ai", label: "AI Pembelajaran", icon: "✦" },
      { href: "/knowledge", label: "Perpustakaan AI", icon: "📚" },
      { href: "/maritime", label: "Simulator Maritim", icon: "⚓" },
      { href: "/academic", label: "Akademik & CBT", icon: "📖" },
    ],
  },
  {
    title: "LAYANAN",
    items: [
      { href: "/services", label: "Layanan Taruna", icon: "🏫" },
    ],
  },
  {
    title: "ADMINISTRASI",
    items: [
      {
        href: "/generator",
        label: "Generator Dokumen",
        icon: "📄",
        permission: "manage_generators",
      },
    ],
  },
  {
    title: "SISTEM",
    items: [
      {
        href: "/database",
        label: "Database & Excel",
        icon: "🗄️",
        roles: ["Admin", "Kepala Sekolah"],
      },
      {
        href: "/users",
        label: "Pengguna & Akses",
        icon: "👥",
        permission: "manage_users",
      },
      {
        href: "/kepala-sekolah",
        label: "Dashboard Eksekutif",
        icon: "📊",
        permission: "executive_dashboard",
      },
    ],
  },
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

  const allowedRolesKey = allowedRoles?.join("|") || "";

  useEffect(() => {
    async function prepare() {
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

      await migrateLegacyData();
      setSession(activeSession);
      setReady(true);
    }

    prepare();
  }, [allowedRolesKey, requiredPermission, router]);

  useEffect(() => setMenuOpen(false), [pathname]);

  const visibleGroups = useMemo(() => {
    if (!session) return [];

    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => {
          if (item.roles && !item.roles.includes(session.role)) return false;
          if (
            item.permission &&
            !hasPermission(session.role, item.permission)
          ) {
            return false;
          }
          return true;
        }),
      }))
      .filter((group) => group.items.length);
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
            <span>Sistem Terpadu Sekolah</span>
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

        <nav className="suite-nav grouped-nav">
          {visibleGroups.map((group) => (
            <section key={group.title}>
              <p>{group.title}</p>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? "active" : ""}
                  onClick={() => setMenuOpen(false)}
                >
                  <span>{item.icon}</span>{item.label}
                </Link>
              ))}
            </section>
          ))}
        </nav>

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
            <Link href="/">Beranda</Link>
          </div>
        </header>

        <div className="suite-body">{children}</div>

        <footer className="system-credit">
          <span>SMKPD AI</span>
          <strong>Dibuat oleh Syaiful Bahri, M. Pd</strong>
          <span>Contact: 082335339994</span>
        </footer>
      </section>
    </main>
  );
}
