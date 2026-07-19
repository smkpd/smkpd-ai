"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { loadSession, Role, Session } from "../lib/client";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  allowedRoles?: Role[];
};

const navigation: Array<{
  href: string;
  label: string;
  icon: string;
  roles: Role[];
}> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "▦",
    roles: ["Admin", "Guru", "Taruna", "Wali Taruna"],
  },
  {
    href: "/ai",
    label: "AI Profesional",
    icon: "✦",
    roles: ["Admin", "Guru", "Taruna", "Wali Taruna"],
  },
  {
    href: "/knowledge",
    label: "PDF & Knowledge",
    icon: "📂",
    roles: ["Admin", "Guru", "Taruna", "Wali Taruna"],
  },
  {
    href: "/kepala-sekolah",
    label: "Dashboard Kepala",
    icon: "📊",
    roles: ["Admin"],
  },
  {
    href: "/presentasi",
    label: "Mode Presentasi",
    icon: "▶",
    roles: ["Admin", "Guru", "Taruna", "Wali Taruna"],
  },
];

export default function PortalLayout({
  title,
  subtitle,
  children,
  allowedRoles,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

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

    setSession(activeSession);
    setReady(true);
  }, [allowedRoles, router]);

  const visibleNavigation = useMemo(
    () =>
      session
        ? navigation.filter((item) => item.roles.includes(session.role))
        : [],
    [session]
  );

  function logout() {
    localStorage.removeItem("smkpd_session");
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
      <aside className="suite-sidebar">
        <Link href="/" className="suite-brand">
          <img src="/logo-smkpd-192.png" alt="Logo SMK Pelayaran Demak" />
          <div>
            <strong>SMKPD AI</strong>
            <span>Presentation Edition v3.0</span>
          </div>
        </Link>

        <div className="suite-profile">
          <span>
            {session.role === "Admin"
              ? "👨‍💼"
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
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="suite-specialists">
          <p>AI SPESIALIS</p>
          <Link href="/ai?mode=nautika">⚓ AI Nautika</Link>
          <Link href="/ai?mode=teknika">⚙️ AI Teknika</Link>
          <Link href="/ai?mode=english">📚 Maritime English</Link>
        </div>

        <button className="suite-logout" onClick={logout}>
          Keluar dari Akun
        </button>
      </aside>

      <section className="suite-main">
        <header className="suite-topbar">
          <div>
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
