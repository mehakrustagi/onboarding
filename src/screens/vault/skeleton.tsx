"use client";

import { motion } from "framer-motion";

/* The vault's empty state is drawn as a loading state, and the whole
 * point of it is that it is NOT loading.
 *
 * Figma gives both versions (13463:7884, 13554:37134) three stacked
 * placeholder rows fading down the stack — the shape of a timeline with
 * nothing in it yet. Rendered static that reads as a screen that failed
 * to load. Rendered as a shimmer it reads as the thing it is: a preview
 * of what the vault will look like once there is something in it, which
 * is what the copy underneath is asking you to make happen.
 *
 * THE STACK LIGHTS ONE ROW AT A TIME — 1, then 2, then 3, then round
 * again. Every placeholder in a row (its box and both of its bars) shares
 * one schedule, and the rows are spaced a full pass apart rather than
 * staggered by a fraction of one. Staggered, the three rows overlap and
 * the stack reads as one surface rippling; spaced, you watch a list being
 * filled in from the top, which is what the screen is promising.
 *
 * THE SHIMMER RUNS ALONG EACH BAR, NOT ACROSS THE STACK.
 *
 * The first pass did the opposite — one highlight crossing all three rows
 * at once, on the theory that it would tie them into a single surface.
 * It read as a sheen passing over a photograph of a loading state rather
 * than as a loading state: a band of light travelling over type-sized
 * bars is a material effect, and skeletons are not made of anything.
 *
 * What people actually recognise is the opposite construction — each bar
 * lit along its own length, left to right, because that is the direction
 * text fills. So the highlight lives inside the bar and is clipped to its
 * own rounded ends, and the bars are staggered rather than synchronised
 * so the stack fills the way a list would.
 *
 * Rest opacity stays Figma's (1 / .6 / .42 in v1; .16 / .07 / .02 on the
 * dark cards) and belongs to the bar itself, so the highlight inside is
 * scaled by it — the designed depth down the stack survives the motion
 * instead of every row shimmering at the same brightness.
 */

/* One row's pass. Slow enough to read as ambient rather than as a
 * progress indicator — nothing here is pending, so nothing should look
 * like it is counting. */
const SHINE_S = 1.05;
/* Dead air between one row finishing and the next starting. Without it
 * the three runs abut and the chase turns back into a ripple. */
const ROW_GAP_S = 0.3;
/* How many rows are in the stack. Both versions draw three; this is here
 * so the cycle length is derived rather than typed twice. */
const ROWS = 3;
/* Time from a row lighting to the same row lighting again. */
const CYCLE_S = ROWS * (SHINE_S + ROW_GAP_S);

/* The schedule every placeholder in row `index` shares. `lag` lets the
 * box trail its own bars by a hair so the row reads as content lighting
 * up and the container following, rather than the two as one block. */
function shine(index: number, lag = 0) {
  return {
    duration: SHINE_S,
    delay: index * (SHINE_S + ROW_GAP_S) + lag,
    repeat: Infinity,
    repeatDelay: CYCLE_S - SHINE_S,
    ease: "easeInOut" as const,
  };
}

/* A specular streak, not a wipe: narrow, angled off vertical, and with
 * its own brightening of whatever it crosses. A full-width band at a flat
 * 90° reads as a shutter passing over the row; this reads as light
 * catching it. */
function streak(light: string) {
  return `linear-gradient(105deg, transparent 0%, ${light} 50%, transparent 100%)`;
}
const STREAK_W = 0.48;

/* THE BASE OPACITY IS BAKED INTO THE FILL, NOT SET ON THE BOX.
 *
 * This looked like a detail and was the whole problem. With `opacity` on
 * the container, everything inside is scaled by it — so on the dimmest
 * row, whose bar sits at 8%, even a pure white streak could only ever
 * reach 8% against the card. The chase was running correctly and was
 * invisible. Folding the rest value into the fill's own alpha leaves the
 * streak free to be as bright as it needs to be.
 *
 * The lift is also a FLOOR, not a multiple: 1.6× of 8% is 13%, which on
 * near-black is no change you can see. Adding a fixed amount means the
 * faintest row lights by as much as the brightest one, which is what
 * makes all three legible as a sequence. */
function rgba(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.min(1, a).toFixed(3)})`;
}
const BAR_LIFT = 0.22;
const PANEL_LIFT = 0.09;

/* ALPHA ALONE IS ENOUGH ON THE DARK CARD AND NOT ON THE LIGHT SHEET.
 *
 * On near-black, a light-grey bar going from 24% to 46% is a swing of
 * fifty levels and the row visibly lights. On the white sheet the bar is
 * #D9DBDD (217) sitting on a #F2F2F2 panel (242) — twenty-five levels of
 * range in total — so taking its alpha from .82 to 1 moves it four
 * levels, and the chase measured correctly while being invisible.
 *
 * `peakColor` lets a surface shift the fill's HUE for its pass instead of
 * only its opacity: on white the bar deepens rather than brightening,
 * which is the only direction with any room, and the white glint then has
 * something dark enough to read against. */
function peakOf(color: string, peakColor: string | undefined, base: number, lift: number) {
  return rgba(peakColor ?? color, base + lift);
}

/* One placeholder bar, lit along its own length.
 *
 * `base` is Figma's designed opacity for this bar at rest and is applied
 * to the bar, not the highlight — see the note above. */
export function Bar({
  x,
  y,
  w,
  h,
  r,
  color,
  base = 1,
  index = 0,
  /* Tuned for the light sheet, where the bar is #D9DBDD on #F2F2F2 and
     there is only ~20 levels between them: much past half white and the
     highlight stops reading as a sheen crossing the bar and starts reading
     as a gap chewed out of it. The dark cards override it upward — their
     bars sit at 2–16% opacity, so a subtle white inside one is multiplied
     down to nothing. */
  light = "rgba(255,255,255,0.55)",
  peakColor,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  color: string;
  base?: number;
  index?: number;
  light?: string;
  /** Fill to deepen toward during this row's pass — see peakOf. */
  peakColor?: string;
}) {
  return (
    /* The bar itself lifts as its streak crosses. The streak alone only
       moves light around inside a bar of fixed brightness, which at these
       opacities is nearly invisible on the dark cards — the row has to
       actually get brighter for the chase to be legible at all. */
    <motion.div
      className="absolute overflow-hidden"
      style={{ left: x, top: y, width: w, height: h, borderRadius: r }}
      initial={{ backgroundColor: rgba(color, base) }}
      animate={{
        backgroundColor: [
          rgba(color, base),
          peakOf(color, peakColor, base, BAR_LIFT),
          rgba(color, base),
        ],
      }}
      transition={shine(index)}
    >
      <motion.div
        className="absolute"
        style={{ top: 0, bottom: 0, width: w * STREAK_W, background: streak(light) }}
        initial={{ x: -w * STREAK_W }}
        animate={{ x: w }}
        transition={shine(index)}
      />
    </motion.div>
  );
}

/* The box a row of bars sits in.
 *
 * Figma draws this as a flat tinted rect and the bars inside it as the
 * only content. Left flat it reads as a container that happens to hold
 * two placeholders; given its own pass it reads as a card still loading,
 * which is what the stack is meant to depict.
 *
 * Its shimmer is deliberately WIDER, SLOWER and MUCH FAINTER than a
 * bar's, and offset behind it. The box is scenery — if it reads as loudly
 * as the bars, the eye starts tracking three boxes instead of six bars
 * and the stack stops looking like a list. Everything about this is tuned
 * to be noticed second. */
export function Panel({
  x,
  y,
  w,
  h,
  r,
  color,
  base = 1,
  index = 0,
  light = "rgba(255,255,255,0.16)",
  peakColor,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  color: string;
  base?: number;
  index?: number;
  light?: string;
  peakColor?: string;
}) {
  /* 0.09s behind its own bars — enough that the content leads and the box
     follows, not enough to read as two separate events. */
  const t = shine(index, 0.09);
  return (
    <motion.div
      className="absolute overflow-hidden"
      style={{ left: x, top: y, width: w, height: h, borderRadius: r }}
      initial={{ backgroundColor: rgba(color, base) }}
      animate={{
        backgroundColor: [
          rgba(color, base),
          peakOf(color, peakColor, base, PANEL_LIFT),
          rgba(color, base),
        ],
      }}
      transition={t}
    >
      <motion.div
        className="absolute"
        style={{ top: 0, bottom: 0, width: w * 0.7, background: streak(light) }}
        initial={{ x: -w * 0.7 }}
        animate={{ x: w }}
        transition={t}
      />
    </motion.div>
  );
}

/* The ruler down the left edge — a symmetric fan of ticks widest at its
 * centre, which is the scrubber for a timeline that has no entries yet.
 *
 * Figma draws it as nine hard-coded bars. Generated instead, because the
 * shape is a formula — widths step 18 → 11.52 → 9.36 → 7.2 → 5.76 out
 * from the middle, opacity 1 → .9 → .8 → .3 → .2 — and nine literals
 * would have to be re-typed by hand at the dark card's 0.77 scale.
 *
 * This one does NOT shimmer along its length: the ticks are 2–18px wide,
 * far too short for a travelling highlight to be anything but a flicker.
 * It brightens in a wave down the fan and back instead, which is the same
 * gesture at a scale the marks can carry. */
const TICKS = [
  { w: 5.76, o: 0.2 },
  { w: 7.2, o: 0.3 },
  { w: 9.36, o: 0.8 },
  { w: 11.52, o: 0.9 },
  { w: 18, o: 1 },
  { w: 11.52, o: 0.9 },
  { w: 9.36, o: 0.8 },
  { w: 7.2, o: 0.3 },
  { w: 5.76, o: 0.2 },
] as const;

export function Ruler({
  x,
  y,
  pitch = 11.47,
  height = 3,
  radius = 10,
  color = "#d9dbdd",
  scale = 1,
}: {
  x: number;
  y: number;
  /** Gap between tick centres. */
  pitch?: number;
  height?: number;
  radius?: number;
  color?: string;
  /** The dark cards in v2 run the same fan at 0.77. */
  scale?: number;
}) {
  return (
    <>
      {TICKS.map((t, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: x,
            top: y + i * pitch,
            width: t.w * scale,
            height,
            borderRadius: radius,
            background: color,
          }}
          initial={{ opacity: t.o }}
          animate={{ opacity: [t.o, Math.min(1, t.o * 1.9), t.o] }}
          transition={{
            duration: 1.9,
            /* Runs down the fan and back up, so the scan reverses at the
               ends instead of jumping back to the top. */
            delay: (i < 5 ? i : 8 - i) * 0.09,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </>
  );
}
