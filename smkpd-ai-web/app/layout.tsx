import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://smkpd-ai.vercel.app"),
  title: {
    default: "SMKPD AI | Sistem Informasi dan Pembelajaran Maritim",
    template: "%s | SMKPD AI",
  },
  description:
    "Sistem terpadu pembelajaran maritim, akademik, administrasi, database, dan layanan SMK Pelayaran Demak Boarding School.",
  applicationName: "SMKPD AI",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-smkpd-192.png", type: "image/png", sizes: "192x192" },
      { url: "/logo-smkpd-512.png", type: "image/png", sizes: "512x512" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  },
  openGraph: {
    title: "SMKPD AI",
    description:
      "Smart Maritime Education Platform – SMK Pelayaran Demak Boarding School.",
    type: "website",
    locale: "id_ID",
    images: [
      {
        url: "/logo-smkpd-512.png",
        width: 512,
        height: 512,
        alt: "Logo SMK Pelayaran Demak",
      },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#061a33",
  colorScheme: "dark light",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
