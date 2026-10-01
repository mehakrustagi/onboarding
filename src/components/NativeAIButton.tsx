"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";

/* Button/Native AI — Figma KxbtgBnr5QKC708d7KlSmx, component 345:26539,
 * calibrated against node 1276:17325.
 *
 * The pill has NO fill of its own. What you see is five solid-colour
 * ellipses ("shimmer-hotspots"), blurred and clipped to the 60px radius,
 * with a 10% white overlay on top — so the page behind shows through and
 * tints the result. Painting a white base under it would wash the whole
 * thing out, which is why there isn't one here.
 *
 * Figma stacks the hotspot frame TWICE, identically. That doubling is what
 * gives the colours their density, so both layers are kept — and it also
 * hands us a free second layer to counter-drift for the liquid motion.
 *
 * Two things carry the glass and neither survives `get_design_context`:
 * the 1px white rim (measurable — see below) and the outward bloom (only
 * visible with the node zoomed on canvas, since the node render is cropped
 * to the pill's own bounds).
 */

/* ── Figma geometry ─────────────────────────────────────────────────────── */

/** Hotspot frame inside the pill: left 15.9%, flush right, 79.296px tall,
 *  vertically centred (so it overflows the 48px pill and gets clipped). */
const LAYER_LEFT_PCT = 15.9;
const LAYER_HEIGHT_PX = 79.296;
/* Figma reports this blur as 25, and the export hands over
   `blur-[25px]`. Taken literally the button comes out measurably washed
   out: Figma's blur and CSS's don't agree on what the number means, and
   because the pill clips 31px off a 79px-tall layer, the extra spread
   isn't redistributed — it is thrown away, so every sample inside the
   pill loses colour, worst at the top and bottom edges.

   21 is a fit, not a spec. Sweeping 12.5 → 25 against the node's own
   render (row and column probes, label and dev-badge pixels excluded)
   bottoms out here: mean error per channel 5.3/255 against 6.8 at 25.
   Curve is shallow either side, so don't chase it further. */
const BLUR_PX = 21;

/** Every ellipse is the same size — 20.5577 × 29.2964 in a 168.2 × 79.296
 *  frame — so only the offsets differ. */
const BLOB_W_PCT = 12.22;
const BLOB_H_PCT = 36.95;

type Blob = { color: string; left: number; top: number };

const BLOBS: Blob[] = [
  { color: "#5057EA", left: 0, top: 0 }, // Ellipse 6900 — blue
  { color: "#B038C2", left: 14.57, top: 63.05 }, // Ellipse 6901 — violet
  { color: "#C81E1E", left: 42.04, top: 31.53 }, // Ellipse 6902 — red
  { color: "#F59E0B", left: 56.62, top: 31.53 }, // Ellipse 6903 — amber
  { color: "#EDD758", left: 87.78, top: 31.53 }, // Ellipse 6904 — gold
];

/** Where a blob's centre sits as a fraction of the PILL's width — the
 *  hotspot frame only covers the right 84.1%, so its local percentages
 *  have to be mapped back onto the pill before we can compare them to a
 *  tap position. */
function blobCentreFraction(blob: Blob) {
  const local = (blob.left + BLOB_W_PCT / 2) / 100;
  return LAYER_LEFT_PCT / 100 + local * (1 - LAYER_LEFT_PCT / 100);
}

/** Medium 200 / Small 120 / Large 360 / Custom hug — from the component's
 *  Figma description. Padding is 20px either side in every case. */
const MIN_WIDTH: Record<NonNullable<NativeAIButtonProps["size"]>, number | undefined> = {
  small: 120,
  medium: 200,
  large: 360,
  custom: undefined,
};

/* ── Idle motion ────────────────────────────────────────────────────────── */

/* The same grammar as the post-payment wash (`BloomFields`), scaled down to
 * a 200px pill. Three things carry over from there, and they are the whole
 * difference between "liquid" and "five blobs bobbing":
 *
*   1. The sweeps are long enough that neighbours physically CROSS. That
 *      comment in BloomFields — "drifting 50px never let them overlap
 *      enough to make a new hue" — is the load-bearing one, and it wants
 *      more than it sounds like: blob centres here are ~24px apart and a
 *      24px drift still read as nearly static. See FIELDS below.
 *   2. Each axis runs on its OWN period — x at `dur`, y at `dur × 1.31`,
 *      scale at `dur × 0.83`. One duration for all three makes a blob
 *      trace the same closed loop forever, which the eye learns.
 *   3. Periods across blobs are prime-ish (4.8 / 5.6 / 6.3 / 7.1 / 8.3,
 *      extending the wash's own four), so the five never re-align into a
 *      fixed arrangement.
 *
 * Every keyframe returns to 0, so a full cycle always restores Figma's
 * left-to-right hue order — the colour wanders but the identity holds.
 *
 * Values are per-index constants rather than randomised: Math.random() here
 * would render differently on server and client and desync on hydration.
 *
 * What does NOT come across from the wash is its multiply blending and
 * pastel-lifted hues. Those exist because the wash lies on a near-white
 * screen; this pill is measured against Figma's own render, and re-tinting
 * the hotspots would break that match. */
/* Amplitudes are ~1.8x the neighbour spacing, not a fraction of it: at
   24px the hotspots only just grazed each other and the button read as
   almost-still. At these values they pass clean THROUGH one another, so
   violet arrives where red was and the warm band walks the length of the
   pill. Periods came down with it (3.4-6.5s, from 4.8-8.3) — amplitude
   alone reads as slow heaving; it is the two together that read as liquid.

   The two edge blobs lead inward. Their outward excursion is the smaller
   0.4 keyframe, so the caps drain and re-flood rather than emptying to
   bare grey and staying there. */
/* Background motion, held at 80% of the tuned amplitudes. Kept as one
   factor rather than folded into the numbers below so the 20% is legible
   and reversible — the FIELDS values stay the tuning, this stays the
   dial. It scales travel and swell only, never the periods: slowing the
   periods to calm it down makes the button read as sluggish, where a
   shorter throw at the same tempo just reads as a calmer liquid. */
const BG_MOTION = 0.55;

/* CALMED, ~45% OF THE FORMER TRAVEL ON ~35% LONGER PERIODS.
 *
 * The note below still holds and is the reason this is a reduction rather
 * than a removal: the hotspots must still CROSS, or the pill stops making
 * new colour and becomes five blobs bobbing. At these amplitudes they
 * still pass through one another, just slowly enough that the button sits
 * quietly in a screen rather than performing in one. Periods stay
 * prime-ish so the five never re-align. */
const FIELDS = [
  { drift: 24, lift: 8, swell: 1.15, dur: 4.6 }, // blue, leftmost — leads right
  { drift: -21, lift: 9, swell: 1.17, dur: 5.5 },
  { drift: 25, lift: 8, swell: 1.14, dur: 6.6 },
  { drift: -23, lift: 10, swell: 1.16, dur: 7.7 },
  { drift: -22, lift: 9, swell: 1.13, dur: 8.8 }, // gold, rightmost — leads left
] as const;

function idleDrift(index: number, layer: number, reduced: boolean) {
  if (reduced) return undefined;
  const f = FIELDS[index];
  /* The second stacked copy runs the same fields mirrored and slowed by a
     non-integer factor, so the two layers slide against each other instead
     of moving as one doubled blob. */
  const dir = layer === 0 ? 1 : -1;
  const dur = f.dur * (layer === 0 ? 1 : 1.17);
  const drift = f.drift * dir * BG_MOTION;
  const lift = f.lift * dir * BG_MOTION;
  const swell = 1 + (f.swell - 1) * BG_MOTION;
  return {
    animate: {
      x: [0, drift, -drift * 0.75, drift * 0.4, 0],
      y: [0, -lift * 0.35, lift, -lift * 0.2, 0],
      scale: [1, swell, 1 / swell, swell * 0.94, 1],
    },
    transition: {
      x: { duration: dur, repeat: Infinity, ease: "easeInOut" as const },
      y: { duration: dur * 1.31, repeat: Infinity, ease: "easeInOut" as const },
      scale: { duration: dur * 0.83, repeat: Infinity, ease: "easeInOut" as const },
    },
  };
}

/* ── The split ──────────────────────────────────────────────────────────── */

type Burst = { fraction: number; id: number } | null;

/** How far a blob is thrown, and how much it squashes, when the tap lands.
 *  Blobs near the tap take the full force and pinch hard; distant ones
 *  drift a little and keep their shape — the same way a hand entering
 *  water moves what it touches far more than what it doesn't. */
function splitTransform(blob: Blob, burst: NonNullable<Burst>, width: number) {
  const delta = blobCentreFraction(blob) - burst.fraction;
  const side = delta === 0 ? 1 : Math.sign(delta);
  const proximity = Math.max(0, 1 - Math.abs(delta) / 0.85);
  const force = 0.35 + 0.65 * proximity;
  /* HALF THE FORMER THROW. These were tuned on their own showcase route,
     where the button IS the subject and a hard split is the point. Used as
     an ordinary CTA at the bottom of a screen whose subject is elsewhere,
     that much displacement reads as the button malfunctioning rather than
     responding — the colour flew most of the pill's width and pinched to
     well under half its height on every tap. Everything here is roughly
     halved; the SHAPE of the effect is unchanged, only its size. */
  return {
    x: side * width * 0.17 * force,
    y: -3 * proximity * side,
    scaleX: 1 - 0.22 * proximity,
    scaleY: 1 + 0.26 * proximity,
    /* The colour brightens on its way out, and by the same `force` that
       throws it — so the hotspots nearest the tap travel furthest AND
       light up hardest, and the far ones barely change. Saturate does the
       work here rather than brightness: these are solid fills, so pushing
       luminance alone walks them toward white and the palette goes pale
       exactly when it should be at its most intense. Brightness comes
       along at a fraction of it, for the bloom. */
    filter: `saturate(${(1 + 0.42 * force).toFixed(3)}) brightness(${(
      1 + 0.08 * force
    ).toFixed(3)})`,
  };
}

/** Out: fast and sharp — the surface is struck, not eased.
 *  Back: slack and underdamped, so the two halves slap together and
 *  wobble before they settle. The asymmetry is the whole effect. */
const PART_SPRING = { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.7 };
/* Damping 12 → 20. The slack return was the loudest part of the tap: the
   two halves slapped together and rang for most of a second. It still
   returns softer than it leaves — the asymmetry is the effect — but it
   settles now instead of wobbling. */
const REJOIN_SPRING = { type: "spring" as const, stiffness: 95, damping: 20, mass: 1.2 };

/** How long the halves stay apart before the water closes back over. */
const HOLD_MS = 150;

/* ── Hotspots ───────────────────────────────────────────────────────────── */

type HotspotsProps = {
  /** 0 or 1 — Figma's two identical stacked copies. Also selects the
   *  drift direction, so the two slide against each other. */
  layer: number;
  burst: Burst;
  parting: boolean;
  width: number;
  reduced: boolean;
  /** Layer blur. The pill uses BLUR_PX; the caustic under it uses more,
   *  because light that has been through the glass arrives softer. */
  blur?: number;
};

/* One frame of five drifting colour ellipses. Extracted so the drop
 * ellipse's caustic is literally the same thing as the pill's colour
 * rather than a second tuning of it — the caustic has to agree with the
 * gradient frame by frame or it reads as an unrelated smudge underneath. */
function Hotspots({ layer, burst, parting, width, reduced, blur = BLUR_PX }: HotspotsProps) {
  return (
    <span
      className="absolute"
      style={{
        left: `${LAYER_LEFT_PCT}%`,
        right: 0,
        top: "50%",
        height: LAYER_HEIGHT_PX,
        transform: "translateY(-50%)",
        filter: `blur(${blur}px)`,
      }}
    >
      {BLOBS.map((blob, index) => {
        const drift = idleDrift(index, layer, reduced);
        return (
          /* Two nested transforms on purpose: the outer one owns the
             endless drift, the inner one owns the split. One element
             can't run both without the loop stomping on the spring
             every time it restarts. */
          <motion.span
            key={blob.color}
            className="absolute block"
            style={{
              left: `${blob.left}%`,
              top: `${blob.top}%`,
              width: `${BLOB_W_PCT}%`,
              height: `${BLOB_H_PCT}%`,
            }}
            animate={drift?.animate}
            transition={drift?.transition}
          >
            <motion.span
              className="block h-full w-full"
              style={{ borderRadius: "50%", background: blob.color }}
              animate={
                burst
                  ? splitTransform(blob, burst, width)
                  : {
                      x: 0,
                      y: 0,
                      scaleX: 1,
                      scaleY: 1,
                      // Same filter SHAPE as the split value — framer
                      // interpolates filter strings function-by-function
                      // and cannot cross from "none" to a two-function
                      // filter.
                      filter: "saturate(1) brightness(1)",
                    }
              }
              transition={parting ? PART_SPRING : REJOIN_SPRING}
            />
          </motion.span>
        );
      })}
    </span>
  );
}

/* ── Refraction ─────────────────────────────────────────────────────────── */

/* The actual lens. Everything before this was a blur or a white overlay,
 * and a blur is not refraction — it averages the colour where glass BENDS
 * it, which is why the pane kept reading as frosted rather than solid.
 *
 * `feDisplacementMap` is the only thing in the platform that genuinely
 * moves pixels, so the colour gets pushed around by a turbulence field
 * instead of smeared. The field is blurred hard before it is used: raw
 * fractal noise displaces at the pixel scale and reads as grain, where the
 * same noise softened to a few broad lobes reads as thick, uneven glass.
 *
 * Two displacements at different scales feed the red and the blue channel,
 * and that is Dispersion done properly — the edges of the colour actually
 * split, instead of the conic ring I painted earlier to imitate it.
 *
 * The turbulence animates, so the lens itself is never still. That is the
 * "liquid" half: the colour drifts underneath (BG_MOTION) while the glass
 * it is seen through slowly kneads on its own, much longer, period. Two
 * unrelated motions on top of each other is what stops it looking like a
 * texture being scrolled.
 */
function LiquidLens({ id, reduced }: { id: string; reduced: boolean }) {
  const svg = useRef<SVGSVGElement>(null);
  /* Reduced motion is honoured by PAUSING the SMIL clock after mount, not
     by leaving the <animate> out of the tree. Rendering a different tree
     when useReducedMotion() is true is a hydration mismatch for everyone
     who has the OS setting on — and the setting is off on the machine you
     are developing on, so it never shows up until a user reports it. An
     imperative pauseAnimations() runs after hydration and so is invisible
     to it; SMIL has no declarative off switch to use instead. */
  useEffect(() => {
    if (reduced) svg.current?.pauseAnimations();
    else svg.current?.unpauseAnimations();
  }, [reduced]);

  return (
    <svg
      ref={svg}
      aria-hidden
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none" }}
    >
      <filter
        id={id}
        x="-15%"
        y="-15%"
        width="130%"
        height="130%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.011 0.026"
          numOctaves={2}
          seed={9}
          result="noise"
        >
          <animate
            attributeName="baseFrequency"
            dur="19s"
            values="0.011 0.026;0.019 0.015;0.013 0.03;0.011 0.026"
            repeatCount="indefinite"
          />
        </feTurbulence>
        {/* Broad lobes, not grain. */}
        <feGaussianBlur in="noise" stdDeviation="5" result="field" />

        {/* One displacement, not the two-scale channel split I tried
            first. Splitting red from blue and recombining with feBlend
            screens the ALPHA as well as the colour — 2a - a^2 instead of a
            — so the transparent parts of the field turned opaque and the
            whole gradient went muddy olive. Real dispersion needs the
            channels recombined additively with alpha taken from one pass
            only, and it is not worth that machinery here: the edge fringe
            is already carried by the conic ring, and this is the layer
            that had to stop looking like a blur. */}
        <feDisplacementMap
          in="SourceGraphic"
          in2="field"
          scale={9}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

export type NativeAIButtonProps = {
  label?: string;
  /** Figma: Small 120 · Medium 200 · Large 360 · Custom hug. */
  size?: "small" | "medium" | "large" | "custom";
  /** The soft grey ellipse under the pill. Figma default: on. */
  dropShadowEllipse?: boolean;
  /** Underlined opt-out line beneath the button. Figma default: off. */
  bottomText?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
  /** Fixed pill width. `size` only sets a MINIMUM, so a button that must
   *  span a known box — a full-width CTA — needs this. */
  width?: number;
  /** The ground the colour sits on.
   *
   *  "glass" is the Figma component: no fill at all, so the page shows
   *  through and tints the result. It is the right surface on a light
   *  background and unreadable on a dark one — the label is black, and
   *  black on a dark scrim through 10% white is not a contrast anyone
   *  should ship.
   *
   *  "solid" puts white underneath, which is what the loyalty node
   *  (1503:1117) specifies and why that screen's CTA reads pastel rather
   *  than saturated. Same component, same motion, same colour field. */
  surface?: "glass" | "solid";
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
};

export default function NativeAIButton({
  label = "text",
  size = "medium",
  dropShadowEllipse = true,
  bottomText,
  leftIcon,
  rightIcon,
  disabled = false,
  width: fixedWidth,
  surface = "glass",
  onClick,
  className,
  style,
}: NativeAIButtonProps) {
  const reduced = useReducedMotion() ?? false;
  const [burst, setBurst] = useState<Burst>(null);
  const [width, setWidth] = useState(MIN_WIDTH[size] ?? 200);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstId = useRef(0);
  /* useId emits colons, which break a url(#id) reference in Safari. */
  const lensId = `nai-lens-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  /* The tap point drives the whole animation, so it is measured off the
     real element rather than assumed to be the centre — tapping the left
     end has to part the water at the left end. */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (disabled) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const fraction = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      setWidth(rect.width);
      burstId.current += 1;
      setBurst({ fraction, id: burstId.current });
      haptic("gradientSplit");
      if (releaseTimer.current) clearTimeout(releaseTimer.current);
      releaseTimer.current = setTimeout(() => setBurst(null), HOLD_MS);
    },
    [disabled],
  );

  const minWidth = MIN_WIDTH[size];
  const parting = burst !== null;

  return (
    <div
      className={`flex flex-col items-center gap-[12px] ${className ?? ""}`}
      style={style}
    >
      <LiquidLens id={lensId} reduced={reduced} />

      <div className="relative flex items-center justify-center">
        {/* glow-drop-ellipse (345:26753) — #ECECEC, 7px Gaussian, inset 11%
            either side, sitting 12.76px below the pill.

            Figma leaves it flat grey. Flat grey is what a solid object
            casts, and this is glass: light goes THROUGH it and lands on the
            surface below carrying the colour with it. So the drop gets the
            pill's own hotspots — the same component, same drift, same
            split, just blurred harder and held low — clipped to the
            ellipse. That makes it a caustic rather than a shadow, and it is
            what stops the glass from looking like it is printed on the
            page.

            It has to be the same `Hotspots` as the pill, not a second
            tuning of it: a caustic that disagrees with the gradient above
            it by even a little reads as an unrelated smudge. */}
        {dropShadowEllipse && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute left-[11%] right-[11%] overflow-hidden"
            style={{
              bottom: -12.76,
              height: 20.76,
              borderRadius: "50%",
              background: "#ECECEC",
              filter: "blur(7px)",
            }}
            animate={parting ? { scaleX: 1.12, opacity: 0.6 } : { scaleX: 1, opacity: 1 }}
            transition={parting ? PART_SPRING : REJOIN_SPRING}
          >
            {/* Stretched taller than the ellipse and pulled up, so what
                lands here is the BOTTOM of the gradient — light leaving the
                underside of the pill, not a copy of its middle. */}
            <span
              className="absolute inset-x-0"
              /* multiply, not normal. The drop's base is #ECECEC — lighter
                 than every hotspot — so averaging colour into it just
                 greys the colour out, which is why the first pass was
                 invisible. Multiplying lets the hues actually tint the
                 grey, the same reason the post-payment wash multiplies its
                 fields onto a near-white screen. */
              style={{
                top: "-140%",
                height: "260%",
                opacity: 0.72,
                mixBlendMode: "multiply",
              }}
            >
              <Hotspots
                layer={0}
                burst={burst}
                parting={parting}
                width={width}
                reduced={reduced}
                blur={22}
              />
            </span>
          </motion.div>
        )}

        <motion.button
          type="button"
          disabled={disabled}
          onPointerDown={handlePointerDown}
          onClick={onClick}
          className="relative flex h-[48px] items-center justify-center gap-[5px] overflow-hidden rounded-[60px] px-[20px] disabled:opacity-50"
          style={{
            minWidth,
            width: fixedWidth,
            /* The white ground, when asked for. Behind everything — the
               hotspots, the glass and the label all sit on top of it. */
            background: surface === "solid" ? "#FFFFFF" : undefined,
            WebkitTapHighlightColor: "transparent",
            /* The glass bloom. Can't be measured off the node render —
               Figma crops that to the pill's own 200×48 bounds, so every
               pixel of an outward glow is outside the frame. It IS plainly
               there when the node is zoomed on canvas: the white edge
               bleeds onto the grey all the way round, a little stronger
               above. Offset up and left to agree with the -45 degree
               light, and kept TIGHT — a wide soft halo diffuses the lit
               edge into the ground and the rim stops reading as an edge at
               all, which is what the first attempt did. Plus a cast shadow
               down-right: glass with depth occludes as well as glows, and
               the two together are what put the button in FRONT of the
               page rather than on it. */
            boxShadow: [
              "0 0 2px rgba(255,255,255,0.18)",
              "-1px -1px 6px rgba(255,255,255,0.16)",
              "0 0 12px rgba(255,255,255,0.05)",
              "3px 5px 14px -4px rgba(0,0,0,0.13)",
            ].join(", "),
          }}
          animate={parting ? { scale: 0.975 } : { scale: 1 }}
          transition={parting ? PART_SPRING : REJOIN_SPRING}
        >
          {/* The pane itself. Sits UNDER the hotspots on purpose: a
              backdrop-filter only affects what is painted behind its own
              element. Above the blobs it would work on the colour instead
              of the page and smear the design.

              Frost is 0 in the design, so there is deliberately NO blur
              here — frosted glass is a different material and the earlier
              blur(8px) was simply wrong. What Refraction 100 does instead
              is bend and concentrate the backdrop, which reads as a gain
              in saturation and contrast for whatever is BEHIND the button.
              The bending of the colour INSIDE it is a real displacement
              now — see LiquidLens. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[60px]"
            style={{
              backdropFilter: "saturate(1.25) contrast(1.04)",
              WebkitBackdropFilter: "saturate(1.25) contrast(1.04)",
            }}
          />

          {/* background (345:26754) — the two stacked hotspot frames.
              isolation:isolate so the travelling light's plus-lighter
              blends against the colour in here and not the page behind
              the button, which would blow out the grey ground. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[60px]"
            style={{ isolation: "isolate" }}
          >
            {/* Everything inside here is seen THROUGH the lens. The filter
                goes on this wrapper rather than on the clip above it so the
                displacement happens before the 60px radius crops — put it
                on the clipping element and the lens pulls in transparency
                from outside the pill and eats the edge. */}
            <span
              className="absolute inset-0"
              style={{
                filter: `url(#${lensId})`,
                /* No density change for the solid surface. An earlier pass
                   scaled the hotspots down here, having measured the solid
                   pill at mean luminance 132 against the reference's 219 —
                   but that reading was of the button DISABLED at ₹0, where
                   `disabled:opacity-50` halves the whole pill over a dark
                   scrim. Enabled, it measures 228 against 219 with the
                   hotspots untouched. Measure the state you are actually
                   comparing. */
              }}
            >
            {[0, 1].map((layer) => (
              <Hotspots
                key={layer}
                layer={layer}
                burst={burst}
                parting={parting}
                width={width}
                reduced={reduced}
              />
            ))}

            {/* Light travelling through the colour — the wash's own
                highlight, scaled to the pill. On plus-lighter it ADDS light
                where it passes, so colour it crosses brightens and blooms
                instead of being painted over; wide and heavily blurred so
                you register the brightening, not the thing causing it. Its
                6.2s period is off every field's, so it never keeps catching
                the same hotspot. Opacity peaks mid-run and is already
                dimming before either edge — light welling up and receding
                rather than a highlight entering and leaving frame. */}
            {/* Always in the tree, even under reduced motion — gating an
                element in or out on useReducedMotion() renders one thing on
                the server and another on the client, which is a hydration
                mismatch for every user who has the OS setting on. Reduced
                motion holds it at zero instead. */}
            <motion.span
                className="absolute block"
                style={{
                  left: -120,
                  top: "-60%",
                  width: 250,
                  height: "220%",
                  borderRadius: "50%",
                  background:
                    "radial-gradient(closest-side, rgba(255,246,232,0.62) 0%, rgba(255,242,224,0.4) 30%, rgba(255,238,214,0.2) 62%, rgba(255,255,255,0) 100%)",
                  filter: "blur(40px)",
                  mixBlendMode: "plus-lighter",
                }}
                animate={
                  reduced
                    ? { opacity: 0 }
                    : {
                        x: [0, 340 * BG_MOTION],
                        opacity: [0, 0.45, 0.8, 0.5, 0],
                        scaleY: [0.92, 1.24, 1, 1.14, 0.92],
                        scaleX: [1, 1.22, 1],
                      }
                }
                transition={
                  reduced
                    ? { duration: 0 }
                    : {
                        x: { duration: 6.2, repeat: Infinity, ease: "easeInOut" },
                        opacity: {
                          duration: 6.2,
                          repeat: Infinity,
                          ease: "easeInOut",
                          times: [0, 0.22, 0.5, 0.78, 1],
                        },
                        scaleY: { duration: 4.3, repeat: Infinity, ease: "easeInOut" },
                        scaleX: { duration: 5.1, repeat: Infinity, ease: "easeInOut" },
                      }
                }
              />

            {/* The cleft. Not in Figma — this is the parting itself: the
                colour is pushed aside and the bare surface shows through
                along the line the finger came down on. */}
            <motion.span
              className="absolute block"
              style={{
                left: `${(burst?.fraction ?? 0.5) * 100}%`,
                top: "-50%",
                height: "200%",
                width: "10%",
                x: "-50%",
                borderRadius: "50%",
                /* Dimmer and narrower than it was (0.85 → 0.5, 15% → 10%).
                   The cleft is the brightest thing on the button and it
                   appeared on every tap; at full strength it flashed
                   white through the colour rather than parting it. */
                background:
                  "radial-gradient(closest-side, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.22) 55%, rgba(255,255,255,0) 100%)",
                filter: "blur(8px)",
              }}
              initial={false}
              animate={parting ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0.25 }}
              transition={parting ? PART_SPRING : { ...REJOIN_SPRING, damping: 18 }}
            />
            </span>
          </span>

          {/* type-overlay (345:26769) — Glass: flat 10% white over the lot. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[60px] bg-white/10"
          />

          {/* ── The glass ──────────────────────────────────────────────
              Figma's Glass effect on this pill, read straight off its own
              panel: Light -45 degrees at 80%, Refraction 100, Depth 100,
              Dispersion 100, Frost 0, Splay 0. None of it survives
              get_design_context — the flat 10% white above is everything
              the export gives you, which is why the exported button reads
              as a gradient patch instead of a pane you could pick up.

              Four layers, painted back to front so the lit edge and the
              thickness land last. All of it is fixed: the pane does not move when the
              liquid inside it does. */}

          {/* 1. Specular sheen on the front face. The light is at -45, so
                 the reflection lands across the upper left and is gone
                 before the middle. This is the layer that makes the face
                 read as a surface you are looking AT rather than through. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[60px]"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.1) 20%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 62%)",
            }}
          />

          {/* 2. Dispersion — the edge splitting light into colour. A
                 hairline of the brand hues, started at -45 so the fringe
                 sits where the light enters, drawn as a transparent border
                 filled by a conic gradient and masked to the border box
                 (the only way to get a gradient that follows a 60px
                 radius), then blurred so it bleeds instead of drawing.

                 Held FAR below the panel's 100 and painted under the lit
                 edge rather than over it. At full strength it stopped
                 reading as glass entirely and became a pink-and-yellow
                 outline around the button — chromatic fringing you can
                 actually identify by hue is a rendering fault, not a
                 material. It should only be findable if you go looking. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[60px]"
            style={{
              padding: 1,
              background:
                "conic-gradient(from -45deg, rgba(80,87,234,0.55), rgba(176,56,194,0.45), rgba(200,30,30,0.35), rgba(245,158,11,0.45), rgba(237,215,88,0.55), rgba(80,87,234,0.55))",
              mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              filter: "blur(0.6px)",
              opacity: 0.22,
            }}
          />

          {/* 3. The lit edge. A -45 degree light does NOT ring the pill
                 evenly: it blazes along the top-left run and again along
                 the bottom-right where it exits, and it fades to almost
                 nothing at the two arcs in between. That is the single
                 thing that separates glass from a stroked outline, and my
                 own 1x probe of the coloured node talked me out of it —
                 sampled at one pixel per CSS pixel the rim read 250-255 on
                 all four sides, so I built it uniform. The clear-glass
                 reference shows the truth at a size you can actually see.

                 Conic angles run clockwise from 12 o'clock, and because the
                 pill is wide and short its top edge spans roughly 285-75
                 while the bottom spans 105-255. So 315 and 135 put the two
                 bright runs on the left half of the top edge and the right
                 half of the bottom edge, with the dead arcs at 45 and 225 —
                 which is exactly what the reference does.

                 Drawn as a transparent border filled by the gradient and
                 masked to the border box; that mask-composite pair is the
                 only way to get a gradient stroke that follows a 60px
                 radius.

                 The brightness was never the real problem. Holding 0.46-0.6
                 across 0-30 AND 135-200 degrees meant most of the perimeter
                 carried a visible white line, and a continuous line of even
                 brightness IS a border — dimming it just made a dimmer
                 border. A reflection is the opposite shape: two SHORT
                 glints where the surface turns into the light, with dark
                 glass either side.

                 So the base is 0.04-0.1 — near enough to nothing — and the
                 two glints are ~24 degrees wide, at 318 and 140. The pill
                 is wide and short, so its top edge spans roughly 285-75 and
                 its bottom 105-255; that puts one glint a third of the way
                 along the top and the other two thirds along the bottom,
                 and leaves the rest of the outline absent rather than
                 faint. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[60px]"
            style={{
              padding: 1,
              background:
                "conic-gradient(from 0deg, rgba(255,255,255,0.1) 0deg, rgba(255,255,255,0.05) 46deg, rgba(255,255,255,0.04) 96deg, rgba(255,255,255,0.08) 120deg, rgba(255,255,255,0.4) 140deg, rgba(255,255,255,0.09) 164deg, rgba(255,255,255,0.05) 210deg, rgba(255,255,255,0.04) 246deg, rgba(255,255,255,0.09) 296deg, rgba(255,255,255,0.56) 318deg, rgba(255,255,255,0.1) 342deg, rgba(255,255,255,0.1) 360deg)",
              mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
              WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              /* Blurred on purpose. A 1px hard ring is a stroke however dim
                 you make it; a reflection has no crisp outer boundary. */
              filter: "blur(0.7px)",
            }}
          />

          {/* 4. Depth 100 — the slab's thickness behind that edge. The two
                 lips agree with the light: hard and bright where it enters
                 top-left, softer and wider where it leaves bottom-right.
                 The faint all-round inset is the body of the glass carrying
                 light, without which the lips read as a drawn outline
                 rather than a thickness. The dark one is the colour sitting
                 UNDER the front face — that is what gives the stack its
                 order and the button its depth. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[60px]"
            style={{
              boxShadow: [
                "inset 1px 1px 2px -1px rgba(255,255,255,0.26)",
                "inset -1px -1px 2.5px -1px rgba(255,255,255,0.14)",
                "inset 0 0 14px 2px rgba(255,255,255,0.05)",
                "inset 0 -8px 14px -8px rgba(0,0,0,0.13)",
                "inset 2px 3px 8px -6px rgba(0,0,0,0.10)",
              ].join(", "),
            }}
          />

          {leftIcon && <span className="relative size-[20px] shrink-0">{leftIcon}</span>}
          {/* label (345:26772) — Inter Semi Bold 14/19, tracking -0.14px. */}
          <span
            className="relative shrink-0 whitespace-nowrap text-center text-[14px] font-semibold leading-[19px] tracking-[-0.14px] text-black"
            style={{ WebkitUserSelect: "none", userSelect: "none" }}
          >
            {label}
          </span>
          {rightIcon && <span className="relative size-[20px] shrink-0">{rightIcon}</span>}
        </motion.button>
      </div>

      {/* bottom-text (345:26774) */}
      {bottomText && (
        <span className="whitespace-nowrap text-center text-[14px] font-semibold leading-[19px] tracking-[-0.14px] text-black underline [text-underline-position:from-font]">
          {bottomText}
        </span>
      )}
    </div>
  );
}
