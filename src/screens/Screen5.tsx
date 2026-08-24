"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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

// One benefit per agent — 4 total, counter ticks 25% per orb.
const BENEFITS: Benefit[] = [
  {
    title: "Embassy Slot Priority",
    desc: "Watching calendars 24/7—grabbing appointment slots the second they open",
    percent: 25,
    orb: "visa",
    titleGradientClass: "title-gradient-visa",
  },
  {
    title: "0 Forex Markups",
    desc: "Real interbank exchange rates locked with zero spread fees and doorstep cash delivery",
    percent: 50,
    orb: "forex",
    titleGradientClass: "title-gradient-forex",
  },
  {
    title: "Flat 10% Off Stays",
    desc: "Direct savings auto-applied across Taj, Oberoi, Marriott, Hyatt, and more",
    percent: 75,
    orb: "flight",
    titleGradientClass: "title-gradient-stays",
  },
  {
    title: "24/7 Medical & Delay Cover",
    desc: "Auto-attached $200 delay protection, $500 baggage cover, and instant doctor access",
    percent: 100,
    orb: "safety",
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

/** Set of agents already consumed at (or before) the given benefit index.
 *  benefitIdx is clamped to BENEFITS.length so "all consumed" is expressible. */
function consumedAgents(benefitIdx: number): Set<OrbKey> {
  const s = new Set<OrbKey>();
  if (benefitIdx < 0) return s;
  const end = Math.min(benefitIdx, BENEFITS.length - 1);
  for (let i = 0; i <= end; i++) s.add(BENEFITS[i].orb);
  return s;
}
// Card orb trajectory:
//   Stage 1 (arc): row slot → arrives centered on the card's TOP edge,
//                  still small (34px).
//   Stage 2 (descend + grow): slides down INTO the card and swells,
//                             ending above the benefit text (52px).
const CARD_ORB_ARRIVAL_X = 220;
const CARD_ORB_ARRIVAL_Y = 545; // card top edge (bottom 90 + height 330 → 545)
const CARD_ORB_ARRIVAL_SIZE = 34;
const CARD_ORB_X = 220;
const CARD_ORB_Y = 620;
const CARD_ORB_SIZE = 52;

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
  const [phase, setPhase] = useState<
    "intro" | "cardEmpty" | number | "final"
  >("intro");
  const percent = useMotionValue(2);
  const [displayPercent, setDisplayPercent] = useState(2);
  const time = useTime();
  // When the orb lands, the card gets "pressed" — this MotionValue pulses to
  // dip Y and shrink scale briefly, then springs back.
  const cardPressY = useMotionValue(0);
  const cardPressScale = useMotionValue(1);
  // Card "activation" — dot pattern lights up top-to-bottom when orb lands.
  const cardActivate = useMotionValue(0);

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
    // Final "whirlpool" phase — after the last benefit's hold, all orbs
    // swirl into the card and the summary text appears.
    timers.push(
      window.setTimeout(
        () => setPhase("final"),
        INTRO_HOLD_MS +
          CARD_RISE_MS +
          CARD_EMPTY_HOLD_MS +
          BENEFITS.length * (BENEFIT_HOLD_MS + BENEFIT_TRANSITION_MS),
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  // Whether the current phase starts a brand-new agent's turn on the card.
  // Used to gate both the card press/pulse and the counter animation.
  const isNewAgent =
    typeof phase === "number"
      ? phase === 0 || BENEFITS[phase].orb !== BENEFITS[phase - 1].orb
      : false;

  // Percent counter: 25% per unique orb (agent).
  //   • Starts filling the moment the orb LANDS on the card (after arc).
  //   • Fills at a constant rate until the orb starts to merge (next agent).
  //   • Stops entirely between orbs (no motion during handoff).
  //   • Same-agent benefit swaps do NOT restart the animation — it keeps
  //     running smoothly through the whole residency.
  useEffect(() => {
    if (phase === "intro" || phase === "cardEmpty") {
      percent.set(0);
      setDisplayPercent(0);
      return;
    }
    if (typeof phase !== "number") return;
    if (!isNewAgent) return;

    // Which agent index this is (0..3 in appearance order → Visa/Forex/Flight/Safety).
    const AGENT_ORDER: OrbKey[] = ["visa", "forex", "flight", "safety"];
    const agentIdx = AGENT_ORDER.indexOf(BENEFITS[phase].orb);
    if (agentIdx < 0) return;
    const targetPercent = (agentIdx + 1) * 25;

    // Count consecutive same-agent benefits starting at this phase so the
    // fill duration matches how long this orb stays on the card.
    let benefitsInGroup = 1;
    for (let i = phase + 1; i < BENEFITS.length; i++) {
      if (BENEFITS[i].orb === BENEFITS[phase].orb) benefitsInGroup++;
      else break;
    }
    const phaseWindowMs = BENEFIT_HOLD_MS + BENEFIT_TRANSITION_MS; // 4100ms
    const arriveDelayMs = 1500; // orb arrival time on card
    // Fill spans the full agent window (no minus) so this animation ends
    // exactly when the NEXT agent's fill begins — counter is continuous with
    // no gap between percentage steps.
    const residencyMs = benefitsInGroup * phaseWindowMs;

    const t = window.setTimeout(() => {
      animate(percent, targetPercent, {
        duration: residencyMs / 1000,
        ease: "linear",
        onUpdate: (v) => setDisplayPercent(Math.round(v)),
      });
    }, arriveDelayMs);
    return () => window.clearTimeout(t);
  }, [phase, isNewAgent, percent]);

  // Only fire the card press + activation pulse when a NEW orb arrives
  // (agent change). Same-agent benefit swaps flip the text without disturbing
  // the card, since the orb never leaves.
  useEffect(() => {
    if (typeof phase !== "number") return;
    if (!isNewAgent) return;
    const landingDelayMs = 1500;
    const t = window.setTimeout(() => {
      cardPressY.set(6);
      cardPressScale.set(0.99);
      animate(cardPressY, 0, {
        type: "spring",
        stiffness: 180,
        damping: 18,
        mass: 0.9,
      });
      animate(cardPressScale, 1, {
        type: "spring",
        stiffness: 200,
        damping: 20,
        mass: 0.9,
      });
      cardActivate.set(0);
      animate(cardActivate, 1, {
        duration: 1.6,
        ease: [0.4, 0, 0.4, 1],
      });
    }, landingDelayMs);
    return () => window.clearTimeout(t);
  }, [phase, isNewAgent, cardPressY, cardPressScale, cardActivate]);

  const activeBenefit = typeof phase === "number" ? BENEFITS[phase] : null;
  const cardVisible = phase !== "intro";

  // Text should appear only after the activation pulse finishes for new-orb
  // arrivals; for same-agent swaps the flip happens immediately.
  const textRevealDelay = isNewAgent ? 3.1 : 0;

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

      {/* Final "whirlpool" — after the last benefit, all 4 orbs return and
          spiral inward around the card center before merging. */}
      {phase === "final" &&
        QUEUE.map((agent, orbIndex) => (
          <WhirlpoolOrb
            key={`whirl-${agent}`}
            agent={agent}
            orbIndex={orbIndex}
            time={time}
          />
        ))}

      {/* Card + its floating agent orb.
          OUTER wrapper handles the entrance rise.
          INNER wrapper carries the "weight-response" dip/squish that fires
          each time an orb lands. */}
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
        <motion.div style={{ y: cardPressY, scale: cardPressScale }}>
        <Card3D
          width={230}
          height={330}
          radius={26}
          activatePulse={cardActivate}
        >

          {/* Card contents — either the current benefit or the final summary. */}
          <div className="relative flex h-full flex-col justify-center px-6 text-center">
            {activeBenefit && (
              <>
                <CuboidText
                  text={activeBenefit.title}
                  className={`text-[15px] font-semibold leading-[19px] tracking-[-0.02em] ${activeBenefit.titleGradientClass}`}
                  height={22}
                  delay={textRevealDelay}
                />
                <div className="mt-3">
                  <CuboidText
                    text={activeBenefit.desc}
                    className="subtext-gradient text-[12px] font-normal leading-[16px] tracking-[-0.01em]"
                    height={80}
                    delay={textRevealDelay + 0.2}
                  />
                </div>
              </>
            )}
            {phase === "final" && (
              <motion.div
                key="final-summary"
                initial={{ opacity: 0, filter: "blur(10px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{
                  delay: 1.6,
                  duration: 0.7,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <p className="text-[15px] font-medium leading-[20px] tracking-[-0.02em] text-white">
                  All your benefits.
                </p>
                <p className="text-[15px] font-medium leading-[20px] tracking-[-0.02em] text-white">
                  One WorldPass.
                </p>
              </motion.div>
            )}
          </div>

          {/* Percentage bottom-left — hidden once we hit the final summary. */}
          {phase !== "final" && (
            <p className="absolute bottom-5 left-5 text-[19.5px] font-medium leading-[22.8px] tracking-[-0.04em] text-white">
              {displayPercent.toString().padStart(2, "0")}%
            </p>
          )}

        </Card3D>
        </motion.div>
      </motion.div>

      {/* Active-agent orb — lives at the SCREEN level (not inside the card)
          so its arc travels across the whole screen without being clipped by
          Card3D's overflow-hidden. Traces a clockwise semicircle from its
          row slot down onto the card. Default AnimatePresence mode so the
          outgoing orb's drop-into-card overlaps the next orb's arc entry. */}
      <AnimatePresence>
        {activeBenefit &&
          typeof phase === "number" &&
          (() => {
            const agent = activeBenefit.orb;
            const prevConsumed = consumedAgents(phase - 1);
            const prevRemaining = QUEUE.filter((a) => !prevConsumed.has(a));
            const startIdx = prevRemaining.indexOf(agent);
            const startCX =
              startIdx >= 0
                ? slotX(prevRemaining.length, startIdx)
                : CARD_ORB_X;
            // STAGE 1 — clockwise semicircle from row slot to the top edge
            //            of the card. Small size throughout this stage.
            const arc = clockwiseSemicircle(
              { x: startCX, y: TOP_ROW_Y },
              { x: CARD_ORB_ARRIVAL_X, y: CARD_ORB_ARRIVAL_Y },
            );
            // We reference `CARD_ORB_SIZE` as the base; the arriving size is
            // a fraction of that so we scale UP during the descent.
            const arrivalScale = CARD_ORB_ARRIVAL_SIZE / CARD_ORB_SIZE;
            const startScale = TOP_ORB_SIZE / CARD_ORB_SIZE;

            // Build a single keyframe sequence: arc → descend & grow.
            const xs = [...arc.xs, CARD_ORB_X];
            const ys = [...arc.ys, CARD_ORB_Y];
            const scales = [
              ...arc.xs.map(
                (_, i) =>
                  startScale +
                  (arrivalScale - startScale) *
                    (i / (arc.xs.length - 1)),
              ),
              1,
            ];
            const opacities = [
              ...arc.xs.map((_, i) =>
                i === 0 ? 0 : Math.min(1, i / 3),
              ),
              1,
            ];
            // Arc takes ~70% of the animation, descent the remaining ~30%.
            const arcSteps = arc.xs.length;
            const times = [
              ...arc.xs.map((_, i) => (i / (arcSteps - 1)) * 0.7),
              1,
            ];
            return (
              <motion.div
                key={`card-orb-${agent}`}
                className="pointer-events-none absolute left-0 top-0"
                style={{
                  width: CARD_ORB_SIZE,
                  height: CARD_ORB_SIZE,
                  marginLeft: -CARD_ORB_SIZE / 2,
                  marginTop: -CARD_ORB_SIZE / 2,
                }}
                initial={{
                  x: xs[0],
                  y: ys[0],
                  scale: startScale,
                  opacity: 0,
                }}
                animate={{
                  x: xs,
                  y: ys,
                  scale: scales,
                  opacity: opacities,
                  transition: {
                    // 1.15s arc + 0.65s slow descend + grow = 1.8s total.
                    x: { duration: 1.8, ease: "linear", times },
                    y: { duration: 1.8, ease: "linear", times },
                    scale: {
                      duration: 1.8,
                      ease: [0.22, 1, 0.36, 1],
                      times,
                    },
                    opacity: { duration: 0.55, ease: "easeOut" },
                  },
                }}
                exit={{
                  // Grow bigger, fade, and drop down — merges into the card.
                  opacity: 0,
                  scale: 1.9,
                  y: CARD_ORB_Y + 90,
                  filter: "blur(10px)",
                  transition: { duration: 0.85, ease: [0.4, 0, 0.2, 1] },
                }}
              >
                <AgentOrb size={CARD_ORB_SIZE} blob={ORB_BLOBS[agent]} />
              </motion.div>
            );
          })()}
      </AnimatePresence>
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
/**
 * Whirlpool orb — spirals inward around the card center. Starts at a large
 * radius, radius decays exponentially while angular velocity increases so
 * the motion accelerates as it converges. Opacity fades to 0 near the end so
 * the orbs "merge" into the card.
 */
function WhirlpoolOrb({
  agent,
  orbIndex,
  time,
}: {
  agent: OrbKey;
  orbIndex: number;
  time: import("framer-motion").MotionValue<number>;
}) {
  // Whirlpool sits ON the card, in its upper half — orbs orbit visibly
  // across the card face (above the "All your benefits" text).
  const CX = 220;
  const CY = 620;
  const SIZE = 36;
  const startAngle = orbIndex * ((Math.PI * 2) / QUEUE.length);
  // Whirlpool timing: 3.4s total spiral before orbs disappear into card.
  const WHIRL_DURATION_MS = 3400;

  // Mount time captured once so animation starts from 0.
  const mountRef = useRef<number | null>(null);
  if (mountRef.current === null) mountRef.current = time.get();

  const state = useTransform(time, (t: number) => {
    const localT = Math.min(1, (t - (mountRef.current ?? t)) / WHIRL_DURATION_MS);
    // Radius shrinks from 90 → 0 with an ease-in curve — keeps orbs inside
    // the card's upper half, spinning above the "All your benefits" text.
    const radius = 90 * Math.pow(1 - localT, 1.8);
    // Angular sweep: 3 full rotations over the duration + spin faster as
    // radius shrinks (constant tangential speed feel).
    const totalRotations = 3;
    const angle = startAngle + localT * Math.PI * 2 * totalRotations;
    const x = CX + radius * Math.cos(angle);
    const y = CY + radius * Math.sin(angle);
    // Fade out over the last 20% of the spiral.
    const opacity = localT < 0.8 ? 1 : Math.max(0, 1 - (localT - 0.8) / 0.2);
    const scale = 1 - localT * 0.5;
    return { x, y, opacity, scale };
  });
  const x = useTransform(state, (s) => s.x - SIZE / 2);
  const y = useTransform(state, (s) => s.y - SIZE / 2);
  const opacity = useTransform(state, (s) => s.opacity);
  const scale = useTransform(state, (s) => s.scale);

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: SIZE, height: SIZE, x, y, opacity, scale }}
    >
      <AgentOrb size={SIZE} blob={ORB_BLOBS[agent]} />
    </motion.div>
  );
}

function QueueOrb({
  agent,
  orbIndex,
  phase,
  time,
}: {
  agent: OrbKey;
  orbIndex: number;
  phase: "intro" | "cardEmpty" | "final" | number;
  time: import("framer-motion").MotionValue<number>;
}) {
  // In "final" phase all agents are consumed (their whirlpool clones handle
  // the visual). Numeric phase = current benefit index. Other = pre-arrival.
  const activeIdx =
    typeof phase === "number"
      ? phase
      : phase === "final"
        ? BENEFITS.length
        : -1;
  const consumed = consumedAgents(activeIdx);
  const isConsumed = consumed.has(agent);
  const remaining = QUEUE.filter((a) => !consumed.has(a));
  const idxInRemaining = remaining.indexOf(agent);
  const displayCount = remaining.length + (isConsumed ? 1 : 0);
  const displayIdx = isConsumed ? 0 : idxInRemaining;
  const targetCX = slotX(displayCount, displayIdx);
  // No size change during handoff — TOP_ORB_SIZE now equals HANDOFF_SIZE.
  const topRowScale = 1;

  // Continuous sine wave — larger amplitude + wider phase offset per orb so
  // the row visibly reads as a rope with a travelling wave passing through it.
  // Amplitude increases slightly when there are fewer orbs (the "rope" flexes
  // more freely as it shortens).
  const waveY = useTransform(time, (t) => {
    const remainingCount = Math.max(1, displayCount);
    const flex = 1 + (QUEUE.length - remainingCount) * 0.12; // 1.0 → ~1.36
    const waveAmplitude = 12 * flex;
    const waveSpeedRadPerMs = 0.0022;
    const phaseOffset = orbIndex * 1.2;
    return Math.sin(t * waveSpeedRadPerMs + phaseOffset) * waveAmplitude;
  });
  // Subtle horizontal sway — orbs also drift a couple of px sideways in
  // lock-step with the wave, reinforcing the "chain being tugged" feel.
  const waveX = useTransform(time, (t) => {
    const waveSpeedRadPerMs = 0.0022;
    const phaseOffset = orbIndex * 1.2 - Math.PI / 2;
    return Math.sin(t * waveSpeedRadPerMs + phaseOffset) * 3;
  });

  return (
    <motion.div
      className="absolute"
      style={{
        width: HANDOFF_SIZE,
        height: HANDOFF_SIZE,
        top: HANDOFF_Y - HANDOFF_SIZE / 2,
        left: 0,
        x: waveX,
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
          // Slower + heavier spring — orbs shift as if pulled by a rope,
          // with a slight lag that reads as coupled motion.
          x: {
            delay: 0.15,
            type: "spring",
            stiffness: 70,
            damping: 20,
            mass: 1.2,
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
