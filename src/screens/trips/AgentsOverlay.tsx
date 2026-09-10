"use client";

import { useEffect } from "react";
import Image from "next/image";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";

/* Agents at work — Figma frame 947:30859.
 *
 * A scrim over the settled MyTrip screen with the trip's agents lifted out
 * of it, so the screen you were just reading becomes the backdrop to what
 * is being done on your behalf. Geometry read off the node, frame-relative
 * on the same 440×965 shell:
 *
 *   scrim   947:31162  full frame, r44, vertical black gradient
 *   orbs    947:31164  three, at (238.8, 634.4) 30, (168.7, 624.5) 30,
 *                      and (198.8, 667.7) 40 — the big one in front
 *   copy    947:31218  Inter Medium 20/25, -0.8, white, centred on x 218.3,
 *                      248 wide, top 749.5
 *   stars   947:31219  320.95×87.75 at (59.9, 876.8)
 *
 * THE ORBS RELEASE LIKE BALLOONS — frames 704 → 706 → gone
 *
 * Frame 706 is a WAYPOINT, not the destination. The orbs pass through
 * those positions and keep going, out through the top of the frame, while
 * the scrim fades from under them — so the beat ends on the clean MyTrip
 * screen rather than on three orbs parked in the upper third.
 *
 * The path is a SINE, and it is computed rather than keyframed. An earlier
 * pass built the exit from four waypoints, which cannot describe a curve —
 * between any two of them framer interpolates a straight line, so what you
 * got was a dog-leg with rounded corners. A wave needs to be evaluated, so
 * each balloon runs off a single progress value 0 → 1 and derives
 * everything from it every frame:
 *
 *   y      exitY · t                    a steady climb
 *   x      driftX · t + A·sin(2πf·t + φ)   the wave, riding a slow drift
 *   rotate −tilt · cos(2πf·t + φ)        the derivative, so it banks INTO
 *                                        each turn — that is what reads as
 *                                        a spiral rather than a wobble
 *   scale  1 → endScale                  distance
 *
 * Because rotation follows the derivative of the lateral position, the orb
 * is always leaning the way it is about to go. That coupling is the whole
 * difference between something spiralling up through air and something
 * being shaken side to side.
 *
 * Each has its own frequency, amplitude and phase, so at no point are the
 * three doing the same thing — three in step would read as a formation
 * being lifted rather than three things let go.
 *
 * The easing is relaxed and the exit target overshoots the top of the
 * frame by a wide margin, so the curve's deceleration happens off-screen
 * and everything you actually see is the steady middle of the climb.
 *
 * ORIGINAL FRAME DATA — frames 704 → 706
 *
 * Figma gives both ends of that move and nothing in between, so the drift
 * targets below are exact and the timing is invented. Reading the two
 * frames against each other:
 *
 *   b  (168.7, 624.5) → (177.2, 363.8)   +8.5, -260.7   30 → 30
 *   a  (238.8, 634.4) → (162.5, 451.7)  -76.3, -182.7   30 → 30
 *   c  (198.8, 667.7) → (114.5, 520.3)  -84.3, -147.5   40 → 30
 *
 * They all rise, they all drift left except b, and the big one shrinks to
 * match the others — so what reads is three things of equal weight letting
 * go and floating up, not a formation moving. The copy and the stars are
 * simply absent from 706, so they go before the orbs do; the orbs are the
 * last thing on screen, which is the point of the beat.
 *
 * The bob and the drift are on SEPARATE elements. Both want `y`, and
 * framer can only own a property once — putting an infinite loop and a
 * one-way drift on the same value means whichever starts last silently
 * wins. Outer element drifts, inner element bobs.
 *
 * The scrim is CSS rather than Figma's exported SVG. Figma draws it as a
 * rounded rect at opacity 0.9 filled with a black gradient at fill-opacity
 * 0.9 running to full black by y 840 — so the effective ramp is transparent
 * to rgba(0,0,0,0.81) at 87% of the height. As an <img> that is a fixed
 * 440×965 bitmap that cannot be animated; as a gradient it can fade in with
 * the rest of the overlay, which is the whole point of the beat.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* When the last balloon has physically left the frame.
 *
 * Each exits at about t = 0.7 of its own float (the targets overshoot the
 * top by ~40%), plus its stagger — so the slowest, orb c, is gone at
 * 0.16 + 1.7 x 0.7. The scrim holds until then: the balloons have to rise
 * against the black, because that is the only thing they read against.
 * Fading it underneath them turned the release into a crossfade and took
 * the contrast out from under the one moment the beat exists for. */
const LAST_ORB_OUT = 1.35;

/* Relaxed: a soft start against the balloon's own inertia, then steady.
 * The curve does decelerate, but the exit target sits so far above the
 * frame that the orb is long gone before that part of it arrives — so what
 * shows is only the even middle. */
const RISE_EASE = [0.32, 0, 0.5, 1] as const;

/* 0.9 × 0.9 = 0.81, reaching full at 840.387 / 965 = 87.1%. */
const SCRIM =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.81) 87.1%, rgba(0,0,0,0.81) 100%)";

/* The three agents. `lift` is how far each floats on its own loop — they
 * are working, not posing, and a cluster where everything bobs in step
 * reads as one object with three heads rather than three agents. */
const ORBS = [
  {
    key: "b",
    src: "/assets/trips/agents/orb-b.png",
    ring: "/assets/trips/agents/ring-30.svg",
    tail: "/assets/trips/agents/tail-b.svg",
    x: 168.68,
    y: 624.45,
    size: 30,
    art: 27.75,
    tailW: 28.59,
    tailH: 32.41,
    lift: 7,
    dur: 4.2,
    /* Figma's 706 position, then out through the top. */
    to: { dx: 8.54, dy: -260.66, scale: 1 },
    /* Overshoots the top by ~40%: the orb is gone by t≈0.7, so the eased
       tail never shows. */
    exitY: -1080,
    driftX: 46,
    amp: 30,
    freq: 1.15,
    phase: 0.2,
    tilt: 9,
    endScale: 0.5,
    float: 1.55,
  },
  {
    key: "a",
    src: "/assets/trips/agents/orb-a.png",
    ring: "/assets/trips/agents/ring-30.svg",
    tail: "/assets/trips/agents/tail-a.svg",
    x: 238.77,
    y: 634.4,
    size: 30,
    art: 29.29,
    tailW: 27.57,
    tailH: 30.64,
    lift: 9,
    dur: 5.1,
    to: { dx: -76.26, dy: -182.68, scale: 1 },
    exitY: -1120,
    driftX: -96,
    amp: 35,
    freq: 1.32,
    phase: 2.1,
    tilt: -11,
    endScale: 0.47,
    float: 1.4,
  },
  {
    key: "c",
    src: "/assets/trips/agents/orb-c.png",
    ring: "/assets/trips/agents/ring-40.svg",
    tail: "/assets/trips/agents/tail-c.svg",
    x: 198.77,
    y: 667.74,
    size: 40,
    art: 37,
    tailW: 38.12,
    tailH: 43.22,
    lift: 6,
    dur: 3.6,
    /* 30 / 40 — Figma has the big one come down to the others' size. */
    to: { dx: -84.27, dy: -147.49, scale: 0.75 },
    exitY: -1180,
    driftX: -44,
    amp: 25,
    freq: 0.98,
    phase: 4.0,
    tilt: 7,
    endScale: 0.4,
    float: 1.7,
  },
] as const;

export type AgentsPhase = "hidden" | "working" | "dispersing";

export default function AgentsOverlay({ phase }: { phase: AgentsPhase }) {
  const open = phase !== "hidden";
  const going = phase === "dispersing";

  return (
    <motion.div
      className="absolute inset-0"
      /* Stops intercepting the moment the release begins — by then the
         trip screen underneath is what the user is aiming at, and the
         scrim is on its way out even though it is still painted. */
      style={{ zIndex: 9, pointerEvents: open && !going ? "auto" : "none" }}
      initial={false}
      animate={{ opacity: open ? 1 : 0 }}
      transition={{ duration: going ? 1.2 : 0.35, ease: IN_EASE }}
      aria-hidden={!open}
    >
      {/* The scrim holds at full through the entire release and only goes
          once the last balloon is out of frame. */}
      <motion.div
        className="absolute inset-0"
        style={{ background: SCRIM, borderRadius: 44 }}
        initial={false}
        animate={{ opacity: going ? 0 : 1 }}
        transition={{
          duration: going ? 0.7 : 0.35,
          delay: going ? LAST_ORB_OUT : 0,
          ease: IN_EASE,
        }}
      />

      {/* Stars first, so the orbs and the copy sit over them. */}
      <motion.div
        className="absolute"
        style={{ left: 59.91, top: 876.78, width: 320.95, height: 87.75 }}
        initial={false}
        animate={{ opacity: open && !going ? 1 : 0 }}
        transition={{
          delay: open && !going ? 0.25 : 0,
          duration: going ? 0.35 : 0.55,
          ease: IN_EASE,
        }}
      >
        <Image
          src="/assets/trips/agents/stars.svg"
          alt=""
          width={320.95}
          height={87.75}
          style={{ width: 320.95, height: 87.75 }}
        />
      </motion.div>

      {ORBS.map((o, i) => (
        <Balloon key={o.key} o={o} i={i} open={open} going={going} />
      ))}

      <motion.p
        className="absolute -translate-x-1/2 text-center font-medium text-white"
        style={{
          left: 218.27,
          top: 749.53,
          width: 247.948,
          fontSize: 20,
          lineHeight: "25px",
          letterSpacing: "-0.8px",
        }}
        initial={false}
        animate={{
          opacity: open && !going ? 1 : 0,
          y: open && !going ? 0 : going ? -14 : 12,
        }}
        transition={{
          delay: open && !going ? 0.17 : 0,
          duration: going ? 0.38 : 0.3,
          ease: IN_EASE,
        }}
      >
        6 advanced AI agents are already working to get you travel-ready
      </motion.p>
    </motion.div>
  );
}

/* One agent. Owns every animated property itself rather than splitting
 * them between a `style` motion value and an `animate` prop — framer can
 * only own a property from one of those at a time, and mixing them is how
 * you get a transform that silently stops responding halfway through. */
function Balloon({
  o,
  i,
  open,
  going,
}: {
  o: (typeof ORBS)[number];
  i: number;
  open: boolean;
  going: boolean;
}) {
  /* Entrance 0 → 1, and release 0 → 1. Kept separate so the release can
     multiply into whatever the entrance settled on instead of fighting it. */
  const entered = useMotionValue(0);
  const t = useMotionValue(0);

  useEffect(() => {
    const controls = animate(entered, open ? 1 : 0, {
      delay: open && !going ? 0.06 + i * 0.045 : 0,
      duration: 0.3,
      ease: IN_EASE,
    });
    return () => controls.stop();
  }, [entered, open, going, i]);

  useEffect(() => {
    if (!going) {
      t.set(0);
      return;
    }
    const controls = animate(t, 1, {
      duration: o.float,
      ease: RISE_EASE,
      delay: i * 0.08,
    });
    return () => controls.stop();
  }, [t, going, o.float, i]);

  /* The wave. Phase-shifted so x starts at exactly 0 — without the
     correction the orb jumps sideways by A·sin(φ) on the first frame. */
  const x = useTransform(
    t,
    (v) =>
      o.driftX * v +
      o.amp * (Math.sin(2 * Math.PI * o.freq * v + o.phase) - Math.sin(o.phase)),
  );
  const y = useTransform(t, (v) => o.exitY * v);
  /* Banking into the turn: the derivative of the lateral position. */
  const rotate = useTransform(
    t,
    (v) => -o.tilt * Math.cos(2 * Math.PI * o.freq * v + o.phase),
  );

  const scale = useTransform([entered, t] as const, ([e, v]: number[]) => {
    const enterScale = 0.7 + 0.3 * e;
    return enterScale * (1 + (o.endScale - 1) * v);
  });
  /* Held fully opaque for the first two thirds — a balloon does not
     dissolve on its way up, it gets far away and then leaves frame. */
  const opacity = useTransform([entered, t] as const, ([e, v]: number[]) =>
    e * (v < 0.66 ? 1 : Math.max(0, 1 - (v - 0.66) / 0.34)),
  );

  return (
    <motion.div
      className="absolute"
      style={{
        left: o.x,
        top: o.y,
        width: o.size,
        height: o.size,
        x,
        y,
        rotate,
        scale,
        opacity,
      }}
    >
      {/* The idle working bob, on its own element because the release above
          already owns `y` on the parent. */}
      <motion.div
        className="absolute inset-0"
        animate={{ y: going ? 0 : [0, -o.lift, 0] }}
        transition={
          going
            ? { duration: 0.3, ease: IN_EASE }
            : { duration: o.dur, repeat: Infinity, ease: "easeInOut" }
        }
      >
        {/* The trailing comet, rotated -30 degrees as Figma has it. Sized
            from its own box rather than the orb's — it overhangs on both
            axes, which is what makes the orb look like it is moving
            through something rather than sitting still. */}
        <Image
          src={o.tail}
          alt=""
          width={o.tailW}
          height={o.tailH}
          style={{
            position: "absolute",
            left: (o.size - o.tailW) / 2,
            top: (o.size - o.tailH) / 2,
            width: o.tailW,
            height: o.tailH,
          }}
        />
        <Image
          src={o.src}
          alt=""
          width={o.art}
          height={o.art}
          style={{
            position: "absolute",
            left: (o.size - o.art) / 2,
            top: (o.size - o.art) / 2,
            width: o.art,
            height: o.art,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
        <Image
          src={o.ring}
          alt=""
          width={o.size}
          height={o.size}
          style={{ position: "absolute", inset: 0, width: o.size, height: o.size }}
        />
      </motion.div>
    </motion.div>
  );
}
