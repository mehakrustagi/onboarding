"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import GradientText from "@/components/GradientText";
import WordReveal from "@/components/WordReveal";
import { blurInVariants } from "./motion";
import { haptic } from "@/lib/haptics";

export default function Screen2() {
  // Fire a soft tick as each of the 4 subtitle sentences lands
  // ("Filling visa forms.", "Hunting slots.", …). The headline uses
  // WordReveal with a fast stagger — one tick when the first word lands
  // gives it presence without turning into a buzz.
  useEffect(() => {
    const timers: number[] = [];
    // Headline word-reveal starts at t=0; first word lands ~150ms in.
    timers.push(window.setTimeout(() => haptic("textReveal"), 150));
    // Subtitle: delay 0.9 + i * 0.28 (per Screen2 JSX)
    for (let i = 0; i < 4; i++) {
      timers.push(
        window.setTimeout(() => haptic("textReveal"), 900 + i * 280 + 100),
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
      <div className="absolute left-1/2 top-[50%] w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center">
        <WordReveal
          as="h2"
          text={"All your life,\nyou’ve been your own travel agent."}
          className="text-[22px] font-medium leading-[28px] tracking-[-0.04em] text-[color:var(--ink)]"
          staggerMs={70}
          perWordDurationMs={300}
        />

        {/* Subtitle — sentences appear one by one after the headline finishes. */}
        <motion.div
          variants={blurInVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="mt-8 text-[15px] font-semibold leading-[22px] tracking-[-0.02em]"
        >
          <GradientText as="p" shine>
            {["Filling visa forms.", "Hunting slots.", "Tracking fares.", "Comparing hotels."].map(
              (sentence, i, arr) => (
                <motion.span
                  key={i}
                  className="inline"
                  initial={{ opacity: 0, filter: "blur(10px)", y: 6 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  transition={{
                    // Sped up so the whole intro clears in ~2s.
                    delay: 0.9 + i * 0.28,
                    duration: 0.45,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {sentence}
                  {i < arr.length - 1 && " "}
                </motion.span>
              ),
            )}
          </GradientText>
        </motion.div>
      </div>
    </motion.div>
  );
}
