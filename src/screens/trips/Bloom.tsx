"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";
import type { HandoffBeat } from "./beats";

/* The light — Figma prototype 971:6622, the NameDrop sequence.
 *
 * That prototype is six frames of one object, and it settles every question
 * the earlier passes were guessing at:
 *
 *   Home                   nothing
 *   Home_sending           a warm arc hanging off the TOP edge
 *   loading_contactinfo    it has swollen into a full orb in the upper half
 *                          and gained a cool top
 *   share_contactinfo →    dissipating
 *   sending → waiting
 *
 * So the light is a single body that grows at one edge and travels across.
 * It is not a band, not a rim, and — importantly — it has no hard edge
 * anywhere in it: no specular line, no chromatic fringe, nothing with a
 * boundary. Earlier passes had all three, which is where "harsh" was
 * coming from. They are gone.
 *
 * The prototype runs top-down; this runs BOTTOM-UP, which is also how the
 * Figma section reads (Ellipse 6988 climbs 1108 → 808 across frames 3→4).
 * The reference's vertical colour order is kept as-is rather than mirrored:
 * warm at the leading edge, cool trailing behind it. That way the hot end
 * of the spectrum is the part doing the work — arriving first and pushing
 * into the screen — which is what the prototype shows too, just with the
 * frame the other way up.
 *
 *
 * COLOUR
 *
 * Sampled down the centre of the prototype's own frames rather than
 * invented. These are composited-against-white values, which is what makes
 * them usable directly — the screen underneath is near-white, so they can
 * be laid on as a soft gradient without depending on a blend mode:
 *
 *   frame 2   #f2f9e5 lime · #f0ecc4 cream · #f8d4a7 sand · #fcb595 coral
 *             · #fec5bc pink        (warm only, peak at 25% of the height)
 *   frame 3   #d0e6e5 cyan · #afddcb mint · #9fdfad green · #b0e892 ·
 *             #d4e788 lime · #f0d486 · #faba86 orange · #fcad94 coral ·
 *             #ffc0b8 pink
 *
 * The cool half only exists once the orb has formed, which is the tell that
 * the two frames are one object at two moments rather than two effects: the
 * warm end arrives first and the spectrum fills in behind it.
 *
 * Shape is an ellipse, colour is a vertical ramp inside it — one radial
 * gradient as a mask over one linear gradient. The reference's colour runs
 * top-to-bottom while its silhouette is round, and layering them that way
 * is the cheapest honest reproduction of that.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* Warm-only ramp: the arc hanging off the top edge, before the orb forms. */
const WARM =
  "linear-gradient(to top, rgba(242,249,229,0) 0%, rgba(242,249,229,0.6) 14%, rgba(240,236,196,0.68) 34%, rgba(248,212,167,0.72) 56%, rgba(252,181,149,0.74) 74%, rgba(254,197,188,0.56) 88%, rgba(254,232,232,0) 100%)";

/* Full spectrum: the formed orb. */
const SPECTRUM =
  "linear-gradient(to top, rgba(208,230,229,0) 0%, rgba(208,230,229,0.48) 10%, rgba(175,221,203,0.60) 20%, rgba(159,223,173,0.66) 30%, rgba(176,232,146,0.66) 40%, rgba(212,231,136,0.66) 50%, rgba(240,212,134,0.68) 62%, rgba(250,186,134,0.70) 74%, rgba(252,173,148,0.70) 84%, rgba(255,192,184,0.52) 93%, rgba(254,228,227,0) 100%)";

/* Soft all the way out. The reference has no findable edge on this shape,
 * and these stops are doing more for that than the blur on top of them. */
const ORB =
  "radial-gradient(closest-side, #000 0%, #000 34%, rgba(0,0,0,0.72) 62%, rgba(0,0,0,0.28) 84%, transparent 100%)";

type Stage = {
  rx: number;
  ry: number;
  /** Centre-y in px on the 965 shell. */
  cy: number;
  opacity: number;
  blur: number;
  /** 0 = warm arc only, 1 = full spectrum. */
  cool: number;
};

/* Mirrored onto the bottom edge, and softened throughout — every opacity
 * here is roughly three-quarters of the pass before it, and every blur is
 * wider. The reference is a light source on a blank white screen; the same
 * values over a screen with real content in it read considerably heavier
 * than they do in the prototype, which is most of what still felt
 * aggressive once the direction was right. */
const STAGES: Record<HandoffBeat, Stage> = {
  /* Barely there and mostly off the bottom edge — the trace of colour the
     prototype's Home frame carries. */
  idle: { rx: 300, ry: 150, cy: 1030, opacity: 0.18, blur: 52, cool: 0 },
  /* frame 2, Home_sending, mirrored: wide, shallow, hung off the bottom
     edge, warm only. */
  charging: { rx: 345, ry: 215, cy: 960, opacity: 0.7, blur: 44, cool: 0 },
  /* frame 3, loading_contactinfo: rounder, further into frame, and the cool
     end of the spectrum has filled in behind the warm.

     889 is not a look choice — it is where the orb has to sit for the arc
     to be inside its lower body. See ALIGNMENT below. */
  contact: { rx: 322, ry: 268, cy: 900, opacity: 0.82, blur: 38, cool: 1 },
  /* Same body, now travelling. Its position during the sweep comes from the
     sweep value, not from here. */
  sweeping: { rx: 322, ry: 268, cy: 900, opacity: 0.82, blur: 38, cool: 1 },
  settled: { rx: 322, ry: 268, cy: 900, opacity: 0, blur: 42, cool: 1 },
};

/* ALIGNMENT — the light has to travel with the wave, not near it.
 *
 * The boundary is now the ripple's crest: a circle spreading from (220, 900)
 * out to 1240px while its centre climbs 300px. The orb has to keep pace with
 * that or the two drift apart, which is exactly what an earlier pass did —
 * the colour had left the top of the screen while the transition was still
 * happening in the middle of it, uncovered.
 *
 * The crest is radial and the orb is a soft ellipse, so they cannot match
 * exactly. What matters is that the orb stays centred on the part of the
 * crest doing the visible work — the top of the circle, which is where it
 * meets content the user is still reading. That point starts at y 900 and
 * ends around y −640, so the orb starts at the source and travels the same
 * 1540px. */
const TRAVEL = -1540;

export default function Bloom({
  beat,
  sweep,
}: {
  beat: HandoffBeat;
  sweep: MotionValue<number>;
}) {
  const s = STAGES[beat];

  /* Beat-driven resting position with the sweep added on top, as ONE motion
     value. Switching a property between a beat animation and a sweep
     transform would leave a frame where control changes hands, and that
     frame is exactly where a visible jump lands. */
  const baseY = useMotionValue(STAGES.idle.cy);
  const y = useTransform([baseY, sweep] as const, ([b, p]: number[]) => b + p * TRAVEL);

  useEffect(() => {
    const controls = animate(baseY, s.cy, {
      duration: beat === "contact" ? 0.26 : 0.85,
      ease: EASE,
    });
    return () => controls.stop();
  }, [baseY, beat, s.cy]);

  /* Fades over the last third of the travel rather than at a beat boundary,
     so the light is gone before the sequence formally ends and nothing has
     to be switched off. */
  const travelFade = useTransform(sweep, [0, 0.62, 1], [1, 1, 0]);

  const transition = {
    duration: beat === "contact" ? 0.26 : 0.85,
    ease: EASE,
  };

  return (
    <motion.div
      className="pointer-events-none absolute"
      aria-hidden
      /* Zero-sized anchor at the orb's centre: `y` moves the centre, and the
         two colour layers hang off it symmetrically. Sizing the orb and
         moving it then become independent, so the swell and the travel
         never fight over the same property. */
      style={{ left: 220, top: 0, width: 0, height: 0, zIndex: 5, y, opacity: travelFade }}
    >
      {/* Warm and spectrum are stacked copies cross-faded by `cool`, not one
          gradient interpolating into another. Interpolating multi-stop
          gradients marches the stops past each other and the colours pass
          through mud on the way; cross-fading keeps both ramps correct at
          every point between. */}
      {[
        { key: "warm", g: WARM, o: 1 - s.cool },
        { key: "spectrum", g: SPECTRUM, o: s.cool },
      ].map(({ key, g, o }) => (
        <motion.div
          key={key}
          className="absolute"
          style={{
            background: g,
            WebkitMaskImage: ORB,
            maskImage: ORB,
            borderRadius: "50%",
          }}
          initial={false}
          animate={{
            width: s.rx * 2,
            height: s.ry * 2,
            x: -s.rx,
            y: -s.ry,
            opacity: o * s.opacity,
            filter: `blur(${s.blur}px)`,
          }}
          transition={transition}
        />
      ))}
    </motion.div>
  );
}
