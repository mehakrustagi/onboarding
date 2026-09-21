"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";

/* A second take on the gradient pill — built from a screen recording of the
 * Natural app's Continue button, not from Figma. It is deliberately a
 * different animal from NativeAIButton:
 *
 *   NativeAIButton          this
 *   ─────────────────────   ─────────────────────────────────────────────
 *   grey ground             near-white ground
 *   cool → warm, L → R      warm → cool, L → R (reversed)
 *   flat, even density      rich along the bottom, washed white at the top
 *   hard 1px lit rim        no rim at all; the colour just fades out
 *   tap parts it L/R        tap grows a lens out of the touch point
 *
 * The tap is the real difference. A left/right parting is a liquid being
 * struck; this is a bead of glass swelling under the finger, magnifying
 * what it passes over — label included — and carrying on out past the
 * button's own edge. In the recording you can watch "Continue" lighten and
 * bend as the circle crosses it, which is why the lens here sits ABOVE the
 * label rather than under it.
 *
 * Measurements come from probing the recording's own frames (354×182, so a
 * 190×46 pill — roughly 211×51pt on a 393pt screen). I could not read
 * Apple's Liquid Glass page: it renders client-side and returns a title and
 * nothing else. So the material traits here — rim-weighted lensing,
 * highlights that answer the light, a lens that grows on touch, concentric
 * radii, shadow only to separate — are from the recording and from what the
 * material is generally known to do, NOT quoted from that document.
 */

/* ── Palette ─────────────────────────────────────────────────────────────── */

/* Sampled across the recording's richest band (y=84 of the pill's 46 rows),
 * left to right. The top of the pill runs far paler than this — that is the
 * white wash below, not a second palette. */
type Field = {
  rgb: [number, number, number];
  /** Centre along the pill, 0–1. */
  at: number;
  /** Width as a fraction of the pill. Generous and overlapping: the hues
   *  have to melt into each other, not sit in lanes. */
  w: number;
  drift: number;
  lift: number;
  swell: number;
  dur: number;
};

const FIELDS: Field[] = [
  { rgb: [247, 218, 200], at: 0.15, w: 0.4, drift: 30, lift: 8, swell: 1.2, dur: 5.1 }, // apricot
  { rgb: [244, 211, 178], at: 0.3, w: 0.38, drift: -26, lift: 11, swell: 1.24, dur: 6.2 }, // gold
  { rgb: [250, 195, 225], at: 0.49, w: 0.36, drift: 32, lift: 9, swell: 1.18, dur: 4.4 }, // pink
  { rgb: [250, 180, 244], at: 0.61, w: 0.34, drift: -30, lift: 12, swell: 1.26, dur: 7.3 }, // magenta
  { rgb: [222, 189, 249], at: 0.72, w: 0.36, drift: 28, lift: 10, swell: 1.21, dur: 5.7 }, // violet
  { rgb: [216, 212, 253], at: 0.85, w: 0.4, drift: -24, lift: 8, swell: 1.17, dur: 8.1 }, // periwinkle
];

/** Shared with NativeAIButton's reasoning, same value: amplitude dial kept
 *  separate from the tuning so it can be pulled without touching it. */
const BG_MOTION = 0.8;

const BLUR_PX = 15;

function fieldPaint([r, g, b]: [number, number, number]) {
  return `radial-gradient(closest-side, rgba(${r},${g},${b},1) 0%, rgba(${r},${g},${b},0.88) 44%, rgba(${r},${g},${b},0.38) 76%, rgba(${r},${g},${b},0) 100%)`;
}

/* ── Idle motion ─────────────────────────────────────────────────────────── */

/* Same grammar as the post-payment wash and NativeAIButton: each axis on
 * its own period, periods prime-ish across fields so the arrangement never
 * re-aligns, every keyframe returning to zero so the left-to-right hue
 * order always comes back. */
function idleDrift(field: Field, index: number, reduced: boolean) {
  if (reduced) return undefined;
  const drift = field.drift * BG_MOTION;
  const lift = field.lift * BG_MOTION;
  const swell = 1 + (field.swell - 1) * BG_MOTION;
  return {
    animate: {
      x: [0, drift, -drift * 0.75, drift * 0.4, 0],
      y: [0, -lift * 0.35, lift, -lift * 0.2, 0],
      scale: [1, swell, 1 / swell, swell * 0.94, 1],
    },
    transition: {
      x: { duration: field.dur, repeat: Infinity, ease: "easeInOut" as const },
      y: { duration: field.dur * 1.31, repeat: Infinity, ease: "easeInOut" as const },
      scale: {
        duration: field.dur * 0.83,
        repeat: Infinity,
        ease: "easeInOut" as const,
        delay: index * -0.6,
      },
    },
  };
}

/* ── The lens ────────────────────────────────────────────────────────────── */

/* Displacement for the bead. Much tighter and stronger than the pill-wide
 * lens on NativeAIButton, because this one is a small sphere rather than a
 * flat pane: a bead bends what is behind it hard and over a short distance. */
function LensFilter({ id, reduced }: { id: string; reduced: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  /* Paused imperatively after mount. Leaving the <animate> out of the tree
     when reduced motion is on renders a different tree on server and
     client, which is a hydration mismatch — and SMIL has no declarative
     off switch to use instead. */
  useEffect(() => {
    if (reduced) svg.current?.pauseAnimations();
    else svg.current?.unpauseAnimations();
  }, [reduced]);

  return (
    <svg ref={svg} aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <filter id={id} x="-25%" y="-25%" width="150%" height="150%" colorInterpolationFilters="sRGB">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.02 0.035"
          numOctaves={2}
          seed={4}
          result="noise"
        >
          <animate
            attributeName="baseFrequency"
            dur="11s"
            values="0.02 0.035;0.032 0.022;0.02 0.035"
            repeatCount="indefinite"
          />
        </feTurbulence>
        <feGaussianBlur in="noise" stdDeviation="4" result="field" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="field"
          scale={16}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

/** Out fast, back slow — a bead swelling under pressure and relaxing. */
const SWELL = { type: "spring" as const, stiffness: 320, damping: 22, mass: 0.8 };
const SETTLE = { type: "spring" as const, stiffness: 110, damping: 15, mass: 1.1 };
/** How long the bead stays out before it sinks back. */
const HOLD_MS = 260;

/* ── Component ───────────────────────────────────────────────────────────── */

export type LiquidGlassButtonProps = {
  label?: ReactNode;
  /** Pill height. The radius stays fully round at any height, and the lens
   *  is sized from this, so one number scales the whole thing. */
  height?: number;
  /** Default 232 — the recording's pill is 190×46, a ratio of ~4.1, and
   *  this keeps that at a 52px height. */
  minWidth?: number;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
};

export default function LiquidGlassButton({
  label = "Continue",
  height = 52,
  minWidth = 232,
  disabled = false,
  onClick,
  className,
  style,
}: LiquidGlassButtonProps) {
  const reduced = useReducedMotion() ?? false;
  /* Position and swell are SEPARATE state on purpose. Driving x/y off a
     single nullable tap teleports the bead to the button's top-left corner
     the instant the gesture clears, so instead of sinking where your finger
     was it streaks to the origin and shrinks there. The position has to
     outlive the gesture; only the swell is allowed to end. (It is state and
     not a ref because it is read during render — a ref would not guarantee
     the re-render that moves the bead.) */
  const [at, setAt] = useState({ x: 0, y: 0 });
  const [swelling, setSwelling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /* useId emits colons, which break url(#id) in Safari. */
  const lensId = `lgb-lens-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const rect = event.currentTarget.getBoundingClientRect();
      setAt({ x: event.clientX - rect.left, y: event.clientY - rect.top });
      setSwelling(true);
      haptic("gradientSplit");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setSwelling(false), HOLD_MS);
    },
    [disabled],
  );

  /* The bead ends up wider than the pill is tall — in the recording it
     clears the button's top and bottom edges before it fades. */
  const lens = height * 1.15;

  return (
    <div
      className={`relative inline-flex flex-col items-center ${className ?? ""}`}
      style={style}
    >
      <LensFilter id={lensId} reduced={reduced} />

      <motion.button
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onClick={onClick}
        className="relative flex items-center justify-center disabled:opacity-50"
        style={{
          height,
          minWidth,
          paddingInline: height * 0.46,
          borderRadius: 999,
          WebkitTapHighlightColor: "transparent",
          /* Shadow only to lift it off the page — no rim, no glow. The
             reference has no lit edge whatsoever; the colour simply stops.
             Adding one is what made the first pill read as a stroked
             outline rather than a soft bead of light. */
          boxShadow: "0 8px 22px -12px rgba(120,90,140,0.35), 0 1px 2px rgba(120,90,140,0.08)",
        }}
        animate={swelling ? { scale: 0.985 } : { scale: 1 }}
        transition={swelling ? SWELL : SETTLE}
      >
        {/* The colour. Clipped concentrically with the pill — same centre,
            same radius — so the two curves never disagree at the caps. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ borderRadius: 999 }}
        >
          {/* A note on what is NOT here: probing the recording's upper
              and lower bands separately suggested the hue bands are
              diagonal — pink arrives at t=0.2 across the top but not until
              t=0.5 along the bottom. I built that as a skewX on this stack,
              anchored to the bottom edge so the already-matched lower band
              would stay put, and swept it: 0deg scored 6.50 mean error per
              channel, -20deg 6.69, -35deg 6.83, -45deg 7.45. Every lean
              measured WORSE than none, so the reading is either an artefact
              of the label's antialiasing at 354px wide, or the pill is a
              mesh gradient that a skewed blob stack cannot imitate. Left
              flat deliberately. */}
          {FIELDS.map((field, index) => {
            const drift = idleDrift(field, index, reduced);
            return (
              <motion.span
                key={field.rgb.join()}
                className="absolute block"
                style={{
                  left: `${(field.at - field.w / 2) * 100}%`,
                  width: `${field.w * 100}%`,
                  /* Sat low and tall. The band has to be richest along the
                     bottom of the pill and the white wash above does the
                     rest, so the mass of every field sits under centre. */
                  top: "-25%",
                  height: "170%",
                  borderRadius: "50%",
                  background: fieldPaint(field.rgb),
                  filter: `blur(${BLUR_PX}px)`,
                }}
                animate={drift?.animate}
                transition={drift?.transition}
              />
            );
          })}

          {/* The vertical wash. In the recording the top of the pill runs
              ~40 levels paler than the bottom on every channel — light
              falling on the upper surface. Not a highlight band: a smooth
              ramp that is gone by the halfway line.

              Held far weaker than the first two attempts. At 0.6-0.72 it
              read as the right SHAPE and the wrong strength: probed against
              the recording, the whole pill came out 10-25 levels too pale
              on green, and the top half lost its colour entirely where the
              reference still clearly carries pink. */}
          <span
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.18) 26%, rgba(255,255,255,0.03) 56%, rgba(255,255,255,0) 76%)",
            }}
          />

          {/* Both caps fade out. The colour does not reach the ends — it
              stops short and lets the white through, which is what gives
              the pill its soft, edgeless shape. */}
          <span
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.2) 6%, rgba(255,255,255,0) 13%, rgba(255,255,255,0) 87%, rgba(255,255,255,0.24) 95%, rgba(255,255,255,0.9) 100%)",
            }}
          />
        </span>

        <span
          className="relative whitespace-nowrap text-center font-semibold text-[#1c1a1d]"
          style={{
            fontSize: 15,
            letterSpacing: "-0.15px",
            WebkitUserSelect: "none",
            userSelect: "none",
          }}
        >
          {label}
        </span>
      </motion.button>

      {/* The bead. Sibling of the button, so it is neither clipped by the
          pill nor painted under the label — it has to cross both. Its
          backdrop-filter is what makes it a lens: everything already
          painted behind it, colour and text alike, gets magnified,
          brightened and bent. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute"
        style={{
          left: 0,
          top: 0,
          width: lens,
          height: lens,
          marginLeft: -lens / 2,
          marginTop: -lens / 2,
          borderRadius: "50%",
          x: at.x,
          y: at.y,
          backdropFilter: `url(#${lensId}) brightness(1.09) saturate(1.2)`,
          WebkitBackdropFilter: "brightness(1.09) saturate(1.2)",
          /* The bead's own surface: a bright rim where it curves away, and
             almost nothing in the middle. A filled white circle would read
             as a paint blob; only the edge should catch light. */
          boxShadow:
            "inset 0 0 0 0.75px rgba(255,255,255,0.5), inset 0 2px 5px -3px rgba(255,255,255,0.45), 0 0 8px rgba(255,255,255,0.18)",
          /* Almost nothing. The first pass filled the bead with white and
             it read as a paint blob that erased the label; in the recording
             the label stays legible THROUGH the circle, just lifted and
             bent. The lens has to do the work, not the fill. */
          background:
            "radial-gradient(closest-side, rgba(255,255,255,0) 62%, rgba(255,255,255,0.12) 90%, rgba(255,255,255,0) 100%)",
        }}
        initial={false}
        animate={
          swelling
            ? { scale: 1, opacity: 1 }
            : { scale: 0.1, opacity: 0 }
        }
        transition={swelling ? SWELL : SETTLE}
      />
    </div>
  );
}
