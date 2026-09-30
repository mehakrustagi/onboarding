"use client";

import { useEffect, useState } from "react";
import { useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/* How the card leans — from the phone itself when it can, from a clock
 * when it cannot.
 *
 * Both drivers write the SAME two motion values, and the card only ever
 * reads those. That is the point of the shape: the card does not know or
 * care which driver is running, so there is no branch in the render path
 * and no second code path to keep in sync. Gyro takes over the moment a
 * real reading arrives and hands back if the readings stop.
 *
 *
 * ON `Card3D` (the WorldPass card), which this borrows from.
 *
 * That component tracks the MOUSE — `px/py` from the pointer's position in
 * the card's box, scaled by `tiltMax`, run through a spring at stiffness
 * 220 / damping 22. The spring constants and the ±14° range come straight
 * from it, because they are tuned and they are the reason that card feels
 * like a slab rather than a picture.
 *
 * What does NOT come across is the mouse. A pointer is the wrong input
 * here twice over: this screen plays a scripted sequence that nobody is
 * hovering, and it is a phone screen, where there is no cursor at all.
 * Hence the two drivers below.
 *
 *
 * ON PERMISSION. iOS 13+ will not deliver `deviceorientation` until
 * `DeviceOrientationEvent.requestPermission()` has been granted, and that
 * call is only honoured from inside a user gesture. The one gesture this
 * flow guarantees is the Convert tap, so that is where it is asked — see
 * `requestGyro`. Everywhere else (Android, desktop Safari, any browser
 * without the prompt) the listener just works, and where there is no
 * hardware at all no reading ever arrives and the timed driver stays on.
 */

/** Matches `Card3D`'s tiltMax, and its spring. */
const TILT_MAX = 12;
const SPRING = { stiffness: 220, damping: 22 } as const;

/** The pose a phone is actually held in — roughly 45° back from flat, not
 *  upright. Measuring from there means a naturally-held phone reads as
 *  level instead of pinned to one end of the range. */
const NEUTRAL_BETA = 45;

/** Gyro readings are noisy enough that a still hand produces visible
 *  jitter. Anything under this many degrees of change is dropped. */
const DEADBAND = 0.4;

type PermissionedDOE = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** Ask iOS for motion access. Must be called from inside a user gesture —
 *  called from the Convert handler, which is one. Safe to call anywhere
 *  else: it resolves false rather than throwing. */
export async function requestGyro(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const DOE = window.DeviceOrientationEvent as PermissionedDOE | undefined;
  if (!DOE) return false;
  if (typeof DOE.requestPermission !== "function") return true; // no prompt needed
  try {
    return (await DOE.requestPermission()) === "granted";
  } catch {
    return false;
  }
}

export function useCardTilt(active: boolean) {
  const reduced = useReducedMotion() ?? false;
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  /* The same spring `Card3D` puts on its mouse tilt. Without it the gyro
     drives the card directly off a noisy sensor and the card buzzes. */
  const rotateX = useSpring(rawX, SPRING);
  const rotateY = useSpring(rawY, SPRING);
  const [gyro, setGyro] = useState(false);

  /* ── Driver 1: the phone ──────────────────────────────────────────── */
  useEffect(() => {
    if (typeof window === "undefined" || reduced) return;
    let lastBeta = 0;
    let lastGamma = 0;

    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.beta === null || e.gamma === null) return;
      if (
        Math.abs(e.beta - lastBeta) < DEADBAND &&
        Math.abs(e.gamma - lastGamma) < DEADBAND
      ) {
        return;
      }
      lastBeta = e.beta;
      lastGamma = e.gamma;
      setGyro(true);
      const clamp = (v: number) => Math.max(-TILT_MAX, Math.min(TILT_MAX, v));
      /* beta is front-to-back, gamma left-to-right. Halved, because a
         phone tilts through far more degrees than a card should — mapping
         them 1:1 makes the card swing wildly for a small wrist movement. */
      rawX.set(clamp(-(e.beta - NEUTRAL_BETA) * 0.5));
      rawY.set(clamp(e.gamma * 0.5));
    };

    window.addEventListener("deviceorientation", onOrient);
    return () => window.removeEventListener("deviceorientation", onOrient);
  }, [rawX, rawY, reduced]);

  /* ── Driver 2: the clock ──────────────────────────────────────────── */
  useEffect(() => {
    /* Stands down as soon as the phone is driving, and only runs while the
       card is actually being charged — the card is still either side of
       that, and the contrast is what gives the movement meaning. */
    if (!active || gyro || reduced) {
      rawX.set(0);
      rawY.set(0);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const t = (now - t0) / 1000;
      /* Coprime periods — 4.3s and 3.1s — so the pair never retraces the
         same closed path. Matched periods trace one loop forever, which
         the eye learns in about two cycles and then stops seeing. */
      rawY.set(Math.sin((t / 4.3) * Math.PI * 2) * 6);
      rawX.set(Math.sin((t / 3.1) * Math.PI * 2) * -4.5);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, gyro, rawX, rawY, reduced]);

  return { rotateX, rotateY, gyro };
}
