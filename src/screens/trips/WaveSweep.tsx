"use client";

import { useCallback, type ReactNode } from "react";
import { motion, useMotionTemplate, useTransform, type MotionValue } from "framer-motion";
import {
  BANDS,
  ORIGIN_X,
  applyBackground,
  applyMask,
  bandMask,
  bandRotate,
  bandScale,
  glintGradient,
  washGradient,
  rippleAt,
  useRippleStyle,
  type RippleState,
} from "./ripple";

/* The ripple's own layers — glint and displacement.
 *
 * The screen swap lives on the two screen components (each carries its own
 * ripple mask); this file is what you actually SEE of the wave:
 *
 *   BANDS   copies of the outgoing screen, each masked to one lobe of the
 *           ring and scaled about the ripple's origin. Scaling about the
 *           origin is radial displacement — the shader's
 *           `normalize(ray) * wave` — quantised to two lobes. One pushed
 *           out on the crest, one pulled in on the trough behind it, so
 *           the alternation is visible rather than a single smear.
 *   WASH    the milky white the crest leaves behind it. In the reference
 *           the screen behind the wave is not dimmed, it is bleached — and
 *           that is what makes the next screen have to ARRIVE rather than
 *           merely be uncovered.
 *   GLINT   `max(wave, 0.) * .19` in a cool white, on plus-lighter. Only
 *           the crests, never the troughs — that one-sidedness is most of
 *           why the reference reads as light on water.
 *
 * There is no colour here beyond the glint. The ripple is a distortion of
 * the screen, not a thing painted over it; all of the transition's colour
 * comes from Bloom, which carries the Figma prototype's spectrum.
 */

export default function WaveSweep({
  sweep,
  mounted,
  visible,
  lens,
}: {
  sweep: MotionValue<number>;
  /* Mounted a beat EARLY, visible only once the ripple is running. The
     bands are full copies of the outgoing screen; building those subtrees
     costs a frame, and building them on the frame the ripple starts put a
     ~100ms stall exactly where the motion has to be smoothest. Paying it
     during contact hides it behind the flash. */
  mounted: boolean;
  visible: boolean;
  /** A bare copy of the outgoing screen, drawn once per displacement band. */
  lens: ReactNode;
}) {
  /* Fades at the very ends of the run so the ripple is never seen arriving
     or leaving as a shape. */
  const opacity = useTransform(sweep, [0, 0.05, 0.86, 1], [0, 1, 1, 0]);

  const glintRef = useRippleStyle<HTMLDivElement>(sweep, glintGradient, applyBackground);
  const washRef = useRippleStyle<HTMLDivElement>(sweep, washGradient, applyBackground);

  /* The transform origin is the ripple's source, and it climbs with it — so
     the displacement stays radial about the moving source rather than about
     a point the wave has already left behind. */
  const originY = useTransform(sweep, (p) => rippleAt(p).originY);
  const transformOrigin = useMotionTemplate`${ORIGIN_X}px ${originY}px`;

  if (!mounted) return null;

  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      aria-hidden
      style={{
        zIndex: 7,
        opacity,
        /* visibility rather than display: display:none drops the subtree out
           of layout and hands back the frame we just paid for. */
        visibility: visible ? "visible" : "hidden",
      }}
    >
      {BANDS.map((band) => (
        <Band key={band.key} sweep={sweep} band={band} transformOrigin={transformOrigin}>
          {lens}
        </Band>
      ))}

      <div ref={washRef} className="absolute inset-0" />

      <div
        ref={glintRef}
        className="absolute inset-0"
        style={{ mixBlendMode: "plus-lighter" }}
      />
    </motion.div>
  );
}

function Band({
  sweep,
  band,
  transformOrigin,
  children,
}: {
  sweep: MotionValue<number>;
  band: (typeof BANDS)[number];
  transformOrigin: MotionValue<string>;
  children: ReactNode;
}) {
  const build = useCallback(
    (s: RippleState) => bandMask(s, band.from, band.to),
    [band.from, band.to],
  );
  const ref = useRippleStyle<HTMLDivElement>(sweep, build, applyMask);
  const scale = useTransform(sweep, (p) => bandScale(rippleAt(p), band.push));
  const rotate = useTransform(sweep, (p) => bandRotate(rippleAt(p), band.twist));

  return (
    <motion.div
      ref={ref}
      data-ripple-band
      className="absolute inset-0"
      style={{
        scale,
        rotate,
        transformOrigin,
        /* Just enough that the band's own edges read as the UI bending
           rather than as a cut-out of it sliding. */
        filter: "blur(1.4px)",
      }}
    >
      {children}
    </motion.div>
  );
}
