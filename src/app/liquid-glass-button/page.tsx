"use client";

import LiquidGlassButton from "@/components/LiquidGlassButton";

/* Bench for the second gradient pill, built from the Natural app recording.
 * The ground is near-white (#fafafa, sampled off the recording) — it has to
 * be: the pill's caps and its whole upper half fade INTO the page, so on a
 * grey ground the shape would end in a visible grey band instead of
 * dissolving. */
export default function LiquidGlassButtonBench() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-7 bg-[#fafafa] px-6">
      <LiquidGlassButton label="Continue" />
      <p className="max-w-[300px] text-center text-[13px] leading-[18px] text-[#8a8a92]">
        By tapping &lsquo;Continue&rsquo; you agree to our{" "}
        <span className="text-[#9aa8d8]">Terms of Service</span> and{" "}
        <span className="text-[#9aa8d8]">Privacy Policy</span>.
      </p>
      <p className="mt-6 text-[12px] text-[#b0b0b8]">
        Tap it — a bead of glass swells where your finger lands.
      </p>
    </main>
  );
}
