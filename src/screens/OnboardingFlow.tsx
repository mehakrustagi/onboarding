"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Screen1 from "./Screen1";
import Screen2 from "./Screen2";
import Screen3 from "./Screen3";
import Screen4 from "./Screen4";

const SCREENS = [Screen1, Screen2, Screen3, Screen4] as const;

const AUTO_ADVANCE_MS: Record<number, number> = {
  0: 3000,
  1: 4200,
  2: 2000,
};

export default function OnboardingFlow() {
  const [index, setIndex] = useState(0);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, SCREENS.length - 1));
  }, []);

  useEffect(() => {
    const delay = AUTO_ADVANCE_MS[index];
    if (!delay || index === SCREENS.length - 1) return;
    const t = window.setTimeout(next, delay);
    return () => window.clearTimeout(t);
  }, [index, next]);

  const Current = SCREENS[index];

  return (
    <div
      onClick={next}
      className="relative h-[965px] w-[440px] cursor-pointer select-none overflow-hidden rounded-[44px] bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
    >
      <AnimatePresence mode="wait">
        <motion.div key={index} className="absolute inset-0">
          <Current />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
