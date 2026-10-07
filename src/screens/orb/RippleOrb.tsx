"use client";

import { motion, useReducedMotion } from "framer-motion";

import OrbV2 from "@/components/OrbV2";

/* Variant 1 — ripple.
 *
 * A ring is released just outside the orb, lights up in the orb's own
 * colours, and is gone within half its travel. It only ever gets about half
 * again as wide as the orb: this is a thinking state, so it has to read as
 * something ticking over, not as a broadcast. Three are in flight a third
 * of a period apart, each fainter than the one behind it.
 *
 * It had beads riding the rings and a long travel out to 2.5×, which made
 * it the loudest thing on any screen it would sit on. Both are gone.
 *
 * TWO THINGS THAT LOOK LIKE DETAILS AND ARE NOT:
 *
 * The ring animates WIDTH AND HEIGHT, not `scale`. Scale multiplies the
 * 1.5px stroke along with everything else, so the faintest and widest rings
 * would also be the fattest, which is backwards — a ripple thins as it
 * spreads. Growing the box keeps the stroke a hairline the whole way.
 *
 * The stroke is a CONIC GRADIENT. "Revolving" is the half of this that is
 * easy to build and impossible to see: a uniform circle rotating about its
 * own centre is indistinguishable from one standing still. The gradient
 * gives the ring a weighted arc, and that arc turning is the only reason
 * the rotation registers at all. It also carries the colour.
 *
 * The ring is that gradient clipped to a circle by `border-radius` and
 * hollowed out by a radial mask, the same way `GlowingEdge` punches its
 * rim. A `border` cannot carry a gradient, which is the whole reason for
 * the detour. */

/** Default orb diameter. Everything else is a multiple of whatever is
 *  passed in, so the treatment can be dropped into the chat UI at 26px and
 *  onto the bench at 132 without a second set of numbers. */
const ORB_DEFAULT = 132;

/* The ring is released just OUTSIDE the orb rather than exactly on it. Born
   on the rim it reads as the orb's own outline peeling off; a little clear
   air makes it a separate thing leaving. */
const START_K = 1.06;

/* Short. This used to run to 2.55× and the rings dominated whatever they
   were placed on — fine on a bench, wrong for a state that is meant to sit
   quietly in the corner of a screen while something else is the subject.
   Half again as wide as the orb is enough to read as spreading. */
const END_K = 1.52;

/* The stroke does NOT scale with the orb. A hairline is a hairline at any
   size, and scaled down to a 26px orb a proportional stroke would land at a
   third of a pixel and disappear. */
const RING_W = 1.5;

/** One ring's whole life. */
const PERIOD = 2.6;

const RINGS = [0, 1, 2];

/* The ring lights up in the ORB'S OWN COLOURS rather than in ink.
 *
 * These four are sampled off the composed orb — the warm orange of its
 * upper left, the violet of its shadow side, the pale green of its lower
 * right, and a warm white for the glare — so the ring reads as colour
 * thrown off the orb rather than as a stroke drawn around it.
 *
 * The alphas are high for what they are because the page is white and
 * these are hairlines: a 1.5px line at 30% of a pale green is nothing at
 * all. If the ground ever goes dark, this constant is what changes. */
const RING_PAINT =
  "conic-gradient(from 0deg," +
  " rgba(226,139,78,0.95) 0deg," +
  " rgba(150,96,168,0.80) 95deg," +
  " rgba(123,160,96,0.55) 190deg," +
  " rgba(236,190,150,0.30) 280deg," +
  " rgba(226,139,78,0.95) 360deg)";

/* `closest-side` and `100%`, both load-bearing. A bare
   `radial-gradient(circle, ...)` sizes itself to the FARTHEST CORNER, so on
   a square box its 100% is the half-diagonal and a stop written at 50%
   lands at 0.354 of the width — nowhere near the rim. The result is a fat
   grey band with a filled disc behind it rather than a hairline. With
   `closest-side` the ray length is exactly the radius, so `100% - RING_W`
   is the rim minus the stroke, which is the annulus we want. */
const RING_MASK = `radial-gradient(circle closest-side, transparent calc(100% - ${RING_W}px), #000 calc(100% - ${RING_W}px))`;

/* Lights up almost at once and is gone by 55% of the travel, holding zero
   through the rest. The ring never reaches its full width at any visible
   opacity — the last part of the journey happens invisibly — which is what
   keeps the footprint small while the motion still reads as spreading
   outward rather than as a ring blinking on and off in place. */
const FADE = [0, 1, 0.45, 0, 0];
const FADE_AT = [0, 0.09, 0.3, 0.55, 1];

export default function RippleOrb({ orb = ORB_DEFAULT }: { orb?: number }) {
  const ORB = orb;
  const RING_START = ORB * START_K;
  const RING_END = ORB * END_K;
  /* Padding proportional to the orb, so a small instance does not carry a
     fixed 16px of dead space that dwarfs it. */
  const FIELD = RING_END + ORB * 0.12;

  /* Gate the PROPS, never the tree. `{!reduced && <motion.div/>}` renders on
     the server and vanishes on the client for anyone with the OS setting
     on, which is a hydration mismatch and a red overlay — and invisible in
     development, because your own machine has the setting off. */
  const reduced = useReducedMotion();

  return (
    <div
      className="relative"
      style={{ width: FIELD, height: FIELD }}
      /* One decorative loop; there is nothing here to announce. */
      aria-hidden
    >
      {RINGS.map((i) => (
        <motion.div
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            /* Centred by its own size, so it stays centred as the box
               grows. Framer composes these with the animated `rotate`. */
            x: "-50%",
            y: "-50%",
            background: RING_PAINT,
            /* Safe to mask the element itself again now the bead is gone.
               While the bead existed this had to live on a separate child:
               the mask keeps only the outermost 1.5px, so it hollowed out
               the bead too and the bead silently vanished. */
            WebkitMaskImage: RING_MASK,
            maskImage: RING_MASK,
          }}
          /* An EXPLICIT initial, not `initial={false}`.
             `false` tells framer-motion to render the `animate` values
             straight into the style attribute, and `animate` differs
             between the two branches — so the server (which always reads
             reduced-motion as off) emitted one style and a client with the
             OS setting ON hydrated with another. That is an attribute
             hydration mismatch and a red overlay, for exactly the viewers
             the branch was meant to look after. With a concrete `initial`
             both sides render the same thing and the branch only takes
             effect after mount. */
          initial={{
            width: RING_START,
            height: RING_START,
            opacity: 0,
            rotate: 0,
          }}
          animate={
            reduced
              ? {
                  /* Still, but not identical: fanned out and fading, so the
                     shape of the thing survives without any motion. */
                  width: RING_START + ((RING_END - RING_START) * i) / 2,
                  height: RING_START + ((RING_END - RING_START) * i) / 2,
                  opacity: [1, 0.4, 0.15][i],
                  rotate: 0,
                }
              : {
                  width: [RING_START, RING_END],
                  height: [RING_START, RING_END],
                  opacity: FADE,
                  /* Counter-clockwise, so the dark arc of the gradient
                     TRAILS the bead instead of running ahead of it. */
                  rotate: -360,
                }
          }
          transition={
            reduced
              ? { duration: 0 }
              : {
                  width: {
                    duration: PERIOD,
                    /* Water decelerates as it spreads. Linear here is the
                       one thing that makes this read as a pulse ring from a
                       UI kit rather than a ripple. */
                    ease: [0.16, 0.73, 0.35, 1],
                    repeat: Infinity,
                    delay: (i * PERIOD) / RINGS.length,
                  },
                  height: {
                    duration: PERIOD,
                    ease: [0.16, 0.73, 0.35, 1],
                    repeat: Infinity,
                    delay: (i * PERIOD) / RINGS.length,
                  },
                  opacity: {
                    duration: PERIOD,
                    times: FADE_AT,
                    ease: "linear",
                    repeat: Infinity,
                    delay: (i * PERIOD) / RINGS.length,
                  },
                  /* Deliberately NOT a multiple of PERIOD. Matched, every
                     ring would be born at the same angle and the field
                     would turn in lockstep; drifting, the weighted arc
                     starts somewhere new each time. */
                  rotate: {
                    duration: 9,
                    ease: "linear",
                    repeat: Infinity,
                    delay: (i * PERIOD) / RINGS.length,
                  },
                }
          }
        />
      ))}

      {/* The orb breathes. Perfectly still inside moving rings it reads as a
          static asset the rings are decorating, rather than the thing they
          are coming from. */}
      <motion.div
        className="absolute left-1/2 top-1/2"
        style={{ marginLeft: -ORB / 2, marginTop: -ORB / 2 }}
        initial={{ scale: 1 }}
        animate={reduced ? { scale: 1 } : { scale: [1, 1.045, 1] }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 2.4, ease: "easeInOut", repeat: Infinity }
        }
      >
        <OrbV2 size={ORB} />
      </motion.div>
    </div>
  );
}
