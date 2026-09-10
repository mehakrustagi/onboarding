"use client";

import { useCallback, useMemo, useRef } from "react";
import { useAnimationFrame, useMotionValue, type MotionValue } from "framer-motion";

/* Damped-oscillator motion values — the physics behind the handoff jolt.
 *
 * The iPhone device-to-device moment isn't one animation, it's two bodies
 * ringing at once: a hard, fast rattle where the two edges meet, and a
 * slow, heavy wobble as the whole slab absorbs it. Springs won't give you
 * that directly — framer's spring exposes stiffness and damping, but not
 * the frequency and decay separately, and it always settles monotonically
 * once it's critically damped. What sells a knock is a deliberately
 * UNDER-damped ring you can tune: how fast it shakes, how quickly it dies,
 * and how far it throws on the first swing, each set independently.
 *
 * So this runs the closed form on every frame instead:
 *
 *   x(t) = amp · e^(−decay·t) · cos(2π · freq · t)
 *
 * A cosine so the first frame is at full throw — the impact happens AT
 * contact, not a quarter-period later, which is the difference between a
 * hit and a sway. The envelope decays on its own clock, so a 20Hz rattle
 * can die in 400ms while a 6Hz body wobble rings for a second and a half
 * underneath it, and the two sum into something that reads as mass.
 *
 * Values land on MotionValues, not React state — 60fps of setState on a
 * screen this heavy would drop frames, and nothing here needs to re-render.
 */

export type Ring = {
  /** Peak throw on the first swing, in the consumer's own units. */
  amp: number;
  /** Oscillations per second. High reads as a rattle, low as a wobble. */
  freq: number;
  /** e-folding rate. Bigger dies faster; ~4 gives roughly a second of ring. */
  decay: number;
  /** Hard cutoff, seconds. The tail is inaudible long before the maths is. */
  duration: number;
};

export type Oscillator = {
  value: MotionValue<number>;
  fire: (ring: Ring) => void;
  stop: () => void;
};

export function useOscillator(): Oscillator {
  const value = useMotionValue(0);
  /* Both live in refs: the frame loop reads them every tick and must never
     be the reason a render happens. */
  const ring = useRef<Ring | null>(null);
  const firedAt = useRef<number | null>(null);

  useAnimationFrame((now) => {
    const spec = ring.current;
    if (!spec) return;

    /* Stamp the start on the first frame we see rather than inside fire().
       fire() may be called from a timer that lands mid-frame, and dating
       the impact from a clock the loop doesn't share throws away part of
       the first swing — the one swing that has to be at full throw. */
    if (firedAt.current === null) firedAt.current = now;

    const t = (now - firedAt.current) / 1000;
    if (t >= spec.duration) {
      /* Land exactly on zero. Cutting a decaying cosine mid-swing leaves a
         residual offset — small, but it's a permanently crooked screen. */
      value.set(0);
      ring.current = null;
      firedAt.current = null;
      return;
    }

    value.set(
      spec.amp * Math.exp(-spec.decay * t) * Math.cos(2 * Math.PI * spec.freq * t),
    );
  });

  const fire = useCallback((spec: Ring) => {
    ring.current = spec;
    firedAt.current = null;
  }, []);

  const stop = useCallback(() => {
    ring.current = null;
    firedAt.current = null;
    value.set(0);
  }, [value]);

  /* Memoised. The returned object ends up in the dependency list of the
     effect that schedules the sequence, and a fresh literal every render
     makes that effect re-run every render — which tears down the timers
     and restarts the timeline before any of it can play. `value`, `fire`
     and `stop` are all stable, so the object can be too. */
  return useMemo(() => ({ value, fire, stop }), [value, fire, stop]);
}

/* The two bodies of the handoff knock.
 *
 * RATTLE is the contact itself — 19Hz is past the point where the eye can
 * follow individual swings, so it reads as a buzz rather than a shake, and
 * it's gone in under half a second. That speed is what makes it feel like
 * hardware meeting hardware instead of a UI easing.
 *
 * BODY is the slab absorbing it. 5.8Hz is slow enough to watch, and the
 * long decay means the screen is still settling well after the rattle has
 * stopped — which is the part that gives the phone weight. Fire them
 * together and the rattle rides on top of the wobble's first swing. */
/* Both softened from the first pass (rattle was 19Hz/13, body 5.8Hz/3.4, at
 * roughly double the amplitudes they are multiplied by now). The knock was
 * reading as harsh — a violent jolt and then a wave, two events rather than
 * one. The contact is meant to be the CAUSE of the wave, not a rival to it,
 * so it now registers as a firm tap you feel more than watch, and the
 * crossing carries the moment. */
export const RATTLE: Ring = { amp: 1, freq: 13, decay: 17, duration: 0.36 };
export const BODY: Ring = { amp: 1, freq: 3.6, decay: 4.2, duration: 1.15 };

/* A second, much gentler ring for the incoming screen. It arrives already
 * moving, so it only needs to overshoot once and settle — a full rattle on
 * top would read as a second impact that never happened. */
export const ARRIVAL: Ring = { amp: 1, freq: 3.4, decay: 4.6, duration: 1 };
