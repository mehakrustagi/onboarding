import type { Metadata } from "next";
import { Inter, Doto } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Dotted-digital display font for the WorldPass card ID — Doto is a
// variable-weight Google font designed to mimic segmented dot-matrix
// displays, matching Figma's "Enhanced Dot Digital-7" much more closely
// than VT323's straight-line segments.
const doto = Doto({
  variable: "--font-doto",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Atlys — Onboarding",
  description: "Atlys onboarding experience",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${doto.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
