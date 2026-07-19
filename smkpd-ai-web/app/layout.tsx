import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SMKPD AI | Smart Maritime Education Platform",
  description: "Platform AI pembelajaran maritim SMK Pelayaran Demak Boarding School",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
