"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTime,
  useTransform,
  animate,
} from "framer-motion";
import AgentOrb from "@/components/AgentOrb";
import Card3D from "@/components/Card3D";
import CuboidText from "@/components/CuboidText";
import WordReveal from "@/components/WordReveal";

/* -----------------------------------------------------------------------------
 * Screen 5 — "Issuing your Atlys WorldPass"
 *
 * Story arc:
 *   1. Intro title "Every agent on your team unlocks multiple benefits"
 *   2. 3D card rises from below, "02%" visible
 *   3. Header text swaps to "Issuing your Atlys WorldPass"
 *   4. For each benefit: the responsible agent's orb glides down onto the card,
 *      title + description reveal word-by-word, % ticks up, card shines.
 *   5. Repeat for all 6 benefits.
 * ---------------------------------------------------------------------------*/

type OrbKey = "visa" | "flight" | "forex" | "safety";
const ORB_BLOBS: Record<OrbKey, string> = {
  visa: "/assets/orb/ellipse.png",
  flight: "/assets/orb/blob-flight.png",
  forex: "/assets/orb/blob-forex.png",
  safety: "/assets/orb/blob-safety.png",
};

type Benefit = {
  title: string;
  desc: string;
  percent: number;
  orb: OrbKey;
  /** CSS class from globals.css with the exact stops per Figma. */
  titleGradientClass: string;
};

const BENEFITS: Benefit[] = [
  {
    title: "Embassy Slot Priority",
    desc: "Watching calendars 24/7—grabbing appointment slots the second they open",
    percent: 12,
    orb: "visa",
    titleGradientClass: "title-gradient-visa",
  },
  {
    title: "Atlys Protect",
    desc: "100% automatic refund on visa & government fees if rejected",
    percent: 48,
    orb: "visa",
    titleGradientClass: "title-gradient-protect",
  },
  {
    title: "0 Forex Markups",
    desc: "Real interbank exchange rates locked with zero spread fees and doorstep cash delivery",
    percent: 66,
    orb: "forex",
    titleGradientClass: "title-gradient-forex",
  },
  {
    title: "Flat 10% Off Stays",
    desc: "Direct savings auto-applied across Taj, Oberoi, Marriott, Hyatt, and more",
    percent: 74,
    orb: "flight",
    titleGradientClass: "title-gradient-stays",
  },
  {
    title: "24/7 Medical & Delay Cover",
    desc: "Auto-attached $200 delay protection, $500 baggage cover, and instant doctor access",
    percent: 88,
    orb: "safety",
    titleGradientClass: "title-gradient-data",
  },
  {
    title: "Global Data Pass",
    desc: "Instant eSIM activation ready before you land on every trip",
    percent: 95,
    orb: "flight",
    titleGradientClass: "title-gradient-data",
  },
];

// Orb resting row at top — orbs keep the SAME size as Screen 4's welcome
// row (48px) so the 4→5 handoff has zero size change. Only Y translates.
const TOP_ROW_Y = 205;
const TOP_ORB_SIZE = 48;
const TOP_ROW_GAP = 12;

/** Ordered unique agents shown in the top row, left → right — matches the
 *  order handed over from Screen 4's welcome/team-perks state. */
const QUEUE: OrbKey[] = ["safety", "forex", "flight", "visa"];

/** X coordinate for the center of the i-th orb when the row has `count` orbs.
 *  The row is always centered horizontally at x=220. */
function slotX(count: number, i: number) {
  const totalW = count * TOP_ORB_SIZE + (count - 1) * TOP_ROW_GAP;
  const leftEdge = 220 - totalW / 2;
  return leftEdge + i * (TOP_ORB_SIZE + TOP_ROW_GAP) + TOP_ORB_SIZE / 2;
}

/** Set of agents already consumed at (or before) the given benefit index. */
function consumedAgents(benefitIdx: number): Set<OrbKey> {
  const s = new Set<OrbKey>();
  if (benefitIdx < 0) return s;
  for (let i = 0; i <= benefitIdx; i++) s.add(BENEFITS[i].orb);
  return s;
}
// When an orb is "active" on the card, it sits centered above the card content.
const CARD_ORB_X = 220;
const CARD_ORB_Y = 440;
const CARD_ORB_SIZE = 34;

// Where each orb sits at the moment Screen 4 hands us over — matches
// Screen 4's welcome-row positions so the handoff has no jump.
const HANDOFF_Y = 425;
const HANDOFF_SIZE = 48;
const HANDOFF_XS: Record<OrbKey, number> = {
  safety: 130,
  forex: 190,
  flight: 250,
  visa: 310,
};

// Timing
// Time we hold in the intro phase — just enough for the orbs to complete
// their shift-up (1.1s + 0.15s delay). No intro text anymore, so this is
// purely to let the orbs settle before the card rises.
const INTRO_HOLD_MS = 1350;
const CARD_RISE_MS = 1100;
const CARD_EMPTY_HOLD_MS = 900;
const BENEFIT_HOLD_MS = 3200;
const BENEFIT_TRANSITION_MS = 900;

/** Sample a clockwise semicircular arc from `start` to `end` (bulges right,
 *  i.e., a 12→3→6 sweep when start is above end). Returns arrays of x and y
 *  suitable for framer-motion keyframes. */
function clockwiseSemicircle(
  start: { x: number; y: number },
  end: { x: number; y: number },
  samples = 48,
) {
  const mx = (start.x + end.x) / 2;
  const my = (start.y + end.y) / 2;
  const startAngle = Math.atan2(start.y - my, start.x - mx);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const r = Math.sqrt(dx * dx + dy * dy) / 2;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const angle = startAngle + Math.PI * t;
    xs.push(mx + r * Math.cos(angle));
    ys.push(my + r * Math.sin(angle));
  }
  return { xs, ys };
}

export default function Screen5() {
  // Overall phase state: -1=intro, 0..BENEFITS.length-1=benefit index
  const [phase, setPhase] = useState<"intro" | "cardEmpty" | number>("intro");
  const percent = useMotionValue(2);
  const [displayPercent, setDisplayPercent] = useState(2);
  const time = useTime();

  // Progression state machine.
  useEffect(() => {
    const timers: number[] = [];
    // Intro → card empty
    timers.push(
      window.setTimeout(() => setPhase("cardEmpty"), INTRO_HOLD_MS),
    );
    // card empty → first benefit
    timers.push(
      window.setTimeout(
        () => setPhase(0),
        INTRO_HOLD_MS + CARD_RISE_MS + CARD_EMPTY_HOLD_MS,
      ),
    );
    // subsequent benefits
    for (let i = 1; i < BENEFITS.length; i++) {
      timers.push(
        window.setTimeout(
          () => setPhase(i),
          INTRO_HOLD_MS +
            CARD_RISE_MS +
            CARD_EMPTY_HOLD_MS +
            i * (BENEFIT_HOLD_MS + BENEFIT_TRANSITION_MS),
        ),
      );
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // Smooth counter: animate percent between phases. Slower + gentle ease so
  // it reads as a ticking counter, not a jump.
  useEffect(() => {
    const target =
      typeof phase === "number"
        ? BENEFITS[phase].percent
        : phase === "cardEmpty"
          ? 2
          : 0;
    const ctrl = animate(percent, target, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplayPercent(Math.round(v)),
    });
    return () => ctrl.stop();
  }, [phase, percent]);

  const activeBenefit = typeof phase === "number" ? BENEFITS[phase] : null;
  const cardVisible = phase !== "intro";

  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[44px]"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg-screen-start), var(--bg-screen-end))",
      }}
    >
      {/* Header title — appears once the card is on screen. */}
      <div className="absolute left-1/2 top-[300px] w-full -translate-x-1/2 px-8 text-center">
        <AnimatePresence>
          {phase !== "intro" && (
            <motion.div
              key="issuing-title"
              initial={{ opacity: 0, filter: "blur(10px)", y: -8 }}
              animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
              transition={{ delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="text-[19px] font-medium leading-[24px] tracking-[-0.02em] text-neutral-500"
            >
              Issuing your Atlys WorldPass
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Top row queue — orbs arrive at the handoff position, slide up as a
          group, and keep a gentle sine-wave bob (same rhythm as Screen 4). */}
      {QUEUE.map((agent, orbIndex) => (
        <QueueOrb
          key={`queue-${agent}`}
          agent={agent}
          orbIndex={orbIndex}
          phase={phase}
          time={time}
        />
      ))}

      {/* Card + its floating agent orb */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: 90 }}
        initial={{ y: 260, opacity: 0, rotateX: -10, scale: 0.94 }}
        animate={
          cardVisible
            ? {
                y: 0,
                opacity: 1,
                rotateX: 0,
                scale: 1,
                transition: {
                  duration: CARD_RISE_MS / 1000,
                  ease: [0.22, 1, 0.36, 1],
                },
              }
            : { y: 260, opacity: 0, rotateX: -10, scale: 0.94 }
        }
      >
        <Card3D width={230} height={330} radius={26}>
          {/* Card orb — keyed by AGENT (not benefit) so it persists across
              consecutive same-agent benefits. When the agent changes, this
              exits and the new one flies in from its row slot via a soft arc. */}
          <AnimatePresence mode="wait">
            {activeBenefit &&
              typeof phase === "number" &&
              (() => {
                const agent = activeBenefit.orb;
                // Row state right BEFORE this benefit fires (previous phase).
                const prevConsumed = consumedAgents(phase - 1);
                const prevRemaining = QUEUE.filter(
                  (a) => !prevConsumed.has(a),
                );
                const startIdx = prevRemaining.indexOf(agent);
                // Where the orb was sitting in the row a moment ago.
                const startCX =
                  startIdx >= 0
                    ? slotX(prevRemaining.length, startIdx)
                    : CARD_ORB_X; // agent no longer in row (reused) — fade in on card
                const startY = TOP_ROW_Y;
                return (
                  <motion.div
                    key={`card-orb-${agent}`}
                    className="absolute left-1/2 -translate-x-1/2"
                    style={{ top: -CARD_ORB_SIZE / 2 }}
                    initial={{
                      x: startCX - CARD_ORB_X,
                      y: startY - CARD_ORB_Y,
                      scale: TOP_ORB_SIZE / CARD_ORB_SIZE,
                      opacity: 0,
                    }}
                    animate={{
                      x: 0,
                      y: 0,
                      scale: 1,
                      opacity: 1,
                      transition: {
                        x: {
                          type: "spring",
                          stiffness: 90,
                          damping: 22,
                          mass: 1,
                        },
                        y: {
                          type: "spring",
                          stiffness: 90,
                          damping: 22,
                          mass: 1,
                        },
                        scale: {
                          type: "spring",
                          stiffness: 100,
                          damping: 18,
                        },
                        opacity: { duration: 0.55, ease: "easeOut" },
                      },
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.7,
                      filter: "blur(6px)",
                      transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] },
                    }}
                  >
                    <AgentOrb size={CARD_ORB_SIZE} blob={ORB_BLOBS[agent]} />
                  </motion.div>
                );
              })()}
          </AnimatePresence>

          {/* Card contents. Title uses word-by-word reveal, description uses
              a cuboid X-axis flip so the text swap feels like a physical face
              rotation. */}
          <div className="relative flex h-full flex-col justify-center px-6 text-center">
            {activeBenefit && (
              <>
                {/* Title — swaps entirely between benefits (each triggers its
                    own word-by-word reveal via the key). */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`title-${phase}`}
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0, filter: "blur(10px)" }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <BenefitTitle
                      title={activeBenefit.title}
                      gradientClass={activeBenefit.titleGradientClass}
                    />
                  </motion.div>
                </AnimatePresence>

                {/* Description — cuboid flip on text change. */}
                <div className="mt-3">
                  <CuboidText
                    text={activeBenefit.desc}
                    className="subtext-gradient text-[12px] font-normal leading-[16px] tracking-[-0.01em]"
                    height={80}
                  />
                </div>
              </>
            )}
          </div>

          {/* Percentage bottom-left */}
          <p className="absolute bottom-5 left-5 text-[19.5px] font-medium leading-[22.8px] tracking-[-0.04em] text-white">
            {displayPercent.toString().padStart(2, "0")}%
          </p>

        </Card3D>
      </motion.div>
    </div>
  );
}

/**
 * A single orb in Screen 5's top-row queue. Combines two motions:
 *   • the layout animation (shift up from handoff position + spring x to slot)
 *   • a continuous sine wave bob (constant, driven by `useTime`)
 * The outer motion.div carries the wave (via `style.y` from useTransform),
 * the inner motion.div carries the shift/scale/opacity transitions.
 */
function QueueOrb({
  agent,
  orbIndex,
  phase,
  time,
}: {
  agent: OrbKey;
  orbIndex: number;
  phase: "intro" | "cardEmpty" | number;
  time: import("framer-motion").MotionValue<number>;
}) {
  const activeIdx = typeof phase === "number" ? phase : -1;
  const consumed = consumedAgents(activeIdx);
  const isConsumed = consumed.has(agent);
  const remaining = QUEUE.filter((a) => !consumed.has(a));
  const idxInRemaining = remaining.indexOf(agent);
  const displayCount = remaining.length + (isConsumed ? 1 : 0);
  const displayIdx = isConsumed ? 0 : idxInRemaining;
  const targetCX = slotX(displayCount, displayIdx);
  // No size change during handoff — TOP_ORB_SIZE now equals HANDOFF_SIZE.
  const topRowScale = 1;

  // Continuous sine wave — different phase per orb creates a travelling wave.
  const waveY = useTransform(time, (t) => {
    const waveAmplitude = 9;
    const waveSpeedRadPerMs = 0.0022;
    const phaseOffset = orbIndex * 0.9;
    return Math.sin(t * waveSpeedRadPerMs + phaseOffset) * waveAmplitude;
  });

  return (
    <motion.div
      className="absolute"
      style={{
        width: HANDOFF_SIZE,
        height: HANDOFF_SIZE,
        top: HANDOFF_Y - HANDOFF_SIZE / 2,
        left: 0,
        y: waveY,
      }}
    >
      <motion.div
        className="h-full w-full"
        initial={{
          x: HANDOFF_XS[agent] - HANDOFF_SIZE / 2,
          y: 0,
          scale: 1,
          opacity: 1,
        }}
        animate={{
          x: targetCX - HANDOFF_SIZE / 2,
          y: TOP_ROW_Y - HANDOFF_Y,
          scale: isConsumed ? topRowScale * 0.7 : topRowScale,
          opacity: isConsumed ? 0 : 1,
          filter: isConsumed ? "blur(4px)" : "blur(0px)",
        }}
        transition={{
          y: { delay: 0.15, duration: 1.1, ease: [0.22, 1, 0.36, 1] },
          scale: { delay: 0.15, duration: 1.1, ease: [0.22, 1, 0.36, 1] },
          x: {
            delay: 0.15,
            type: "spring",
            stiffness: 110,
            damping: 22,
            mass: 0.9,
          },
          opacity: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
          filter: { duration: 0.5 },
        }}
      >
        <AgentOrb size={HANDOFF_SIZE} blob={ORB_BLOBS[agent]} />
      </motion.div>
    </motion.div>
  );
}

/**
 * Title uses the same H5 typography as the other headlines, with a subtle
 * yellow-green accent on the last portion — Figma shows a gradient variant.
 * Kept in a separate component so future benefit-specific highlights are easy.
 */
function BenefitTitle({
  title,
  gradientClass,
}: {
  title: string;
  gradientClass: string;
}) {
  const words = useMemo(() => title.split(" "), [title]);
  return (
    <p
      className={`text-[15px] font-semibold leading-[19px] tracking-[-0.02em] ${gradientClass}`}
    >
      {words.map((w, i) => (
        <motion.span
          key={`${title}-${i}`}
          className="inline-block"
          initial={{ opacity: 0, y: 6, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            delay: i * 0.08,
            duration: 0.35,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {w}
          {i < words.length - 1 && " "}
        </motion.span>
      ))}
    </p>
  );
}
