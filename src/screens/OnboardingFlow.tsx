"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import Screen1 from "./Screen1";
import Screen2 from "./Screen2";
import Screen3 from "./Screen3";
import Screen4 from "./Screen4";
import Screen5 from "./Screen5";
import Screen6 from "./Screen6";
import {
  ALL_CHECKPOINTS,
  CHECKPOINTS_INNER,
  CHECKPOINTS_OUTER,
  CheckpointPanel,
  type CheckpointOrInner,
  type Screen5Phase,
} from "./checkpoints";

type InnerMatcher = (typeof CHECKPOINTS_INNER)[number]["matcher"];

const SCREENS = [Screen1, Screen2, Screen3, Screen4, Screen5, Screen6] as const;

const AUTO_ADVANCE_MS: Record<number, number> = {
  0: 3000,
  1: 4200,
  2: 2000,
};

export default function OnboardingFlow() {
  const [index, setIndex] = useState(0);
  const [checkpointIdx, setCheckpointIdx] = useState(-1);
  // Shared: Screen 6 drives this 1 → 0 as user swipes to the household card;
  // Screen 5 reads it to fade out its finale WorldPass card in sync.
  const screen5CardVisibility = useMotionValue(1);

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
  const screen5Phase: Screen5Phase | undefined =
    activeCp && "screen5Phase" in activeCp
      ? (activeCp.screen5Phase as Screen5Phase | undefined)
      : undefined;
  // Force-remount Screen 5 when a checkpoint into it changes, so the
  // initialPhase seed re-runs from scratch.
  const screen5Key = `screen5-${screen5Phase ?? "default"}`;

  return (
    <>
      {/* Checkpoint panel hidden — flip to `true` when needed for dev jumping. */}
      {false && (
        <CheckpointPanel
          activeIdx={checkpointIdx}
          onJump={(i) => setCheckpointIdx(i)}
        />
      )}
      <div
        onClick={next}
        className="relative h-[965px] w-[440px] cursor-pointer select-none overflow-hidden rounded-[44px] bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
      >
        {/* Screens 1–4 (splash → agent flow) swap through AnimatePresence.
            Screens 5 & 6 share a single canvas — Screen 5 stays mounted
            once index reaches 4 so its globe video keeps playing without
            a reload when Screen 6 layers on top at index 5. */}
        <AnimatePresence mode="wait">
          {index <= 3 && (
            <motion.div key={index} className="absolute inset-0">
              {index === 3 ? (
                <Screen4 checkpointMatcher={innerMatcher} onComplete={next} />
              ) : (
                <Current />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {index >= 4 && (
          <div className="absolute inset-0">
            <Screen5
              key={screen5Key}
              initialPhase={index === 5 ? "final" : screen5Phase}
              onComplete={next}
              hideFinaleSummary={index === 5}
              finaleCardOpacity={index === 5 ? screen5CardVisibility : undefined}
            />
          </div>
        )}
        {index === 5 && (
          <div className="absolute inset-0">
            <Screen6 screen5CardVisibility={screen5CardVisibility} />
          </div>
        )}
      </div>
    </>
  );
}

// Suppress unused-import lint warnings while we keep the array exports live.
export const _cpKeepAlive = [CHECKPOINTS_OUTER, CHECKPOINTS_INNER];
