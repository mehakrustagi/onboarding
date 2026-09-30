"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion } from "framer-motion";

/* A lit border that follows the pointer around the card's edge.
 *
 * The MECHANIC is Aceternity UI's `GlowingEffect`, and it is worth stating
 * plainly what that mechanic is, because it is not a border-colour
 * animation:
 *
 *   - A conic gradient is painted over the element and masked down to the
 *     border box only, so what you see is a ring of colour following a
 *     rounded rectangle. (Same masking trick as `NativeAIButton`'s
 *     dispersion fringe: paint the gradient, then `mask-composite: xor` a
 *     content-box rectangle out of it. It is the only way to get a
 *     gradient that follows a border radius.)
 *   - One CSS custom property, `--start`, rotates that gradient. Pointing
 *     it at the cursor is what makes the light appear to be CAUSED by the
 *     pointer rather than merely animated near it.
 *   - `proximity` gates it: past that distance the ring fades out entirely
 *     rather than following from across the screen.
 *   - `inactiveZone` kills it near the centre, where "which way is the
 *     pointer" stops being a meaningful question.
 *
 * WHAT IS DIFFERENT HERE, and why:
 *
 *   - The palette is this screen's, not the original's pink-and-amber: it
 *     runs the card's own gold through to the green of the conversion, so
 *     the edge belongs to the card rather than sitting on top of it.
 *   - It takes `charge`. At rest the ring is faint; as the points arrive
 *     it brightens, so the edge is part of the card being charged instead
 *     of a separate hover decoration.
 *   - It rotates slowly on its own when the pointer is away. The original
 *     simply parks; on a screen that plays a scripted sequence with no
 *     cursor involved, parking means the effect never appears at all.
 *
 * The whole thing is `pointer-events: none` and sits under the card's
 * contents, so nothing about the card's own behaviour changes.
 */

/* Degrees per second when nobody is pointing at it. Slow — this is a rim
 * light on a card, and at any speed you can follow with your eye it
 * becomes a loading spinner. */
const IDLE_SPIN = 26;

/* How far outside the card the pointer still counts, in px. */
const PROXIMITY = 64;
/* Fraction of the card's half-diagonal around the centre where the effect
 * switches off — inside it there is no meaningful direction to point. */
const INACTIVE_ZONE = 0.35;

export default function GlowingEdge({
  radius,
  /** 0 → resting rim. 1 → the card is taking the points. */
  charge,
  /** Border thickness. */
  width = 1.5,
}: {
  radius: number;
  charge: number;
  width?: number;
}) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLDivElement>(null);
  /* The rotation lives in a CSS CUSTOM PROPERTY, not in React state, and
     that is the whole reason this is affordable.

     The gradient is a string rather than a transform, so the obvious
     implementation mirrors the motion value into state and rebuilds the
     string — which re-renders this card sixty times a second, forever,
     because the idle spin never stops. Writing `--edge-angle` instead lets
     framer set the property straight on the element with no React render
     at all, and the gradient reads it through `calc()`. It is also what
     the original does, with `--start`. */
  const start = useMotionValue(0);
  const [near, setNear] = useState(false);

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let last = performance.now();
    let pointerAngle: number | null = null;

    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;

      /* Outside the card plus its proximity margin → not near. Measured
         against the box, not the centre, so a wide card does not have a
         circular catchment. */
      const outside =
        e.clientX < r.left - PROXIMITY ||
        e.clientX > r.right + PROXIMITY ||
        e.clientY < r.top - PROXIMITY ||
        e.clientY > r.bottom + PROXIMITY;

      const half = Math.hypot(r.width, r.height) / 2;
      const inDeadZone = Math.hypot(e.clientX - cx, e.clientY - cy) < half * INACTIVE_ZONE;

      if (outside || inDeadZone) {
        pointerAngle = null;
        setNear(false);
        return;
      }
      setNear(true);
      /* +90 so 0° is the top edge, which is where a conic gradient starts. */
      pointerAngle = (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI + 90;
    };

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const current = start.get();

      if (pointerAngle === null) {
        start.set((current + IDLE_SPIN * dt) % 360);
      } else {
        /* Shortest way round. Without this the ring takes the long way
           whenever the pointer crosses 0°/360° and visibly whips. */
        const diff = ((pointerAngle - current + 540) % 360) - 180;
        /* Ease toward the pointer rather than snapping — the lag is what
           makes it read as light swinging round, not as a value being
           assigned. */
        start.set(current + diff * Math.min(1, dt * 6));
      }
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced, start]);

  /* Faint at rest, brighter with the charge, brighter again under the
     pointer — the three states stack rather than replacing each other. */
  const intensity = 0.3 + charge * 0.6 + (near ? 0.25 : 0);

  /* The ring. `repeating-conic-gradient` with the sweep starting at
     `--start` is the original's construction; the stops are this screen's
     — gold through white into the conversion green and back, so the edge
     reads as the card's own material catching light. */
  const ring = `conic-gradient(from calc(var(--edge-angle, 0) * 1deg) at 50% 50%,
    rgba(223,175,98,0) 0deg,
    rgba(223,175,98,${0.55 * intensity}) 35deg,
    rgba(255,255,255,${0.95 * intensity}) 70deg,
    rgba(68,232,116,${0.85 * intensity}) 110deg,
    rgba(36,178,81,0) 165deg,
    rgba(36,178,81,0) 360deg)`;

  /* Cut the middle out so only the border remains. */
  const borderMask = {
    WebkitMask:
      "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    WebkitMaskComposite: "xor",
    mask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
    maskComposite: "exclude",
  } as const;

  return (
    <motion.div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={
        /* framer writes the custom property here every frame; both rings
           below read it, so one value drives both with a single write. */
        { borderRadius: radius, "--edge-angle": start } as React.CSSProperties
      }
    >
      {/* The bloom — the same ring, thicker and blurred, sitting under the
          crisp one. A single hairline reads as a stroke; it is the soft
          copy beneath that reads as light coming off an edge. */}
      <div
        className="absolute"
        style={{
          inset: -2,
          borderRadius: radius + 2,
          padding: width + 2.5,
          background: ring,
          filter: "blur(5px)",
          opacity: 0.85,
          ...borderMask,
        }}
      />
      {/* The edge itself. */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: radius,
          padding: width,
          background: ring,
          ...borderMask,
        }}
      />
    </motion.div>
  );
}
