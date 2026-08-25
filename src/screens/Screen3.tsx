"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import WordReveal from "@/components/WordReveal";
import { haptic } from "@/lib/haptics";

export default function Screen3() {
  // "That job is over." — 4 words at 90ms stagger. One tick per word
  // gives the line a decisive, staccato cadence.
  useEffect(() => {
    const words = 4;
    const stagger = 90;
    const firstWordLandsAt = 140; // word blur-in resolves ~140ms after start
    const timers: number[] = [];
    for (let i = 0; i < words; i++) {
      timers.push(
        window.setTimeout(
          () => haptic("textReveal"),
          firstWordLandsAt + i * stagger,
        ),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);
  return (
    <motion.div
      className="relative h-full w-full overflow-hidden rounded-[44px]"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg-screen-start), var(--bg-screen-end))",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.4 } }}
    >
      <div className="absolute left-1/2 top-1/2 w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center">
        <WordReveal
          text="That job is over."
          className="text-[22px] font-medium leading-[28px] tracking-[-0.04em] text-[color:var(--ink)]"
          staggerMs={90}
          perWordDurationMs={340}
        />
      </div>
    </motion.div>
  );
}
