"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
// Order: Visa → Flight → Forex → Safety.
const BENEFITS: Benefit[] = [
  {
    title: "Embassy Slot Priority",
    desc: "Watching calendars 24/7—grabbing appointment slots the second they open",
    percent: 25,
    orb: "visa",
    titleGradientClass: "title-gradient-visa",
  },
  {
    title: "Flat 10% Off Stays",
    desc: "Direct savings auto-applied across Taj, Oberoi, Marriott, Hyatt, and more",
    percent: 50,
    orb: "flight",
    titleGradientClass: "title-gradient-stays",
  },
  {
    title: "0 Forex Markups",
    desc: "Real interbank exchange rates locked with zero spread fees and doorstep cash delivery",
    percent: 75,
    orb: "forex",
    titleGradientClass: "title-gradient-forex",
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
// Card position: pulled up so there's less empty space between the
// header title and the card. All orb-landing constants derive from this.
const CARD_BOTTOM = 190; // was 90 → moved card up 100px
const CARD_HEIGHT = 330;
const CARD_TOP_Y = 965 - CARD_BOTTOM - CARD_HEIGHT; // = 445
// Card orb trajectory:
//   Stage 1 (arc): row slot → arrives centered on the card's TOP edge (small).
//   Stage 2 (descend + grow): slides down INTO the card and swells.
const CARD_ORB_ARRIVAL_X = 220;
const CARD_ORB_ARRIVAL_Y = CARD_TOP_Y; // = 445
const CARD_ORB_ARRIVAL_SIZE = 34;
const CARD_ORB_X = 220;
const CARD_ORB_Y = CARD_TOP_Y + 75; // = 520
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

export default function Screen5({
  initialPhase,
  onComplete,
  hideFinaleSummary = false,
  finaleCardX,
}: {
  /** Optional phase to seed on mount — used by the dev checkpoint panel to
   *  jump directly to a specific state (skips prior auto-advance timers). */
  initialPhase?: "intro" | "cardEmpty" | number | "final";
  /** Called once the WorldPass finale has settled — used to auto-advance
   *  to Screen 6 ("Your WorldPass is issued"). */
  onComplete?: () => void;
  /** When Screen 6 is layered on top (shared-canvas transition), the card
   *  stays but the "All your benefits. One WorldPass." summary is replaced
   *  by the name + ID overlay from Screen 6. */
  hideFinaleSummary?: boolean;
  /** External MotionValue owned by OnboardingFlow — Screen 6 sets this to
   *  the carousel strip's x offset so this card translates horizontally in
   *  sync (WorldPass slides off left when user swipes to the household card). */
  finaleCardX?: import("framer-motion").MotionValue<number>;
} = {}) {
  const [phase, setPhase] = useState<
    "intro" | "cardEmpty" | number | "final"
  >(initialPhase ?? "intro");

  // Starting percent for the counter, in case we jump to a mid-flow phase.
  const initialPercent = (() => {
    if (initialPhase === undefined || initialPhase === "intro") return 0;
    if (initialPhase === "cardEmpty") return 0;
    if (typeof initialPhase === "number") return initialPhase * 25;
    return 100; // "final"
  })();
  const percent = useMotionValue(initialPercent);
  const [displayPercent, setDisplayPercent] = useState(initialPercent);
  const time = useTime();
  // When the orb lands, the card gets "pressed" — this MotionValue pulses to
  // dip Y and shrink scale briefly, then springs back.
  const cardPressY = useMotionValue(0);
  const cardPressScale = useMotionValue(1);
  // Card "activation" — dot pattern lights up top-to-bottom when orb lands.
  const cardActivate = useMotionValue(0);
  // Y-shift applied to the card once the whirlpool completes — moves the
  // card up so it sits at the vertical center of the screen for the
  // WorldPass finale (globe + pill + text).
  const cardShiftY = useMotionValue(0);

  // Progression state machine. When an initialPhase is provided (via the
  // dev checkpoint panel), we only schedule timers for phases AFTER it.
  useEffect(() => {
    const timers: number[] = [];
    const cardEmptyAt = INTRO_HOLD_MS;
    const firstBenefitAt =
      INTRO_HOLD_MS + CARD_RISE_MS + CARD_EMPTY_HOLD_MS;
    const benefitAt = (i: number) =>
      firstBenefitAt + i * (BENEFIT_HOLD_MS + BENEFIT_TRANSITION_MS);
    // For the LAST benefit (Safety), fire the whirlpool sooner — text has
    // been on the card for ~2s already; no need to sit through the full
    // 4.1s phase window.
    const finalAt =
      firstBenefitAt +
      (BENEFITS.length - 1) * (BENEFIT_HOLD_MS + BENEFIT_TRANSITION_MS) +
      2600;

    // Determine the "starting index" in our step timeline based on initialPhase.
    // Steps: 0=intro, 1=cardEmpty, 2=benefit0, 3=benefit1, …, 6=final
    const stepFromInitial = (() => {
      if (initialPhase === undefined || initialPhase === "intro") return 0;
      if (initialPhase === "cardEmpty") return 1;
      if (typeof initialPhase === "number") return 2 + initialPhase;
      return 2 + BENEFITS.length; // "final"
    })();

    const schedule = (fireAt: number, atStep: number, action: () => void) => {
      if (atStep <= stepFromInitial) return;
      const delay = Math.max(0, fireAt - (
        stepFromInitial === 0
          ? 0
          : stepFromInitial === 1
            ? cardEmptyAt
            : stepFromInitial < 2 + BENEFITS.length
              ? benefitAt(stepFromInitial - 2)
              : finalAt
      ));
      timers.push(window.setTimeout(action, delay));
    };

    schedule(cardEmptyAt, 1, () => setPhase("cardEmpty"));
    schedule(firstBenefitAt, 2, () => setPhase(0));
    for (let i = 1; i < BENEFITS.length; i++) {
      schedule(benefitAt(i), 2 + i, () => setPhase(i));
    }
    schedule(finalAt, 2 + BENEFITS.length, () => setPhase("final"));
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
    const AGENT_ORDER: OrbKey[] = ["visa", "flight", "forex", "safety"];
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

  // When the whirlpool finishes, glide the card up to the vertical center
  // of the screen for the WorldPass finale (globe + pill + text).
  useEffect(() => {
    if (phase !== "final") return;
    // Screen center Y = 482. Card center currently at CARD_TOP_Y + 165 = 610.
    // Move up by (610 - 482) = 128px so the card sits at screen center.
    const targetShift = -(CARD_TOP_Y + CARD_HEIGHT / 2 - 965 / 2);
    const t = window.setTimeout(() => {
      animate(cardShiftY, targetShift, {
        duration: 1.0,
        ease: [0.22, 1, 0.36, 1],
      });
    }, 2300); // right as the rope closes the circle, before globe/text fade in
    return () => window.clearTimeout(t);
  }, [phase, cardShiftY]);

  // Auto-advance to Screen 6 once the finale has been on screen long enough
  // for the "All your benefits. One WorldPass." text to land.
  useEffect(() => {
    if (phase !== "final") return;
    if (!onComplete) return;
    // Fires after the finale content has landed (~4.4s in) with a beat
    // to read "All your benefits. One WorldPass." before advancing.
    const t = window.setTimeout(onComplete, 4000);
    return () => window.clearTimeout(t);
  }, [phase, onComplete]);

  const activeBenefit = typeof phase === "number" ? BENEFITS[phase] : null;
  const cardVisible = phase !== "intro";

  // Text appears the MOMENT the orb touches the card (matches landingDelayMs
  // = 1.5s) so the user can read the benefit before the whirlpool fires.
  // For same-agent swaps the swap happens immediately.
  const textRevealDelay = isNewAgent ? 1.5 : 0;

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
          {phase !== "intro" && phase !== "final" && (
            <motion.div
              key="issuing-title"
              initial={{ opacity: 0, filter: "blur(10px)", y: -8 }}
              animate={{
                opacity: 1,
                filter: "blur(0px)",
                y: 0,
                transition: { delay: 0.25, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
              }}
              exit={{
                opacity: 0,
                filter: "blur(8px)",
                y: -6,
                scale: 0.98,
                transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
              }}
              className="grey-shine-text text-[19px] font-medium leading-[24px] tracking-[-0.02em]"
            >
              Issuing your
              <br />
              Atlys WorldPass
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

      {/* Whirlpool moved BELOW card in this JSX block — see after the card
          wrapper so orbs render above the card surface (not clipped behind it). */}

      {/* Card + its floating agent orb.
          OUTER wrapper handles the entrance rise.
          INNER wrapper carries the "weight-response" dip/squish that fires
          each time an orb lands. */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2"
        style={{ bottom: CARD_BOTTOM, x: finaleCardX }}
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
        <motion.div style={{ y: cardShiftY }}>
        <motion.div style={{ y: cardPressY, scale: cardPressScale }}>
        <Card3D
          width={230}
          height={330}
          radius={26}
          activatePulse={cardActivate}
        >
          {/* "+ atlys worldpass" pill — top of card, fades in after whirlpool. */}
          {phase === "final" && (
            <motion.div
              className="subtext-gradient pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] font-medium tracking-[-0.01em]"
              style={{ top: 18 }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.5, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              + atlys worldpass
            </motion.div>
          )}

          {/* Globe — rotating video from Figma, masked with a radial gradient
              so only the circular globe is visible against the card. */}
          {phase === "final" && (
            <motion.div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{
                top: 40,
                width: 220,
                height: 220,
                maskImage:
                  "radial-gradient(circle, black 38%, transparent 55%)",
                WebkitMaskImage:
                  "radial-gradient(circle, black 38%, transparent 55%)",
              }}
              initial={{ opacity: 0, scale: 0.86 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 2.5, duration: 2.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <video
                src="/assets/globe/globe.mp4"
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </motion.div>
          )}

          {/* Card contents — either the current benefit or the final summary. */}
          <div className="relative flex h-full flex-col justify-center px-6 text-center">
            {activeBenefit && (
              <div key={activeBenefit.orb} className="contents">
                <WordReveal
                  text={activeBenefit.title}
                  className={`text-[15px] font-semibold leading-[19px] tracking-[-0.02em] ${activeBenefit.titleGradientClass}`}
                  delay={textRevealDelay}
                  staggerMs={70}
                />
                <div className="mt-3">
                  <WordReveal
                    text={activeBenefit.desc}
                    className="subtext-gradient text-[12px] font-normal leading-[16px] tracking-[-0.01em]"
                    delay={textRevealDelay + 0.25}
                    staggerMs={45}
                  />
                </div>
              </div>
            )}
            {phase === "final" && !hideFinaleSummary && (
              <motion.div
                key="final-summary"
                className="pointer-events-none absolute inset-x-0"
                style={{ bottom: 60 }}
                initial={{ opacity: 0, filter: "blur(10px)", scale: 0.85 }}
                animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
                transition={{
                  delay: 2.4,
                  duration: 0.8,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <p className="subtext-gradient text-[15px] font-medium leading-[20px] tracking-[-0.02em]">
                  All your benefits.
                </p>
                <p className="subtext-gradient text-[15px] font-medium leading-[20px] tracking-[-0.02em]">
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
      </motion.div>

      {/* Whirlpool — rendered AFTER the card so orbs stack on top of the
          card surface (would otherwise be hidden behind it). */}
      {phase === "final" &&
        QUEUE.map((agent, orbIndex) => (
          <WhirlpoolOrb
            key={`whirl-${agent}`}
            agent={agent}
            orbIndex={orbIndex}
          />
        ))}

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
 * Whirlpool orb — spirals inward around a center point above the card text.
 * Progress is driven by an explicit `animate()` call on mount, which is
 * more reliable than reading `useTime` during render.
 */
function WhirlpoolOrb({
  agent,
  orbIndex,
}: {
  agent: OrbKey;
  orbIndex: number;
}) {
  // Subtle "closing the circle": beads trace ONE gentle arc around the card
  // center — same tight radius the entrance arc used, no multi-loop swirl.
  // All four beads follow the same curve, staggered slightly so they read
  // as a rope tightening into the eye.
  const CX = 220;
  const CY = CARD_TOP_Y + CARD_HEIGHT / 2; // = 610, card center
  const SIZE = 30;
  const STAGGER_S = 0.22;
  const INDIVIDUAL_S = 1.6;
  const RADIUS = 48; // small, subtle — like the entrance arc
  const START_ANGLE = -Math.PI / 2; // start at top (12 o'clock)

  const progress = useMotionValue(0);
  useEffect(() => {
    const controls = animate(progress, 1, {
      duration: INDIVIDUAL_S,
      delay: orbIndex * STAGGER_S,
      ease: [0.4, 0, 0.2, 1],
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Exactly one revolution, radius eases to zero only in the last stretch.
  const angleOf = (p: number) => START_ANGLE + p * Math.PI * 2;
  const radiusOf = (p: number) => RADIUS * (1 - Math.pow(p, 2.4));

  const x = useTransform(progress, (p) => CX + radiusOf(p) * Math.cos(angleOf(p)) - SIZE / 2);
  const y = useTransform(progress, (p) => CY + radiusOf(p) * Math.sin(angleOf(p)) - SIZE / 2);
  // Quick fade-in as the bead joins the rope, held bright, dissolves at eye.
  const opacity = useTransform(progress, [0, 0.1, 0.75, 1], [0, 1, 1, 0]);
  const scale = useTransform(progress, (p) => 1 - p * 0.6);
  const filter = useTransform(progress, (p) => `blur(${Math.max(0, p - 0.7) * 6}px)`);

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0"
      style={{ width: SIZE, height: SIZE, x, y, opacity, scale, filter }}
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
