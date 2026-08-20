"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Screen1 from "./Screen1";
import Screen2 from "./Screen2";
import Screen3 from "./Screen3";
import Screen4 from "./Screen4";
import Screen5 from "./Screen5";
import {
  ALL_CHECKPOINTS,
  CHECKPOINTS_INNER,
  CHECKPOINTS_OUTER,
  CheckpointPanel,
  type CheckpointOrInner,
} from "./checkpoints";

type InnerMatcher = (typeof CHECKPOINTS_INNER)[number]["matcher"];

const SCREENS = [Screen1, Screen2, Screen3, Screen4, Screen5] as const;

const AUTO_ADVANCE_MS: Record<number, number> = {
  0: 3000,
  1: 4200,
  2: 2000,
};

export default function OnboardingFlow() {
  const [index, setIndex] = useState(0);
  const [checkpointIdx, setCheckpointIdx] = useState(-1);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, SCREENS.length - 1));
  }, []);

  useEffect(() => {
    // Only auto-advance when user hasn't jumped to a checkpoint.
    if (checkpointIdx >= 0) return;
    const delay = AUTO_ADVANCE_MS[index];
    if (!delay || index === SCREENS.length - 1) return;
    const t = window.setTimeout(next, delay);
    return () => window.clearTimeout(t);
  }, [index, next, checkpointIdx]);

  // When a checkpoint is chosen, switch to its outer screen index.
  useEffect(() => {
    if (checkpointIdx < 0) return;
    const cp = ALL_CHECKPOINTS[checkpointIdx];
    setIndex(cp.outerIdx);
  }, [checkpointIdx]);

  const Current = SCREENS[index];

  // Compute the inner matcher to pass into Screen4 (only when relevant).
  const activeCp: CheckpointOrInner | null =
    checkpointIdx >= 0 ? ALL_CHECKPOINTS[checkpointIdx] : null;
  const innerMatcher: InnerMatcher | undefined =
    activeCp && "matcher" in activeCp
      ? (activeCp.matcher as InnerMatcher)
      : undefined;

  return (
    <>
      <CheckpointPanel
        activeIdx={checkpointIdx}
        onJump={(i) => setCheckpointIdx(i)}
      />
      <div
        onClick={next}
        className="relative h-[965px] w-[440px] cursor-pointer select-none overflow-hidden rounded-[44px] bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
      >
        <AnimatePresence mode="wait">
          <motion.div key={index} className="absolute inset-0">
            {index === 3 ? (
              <Screen4 checkpointMatcher={innerMatcher} onComplete={next} />
            ) : (
              <Current />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

// Suppress unused-import lint warnings while we keep the array exports live.
export const _cpKeepAlive = [CHECKPOINTS_OUTER, CHECKPOINTS_INNER];
