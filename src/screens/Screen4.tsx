"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  useTime,
  animate,
  type MotionValue,
} from "framer-motion";
import AgentOrb from "@/components/AgentOrb";
import AuraGlow from "@/components/AuraGlow";
import GradientText from "@/components/GradientText";
import StatusIndicator from "@/components/StatusIndicator";
import WordReveal from "@/components/WordReveal";
import { CHECKPOINTS_INNER } from "./checkpoints";
import { haptic } from "@/lib/haptics";

/* =============================================================================
 * Screen 4 — the full agent choreography.
 *
 * Phase A (arcProgress: 0→1): 5 orbs enter along a clockwise arc.
 * Phase B (settleProgress: 0→1): orbs settle into a vertical column (screen 6).
 * Phase C (promoteLevel: 0→N): agents complete one by one — each promotion
 *   shifts the whole column up one slot; completed agents live as greyed pills
 *   at the top; the newly-active agent becomes the main card.
 *
 * Everything is driven by three shared MotionValues so the whole scene moves
 * as one rope.
 * ==========================================================================*/

// ---- Arc geometry (entrance) ----
// Bezier pulled so the entrance traces a proper circular sweep from off-screen right
// to the main orb's rest position at (75, 500).
const P0 = { x: 600, y: 640 };
const P1 = { x: 460, y: 830 };
const P2 = { x: 130, y: 780 };
const P3 = { x: 75, y: 500 };

const MAX_SIZE = 92;
const ENTRY_SIZE = 10;

function pathAt(t: number) {
  const u = 1 - t;
  return {
    x:
      u * u * u * P0.x +
      3 * u * u * t * P1.x +
      3 * u * t * t * P2.x +
      t * t * t * P3.x,
    y:
      u * u * u * P0.y +
      3 * u * u * t * P1.y +
      3 * u * t * t * P2.y +
      t * t * t * P3.y,
  };
}
const trailPosAt = (arcT: number) => ({
  x: P0.x + -arcT * 600,
  y: P0.y,
});
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));
const restBlurAt = (t: number) => (1 - clamp01(t)) * 6;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function lerpArr(vals: number[], t: number) {
  const clamped = Math.max(0, Math.min(vals.length - 1, t));
  const i = Math.floor(clamped);
  const f = clamped - i;
  if (i >= vals.length - 1) return vals[vals.length - 1];
  return lerp(vals[i], vals[i + 1], f);
}

/* ---------------- Orb specs ---------------- */
type OrbLayout = { cx: number; cy: number; size: number; opacity?: number };
type OrbSpec = {
  finalT: number;
  arcSize: number;
  /** Per-agent blob image displayed inside the orb bezel. */
  blob?: string;
  /** Layout for each promotion level 0..3. */
  states: OrbLayout[];
  /** Position/size in the final "Welcome back" horizontal row (screen 1486). */
  welcome: OrbLayout;
  fadeOnSettle?: boolean;
};

// Pill column positions (center y) — matches Figma node 16:22343.
// PILL_1 is the bottom completed row (closest to the active orb).
const PILL_1 = 378;
const PILL_2 = 308;
const PILL_3 = 243;
const ACTIVE_Y = 468;

// Vertical column positions — settled state before the text card shows.
// Entrance is a curved arc; once settled, orbs stack vertically at cx=70
// so the text card at x=135 has no collision.
const COL_X = 70;
const COL_Y = [ACTIVE_Y, 572, 642, 705, 778] as const;

// Completed-row (pill) orb: 40px, half-opacity — per Figma spec.
const PILL: Omit<OrbLayout, "cx" | "cy"> = { size: 40, opacity: 0.5 };

const ORBS: OrbSpec[] = [
  // Orb 0 — Visa. Starts main, ends deepest pill.
  {
    finalT: 1.0,
    arcSize: 92,
    blob: "/assets/orb/ellipse.png",
    states: [
      { cx: COL_X, cy: COL_Y[0], size: 60 },
      { cx: COL_X, cy: PILL_1, ...PILL },
      { cx: COL_X, cy: PILL_2, ...PILL },
      { cx: COL_X, cy: PILL_3, ...PILL },
    ],
    welcome: { cx: 310, cy: 425, size: 48 },
  },
  // Orb 1 — Flight.
  {
    finalT: 0.78,
    arcSize: 66,
    blob: "/assets/orb/blob-flight.png",
    states: [
      { cx: COL_X, cy: COL_Y[1], size: 55 },
      { cx: COL_X, cy: COL_Y[0], size: 60 },
      { cx: COL_X, cy: PILL_1, ...PILL },
      { cx: COL_X, cy: PILL_2, ...PILL },
    ],
    welcome: { cx: 250, cy: 425, size: 48 },
  },
  // Orb 2 — Forex.
  {
    finalT: 0.6,
    arcSize: 44,
    blob: "/assets/orb/blob-forex.png",
    states: [
      { cx: COL_X, cy: COL_Y[2], size: 40, opacity: 0.9 },
      { cx: COL_X, cy: COL_Y[1], size: 50 },
      { cx: COL_X, cy: COL_Y[0], size: 60 },
      { cx: COL_X, cy: PILL_1, ...PILL },
    ],
    welcome: { cx: 190, cy: 425, size: 48 },
  },
  // Orb 3 — Safety.
  {
    finalT: 0.45,
    arcSize: 30,
    blob: "/assets/orb/blob-safety.png",
    states: [
      { cx: COL_X, cy: COL_Y[3], size: 30, opacity: 0.55 },
      { cx: COL_X, cy: COL_Y[2], size: 38, opacity: 0.85 },
      { cx: COL_X, cy: COL_Y[1], size: 48 },
      { cx: COL_X, cy: COL_Y[0], size: 60 },
    ],
    welcome: { cx: 130, cy: 425, size: 48 },
  },
  // Orb 4 — tail droplet during arc entrance only. Fades out on settle and
  // stays hidden for the rest of the lifecycle so the layout is always 4 orbs.
  {
    finalT: 0.32,
    arcSize: 20,
    states: [
      { cx: COL_X, cy: COL_Y[3], size: 20, opacity: 0 },
      { cx: COL_X, cy: COL_Y[3], size: 20, opacity: 0 },
      { cx: COL_X, cy: COL_Y[3], size: 20, opacity: 0 },
      { cx: COL_X, cy: COL_Y[3], size: 20, opacity: 0 },
    ],
    welcome: { cx: COL_X, cy: COL_Y[3], size: 20, opacity: 0 },
    fadeOnSettle: true,
  },
];

const arcSizeAt = (arcT: number, spec: OrbSpec) => {
  const p = clamp01(arcT / spec.finalT);
  return ENTRY_SIZE + (spec.arcSize - ENTRY_SIZE) * p;
};

/* ---------------- Agents data ---------------- */
type WorkingLine = {
  text: string;
  variant?: "default" | "green";
  /** Optional rolling grey statuses shown while this line is on. */
  statuses?: Array<{ line1: string; line2: string }>;
};
type Agent = {
  title: string;
  /** Working states — user sees each in sequence, rolling down between them. */
  workingLines: WorkingLine[];
  /** Green summary + optional greyed description below. */
  summary: { text: string; desc?: string };
};

const AGENTS: Agent[] = [
  {
    title: "Visa agent",
    workingLines: [
      {
        text: "Checking your Atlys history..",
        statuses: [
          { line1: "Found 1 active application:", line2: "Dubai (3 Travelers)" },
          { line1: "Processing", line2: "Estimated delivery in 2 days" },
          {
            line1: "Passport validity checked:",
            line2: "Valid till Jan 30, 2030",
          },
        ],
      },
    ],
    summary: { text: "3 Past & 1 Active trip found" },
  },
  {
    title: "Flight Agent",
    workingLines: [
      { text: "watching flights for your trip..." },
      {
        text: "Watching seat & upgrade windows",
        statuses: [
          {
            line1: "Scanned 142 routes for Dubai —",
            line2: "fares moved ₹2,000 this week",
          },
        ],
      },
    ],
    summary: { text: "Top 12 flights shortlisted", desc: "Check-in on autopilot" },
  },
  {
    title: "Forex agent",
    workingLines: [
      {
        text: "Watching forex rate...",
        statuses: [
          { line1: "Currency:", line2: "UAE Dirham (AED)" },
          { line1: "Spread fee: 0%", line2: "Foreign markup: 0%" },
        ],
      },
    ],
    summary: {
      text: "Forex rate locked for Dubai",
      desc: "Zero-markup AED rate locked. Pick an amount — Fx comes to your door",
    },
  },
  {
    title: "Safety agent",
    workingLines: [
      {
        text: "Fall sick abroad?",
        statuses: [
          {
            line1: "A doctor's on call and a",
            line2: "hospital gets arranged.",
          },
        ],
      },
      {
        text: "Adding protection to trip...",
        statuses: [
          {
            line1: "Passport emergency:",
            line2: "Embassy priority channel open",
          },
          { line1: "Status:", line2: "24/7 Global Travel Assistance Active" },
        ],
      },
    ],
    summary: {
      text: "Dubai trip is 24/7 protected",
      desc: "Your Dubai trip is protected round the clock — on-call doctors and airport hotline whenever you need them",
    },
  },
];

/* ---------------- Timing ---------------- */
// Text stays visible for the entire orb arc + settle. Only blurs out once
// the orbs have reached their vertical-column resting positions.
const TEXT_IN = 1.1;
const TEXT_HOLD = 3.3; // spans rope arc + settle
const TEXT_OUT = 0.55;
const TEXT_TOTAL = TEXT_IN + TEXT_HOLD + TEXT_OUT;

const ROPE_DURATION = 2.0;
// Rope starts right after the headline word-by-word finishes — text stays
// on screen while the orbs travel the arc + settle beneath it.
const ROPE_DELAY = TEXT_IN + 0.2;
const SETTLE_DURATION = 2.1;
const SETTLE_DELAY = ROPE_DELAY + ROPE_DURATION * 0.55;

const CARD_FADE_IN = 0.6;
// Card fades in only after the headline text has finished blurring out.
const CARD_DELAY = TEXT_TOTAL + 0.05;

const WATER_DROPLET_EASE = [0.16, 1, 0.3, 1] as const;
const SETTLE_EASE = [0.45, 0, 0.25, 1] as const;

// Uniform hold + transition timing across the whole agent lifecycle.
const HOLD = {
  workingLine: 2400,
  statusFirst: 2400,
  status: 2400,
  summary: 2400,
  promote: 1100,
};
// Every text/component roll (subtitle, status, card) uses the same duration + ease.
const ROLL_DURATION = 0.55;
const ROLL_EASE = [0.22, 1, 0.36, 1] as const;

/* ---------------- Runtime state ---------------- */
// A single "step" the app is currently in.
type Step =
  | { kind: "working"; agentIdx: number; lineIdx: number; statusIdx: number }
  | { kind: "summary"; agentIdx: number };

function buildTimeline(): Array<{ step: Step; hold: number }> {
  const timeline: Array<{ step: Step; hold: number }> = [];
  AGENTS.forEach((agent, agentIdx) => {
    agent.workingLines.forEach((line, lineIdx) => {
      const statuses = line.statuses ?? [];
      if (statuses.length === 0) {
        timeline.push({
          step: { kind: "working", agentIdx, lineIdx, statusIdx: -1 },
          hold: HOLD.workingLine,
        });
      } else {
        statuses.forEach((_, statusIdx) => {
          timeline.push({
            step: { kind: "working", agentIdx, lineIdx, statusIdx },
            hold: statusIdx === 0 ? HOLD.statusFirst : HOLD.status,
          });
        });
      }
    });
    // Final agent's summary holds indefinitely — its text stays on screen
    // while the Next CTA appears below.
    const isLast = agentIdx === AGENTS.length - 1;
    timeline.push({
      step: { kind: "summary", agentIdx },
      hold: isLast ? 999_999 : HOLD.summary,
    });
  });
  return timeline;
}

const TIMELINE = buildTimeline();

/** Named checkpoints for the dev jump panel. */
type Checkpoint = {
  label: string;
  timelineIdx: number;
  promoteLevel: number;
  welcomeProgress: number;
  welcomeTextIdx: number;
  arcProgress: number;
  settleProgress: number;
};

function findTimelineIdx(
  agentIdx: number,
  kind: "working" | "summary",
  lineIdx = 0,
  statusIdx = -1,
): number {
  return TIMELINE.findIndex((e) => {
    if (e.step.kind !== kind) return false;
    if (e.step.agentIdx !== agentIdx) return false;
    if (kind === "working") {
      const s = e.step as Extract<Step, { kind: "working" }>;
      return s.lineIdx === lineIdx && s.statusIdx === statusIdx;
    }
    return true;
  });
}

type InnerMatcher = (typeof CHECKPOINTS_INNER)[number]["matcher"];

function resolveInnerCheckpoint(matcher: InnerMatcher): Checkpoint {
  switch (matcher.kind) {
    case "start":
      return {
        label: "start",
        timelineIdx: -1,
        arcProgress: 0,
        settleProgress: 0,
        promoteLevel: 0,
        welcomeProgress: 0,
        welcomeTextIdx: 0,
      };
    case "teamPerks":
      return {
        label: "teamPerks",
        timelineIdx: findTimelineIdx(3, "summary"),
        arcProgress: 1,
        settleProgress: 1,
        promoteLevel: 3,
        welcomeProgress: 1,
        // Team perks is the only welcome text now — "Welcome back, Mohak" was
        // removed. WELCOME_TEXTS[0] is the team-perks copy.
        welcomeTextIdx: 0,
      };
    case "working":
      return {
        label: "working",
        timelineIdx: findTimelineIdx(
          matcher.agentIdx,
          "working",
          matcher.lineIdx,
          matcher.statusIdx,
        ),
        arcProgress: 1,
        settleProgress: 1,
        promoteLevel: matcher.agentIdx,
        welcomeProgress: 0,
        welcomeTextIdx: 0,
      };
    case "summary":
      return {
        label: "summary",
        timelineIdx: findTimelineIdx(matcher.agentIdx, "summary"),
        arcProgress: 1,
        settleProgress: 1,
        promoteLevel: matcher.agentIdx,
        welcomeProgress: 0,
        welcomeTextIdx: 0,
      };
  }
}

/* ============================================================================
 * Component
 * ==========================================================================*/

function ArcOrb({
  spec,
  orbIndex,
  arcProgress,
  settleProgress,
  promoteLevel,
  welcomeProgress,
}: {
  spec: OrbSpec;
  orbIndex: number;
  arcProgress: MotionValue<number>;
  settleProgress: MotionValue<number>;
  promoteLevel: MotionValue<number>;
  welcomeProgress: MotionValue<number>;
}) {
  const time = useTime();
  const cxs = spec.states.map((s) => s.cx);
  const cys = spec.states.map((s) => s.cy);
  const sizes = spec.states.map((s) => s.size);
  const opacities = spec.states.map((s) => s.opacity ?? 1);

  const x = useTransform(
    [arcProgress, settleProgress, promoteLevel, welcomeProgress],
    (vals: number[]) => {
      const [a, s, p, w] = vals;
      const arcT = spec.finalT - 1 + a;
      const arcPt = arcT >= 0 ? pathAt(arcT) : trailPosAt(arcT);
      const restCx = lerp(arcPt.x, spec.states[0].cx, s);
      const promotedCx = p <= 0 ? restCx : lerpArr(cxs, p);
      const cx = lerp(promotedCx, spec.welcome.cx, w);
      return cx - MAX_SIZE / 2;
    },
  );
  const y = useTransform(
    [arcProgress, settleProgress, promoteLevel, welcomeProgress, time],
    (vals: number[]) => {
      const [a, s, p, w, t] = vals;
      const arcT = spec.finalT - 1 + a;
      const arcPt = arcT >= 0 ? pathAt(arcT) : trailPosAt(arcT);
      const restCy = lerp(arcPt.y, spec.states[0].cy, s);
      const promotedCy = p <= 0 ? restCy : lerpArr(cys, p);
      const cy = lerp(promotedCy, spec.welcome.cy, w);
      // Sine wave bob during the Welcome state — each orb has its own phase
      // so they collectively form a travelling wave.
      const waveAmplitude = 11;
      const waveSpeedRadPerMs = 0.0022;
      const phase = orbIndex * 0.9;
      const bob = Math.sin(t * waveSpeedRadPerMs + phase) * waveAmplitude * w;
      return cy - MAX_SIZE / 2 + bob;
    },
  );
  const scale = useTransform(
    [arcProgress, settleProgress, promoteLevel, welcomeProgress],
    (vals: number[]) => {
      const [a, s, p, w] = vals;
      const arcT = spec.finalT - 1 + a;
      const arcSz = arcSizeAt(arcT, spec);
      const restSize = lerp(arcSz, spec.states[0].size, s);
      const promotedSize = p <= 0 ? restSize : lerpArr(sizes, p);
      const size = lerp(promotedSize, spec.welcome.size, w);
      return size / MAX_SIZE;
    },
  );
  const filter = useTransform(
    [arcProgress, settleProgress, promoteLevel, welcomeProgress],
    (vals: number[]) => {
      const [a, s, p, w] = vals;
      const arcT = spec.finalT - 1 + a;
      const trailingBlur = arcT < 0 ? 14 : 0;
      const arcBlur = restBlurAt(arcT) + trailingBlur;
      const b = lerp(arcBlur, 0, s);
      // Once this orb is promoted past its own turn, drain its color so the
      // completed agents read as "done" in the top row. Welcome un-grayscales.
      const promoted = Math.min(1, Math.max(0, p - orbIndex));
      const gray = promoted * (1 - w);
      return `blur(${b.toFixed(2)}px) grayscale(${gray.toFixed(2)})`;
    },
  );
  const opacity = useTransform(
    [arcProgress, settleProgress, promoteLevel, welcomeProgress],
    (vals: number[]) => {
      const [a, s, p, w] = vals;
      const arcT = spec.finalT - 1 + a;
      let baseOp = 1;
      if (arcT < -0.35) baseOp = 0;
      else if (arcT < 0) baseOp = (arcT + 0.35) / 0.35;
      if (spec.fadeOnSettle) baseOp *= 1 - s;
      const settledOp = lerp(1, spec.states[0].opacity ?? 1, s);
      const promotedOp = p <= 0 ? settledOp : lerpArr(opacities, p);
      const welcomeOp = lerp(promotedOp, spec.welcome.opacity ?? 1, w);
      return baseOp * welcomeOp;
    },
  );

  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{
        width: MAX_SIZE,
        height: MAX_SIZE,
        transformOrigin: "center",
        x,
        y,
        scale,
        filter,
        opacity,
        willChange: "transform, filter, opacity",
      }}
    >
      <AgentOrb size={MAX_SIZE} blob={spec.blob} />
    </motion.div>
  );
}

/**
 * A completed-agent pill row that sits above the active card.
 * Position is driven reactively so it slides up as more agents complete.
 */
function PillRow({
  agentIdx,
  promoteLevel,
}: {
  agentIdx: number;
  promoteLevel: MotionValue<number>;
}) {
  // Slot depth = promoteLevel - agentIdx (fractional during a promotion).
  // slot 1 → PILL_1, slot 2 → PILL_2, slot 3 → PILL_3. Driven directly by
  // the animating promoteLevel MotionValue → smooth ride, no discrete jump.
  const PILL_ROW_HEIGHT = 19;
  const targetY = useTransform(promoteLevel, (p) => {
    const slot = Math.max(1, p - agentIdx);
    return lerpArr([PILL_1, PILL_2, PILL_3], slot - 1) - PILL_ROW_HEIGHT / 2;
  });
  const opacity = useTransform(promoteLevel, [agentIdx, agentIdx + 0.4], [0, 1]);
  return (
    <motion.div
      className="absolute left-[135px] w-[265px]"
      style={{ top: targetY, height: PILL_ROW_HEIGHT, opacity }}
    >
      <div className="flex h-full items-center justify-between gap-2">
        <p className="text-[14px] font-semibold leading-[19px] tracking-[-0.01em] text-[#999]">
          {AGENTS[agentIdx].summary.text}
        </p>
        <CheckmarkBadge />
      </div>
    </motion.div>
  );
}

function AuraContainer({
  welcomeProgress,
  children,
}: {
  welcomeProgress: MotionValue<number>;
  children: React.ReactNode;
}) {
  // Fade the aura completely as the Welcome transition takes over.
  const opacity = useTransform(welcomeProgress, [0, 0.9], [1, 0]);
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 overflow-hidden"
      style={{
        width: 500,
        height: 220,
        maskImage:
          "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, black 0%, black 55%, transparent 100%)",
        opacity,
      }}
    >
      {children}
    </motion.div>
  );
}

function FadingWrapper({
  welcomeProgress,
  children,
}: {
  welcomeProgress: MotionValue<number>;
  children: React.ReactNode;
}) {
  const opacity = useTransform(welcomeProgress, [0, 0.6], [1, 0]);
  return (
    <motion.div className="absolute inset-0" style={{ opacity }}>
      {children}
    </motion.div>
  );
}

function WelcomeText({
  welcomeProgress,
  textIdx,
}: {
  welcomeProgress: MotionValue<number>;
  textIdx: number;
}) {
  const opacity = useTransform(welcomeProgress, [0.5, 1], [0, 1]);
  const y = useTransform(welcomeProgress, [0.5, 1], [10, 0]);
  const current = WELCOME_TEXTS[textIdx];
  // Longer stagger + per-word duration → readable but still crisp.
  const line1Words = current.line1.split(/\s+/).length;
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-[490px] -translate-x-1/2 text-center"
      style={{ opacity, y }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={textIdx}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(12px)", transition: { duration: 0.5, ease: ROLL_EASE } }}
        >
          <WordReveal
            text={current.line1}
            className="text-[22px] font-medium leading-[28px] tracking-[-0.04em] text-neutral-400"
            staggerMs={140}
            perWordDurationMs={480}
          />
          <div className="mt-2">
            <WordReveal
              text={current.line2}
              className="text-[22px] font-semibold leading-[28px] tracking-[-0.04em] text-[color:var(--ink)]"
              delay={(line1Words * 140) / 1000 + 0.15}
              staggerMs={140}
              perWordDurationMs={480}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

function CheckmarkBadge() {
  return (
    <span
      className="relative inline-block h-[20px] w-[20px]"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{ border: "1.5px solid #10B981" }}
      />
      {/* Inner filled circle with a small gap from the ring */}
      <span
        className="absolute rounded-full"
        style={{
          inset: 3,
          backgroundColor: "#10B981",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
          <path
            d="M1.5 5.2 L4 7.5 L8.5 2.5"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </span>
  );
}

function ActiveCard({ step }: { step: Step }) {
  const agent = AGENTS[step.agentIdx];
  const isSummary = step.kind === "summary";
  const isFinalSummary = isSummary && step.agentIdx === AGENTS.length - 1;
  const line = !isSummary ? agent.workingLines[step.lineIdx] : null;
  const status =
    !isSummary && line?.statuses && step.statusIdx >= 0
      ? line.statuses[step.statusIdx]
      : null;

  return (
    <>
      <motion.p
        key={`title-${step.agentIdx}`}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: ROLL_DURATION, ease: ROLL_EASE }}
        className="text-[16px] font-semibold leading-[20px] tracking-[-0.04em] text-[#0b0b0b]"
      >
        {agent.title}
      </motion.p>

      <div className="relative mt-1 h-[100px] overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={
              isSummary
                ? `summary-${step.agentIdx}`
                : `line-${step.agentIdx}-${step.lineIdx}`
            }
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: ROLL_DURATION, ease: ROLL_EASE }}
            className="absolute inset-0"
          >
            <div className="flex items-center justify-between gap-2">
              <GradientText
                as="p"
                shine
                variant={isSummary ? "green" : line!.variant ?? "default"}
                className="text-[14px] font-semibold leading-[19px] tracking-[-0.01em]"
              >
                {isSummary ? agent.summary.text : line!.text}
              </GradientText>
              {isSummary ? <CheckmarkBadge /> : <StatusIndicator />}
            </div>

            {/* Status/desc line — a single row for summary desc or the rolling status */}
            <div className="relative mt-1 h-[76px] overflow-hidden">
              <AnimatePresence initial={false}>
                {isSummary && agent.summary.desc && (
                  <motion.p
                    key={`desc-${step.agentIdx}`}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: ROLL_DURATION, ease: ROLL_EASE, delay: 0.15 }}
                    className="absolute inset-0 pr-3 text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[#787878]"
                    style={{ hyphens: "auto", wordBreak: "break-word" }}
                  >
                    {agent.summary.desc}
                  </motion.p>
                )}
                {!isSummary && status && (
                  <motion.div
                    key={`status-${step.agentIdx}-${step.lineIdx}-${step.statusIdx}`}
                    initial={{ y: -38, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 38, opacity: 0 }}
                    transition={{ duration: ROLL_DURATION, ease: ROLL_EASE }}
                    className="absolute inset-0 text-[13px] leading-[19px] tracking-[-0.01em]"
                  >
                    <p className="grey-shine-text font-medium">{status.line1}</p>
                    <p className="grey-shine-text font-medium">{status.line2}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

const WELCOME_HOLD_MS = 1800;
const WELCOME_DURATION = 1.6;
// After the Welcome text has been visible for this long, swap to the "Your team..." message.
const WELCOME_TEXT_ADVANCE_MS = 2200;

const WELCOME_TEXTS: Array<{ line1: string; line2: string }> = [
  { line1: "Your team doesn't just\nhandle the work", line2: "They bring the perks" },
];

export default function Screen4({
  checkpointMatcher,
  onComplete,
}: {
  checkpointMatcher?: InnerMatcher;
  onComplete?: () => void;
} = {}) {
  const arcProgress = useMotionValue(0);
  const settleProgress = useMotionValue(0);
  const promoteLevel = useMotionValue(0);
  const welcomeProgress = useMotionValue(0);
  const [welcomeStarted, setWelcomeStarted] = useState(false);
  const [welcomeTextIdx, setWelcomeTextIdx] = useState(0);

  // Apply a checkpoint jump when the matcher prop changes.
  useEffect(() => {
    if (!checkpointMatcher) return;
    const cp = resolveInnerCheckpoint(checkpointMatcher);
    arcProgress.set(cp.arcProgress);
    settleProgress.set(cp.settleProgress);
    promoteLevel.set(cp.promoteLevel);
    welcomeProgress.set(cp.welcomeProgress);
    setTimelineIdx(cp.timelineIdx);
    setWelcomeStarted(cp.welcomeProgress > 0);
    setWelcomeTextIdx(cp.welcomeTextIdx);
  }, [
    checkpointMatcher,
    arcProgress,
    settleProgress,
    promoteLevel,
    welcomeProgress,
  ]);

  const [timelineIdx, setTimelineIdx] = useState(-1);
  const timerRef = useRef<number | null>(null);

  // Kick off arc + settle entrance, then start the agent lifecycle.
  useEffect(() => {
    const arcCtrl = animate(arcProgress, 1, {
      duration: ROPE_DURATION,
      delay: ROPE_DELAY,
      ease: WATER_DROPLET_EASE as unknown as [number, number, number, number],
    });
    const settleCtrl = animate(settleProgress, 1, {
      duration: SETTLE_DURATION,
      delay: SETTLE_DELAY,
      ease: SETTLE_EASE as unknown as [number, number, number, number],
    });
    const startCardMs = (CARD_DELAY + CARD_FADE_IN + 0.4) * 1000;
    const startCard = window.setTimeout(() => setTimelineIdx(0), startCardMs);
    return () => {
      arcCtrl.stop();
      settleCtrl.stop();
      window.clearTimeout(startCard);
    };
  }, [arcProgress, settleProgress]);

  // Advance through the timeline. When the agent changes between steps, run
  // the promotion animation on `promoteLevel` before advancing to the new step.
  useEffect(() => {
    if (timelineIdx < 0 || timelineIdx >= TIMELINE.length) return;
    const entry = TIMELINE[timelineIdx];
    const nextEntry = TIMELINE[timelineIdx + 1];

    const advance = () => {
      if (!nextEntry) return;
      const currentAgent = entry.step.agentIdx;
      const nextAgent = nextEntry.step.agentIdx;
      if (nextAgent > currentAgent) {
        // Promote — animate promoteLevel up before switching step.
        haptic("orbLand");
        animate(promoteLevel, nextAgent, {
          duration: HOLD.promote / 1000,
          ease: SETTLE_EASE as unknown as [number, number, number, number],
        });
        // Switch step ~half-way through the promotion so text morphs while orbs travel.
        timerRef.current = window.setTimeout(
          () => setTimelineIdx(timelineIdx + 1),
          HOLD.promote * 0.55,
        );
      } else {
        haptic("statusFlip");
        setTimelineIdx(timelineIdx + 1);
      }
    };

    timerRef.current = window.setTimeout(advance, entry.hold);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [timelineIdx, promoteLevel]);

  // Once Safety's summary is showing, hold briefly then kick off the Welcome
  // transition. The "Welcome back, Mohak" text is skipped — we start directly
  // on the Team-perks message.
  useEffect(() => {
    if (welcomeStarted) return;
    const entry = timelineIdx >= 0 ? TIMELINE[timelineIdx] : null;
    if (!entry) return;
    const isFinalSummary =
      entry.step.kind === "summary" &&
      entry.step.agentIdx === AGENTS.length - 1;
    if (!isFinalSummary) return;
    const t = window.setTimeout(() => {
      setWelcomeStarted(true);
      animate(welcomeProgress, 1, {
        duration: WELCOME_DURATION,
        ease: SETTLE_EASE as unknown as [number, number, number, number],
      });
    }, WELCOME_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [timelineIdx, welcomeProgress, welcomeStarted]);

  // After the Team-perks text has been on screen for a beat, advance to
  // Screen 5.
  useEffect(() => {
    if (!welcomeStarted || !onComplete) return;
    const t = window.setTimeout(
      onComplete,
      WELCOME_DURATION * 1000 + WELCOME_TEXT_ADVANCE_MS,
    );
    return () => window.clearTimeout(t);
  }, [welcomeStarted, onComplete]);

  const currentEntry = timelineIdx >= 0 ? TIMELINE[timelineIdx] : null;

  return (
    <motion.div
      className="relative h-full w-full overflow-hidden rounded-[44px]"
      style={{
        background:
          "linear-gradient(to bottom, var(--bg-screen-start), var(--bg-screen-end))",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
    >
      {/* Top aura — outer viewport has fixed size + mask that clips overflow.
          Inner element does the motion inside that viewport — spill stays
          contained no matter how much scale/drift we apply. Fades out during
          the Welcome transition. */}
      <AuraContainer welcomeProgress={welcomeProgress}>
        <motion.div
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{ transformOrigin: "50% 20%" }}
          initial={{ opacity: 0, y: -80 }}
          animate={{
            opacity: 1,
            scale: [1, 1.08, 1.02, 1.09, 1.01, 1.06],
            x: [-10, 12, -6, 14, -12, -8],
            y: [-80, -84, -76, -86, -78, -82],
            rotate: [-0.9, 1.1, -0.5, 1.3, -1.1, -0.4],
          }}
          transition={{
            opacity: {
              delay: SETTLE_DELAY,
              duration: 2.6,
              ease: [0.33, 0, 0.67, 1],
            },
            scale: {
              delay: SETTLE_DELAY,
              duration: 11,
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              ease: [0.45, 0, 0.55, 1],
              repeat: Infinity,
              repeatType: "mirror",
            },
            x: {
              delay: SETTLE_DELAY,
              duration: 15,
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              ease: [0.45, 0, 0.55, 1],
              repeat: Infinity,
              repeatType: "mirror",
            },
            y: {
              delay: SETTLE_DELAY,
              duration: 13,
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              ease: [0.45, 0, 0.55, 1],
              repeat: Infinity,
              repeatType: "mirror",
            },
            rotate: {
              delay: SETTLE_DELAY,
              duration: 19,
              times: [0, 0.2, 0.4, 0.6, 0.8, 1],
              ease: [0.45, 0, 0.55, 1],
              repeat: Infinity,
              repeatType: "mirror",
            },
          }}
        >
          <AuraGlow width={500} opacity={0.7} blur={50} />
        </motion.div>
      </AuraContainer>

      {/* Intro headline — word-by-word reveal, then blur-out on hold end. */}
      <motion.div
        className="absolute left-1/2 top-[48%] w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center"
        initial={{ opacity: 1, filter: "blur(0px)" }}
        animate={{
          opacity: [1, 1, 0],
          filter: ["blur(0px)", "blur(0px)", "blur(24px)"],
        }}
        transition={{
          duration: TEXT_TOTAL,
          times: [0, (TEXT_IN + TEXT_HOLD) / TEXT_TOTAL, 1],
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <WordReveal
          text={"Meet your travel team.\nOn duty 24/7."}
          className="text-[22px] font-medium leading-[28px] tracking-[-0.04em] text-[color:var(--ink)]"
          staggerMs={80}
          perWordDurationMs={340}
        />
      </motion.div>

      {/* Wrapper that fades everything (pills + card + CTA) as we transition
          into the Welcome state. Orbs stay outside this wrapper since they
          morph rather than fade. */}
      <FadingWrapper welcomeProgress={welcomeProgress}>
        {/* Completed-agent pills */}
        {AGENTS.slice(0, -1).map((_, idx) => (
          <PillRow
            key={`pill-${idx}`}
            agentIdx={idx}
            promoteLevel={promoteLevel}
          />
        ))}

        {/* Active card — title lands at y ~444 to match Figma node 16:22343
            (title top 444.69, subtitle 472.69, description 506.69). */}
        <motion.div
          className="absolute left-[135px] top-[437px] w-[265px]"
          initial={{ opacity: 0, filter: "blur(20px)", x: -6 }}
          animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
          transition={{
            delay: CARD_DELAY,
            duration: CARD_FADE_IN,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          {currentEntry && <ActiveCard step={currentEntry.step} />}
        </motion.div>

        {/* Next CTA */}
        <AnimatePresence>
          {currentEntry?.step.kind === "summary" &&
            currentEntry.step.agentIdx === AGENTS.length - 1 && (
              <motion.div
                key="next-cta"
                className="absolute bottom-6 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.8,
                  duration: ROLL_DURATION,
                  ease: ROLL_EASE,
                }}
              >
                <button
                  className="relative h-[52px] w-[360px] overflow-hidden rounded-full text-[16px] font-semibold text-[color:var(--ink)]"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(80,87,234,0.28) 0%, rgba(217,70,239,0.22) 35%, rgba(239,68,68,0.26) 65%, rgba(237,215,88,0.30) 100%)",
                    boxShadow: "0 12px 30px -14px rgba(0,0,0,0.18)",
                    border: "1px solid rgba(255,255,255,0.5)",
                  }}
                >
                  Next
                </button>
              </motion.div>
            )}
        </AnimatePresence>
      </FadingWrapper>

      {/* Welcome text — fades in during the welcome transition, then swaps
          messages via blur cross-fade (frame 1443). */}
      <WelcomeText welcomeProgress={welcomeProgress} textIdx={welcomeTextIdx} />

      {/* Orbs */}
      {ORBS.map((orb, i) => (
        <ArcOrb
          key={i}
          spec={orb}
          orbIndex={i}
          arcProgress={arcProgress}
          settleProgress={settleProgress}
          promoteLevel={promoteLevel}
          welcomeProgress={welcomeProgress}
        />
      ))}
    </motion.div>
  );
}
