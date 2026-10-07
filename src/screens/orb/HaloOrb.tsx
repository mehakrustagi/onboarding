"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import OrbV2 from "@/components/OrbV2";

/* Variant 6 — halo.
 *
 * Four masked rings turning behind the orb at different speeds and in
 * different directions, with the orb breathing inside a small warm glow.
 * No text.
 *
 * The rings are the original's and are left alone. Everything that moves
 * other than their rotation belongs to the ORB: it breathes by under 3%,
 * and the glow around it swells on a slower cycle so the two are never in
 * step. A halo that pulses with the thing it surrounds stops being a halo
 * and becomes one object inflating.
 *
 * The ring stack is adapted from a loader component, with three changes
 * forced by this project:
 *
 *   motion       imports come from `framer-motion`, not `motion/react`.
 *   colour       the original's monochrome is kept, but off pure black and
 *                under a hair of blur — see INK and ringBlurFor. On #000
 *                the mask boundary has no antialiasing to hide behind and
 *                the rings read as pixelated.
 *                Its dark-mode twin is dropped: four more elements that are
 *                never drawn on a page that is always light.
 *   structure    the four rings are a table rather than four hand-written
 *                blocks. They differ only in six values, and written out
 *                longhand the fifth one would be written by copying the
 *                fourth and changing a number, which is how the two halves
 *                of the original drifted apart.
 *
 * ABOUT THOSE MASK PERCENTAGES: they are kept exactly as the original has
 * them, and they do NOT mean what they appear to. A `radial-gradient`
 * without a size keyword resolves to `farthest-corner`, so on a square box
 * 100% is the half-DIAGONAL, and a stop written at 35% actually lands at
 * 0.247 of the box width. The rings therefore sit between 0.49 and 0.91 of
 * the box across, which is why the box has to be about twice the orb
 * for the innermost ring to clear it. Change the box ratio and the rings
 * move relative to the orb; change a percentage and they move too. */

/* Default orb diameter. 20% under the 211 the other treatments use, so the
   whole component — rings, glow and orb together — comes in a fifth
   smaller. Everything in here is a multiple of this, so it is the only
   number that has to change. */
const ORB_DEFAULT = 169;

/* The box is this much bigger than the orb, and it is the one number that
   decides where the rings sit relative to it — see the note above on what
   the mask percentages actually resolve to. At 2.05 the innermost ring sits
   right on the orb's rim and the outermost reaches 1.86 of it, which is as
   tight as this stack goes before the inner ring starts cutting the orb. */
const FIELD_K = 2.05;

/* The rings are the ORIGINAL's, unchanged: monochrome, at its opacities,
 * masks, periods, directions and eases. The only thing dropped is the
 * dark-mode twin — four more elements that are never drawn on a page that
 * is always light.
 *
 * Nothing here pulses. The breathing belongs to the orb; rings that also
 * swell turn the whole thing into one object inflating, and the point of a
 * halo is that it is separate from what it is around. */
/* Not pure black.
 *
 * The original is monochrome on #000, which against a white page is the
 * hardest edge available — and the rings are 3px bands with a 2% feather,
 * so that edge lands on the stair-stepping of the mask and reads as
 * pixelated rather than as a line. A dark grey carries the same weight with
 * a fraction of the contrast at the boundary, which is where all of the
 * harshness was. */
const INK = "52, 52, 60";

type Ring = {
  /** The conic sweep: where it starts and what it fades through. */
  paint: string;
  /** Mask stops, verbatim from the original. */
  mask: [number, number, number, number];
  opacity: number;
  /** Seconds for one revolution. */
  dur: number;
  dir: 1 | -1;
  /** Linear turns steadily; the cubic breathes once per revolution. */
  linear: boolean;
};

const RINGS: Ring[] = [
  {
    paint: `conic-gradient(from 0deg, transparent 0deg, rgb(${INK}) 90deg, transparent 180deg)`,
    mask: [35, 37, 39, 41],
    opacity: 0.8,
    dur: 3,
    dir: 1,
    linear: true,
  },
  {
    paint: `conic-gradient(from 0deg, transparent 0deg, rgb(${INK}) 120deg, rgba(${INK}, 0.5) 240deg, transparent 360deg)`,
    mask: [42, 44, 48, 50],
    opacity: 0.9,
    dur: 2.5,
    dir: 1,
    linear: false,
  },
  {
    paint: `conic-gradient(from 180deg, transparent 0deg, rgba(${INK}, 0.6) 45deg, transparent 90deg)`,
    mask: [52, 54, 56, 58],
    opacity: 0.35,
    dur: 4,
    dir: -1,
    linear: false,
  },
  {
    paint: `conic-gradient(from 270deg, transparent 0deg, rgba(${INK}, 0.4) 20deg, transparent 40deg)`,
    mask: [61, 62, 63, 64],
    opacity: 0.5,
    dur: 3.5,
    dir: 1,
    linear: true,
  },
];

function ringMask([a, b, c, d]: Ring["mask"]) {
  return `radial-gradient(circle at 50% 50%, transparent ${a}%, black ${b}%, black ${c}%, transparent ${d}%)`;
}

/* A hair of blur on every ring, and it is doing more than softening.
 *
 * The rings are conic gradients cut by a radial mask, and both of those are
 * rasterised per pixel with no antialiasing across the mask boundary — so
 * the edge of a ring is a hard step between the painted pixel and nothing,
 * which is exactly what "pixelated" looks like. Under a pixel of blur the
 * step becomes a ramp and the ring reads as drawn rather than as sampled.
 *
 * Proportional, with a floor: a fixed blur would be invisible at 169 and
 * would smear the whole ring away at the chat's 26. */
function ringBlurFor(orbD: number) {
  return Math.max(0.35, orbD * 0.0055);
}

/** Seconds for the halo to arrive and to leave. */
const IN_S = 0.8;
const OUT_S = 1.3;

const THINK_S = 5;
const DONE_S = 3;

const BREATHE = [0.4, 0, 0.6, 1] as const;

export default function HaloOrb({
  orb = ORB_DEFAULT,
  controls = true,
}: {
  orb?: number;
  /** The bench wants the cycle button and the caption; the chat does not. */
  controls?: boolean;
}) {
  const reduced = useReducedMotion();
  const [thinking, setThinking] = useState(true);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const hold = (thinking ? THINK_S : DONE_S) * 1000;
    const t = window.setTimeout(() => setThinking((v) => !v), hold);
    return () => window.clearTimeout(t);
  }, [auto, thinking]);

  const field = orb * FIELD_K;
  const ringBlur = ringBlurFor(orb);
  const fade = {
    duration: thinking ? IN_S : OUT_S,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  const stack = (
    <div
      className="relative"
      style={{ width: field, height: field }}
      aria-hidden
    >
      {RINGS.map((r, i) => (
        /* The outer element turns forever; the inner one carries the fade.
           On one element every state change restarts the rotation's
           transition and the ring visibly jolts. */
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={{ rotate: 0 }}
          animate={reduced ? { rotate: i * 40 } : { rotate: r.dir * 360 }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  duration: r.dur,
                  ease: r.linear ? "linear" : BREATHE,
                  repeat: Infinity,
                }
          }
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: r.paint,
              WebkitMaskImage: ringMask(r.mask),
              maskImage: ringMask(r.mask),
              filter: `blur(${ringBlur}px)`,
            }}
            initial={{ opacity: r.opacity }}
            animate={{ opacity: thinking ? r.opacity : 0 }}
            transition={fade}
          />
        </motion.div>
      ))}

      {/* THE GLOW, and it is the only thing in here that breathes.
          Small — it reaches barely past the orb's own edge, where before it
          ran out to 1.55 of it and read as a second object. Faint, warm,
          and on a long slow cycle, so what you notice is the orb being lit
          from inside rather than a halo being switched on and off. */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: orb * 1.16,
          height: orb * 1.16,
          marginLeft: -(orb * 1.16) / 2,
          marginTop: -(orb * 1.16) / 2,
          background: `radial-gradient(circle, rgba(255, 236, 206, 0.55) 0%, rgba(246, 214, 164, 0.22) 46%, rgba(240, 206, 150, 0) 72%)`,
        }}
        initial={{ opacity: 1, scale: 1 }}
        animate={
          reduced
            ? { opacity: thinking ? 1 : 0, scale: 1 }
            : { opacity: thinking ? 1 : 0, scale: [1, 1.06, 1] }
        }
        transition={
          reduced
            ? { duration: 0 }
            : {
                opacity: fade,
                /* Slower than the orb's own breath, so it swells slightly
                   behind rather than with it. Moving in lockstep, the two
                   read as one object scaling. */
                scale: { duration: 3.6, ease: BREATHE, repeat: Infinity },
              }
        }
      />

      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ marginLeft: -orb / 2, marginTop: -orb / 2 }}
        initial={{ scale: 1 }}
        animate={reduced || !thinking ? { scale: 1 } : { scale: [1, 1.028, 1] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 2.8, ease: BREATHE, repeat: Infinity }
        }
      >
        <OrbV2 size={orb} />
      </motion.div>
    </div>
  );

  if (!controls) return stack;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => {
          setAuto(false);
          setThinking((v) => !v);
        }}
        aria-label={thinking ? "Finish thinking" : "Start thinking"}
        className="cursor-pointer"
      >
        {stack}
      </button>
      <p className="text-[12px] text-[#9a9aa2]">
        {auto ? "Cycling — click to drive it" : thinking ? "Thinking" : "Done"}
      </p>
    </div>
  );
}
