"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValue } from "framer-motion";
import Screen1 from "./Screen1";
import Screen2 from "./Screen2";
import Screen3 from "./Screen3";
import Screen4 from "./Screen4";
import Screen5 from "./Screen5";
import Screen6 from "./Screen6";
import Screen7 from "./Screen7";
import {
  ALL_CHECKPOINTS,
  CHECKPOINTS_INNER,
  CHECKPOINTS_OUTER,
  CheckpointPanel,
  type CheckpointOrInner,
  type Screen5Phase,
} from "./checkpoints";

type InnerMatcher = (typeof CHECKPOINTS_INNER)[number]["matcher"];

/* Flow order (index → screen):
 *   0 Screen1 · Visa splash
 *   1 Screen2 · Travel agent intro
 *   2 Screen3 · That job is over
 *   3 Screen4 · Multi-agent flow (Visa/Flight/Forex/Safety) + Team perks
 *   4 Screen7 · Supercar arrival transfer (NEW)
 *   5 Screen5 · Issuing your WorldPass → card rise → finale
 *   6 Screen6 · WorldPass issued (layered on top of Screen 5) */
const SCREENS = [Screen1, Screen2, Screen3, Screen4, Screen7, Screen5, Screen6] as const;

const AUTO_ADVANCE_MS: Record<number, number> = {
  0: 3000,
  1: 4200,
  2: 2000,
};

export default function OnboardingFlow() {
  const [index, setIndex] = useState(0);
  const [checkpointIdx, setCheckpointIdx] = useState(-1);
  // Shared: Screen 6 drives this to translate Screen 5's finale card
  // horizontally along with the carousel strip — the card actually slides
  // instead of fading, so the WorldPass and household cards feel connected.
  const screen5CardX = useMotionValue(0);

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
      <CheckpointPanel
        activeIdx={checkpointIdx}
        onJump={(i) => setCheckpointIdx(i)}
      />
      <div
        onClick={next}
        className="relative h-[965px] w-[440px] cursor-pointer select-none overflow-hidden rounded-[44px] bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
      >
        {/* Screens 1–4 + Screen 7 (Supercar) swap through AnimatePresence.
            Screens 5 & 6 share a single canvas — Screen 5 stays mounted
            once index reaches 5 so its globe video keeps playing without
            a reload when Screen 6 layers on top at index 6. */}
        <AnimatePresence mode="wait">
          {index <= 4 && (
            <motion.div
              key={index}
              className="absolute inset-0"
              // Content drifts upward and softly blurs on exit. Gives the
              // Team-perks → Supercars swap (and every other outer transition)
              // a sense of forward-motion instead of a hard cut.
              exit={{
                y: -50,
                opacity: 0,
                filter: "blur(6px)",
                transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
              }}
            >
              {index === 3 ? (
                <Screen4 checkpointMatcher={innerMatcher} onComplete={next} />
              ) : index === 4 ? (
                <Screen7 onComplete={next} />
              ) : (
                <Current />
              )}
            </motion.div>
          )}
        </AnimatePresence>
        {index >= 5 && (
          <div className="absolute inset-0">
            <Screen5
              key={screen5Key}
              initialPhase={
                index === 6
                  ? "final"
                  : // Auto-flow (no Screen 5 checkpoint): come in on cardEmpty
                    // so the queue orbs are already at TOP_ROW_Y = 205 —
                    // Screen 7's Staged view leaves them exactly there, so
                    // the mount swap is visually continuous.
                    (screen5Phase ?? "cardEmpty")
              }
              onComplete={next}
              hideFinaleSummary={index === 6}
              finaleCardX={index === 6 ? screen5CardX : undefined}
            />
          </div>
        )}
        {index === 6 && (
          <div className="absolute inset-0">
            <Screen6 screen5CardX={screen5CardX} />
          </div>
        )}
      </div>
    </>
  );
}

// Suppress unused-import lint warnings while we keep the array exports live.
export const _cpKeepAlive = [CHECKPOINTS_OUTER, CHECKPOINTS_INNER];
