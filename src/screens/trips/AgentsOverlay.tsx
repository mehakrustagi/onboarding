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
/* The scrim used to wait for the last orb to leave frame. They do not
   leave any more — they land on the progress track — so it has to go
   while they are still in the air, or they would touch down behind it.
   Clear at 1.05s against a last landing at 1.41s: the final third of the
   arrival plays against the real screen, which is the part that has to
   read as "these are the same three agents". */
const SCRIM_OUT_AT = 0.45;
const SCRIM_OUT_FOR = 0.6;

/* Relaxed: a soft start against the balloon's own inertia, then steady.
 * The curve does decelerate, but the exit target sits so far above the
 * frame that the orb is long gone before that part of it arrives — so what
 * shows is only the even middle. */
const RISE_EASE = [0.32, 0, 0.5, 1] as const;

/* 0.9 × 0.9 = 0.81, reaching full at 840.387 / 965 = 87.1%. */
const SCRIM =
  "linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.81) 87.1%, rgba(0,0,0,0.81) 100%)";

/* Where each one comes down: at the START of the progress track, not at
 * its resting position. They land on an empty bar, and then walk it out —
 * the slide and the fill that follows them belong to MyTripLayer. Kept in
 * step with its ORBS by hand: they are two halves of one object and a
 * mismatch would show as the orb jumping on the frame it lands.
 *
 * Assigned left-to-right so no two paths cross. That means an orb does
 * not always keep its own art: the bar's discs are Figma's for that node
 * and the agents' are Figma's for theirs, and only one pair matches. The
 * art crossfades over the last third of the flight, by which point the
 * orb is moving, shrinking and swapping its ring for a white disc, so the
 * change of face is not something you can catch. */
const LANDING = [
  { x: 50.97, src: "/assets/trips/orb-1.png" },
  { x: 74.97, src: "/assets/trips/orb-2.png" },
  { x: 98.97, src: "/assets/trips/orb-3.png" },
] as const;
const LAND_Y = 288.41;
const LAND_SIZE = 30;
/* Art inset inside the white disc, from MyTripLayer. */
const LAND_ART = 21.5;

/* One flight, staggered. Long enough to read as travel rather than a cut,
 * short enough that the interstitial does not outstay the line it has to
 * say. */
const FLIGHT = 1.25;
const FLIGHT_STAGGER = 0.08;

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
    /* Leftmost of the three, so it takes the leftmost slot. */
    slot: 0,
    /* Lateral swing on the way over, decaying to nothing so the orb
       arrives dead on its slot rather than sliding the last few pixels. */
    amp: 30,
    freq: 1.15,
    phase: 0.2,
    tilt: 9,
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
    slot: 2,
    amp: 35,
    freq: 1.32,
    phase: 2.1,
    tilt: -11,
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
    slot: 1,
    amp: 25,
    freq: 0.98,
    phase: 4.0,
    tilt: 7,
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
          duration: going ? SCRIM_OUT_FOR : 0.35,
          delay: going ? SCRIM_OUT_AT : 0,
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
      duration: FLIGHT,
      ease: RISE_EASE,
      delay: i * FLIGHT_STAGGER,
    });
    return () => controls.stop();
  }, [t, going, i]);

  /* Where this one is headed, as a delta from where it is sitting. Both
     measured centre-to-centre, because the orb shrinks on the way and a
     top-left delta would land it half a disc off. */
  const land = LANDING[o.slot];
  const dx = land.x + LAND_SIZE / 2 - (o.x + o.size / 2);
  const dy = LAND_Y + LAND_SIZE / 2 - (o.y + o.size / 2);

  /* The flight.
     Travel is linear in v; the swing rides on top of it and is scaled by
     (1 - v) so it is gone by the time the orb reaches its slot. Without
     that decay the sine leaves a few pixels on the table at v=1 and the
     orb finishes with a visible sideways nudge.

     Phase-shifted so x starts at exactly 0 — without the correction the
     orb jumps sideways by A·sin(φ) on the first frame. */
  const swing = (v: number) =>
    o.amp *
    (1 - v) *
    (Math.sin(2 * Math.PI * o.freq * v + o.phase) - Math.sin(o.phase));
  const x = useTransform(t, (v) => dx * v + swing(v));
  /* Lifted off the straight line early and brought back down onto the
     slot — an orb that travels the chord reads as a slide, one that
     arcs reads as something thrown. */
  const y = useTransform(t, (v) => dy * v - 90 * Math.sin(Math.PI * v));
  /* Banking into the turn: the derivative of the lateral position. */
  const rotate = useTransform(
    t,
    (v) => -o.tilt * (1 - v) * Math.cos(2 * Math.PI * o.freq * v + o.phase),
  );

  /* Ends at exactly the bar disc's size, whatever it started as. */
  const scale = useTransform([entered, t] as const, ([e, v]: number[]) => {
    const enterScale = 0.7 + 0.3 * e;
    return enterScale * (1 + (LAND_SIZE / o.size - 1) * v);
  });
  /* No fade on the way: it is landing, not leaving. */
  const opacity = entered;

  /* The agent's dress — ring and comet — gives way to the bar disc's white
     backing over the last third, so what touches down is already the thing
     that lives on the track. */
  const agentLook = useTransform(t, [0.45, 0.85], [1, 0], { clamp: true });
  const barLook = useTransform(t, [0.5, 0.9], [0, 1], { clamp: true });

  return (
    <motion.div
      className="absolute"
      style={{
        left: o.x,
        top: o.y,
        width: o.size,
        height: o.size,
        /* Same stacking the track uses — leftmost in front, so the three
           overlap the same way before and after they land. */
        zIndex: 3 - o.slot,
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
        {/* What it turns into: the bar's white disc with the track art
            inset. Sized in the orb's own units so the parent's scale
            carries it down to 30 along with everything else. */}
        <motion.div
          className="absolute rounded-full bg-white"
          style={{ inset: 0, opacity: barLook }}
        >
          <Image
            src={land.src}
            alt=""
            width={21.5}
            height={21.5}
            style={{
              position: "absolute",
              left: ((LAND_ART / LAND_SIZE) * o.size - o.size) / -2,
              top: ((LAND_ART / LAND_SIZE) * o.size - o.size) / -2,
              width: (LAND_ART / LAND_SIZE) * o.size,
              height: (LAND_ART / LAND_SIZE) * o.size,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </motion.div>

        <motion.div className="absolute" style={{ inset: 0, opacity: agentLook }}>
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
    </motion.div>
  );
}
