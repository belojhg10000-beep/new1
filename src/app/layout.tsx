import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Cairo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-code", display: "swap" });

export const metadata: Metadata = {
  title: "PROGRAMMERS BATTLE – معركة المبرمجين | New Vision Club",
  description:
    "مسابقة برمجية جامعية ينظمها نادي New Vision Club – كلية العلوم والتكنولوجيا، جامعة محمد خيضر بسكرة. سجّل الآن وشارك في معركة المبرمجين.",
  icons: { icon: "/logos/club.svg" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#0a1f5c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} ${mono.variable}`}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
