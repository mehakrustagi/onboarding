"use client";

import { motion } from "framer-motion";

/* The impact burst, when a rising point strikes the card's bottom edge.
 *
 * The SEQUENCE is lifted from Aceternity UI's `BackgroundBeamsWithCollision`
 * — specifically its `Explosion`, which fires where a falling beam meets the
 * container edge. Two layers, and the pairing is the whole idea:
 *
 *   1. A short blurred BAR across the point of contact, fading 0 → 1 → 0.
 *      It is the flash of the hit — the thing that says a surface was
 *      struck at a particular spot.
 *   2. A dozen or so small dots leaving that spot, fanning upward and
 *      outward, each on its OWN duration so they do not arrive as a ring.
 *      They are the debris.
 *
 * Nothing else came across. The original is a full-screen beams background
 * with its own container, collision detection by `getBoundingClientRect`,
 * and an indigo/purple palette; none of that is here. This is only the
 * burst, in this screen's green, fired on the cadence the stream already
 * has — so no collision detection is needed. Each particle's arrival time
 * is already known, because this screen scheduled it.
 *
 *
 * DIRECTIONS ARE DETERMINISTIC, WHICH IS A DEPARTURE FROM THE ORIGINAL.
 *
 * Aceternity's version computes them with `Math.random()` inside the
 * component body. That is fine in a client-only app and is a hydration
 * mismatch in this one: the server renders one burst and the client
 * renders a different one, and React reports the mismatch on the first
 * paint. The fan below is generated from the index instead — the spread
 * is even where random would clump, and it is identical on both sides.
 */

/** Where the burst is drawn relative to the strike point. A fan from −170°
 *  to −10°, i.e. upward and out to both sides, with the radius and the
 *  duration varied by a cheap index hash so no two dots travel together. */
const SPANS = Array.from({ length: 14 }, (_, i) => {
  const t = i / 13;
  const angle = (-170 + t * 160) * (Math.PI / 180);
  /* Deterministic stand-in for the original's Math.random(). Any cycle
     that is coprime with the count works; 37 mod 11 gives a well-spread
     sequence over 14 items. */
  const jitter = ((i * 37) % 11) / 11;
  const radius = 22 + jitter * 26;
  /* Each particle STARTS a few px out along its own heading, not at the
     shared origin. All fourteen beginning at exactly (0,0) stacked into
     one bright blob at the strike point — six lanes of that read as a row
     of white squares sitting on the card's edge, which is what this looked
     like before. Emerging already spread means there is never a frame
     where they are one object. */
  const from = 5;
  return {
    x0: Number((Math.cos(angle) * from).toFixed(2)),
    y0: Number((Math.sin(angle) * from).toFixed(2)),
    dx: Number((Math.cos(angle) * radius).toFixed(2)),
    dy: Number((Math.sin(angle) * radius).toFixed(2)),
    dur: Number((0.55 + jitter * 0.85).toFixed(2)),
    /* And they do not all leave on the same frame. A burst where every
       fragment departs simultaneously reads as a shape scaling up; a
       short spread of departures reads as debris. */
    lag: Number((jitter * 0.1).toFixed(3)),
  };
});

export default function Strike({
  /** Horizontal offset from the card's centre — the lane the point arrived in. */
  dx,
  /** When the first strike fires: the particle's own delay plus its travel. */
  delay,
  /** The particle's cycle length, so a strike lands on every arrival. */
  period,
  active,
}: {
  dx: number;
  delay: number;
  period: number;
  active: boolean;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute"
      style={{ left: `calc(50% + ${dx}px)`, top: 0, width: 0, height: 0 }}
    >
      {/* The flash. Short and wide — it reads as a line of light along the
          surface that was hit, not as a glow at a point. `screen` so it
          adds to the gold underneath instead of covering it. */}
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
        animate={active ? { opacity: [0, 1, 0], scaleX: [0.4, 1, 1.25] } : { opacity: 0, scaleX: 0.4 }}
        /* Full config per property: a per-property transition REPLACES the
           inherited one rather than merging, so omitting duration or
           repeat here fires the flash once and never again. */
        transition={
          active
            ? {
                opacity: {
                  duration: 0.75,
                  repeat: Infinity,
                  repeatDelay: Math.max(0, period - 0.75),
                  delay,
                  ease: "easeOut",
                },
                scaleX: {
                  duration: 0.75,
                  repeat: Infinity,
                  repeatDelay: Math.max(0, period - 0.75),
                  delay,
                  ease: "easeOut",
                },
              }
            : { duration: 0.2 }
        }
      />

      {/* The debris. */}
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
            /* A flat green rather than a gradient, and NO `screen`. Screen
               blending over the lit card edge pushed these to near-white,
               which is why they read as white dots rather than as green
               debris — the one colour this screen never uses for the
               conversion. */
            background: "#7CF0A8",
          }}
          initial={{ x: s.x0, y: s.y0, opacity: 0 }}
          animate={
            active
              ? { x: s.dx, y: s.dy, opacity: [0, 1, 0] }
              : { x: s.x0, y: s.y0, opacity: 0 }
          }
          transition={
            active
              ? {
                  x: {
                    duration: s.dur,
                    repeat: Infinity,
                    repeatDelay: Math.max(0, period - s.dur),
                    delay: delay + s.lag,
                    ease: "easeOut",
                  },
                  y: {
                    duration: s.dur,
                    repeat: Infinity,
                    repeatDelay: Math.max(0, period - s.dur),
                    delay: delay + s.lag,
                    ease: "easeOut",
                  },
                  opacity: {
                    duration: s.dur,
                    repeat: Infinity,
                    repeatDelay: Math.max(0, period - s.dur),
                    delay: delay + s.lag,
                    /* Fades UP over the first tenth instead of existing at
                       full brightness on frame one. A particle that simply
                       appears has a visible birth; one that arrives does
                       not. */
                    times: [0, 0.1, 1],
                    ease: "easeOut",
                  },
                }
              : { duration: 0.2 }
          }
        />
      ))}
    </div>
  );
}
