"use client";

import { motion } from "framer-motion";

/* The impact burst, fired once where a travelling point meets the card's
 * bottom edge.
 *
 * The SEQUENCE is lifted from Aceternity UI's `BackgroundBeamsWithCollision`
 * — specifically its `Explosion`, which fires where a falling beam meets the
 * container edge. Two layers, and the pairing is the whole idea:
 *
 *   1. A short blurred BAR across the point of contact, fading 0 → 1 → 0.
 *      It is the flash of the hit — the thing that says a surface was
 *      struck at a particular spot.
 *   2. A dozen or so small dots leaving that spot, fanning away from the
 *      card, each on its OWN duration so they do not arrive as a ring.
 *
 * Nothing else came across. The original is a full-screen beams background
 * with its own container, collision detection by `getBoundingClientRect`,
 * and an indigo/purple palette; none of that is here.
 *
 *
 * ONE-SHOT, NOT A LOOP — and that is a bug fix, not a tidy-up.
 *
 * This used to repeat on a cadence mirroring the stream's, which meant
 * stopping it was done by dropping `repeat` to 0. Changing a running
 * framer transition RESTARTS it from its first keyframe, so every fragment
 * jumped back to the impact point and flew out a second time the moment
 * the dial came to rest. It is now spawned per arrival and removes itself
 * through `onDone`, so stopping is simply not spawning another — nothing
 * in flight is ever re-targeted.
 *
 *
 * DIRECTIONS ARE DETERMINISTIC, WHICH IS A DEPARTURE FROM THE ORIGINAL.
 * Aceternity's version computes them with `Math.random()` in the component
 * body — fine in a client-only app, a hydration mismatch here, since the
 * server renders one burst and the client another. The fan below is
 * generated from the index instead: evenly spread where random would
 * clump, and identical on both sides.
 */

const SPANS = Array.from({ length: 14 }, (_, i) => {
  const t = i / 13;
  const angle = (-170 + t * 160) * (Math.PI / 180);
  /* Deterministic stand-in for Math.random(). Any cycle coprime with the
     count works; 37 mod 11 spreads well over 14 items. */
  const jitter = ((i * 37) % 11) / 11;
  const radius = 22 + jitter * 26;
  /* Each starts a few px out along its own heading rather than at the
     shared origin: fourteen fragments all beginning at exactly (0,0)
     stack into one bright blob, and six lanes of that read as a row of
     white squares sitting on the card's edge. */
  const from = 5;
  return {
    x0: Number((Math.cos(angle) * from).toFixed(2)),
    y0: Number((Math.sin(angle) * from).toFixed(2)),
    dx: Number((Math.cos(angle) * radius).toFixed(2)),
    dy: Number((Math.sin(angle) * radius).toFixed(2)),
    dur: Number((0.55 + jitter * 0.85).toFixed(2)),
    /* And they do not all leave on the same frame — a burst where every
       fragment departs at once reads as a shape scaling up, not debris. */
    lag: Number((jitter * 0.1).toFixed(3)),
  };
});

/** Longest fragment life, so a caller can time the burst out if its
 *  completion callback never arrives (a backgrounded tab, for instance). */
export const STRIKE_MS = Math.round(
  (Math.max(...SPANS.map((s) => s.dur + s.lag)) + 0.1) * 1000,
);

export default function Strike({
  /** Horizontal offset from the card's centre — the lane the point arrived in. */
  dx,
  /** True when the energy is leaving the card rather than arriving, so the
   *  debris is thrown downward: a burst that always fanned upward would
   *  have the fragments travelling back into the surface they just left. */
  flip = false,
  onDone,
}: {
  dx: number;
  flip?: boolean;
  onDone: () => void;
}) {
  const sy = flip ? -1 : 1;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: `calc(50% + ${dx}px)`, top: 0, width: 0, height: 0 }}
    >
      {/* The flash. Short and wide — a line of light along the surface that
          was hit, not a glow at a point. `screen` so it adds to the gold
          underneath instead of covering it. */}
      <motion.div
        className="absolute"
        style={{
          left: -30,
          top: -3,
          width: 60,
          height: 5,
          borderRadius: 999,
          background:
            "linear-gradient(90deg, rgba(68,232,116,0) 0%, rgba(150,255,190,0.95) 50%, rgba(68,232,116,0) 100%)",
          filter: "blur(3px)",
          mixBlendMode: "screen",
        }}
        initial={{ opacity: 0, scaleX: 0.4 }}
        animate={{ opacity: [0, 1, 0], scaleX: [0.4, 1, 1.25] }}
        transition={{ duration: 0.75, ease: "easeOut" }}
      />

      {/* The debris. The longest-lived fragment reports the burst finished,
          so the parent can drop it from the list. */}
      {SPANS.map((s, i) => (
        <motion.span
          key={i}
          className="absolute block"
          style={{
            left: -1.25,
            top: -1.25,
            width: 2.5,
            height: 2.5,
            borderRadius: 999,
            /* Flat green, and no `screen`: screen blending over the lit
               card edge pushed these to near-white, which read as white
               dots rather than green debris. */
            background: "#7CF0A8",
          }}
          initial={{ x: s.x0, y: s.y0 * sy, opacity: 0 }}
          animate={{ x: s.dx, y: s.dy * sy, opacity: [0, 1, 0] }}
          transition={{
            duration: s.dur,
            delay: s.lag,
            times: [0, 0.1, 1],
            ease: "easeOut",
          }}
          onAnimationComplete={i === SPANS.length - 1 ? onDone : undefined}
        />
      ))}
    </div>
  );
}
