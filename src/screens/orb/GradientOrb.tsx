"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

import OrbV2 from "@/components/OrbV2";

/* Variant 3 — swirl.
 *
 * While it thinks, the orb's own colour smears around itself and softens
 * into a mush. When it finishes, the smear fades and the orb resolves back
 * out of it, crisp.
 *
 * HOW: the thing that swirls IS THE ORB, several times over. Two extra
 * copies of its own render sit on top of the real one, blurred and turning
 * at different rates and in opposite directions. Averaged together, rotated
 * copies of a strongly banded image smear its bands into each other — which
 * is exactly what a swirl is — and every colour on screen is by construction
 * one the orb already had.
 *
 * WHY NOT A SEPARATE FIELD OF COLOUR: three earlier passes built the
 * thinking state out of its own blobs, and all three had the same problem
 * underneath the specific ones. A field of colour that is not the orb reads
 * as a different object occupying the orb's place, and then the hand-back at
 * the end is a swap rather than a resolution. Here nothing is swapped: the
 * copies fade out, the blur goes to zero, and what was underneath the whole
 * time is the orb.
 *
 * It is also why the base layer never fades. It is the floor of the effect —
 * the orb is present at full strength in every frame, and "thinking" is only
 * ever the smear laid over it.
 *
 * (Earlier attempts, for the record: the raw palette screened onto
 * near-black was vivid but inert; the palette tinted to pastels on white was
 * a pale grey egg, because nothing can look lit on a white ground; bright
 * sources on a dark body did shine, but it put the orb out to do it.) */

/** Default orb diameter. */
const ORB_DEFAULT = 211;

/* A capture of OrbV2's own render. Used for the turning copies because it
   is one image rather than the three composited layers the component builds,
   and three copies of those would be nine layers for no visible gain. It is
   GENERATED — if OrbV2 changes, recapture it. */
const SOURCE = "/assets/orb-v2/orb-composed.png";

/* The turning copies. Opposite directions and periods with no common
 * factor, so the smear keeps changing instead of settling into a pattern.
 * `scale` over 1 keeps each copy's rim outside the clip, so a rotating copy
 * never shows its own edge sweeping across the orb. */
const COPIES = [
  { dur: 9, dir: 1, opacity: 0.38, scale: 1.08 },
  { dur: 6.5, dir: -1, opacity: 0.32, scale: 1.13 },
  { dur: 14, dir: 1, opacity: 0.24, scale: 1.2 },
];

/** How soft the mush gets, as a fraction of the orb. */
const MUSH_BLUR = 0.022;

/* AVERAGING COSTS CONTRAST, and it has to be paid back.
 *
 * Laying rotated copies over each other is a mean, and the mean of a
 * strongly coloured image is always duller than the image — three copies
 * plus a heavy blur took the orb to a flat beige. Lowering the copies'
 * opacity and the blur gets some of it back; the rest is bought with an
 * explicit saturate() over the whole stack while the smear is up, which
 * eases to 1 as it resolves, so the settled orb is untouched. */
const MUSH_SAT = 1.45;

/** Seconds for the swirl to take hold, and to resolve. */
const IN_S = 1;
const OUT_S = 1.5;

const THINK_S = 5;
const DONE_S = 3;

export default function GradientOrb({
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

  const fade = {
    duration: thinking ? IN_S : OUT_S,
    ease: [0.22, 1, 0.36, 1] as const,
  };

  const blur = orb * MUSH_BLUR;

  const limbMask = `radial-gradient(circle closest-side, transparent calc(100% - ${
    orb * 0.09
  }px), #000 100%)`;

  /* The silver lining sits OUTSIDE the orb's clip, so it needs its own box
     and its own ring mask. Width is a flat 2px rather than a fraction —
     a proportional rim is a third of a pixel on the 26px chat orb. */
  /* Proportional with a floor, like every other stroke here — a flat width
     is a hairline on the bench and a band in the chat. */
  const RIM_W = Math.max(0.7, 2 * (orb / ORB_DEFAULT));
  const rimD = orb * 1.035;
  const rimMask = `radial-gradient(circle closest-side, transparent calc(100% - ${RIM_W}px), #000 100%)`;

  const stack = (
    <div
      className="relative"
      style={{ width: rimD, height: rimD }}
      aria-hidden
    >
    <div
      className="absolute left-1/2 top-1/2 overflow-hidden rounded-full"
      style={{
        width: orb,
        height: orb,
        marginLeft: -orb / 2,
        marginTop: -orb / 2,
        isolation: "isolate",
      }}
    >
      {/* The orb, at full strength, always. Only its sharpness changes:
          softened while the smear is over it, so nothing in the frame is
          crisp until the thing has finished thinking. */}
      <motion.div
        className="absolute inset-0"
        initial={{ filter: `blur(${blur}px) saturate(${MUSH_SAT})` }}
        animate={{
          filter: thinking
            ? `blur(${blur}px) saturate(${MUSH_SAT})`
            : "blur(0px) saturate(1)",
        }}
        transition={fade}
      >
        <OrbV2 size={orb} />
      </motion.div>

      {COPIES.map((c, i) => (
        /* The outer element turns forever; the inner one carries the fade.
           Splitting them keeps the rotation a single uninterrupted loop —
           put the opacity on the same element and every state change
           restarts its transition, which visibly jolts the spin. */
        <motion.div
          key={i}
          className="absolute inset-0"
          initial={{ rotate: 0 }}
          animate={reduced ? { rotate: i * 55 } : { rotate: c.dir * 360 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: c.dur, ease: "linear", repeat: Infinity }
          }
        >
          <motion.div
            className="absolute inset-0"
            style={{
              filter: `blur(${blur * 1.4}px) saturate(${MUSH_SAT})`,
              transform: `scale(${c.scale})`,
            }}
            initial={{ opacity: c.opacity }}
            animate={{ opacity: thinking ? c.opacity : 0 }}
            transition={fade}
          >
            <Image
              src={SOURCE}
              alt=""
              width={orb}
              height={orb}
              sizes={`${Math.ceil(orb)}px`}
              style={{ width: orb, height: orb, maxWidth: "none" }}
            />
          </motion.div>
        </motion.div>
      ))}

      {/* A bright arc coming round the inside of the edge. The one thing
          here that is not the orb itself, and it is kept faint for that
          reason: it is a highlight travelling over a surface, not another
          object in the frame.
          `closest-side` and `100%` on the mask are load-bearing — a bare
          radial-gradient sizes to the farthest CORNER, so a stop written at
          50% lands at 0.354 of the width and gives a band across the middle
          instead of a limb at the edge. */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg," +
            " rgba(255,255,255,0.9) 0deg," +
            " rgba(255,244,228,0.42) 55deg," +
            " rgba(255,226,190,0.14) 140deg," +
            " rgba(255,255,255,0) 235deg," +
            " rgba(255,255,255,0.9) 360deg)",
          WebkitMaskImage: limbMask,
          maskImage: limbMask,
          filter: `blur(${orb * 0.018}px)`,
          mixBlendMode: "screen",
        }}
        initial={{ rotate: 0, opacity: 1 }}
        animate={{ rotate: reduced ? 0 : 360, opacity: thinking ? 1 : 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                rotate: { duration: 9, ease: "linear", repeat: Infinity },
                opacity: fade,
              }
        }
      />
    </div>

      {/* THE SILVER LINING. Outside the clip, because a rim drawn inside it
          is a rim on the inside of the glass — this one has to sit ON the
          edge and overhang it slightly, which is what makes it read as
          metal catching the light rather than as a glow under the surface.

          Two bright arcs rather than one. A single travelling highlight
          reads as a light source passing by; two opposite ones read as a
          turned metal surface, because that is what a ring of brushed metal
          does under a single light. */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: rimD,
          height: rimD,
          marginLeft: -rimD / 2,
          marginTop: -rimD / 2,
          background:
            "conic-gradient(from 0deg," +
            " rgba(255,255,255,0.98) 0deg," +
            " rgba(186,192,204,0.30) 58deg," +
            " rgba(255,255,255,0.92) 128deg," +
            " rgba(164,172,188,0.22) 196deg," +
            " rgba(252,250,255,0.95) 282deg," +
            " rgba(200,206,218,0.35) 330deg," +
            " rgba(255,255,255,0.98) 360deg)",
          WebkitMaskImage: rimMask,
          maskImage: rimMask,
          filter: "blur(0.4px)",
        }}
        initial={{ rotate: 0, opacity: 1 }}
        animate={{ rotate: reduced ? 0 : 360, opacity: thinking ? 1 : 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : {
                rotate: { duration: 4.2, ease: "linear", repeat: Infinity },
                opacity: fade,
              }
        }
      />

      {/* The halo the rim throws. Faint, and it does not turn — a moving
          glow as well as a moving highlight is one effect too many. */}
      <motion.div
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: rimD,
          height: rimD,
          marginLeft: -rimD / 2,
          marginTop: -rimD / 2,
          boxShadow: `0 0 ${orb * 0.07}px ${orb * 0.012}px rgba(214,220,235,0.55)`,
        }}
        initial={{ opacity: 1 }}
        animate={{ opacity: thinking ? 1 : 0 }}
        transition={fade}
      />
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
