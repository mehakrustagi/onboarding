import type { Metadata } from "next";
import { Inter, VT323 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// LCD-style digit font for the WorldPass card ID (approximates Figma's
// "Enhanced Dot Digital-7" font — same retro dot-matrix character).
const vt323 = VT323({
  variable: "--font-vt323",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlys — Onboarding",
  description: "Atlys onboarding experience",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${vt323.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
