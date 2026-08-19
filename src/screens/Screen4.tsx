"use client";

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
  type MotionValue,
} from "framer-motion";
import AgentOrb from "@/components/AgentOrb";
import AuraGlow from "@/components/AuraGlow";
import GradientText from "@/components/GradientText";
import StatusIndicator from "@/components/StatusIndicator";

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
const P0 = { x: 600, y: 650 };
const P1 = { x: 420, y: 780 };
const P2 = { x: 150, y: 620 };
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
  /** Layout for each promotion level 0..3. */
  states: OrbLayout[];
  fadeOnSettle?: boolean;
};

// Pill column positions (from top): 3 completed levels stack above the active.
const PILL_1 = 372;
const PILL_2 = 282;
const PILL_3 = 192;
const ACTIVE_Y = 482;

// Queued positions below the active — used when there are fewer promotions.
const Q1 = 572;
const Q2 = 642;
const Q3 = 705;

const PILL: Omit<OrbLayout, "cx" | "cy"> = { size: 32, opacity: 0.5 };

const ORBS: OrbSpec[] = [
  // Orb 0 — Visa. Starts main, ends deepest pill.
  {
    finalT: 1.0,
    arcSize: 92,
    states: [
      { cx: 70, cy: ACTIVE_Y, size: 90 },
      { cx: 70, cy: PILL_1, ...PILL },
      { cx: 70, cy: PILL_2, ...PILL },
      { cx: 70, cy: PILL_3, ...PILL },
    ],
  },
  // Orb 1 — Flight.
  {
    finalT: 0.78,
    arcSize: 66,
    states: [
      { cx: 70, cy: Q1, size: 60 },
      { cx: 70, cy: ACTIVE_Y, size: 90 },
      { cx: 70, cy: PILL_1, ...PILL },
      { cx: 70, cy: PILL_2, ...PILL },
    ],
  },
  // Orb 2 — Forex.
  {
    finalT: 0.6,
    arcSize: 44,
    states: [
      { cx: 70, cy: Q2, size: 40, opacity: 0.9 },
      { cx: 70, cy: Q1, size: 50 },
      { cx: 70, cy: ACTIVE_Y, size: 90 },
      { cx: 70, cy: PILL_1, ...PILL },
    ],
  },
  // Orb 3 — Safety.
  {
    finalT: 0.45,
    arcSize: 30,
    states: [
      { cx: 70, cy: Q3, size: 35, opacity: 0.55 },
      { cx: 70, cy: Q2, size: 42, opacity: 0.8 },
      { cx: 70, cy: Q1, size: 55 },
      { cx: 70, cy: ACTIVE_Y, size: 90 },
    ],
  },
  // Orb 4 — hidden tail droplet, disappears after settle.
  {
    finalT: 0.32,
    arcSize: 20,
    states: [
      { cx: 70, cy: Q3, size: 20, opacity: 0 },
      { cx: 70, cy: Q3, size: 20, opacity: 0 },
      { cx: 70, cy: Q3, size: 20, opacity: 0 },
      { cx: 70, cy: Q3, size: 20, opacity: 0 },
    ],
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
const TEXT_IN = 0.7;
const TEXT_HOLD = 0.45;
const TEXT_OUT = 0.4;
const TEXT_TOTAL = TEXT_IN + TEXT_HOLD + TEXT_OUT;

const ROPE_DURATION = 2.0;
const ROPE_DELAY = TEXT_TOTAL + 0.05;
const SETTLE_DURATION = 2.1;
const SETTLE_DELAY = ROPE_DELAY + ROPE_DURATION * 0.55;

const CARD_FADE_IN = 0.6;
const CARD_DELAY = SETTLE_DELAY + SETTLE_DURATION * 0.6;

const WATER_DROPLET_EASE = [0.16, 1, 0.3, 1] as const;
const SETTLE_EASE = [0.45, 0, 0.25, 1] as const;

// How long each state within an agent lifecycle holds.
const HOLD = {
  workingLine: 2200,
  statusFirst: 1400,
  status: 2400,
  summary: 2400,
  promote: 1100, // duration of promotion animation
};

/* ---------------- Runtime state ---------------- */
// A single "step" the app is currently in.
type Step =
  | { kind: "working"; agentIdx: number; lineIdx: number; statusIdx: number }
  | { kind: "summary"; agentIdx: number }
  | { kind: "next" }; // final CTA (Safety completed)

function buildTimeline(): Array<{ step: Step; hold: number }> {
  const timeline: Array<{ step: Step; hold: number }> = [];
  AGENTS.forEach((agent, agentIdx) => {
    agent.workingLines.forEach((line, lineIdx) => {
      // Working line with no status → single step with statusIdx=-1.
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
    timeline.push({
      step: { kind: "summary", agentIdx },
      hold: HOLD.summary,
    });
  });
  timeline.push({ step: { kind: "next" }, hold: 999_999 });
  return timeline;
}

const TIMELINE = buildTimeline();

/* ============================================================================
 * Component
 * ==========================================================================*/

function ArcOrb({
  spec,
  arcProgress,
  settleProgress,
  promoteLevel,
}: {
  spec: OrbSpec;
  arcProgress: MotionValue<number>;
  settleProgress: MotionValue<number>;
  promoteLevel: MotionValue<number>;
}) {
  const cxs = spec.states.map((s) => s.cx);
  const cys = spec.states.map((s) => s.cy);
  const sizes = spec.states.map((s) => s.size);
  const opacities = spec.states.map((s) => s.opacity ?? 1);

  const x = useTransform(
    [arcProgress, settleProgress, promoteLevel],
    ([a, s, p]: [number, number, number]) => {
      const arcT = spec.finalT - 1 + a;
      const arcPt = arcT >= 0 ? pathAt(arcT) : trailPosAt(arcT);
      const restCx = lerp(arcPt.x, spec.states[0].cx, s);
      const cx = p <= 0 ? restCx : lerpArr(cxs, p);
      return cx - MAX_SIZE / 2;
    },
  );
  const y = useTransform(
    [arcProgress, settleProgress, promoteLevel],
    ([a, s, p]: [number, number, number]) => {
      const arcT = spec.finalT - 1 + a;
      const arcPt = arcT >= 0 ? pathAt(arcT) : trailPosAt(arcT);
      const restCy = lerp(arcPt.y, spec.states[0].cy, s);
      const cy = p <= 0 ? restCy : lerpArr(cys, p);
      return cy - MAX_SIZE / 2;
    },
  );
  const scale = useTransform(
    [arcProgress, settleProgress, promoteLevel],
    ([a, s, p]: [number, number, number]) => {
      const arcT = spec.finalT - 1 + a;
      const arcSz = arcSizeAt(arcT, spec);
      const restSize = lerp(arcSz, spec.states[0].size, s);
      const size = p <= 0 ? restSize : lerpArr(sizes, p);
      return size / MAX_SIZE;
    },
  );
  const filter = useTransform(
    [arcProgress, settleProgress],
    ([a, s]: [number, number]) => {
      const arcT = spec.finalT - 1 + a;
      const trailingBlur = arcT < 0 ? 14 : 0;
      const arcBlur = restBlurAt(arcT) + trailingBlur;
      const b = lerp(arcBlur, 0, s);
      return `blur(${b.toFixed(2)}px)`;
    },
  );
  const opacity = useTransform(
    [arcProgress, settleProgress, promoteLevel],
    ([a, s, p]: [number, number, number]) => {
      const arcT = spec.finalT - 1 + a;
      let baseOp = 1;
      if (arcT < -0.35) baseOp = 0;
      else if (arcT < 0) baseOp = (arcT + 0.35) / 0.35;
      if (spec.fadeOnSettle) baseOp *= 1 - s;
      const promotedOp = p <= 0 ? 1 : lerpArr(opacities, p);
      return baseOp * promotedOp;
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
      <AgentOrb size={MAX_SIZE} />
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
  currentAgentIdx,
}: {
  agentIdx: number;
  promoteLevel: MotionValue<number>;
  currentAgentIdx: number;
}) {
  // The pill's own promotion index within the pill stack:
  // agentIdx 0 becomes pill 1 when agent 1 is active, pill 2 when agent 2 active, etc.
  // So its pill-slot = (currentAgentIdx - agentIdx). When == 1 → PILL_1 (bottom pill),
  // when == 2 → PILL_2, when == 3 → PILL_3.
  // The pill orb's cy is the center of the small orb; we want the row
  // centered on that y — so offset by half the row height.
  const PILL_ROW_HEIGHT = 20;
  const targetY = useTransform(promoteLevel, (p) => {
    const slot = Math.max(1, currentAgentIdx - agentIdx);
    const targets: Record<number, number> = {
      1: PILL_1,
      2: PILL_2,
      3: PILL_3,
    };
    return (targets[slot] ?? PILL_1) - PILL_ROW_HEIGHT / 2;
  });
  const opacity = useTransform(promoteLevel, [agentIdx, agentIdx + 0.4], [0, 1]);
  return (
    <motion.div
      className="absolute left-[135px] w-[265px]"
      style={{ top: targetY, height: PILL_ROW_HEIGHT, opacity }}
    >
      <div className="flex h-full items-center justify-between gap-2">
        <p className="text-[14px] font-medium leading-[18px] tracking-[-0.01em] text-neutral-400">
          {AGENTS[agentIdx].summary.text}
        </p>
        <CheckmarkBadge />
      </div>
    </motion.div>
  );
}

function CheckmarkBadge() {
  return (
    <span
      className="inline-flex h-[18px] w-[18px] items-center justify-center rounded-full"
      style={{ backgroundColor: "#10B981" }}
      aria-hidden="true"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M1.5 5.2 L4 7.5 L8.5 2.5"
          stroke="white"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ActiveCard({
  step,
}: {
  step: Extract<Step, { kind: "working" | "summary" }>;
}) {
  const agent = AGENTS[step.agentIdx];
  const isSummary = step.kind === "summary";
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
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="text-[16px] font-semibold leading-[20px] tracking-[-0.02em] text-[color:var(--ink)]"
      >
        {agent.title}
      </motion.p>

      <div className="relative mt-1 h-[60px] overflow-hidden">
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
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <div className="flex items-center justify-between gap-2">
              <GradientText
                as="p"
                shine
                variant={isSummary ? "green" : line!.variant ?? "default"}
                className="text-[15px] font-medium leading-[19px] tracking-[-0.02em]"
              >
                {isSummary ? agent.summary.text : line!.text}
              </GradientText>
              <StatusIndicator />
            </div>

            {/* Status/desc line — a single row for summary desc or the rolling status */}
            <div className="relative mt-1 h-[38px] overflow-hidden">
              <AnimatePresence initial={false}>
                {isSummary && agent.summary.desc && (
                  <motion.p
                    key={`desc-${step.agentIdx}`}
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.4, delay: 0.15 }}
                    className="absolute inset-0 text-[13px] font-medium leading-[17px] tracking-[-0.01em] text-neutral-400"
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
                    transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
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

export default function Screen4() {
  const arcProgress = useMotionValue(0);
  const settleProgress = useMotionValue(0);
  const promoteLevel = useMotionValue(0);

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
      const currentAgent =
        entry.step.kind === "next" ? -1 : entry.step.agentIdx;
      const nextAgent =
        nextEntry.step.kind === "next" ? -1 : nextEntry.step.agentIdx;
      if (nextAgent > currentAgent) {
        // Promote — animate promoteLevel up before switching step.
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
        setTimelineIdx(timelineIdx + 1);
      }
    };

    timerRef.current = window.setTimeout(advance, entry.hold);
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    };
  }, [timelineIdx, promoteLevel]);

  const currentEntry = timelineIdx >= 0 ? TIMELINE[timelineIdx] : null;
  const currentAgentIdx =
    currentEntry && currentEntry.step.kind !== "next"
      ? currentEntry.step.agentIdx
      : AGENTS.length - 1;

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
      {/* Top aura */}
      <motion.div
        className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
        style={{ y: -40 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: CARD_DELAY, duration: CARD_FADE_IN }}
      >
        <AuraGlow width={520} opacity={0.55} blur={65} />
      </motion.div>

      {/* Intro headline */}
      <div className="absolute left-1/2 top-[48%] w-full -translate-x-1/2 -translate-y-1/2 px-8 text-center">
        <motion.h2
          className="text-[22px] font-medium leading-[28px] tracking-[-0.04em] text-[color:var(--ink)]"
          initial={{ opacity: 0, filter: "blur(24px)", scale: 0.96 }}
          animate={{
            opacity: [0, 1, 1, 0],
            filter: ["blur(24px)", "blur(0px)", "blur(0px)", "blur(24px)"],
            scale: [0.96, 1, 1, 1.02],
          }}
          transition={{
            duration: TEXT_TOTAL,
            times: [
              0,
              TEXT_IN / TEXT_TOTAL,
              (TEXT_IN + TEXT_HOLD) / TEXT_TOTAL,
              1,
            ],
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          Meet your travel team.
          <br />
          On duty 24/7.
        </motion.h2>
      </div>

      {/* Completed-agent pills — one per completed agent, stacked at the top. */}
      {AGENTS.slice(0, -1).map((_, idx) => (
        <PillRow
          key={`pill-${idx}`}
          agentIdx={idx}
          promoteLevel={promoteLevel}
          currentAgentIdx={currentAgentIdx}
        />
      ))}

      {/* Active card */}
      <motion.div
        className="absolute left-[135px] top-[458px] w-[265px]"
        initial={{ opacity: 0, filter: "blur(20px)", x: -6 }}
        animate={{ opacity: 1, filter: "blur(0px)", x: 0 }}
        transition={{
          delay: CARD_DELAY,
          duration: CARD_FADE_IN,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        {currentEntry &&
          (currentEntry.step.kind === "working" ||
            currentEntry.step.kind === "summary") && (
            <ActiveCard step={currentEntry.step} />
          )}
      </motion.div>

      {/* Next CTA (bottom pill after Safety completes) */}
      <AnimatePresence>
        {currentEntry?.step.kind === "next" && (
          <motion.div
            key="next-cta"
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              className="relative h-[52px] w-[360px] overflow-hidden rounded-full text-[16px] font-semibold text-[color:var(--ink)]"
              style={{
                background:
                  "linear-gradient(90deg, rgba(80,87,234,0.35) 0%, rgba(217,70,239,0.28) 35%, rgba(239,68,68,0.32) 65%, rgba(237,215,88,0.35) 100%)",
                boxShadow: "0 12px 30px -12px rgba(0,0,0,0.15)",
              }}
            >
              Next
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Orbs */}
      {ORBS.map((orb, i) => (
        <ArcOrb
          key={i}
          spec={orb}
          arcProgress={arcProgress}
          settleProgress={settleProgress}
          promoteLevel={promoteLevel}
        />
      ))}
    </motion.div>
  );
}
