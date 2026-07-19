import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SMKPD AI v3.1 | Smart Maritime Education Platform",
    template: "%s | SMKPD AI",
  },
  description:
    "Platform AI resmi pembelajaran maritim SMK Pelayaran Demak Boarding School.",
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
