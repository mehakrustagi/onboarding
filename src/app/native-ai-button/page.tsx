"use client";

import NativeAIButton from "@/components/NativeAIButton";

/* Bench for Button/Native AI — Figma node 1276:17325. One button, the
 * default: Medium 200, label "text", drop-glow on, no icons.
 *
 * The page grey is not decoration. The pill is unfilled glass, so whatever
 * sits behind it tints the blurred colour inside — on white it reads pale,
 * on black it reads like neon. #d4d4d4 is the ground the Figma frame uses,
 * and it is the only background this can be compared against. */
export default function NativeAIButtonBench() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#d4d4d4] p-10">
      <NativeAIButton label="text" />
      <p className="text-[12px] text-[#6b6b73]">Tap it — the gradient parts where your finger lands.</p>
    </main>
  );
}
