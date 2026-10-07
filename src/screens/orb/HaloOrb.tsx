"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import OrbV2 from "@/components/OrbV2";

/* Variant 6 — halo.
 *
 * Four masked rings turning behind the orb at different speeds and in
 * different directions, in gold and silver, with the orb breathing and
 * glowing at the centre of them. No text.
 *
 * The ring stack is adapted from a loader component, with three changes
 * forced by this project:
 *
 *   motion       imports come from `framer-motion`, not `motion/react`.
 *   colour       the original is monochrome with a dark-mode twin — eight
 *                elements, four of them hidden. The page here is light and
 *                stays light, so there is one set, in gold and silver.
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
 * the box across, which is why the box has to be about 2.1 times the orb
 * for the innermost ring to clear it. Change the box ratio and the rings
 * move relative to the orb; change a percentage and they move too. */

/** Default orb diameter. */
const ORB_DEFAULT = 211;

/* The box is this much bigger than the orb. See the note above — it is the
   one number that decides whether the rings clear the orb or cut it. */
const FIELD_K = 2.1;

const GOLD = "232, 192, 122";
const GOLD_BRIGHT = "244, 212, 135";
const SILVER = "176, 184, 200";
const SILVER_BRIGHT = "236, 240, 248";

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
    paint: `conic-gradient(from 0deg, transparent 0deg, rgb(${SILVER_BRIGHT}) 70deg, rgb(${SILVER}) 110deg, transparent 180deg)`,
    mask: [35, 37, 39, 41],
    opacity: 0.95,
    dur: 3,
    dir: 1,
    linear: true,
  },
  {
    paint: `conic-gradient(from 0deg, transparent 0deg, rgb(${GOLD_BRIGHT}) 110deg, rgba(${GOLD}, 0.6) 240deg, transparent 360deg)`,
    mask: [42, 44, 48, 50],
    opacity: 0.95,
    dur: 2.5,
    dir: 1,
    linear: false,
  },
  {
    paint: `conic-gradient(from 180deg, transparent 0deg, rgba(${SILVER}, 0.85) 45deg, transparent 90deg)`,
    mask: [52, 54, 56, 58],
    opacity: 0.6,
    dur: 4,
    dir: -1,
    linear: false,
  },
  {
    paint: `conic-gradient(from 270deg, transparent 0deg, rgba(${GOLD}, 0.7) 20deg, transparent 40deg)`,
    mask: [61, 62, 63, 64],
    opacity: 0.7,
    dur: 3.5,
    dir: 1,
    linear: true,
  },
];

function ringMask([a, b, c, d]: Ring["mask"]) {
  return `radial-gradient(circle at 50% 50%, transparent ${a}%, black ${b}%, black ${c}%, transparent ${d}%)`;
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
            }}
            initial={{ opacity: r.opacity }}
            animate={{ opacity: thinking ? r.opacity : 0 }}
            transition={fade}
          />
        </motion.div>
      ))}

      {/* The glow the orb sits in. Gold at the centre falling to nothing
          well inside the innermost ring, so the two never touch — a glow
          that reaches the rings reads as fog rather than as light coming
          off the orb. */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: orb * 1.55,
          height: orb * 1.55,
          marginLeft: -(orb * 1.55) / 2,
          marginTop: -(orb * 1.55) / 2,
          background: `radial-gradient(circle, rgba(${GOLD_BRIGHT}, 0.5) 0%, rgba(${GOLD}, 0.22) 42%, rgba(${GOLD}, 0) 68%)`,
        }}
        initial={{ opacity: 1, scale: 1 }}
        animate={
          reduced
            ? { opacity: thinking ? 1 : 0, scale: 1 }
            : { opacity: thinking ? 1 : 0, scale: [1, 1.09, 1] }
        }
        transition={
          reduced
            ? { duration: 0 }
            : {
                opacity: fade,
                /* Slower than the orb's own breath, so the glow swells
                   slightly behind it rather than with it. The two moving in
                   lockstep reads as one object scaling. */
                scale: { duration: 3.4, ease: BREATHE, repeat: Infinity },
              }
        }
      />

      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ marginLeft: -orb / 2, marginTop: -orb / 2 }}
        initial={{ scale: 1 }}
        animate={reduced || !thinking ? { scale: 1 } : { scale: [1, 1.045, 1] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 2.6, ease: BREATHE, repeat: Infinity }
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
