"use client";

import { motion } from "framer-motion";

/* The pastel colour wash from the payment overlay.
 *
 * Lifted out of PostPaymentScreen so the payment beat and the trips handoff
 * render literally the same fields rather than two tunings that drift
 * apart. Only the FIELDS live here — each screen keeps its own container,
 * mask and travel, because those are what differ: post-payment pools the
 * wash and then fires it off the top, while the trips handoff only lets it
 * rise a couple of hundred pixels, which is all Figma's Ellipse 6988 does
 * between frames 3 and 4.
 *
 *
 * All four brand hues (#5057EA indigo, #D946EF magenta, #EF4444 red,
 * #EDD758 yellow), laid left to right so neighbours are adjacent on the
 * wheel. Ordering matters because the fields overlap and multiply: adjacent
 * hues compound into colours that still belong to the set, where putting
 * indigo next to yellow would mix toward mud.
 *
 * They sit well lighter than the target colour on purpose. Multiply darkens
 * whatever it lands on, so a field mixed at its true brightness comes out
 * heavy and two overlapping fields come out heavier still. These are those
 * hues lifted toward pastel — the screen is near-white, and saturated
 * colour on white reads as a graphic pasted on top, where the same hues
 * tinted up read as light diffusing through the surface.
 */

export const BLOOM_FIELDS = [
  // #5057EA — indigo
  {
    color: "rgba(188,168,238,0.95)",
    fade: "rgba(188,168,238,0.34)",
    x: -250,
    y: 250,
    w: 640,
    h: 360,
    blur: 64,
    drift: 250,
    lift: 70,
    swell: 1.14,
    dur: 5.6,
  },
  // #D946EF — magenta
  {
    color: "rgba(240,182,250,0.95)",
    fade: "rgba(240,182,250,0.34)",
    x: -60,
    y: 300,
    w: 620,
    h: 340,
    blur: 70,
    drift: -215,
    lift: 84,
    swell: 1.17,
    dur: 7.1,
  },
  // #EF4444 — red
  {
    color: "rgba(250,182,178,0.95)",
    fade: "rgba(250,182,178,0.34)",
    x: 110,
    y: 235,
    w: 630,
    h: 350,
    blur: 66,
    drift: 230,
    lift: 62,
    swell: 1.12,
    dur: 4.8,
  },
  // #EDD758 — yellow
  {
    color: "rgba(250,238,186,0.95)",
    fade: "rgba(250,238,186,0.34)",
    x: 250,
    y: 285,
    w: 620,
    h: 330,
    blur: 68,
    // Its own period again, prime-ish against the other three so the four
    // never line up into a fixed arrangement.
    drift: -240,
    lift: 76,
    swell: 1.15,
    dur: 6.3,
  },
] as const;

/* The four fields, drifting. Long sweeps across the full width rather than a
 * gentle wobble in place: the fields have to physically cross each other for
 * the colours to mix, and drifting 50px never let them overlap enough to
 * make a new hue. */
export default function BloomFields() {
  return (
    <>
      {BLOOM_FIELDS.map((f, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: f.x,
            top: f.y,
            width: f.w,
            height: f.h,
            borderRadius: "50%",
            background: `radial-gradient(closest-side, ${f.color} 0%, ${f.fade} 55%, rgba(0,0,0,0) 100%)`,
            filter: `blur(${f.blur}px)`,
            mixBlendMode: "multiply",
          }}
          animate={{
            x: [0, f.drift, -f.drift * 0.75, f.drift * 0.4, 0],
            y: [0, -f.lift * 0.35, f.lift, -f.lift * 0.2, 0],
            scale: [1, f.swell, 1 / f.swell, f.swell * 0.94, 1],
          }}
          transition={{
            x: { duration: f.dur, repeat: Infinity, ease: "easeInOut" },
            y: { duration: f.dur * 1.31, repeat: Infinity, ease: "easeInOut" },
            scale: { duration: f.dur * 0.83, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      ))}
    </>
  );
}
