"use client";

import { useEffect, useRef, useState } from "react";
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";

import OrbV2 from "@/components/OrbV2";

/* Variant 4 — rims.
 *
 * Two hairline rims held at fixed radii around the orb, turning in opposite
 * directions while it thinks and gliding to a stop when it is done. The orb
 * itself never changes: it is the real component the whole time, at rest,
 * at full quality. Nothing else moves — no travel, no breathing, no fade.
 *
 * THE RIMS CANNOT BE UNIFORM. A circle of even weight rotating about its
 * own centre is indistinguishable from one standing still: the animation
 * runs, the transform updates every frame, and a viewer sees nothing. Each
 * rim is therefore a conic gradient that is heavier through one arc and
 * almost gone through the opposite one, so what you actually perceive is
 * that weight travelling around. It is the only reason this variant reads
 * as moving at all.
 *
 * THE ANGLE IS INTEGRATED, NOT KEYFRAMED. A `rotate: 360` loop on repeat
 * cannot be stopped anywhere except where it started — asked to stop, it
 * either snaps or rewinds. Carrying the angle in a motion value and adding
 * speed × dt each frame means the rim can decelerate from wherever it
 * happens to be and simply stay there, which is what "stops thinking"
 * should look like. */

/** Default orb diameter. */
const ORB_DEFAULT = 211;

/* Rim radii as multiples of the orb, read off the reference: the inner one
   sits a quarter out from the orb's edge, the outer one half out. */
const INNER_K = 1.26;
const OUTER_K = 1.5;

/* Proportional, with a floor. A flat width means the rims read as
   hairlines at 211px and as heavy bands at the chat's 26px — the same
   component looking like two different ones, which is the whole complaint
   this is fixing. */
function rimWidthFor(orbD: number) {
  return Math.max(0.7, 1.6 * (orbD / ORB_DEFAULT));
}

/* Degrees per second, at full speed. Opposite signs, and the two are
   deliberately not a simple ratio — 69 against 43.5 means the rims come
   back into the same relative position only rarely, so the pair never
   settles into a pattern you can anticipate.
   Both are 50% up on where they started. */
const INNER_SPEED = 69;
const OUTER_SPEED = -43.5;

/** Seconds to spin up, and to glide to rest. */
const SPIN_UP_S = 0.8;
const SPIN_DOWN_S = 1.6;

const THINK_S = 5;
const DONE_S = 3;

/* Grey, because this variant deliberately adds no colour — the orb is the
   only colour on screen and the rims are there to say "working", not to
   decorate. Heavy through the leading arc, almost nothing opposite it. */
function rimPaint(peak: number) {
  return (
    "conic-gradient(from 0deg," +
    ` rgba(142,142,150,${peak}) 0deg,` +
    ` rgba(142,142,150,${peak * 0.55}) 70deg,` +
    ` rgba(142,142,150,${peak * 0.18}) 165deg,` +
    ` rgba(142,142,150,${peak * 0.05}) 250deg,` +
    ` rgba(142,142,150,${peak}) 360deg)`
  );
}

function rimMask(w: number) {
  /* `closest-side` and `100%`: a bare radial-gradient sizes itself to the
     farthest CORNER, so a stop at 50% lands at 0.354 of the width and you
     get a fat band with a filled disc behind it instead of a hairline. */
  return `radial-gradient(circle closest-side, transparent calc(100% - ${w}px), #000 calc(100% - ${w}px))`;
}

function Rim({
  d,
  w,
  speed,
  running,
  peak,
  reduced,
}: {
  d: number;
  w: number;
  speed: number;
  running: boolean;
  peak: number;
  reduced: boolean;
}) {
  const angle = useMotionValue(0);
  /* Current speed, eased toward the target so the rim spins up and coasts
     down rather than switching on and off. */
  const rate = useRef(0);

  useAnimationFrame((_, delta) => {
    if (reduced) return;
    const dt = Math.min(0.05, delta / 1000);
    const target = running ? speed : 0;
    const span = running ? SPIN_UP_S : SPIN_DOWN_S;
    const step = (Math.abs(speed) * dt) / span;
    const diff = target - rate.current;
    rate.current += Math.max(-step, Math.min(step, diff));
    if (rate.current !== 0) angle.set(angle.get() + rate.current * dt);
  });

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 rounded-full"
      style={{
        width: d,
        height: d,
        marginLeft: -d / 2,
        marginTop: -d / 2,
        background: rimPaint(peak),
        WebkitMaskImage: rimMask(w),
        maskImage: rimMask(w),
        rotate: angle,
      }}
    />
  );
}

export default function RimOrb({
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

  const rimW = rimWidthFor(orb);
  const field = orb * OUTER_K + rimW * 2;

  const stack = (
    <div
      className="relative"
      style={{ width: field, height: field }}
      aria-hidden
    >
      <Rim
        d={orb * INNER_K}
        w={rimW}
        speed={INNER_SPEED}
        running={thinking}
        peak={0.85}
        reduced={!!reduced}
      />
      <Rim
        d={orb * OUTER_K}
        w={rimW}
        speed={OUTER_SPEED}
        running={thinking}
        /* Lighter than the inner one. Equal weights read as a target; the
           falloff is what makes it depth. */
        peak={0.55}
        reduced={!!reduced}
      />

      <div
        className="absolute left-1/2 top-1/2"
        style={{ marginLeft: -orb / 2, marginTop: -orb / 2 }}
      >
        <OrbV2 size={orb} />
      </div>
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
