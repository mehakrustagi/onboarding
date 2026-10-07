"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import OrbV2 from "@/components/OrbV2";

/* Variant 2 — twirl.
 *
 * The orb's own surface turns against itself: inner and outer bands rotate
 * by different amounts, so the colour shears into the swiggle you get from
 * stirring something. When it is done thinking the shear unwinds and the orb
 * is exactly itself again.
 *
 * THIS IS THE PARTICLE VERSION WITH THE PARTICLES TAKEN OUT. The motion was
 * right and the medium was wrong: sampling the orb into several thousand
 * dots gave the swirl a permanent grain, and the gaps between dots showed as
 * speckle wherever the shear pulled them apart. No dot count fixes that —
 * you are always looking at a halftone.
 *
 * So nothing is sampled. The image is drawn whole, about eighty times a
 * frame, each time clipped to a one-pixel-wide ANNULUS and rotated by the
 * amount that annulus should have turned. Reassembled, the rings are a
 * continuous surface with a twist in it — the same differential rotation as
 * before, now with no grain to give it away.
 *
 * (If you want the grain, `CoreOrb` is the one that keeps it, in 3D.)
 *
 * WHY A SWIRL AND NOT A WAVE: the orb has to stay circular. Pushing the
 * surface outward along its radius moves the rim, and at any amplitude you
 * can see, the silhouette stops being a circle. A rotation cannot change the
 * outline at all — every point stays at the radius it started at — and it is
 * highly visible anyway, because the orb's colour is strongly banded and
 * shearing those bands past each other is obvious. The small radial term
 * that remains is damped to nothing at both the centre and the rim. */

/** Default orb diameter. */
const ORB_DEFAULT = 211;

/** The orb's own render, drawn and redrawn. Generated — recapture if OrbV2
 *  changes. */
const SOURCE = "/assets/orb-v2/orb-composed.png";

/* Ring width in CSS pixels. Narrower is smoother and costs a drawImage per
   ring per frame; much wider and the steps between rings become visible as
   concentric terracing once the shear pulls them apart. */
const RING_PX = 1.2;

/** Hard ceiling on the ring count, so a large instance cannot melt a frame. */
const MAX_RINGS = 110;

/** How far the bands rotate against each other, in radians. */
const SWIRL = 0.42;

/** Radial breathing, pinned at the centre and the rim. */
const SWELL = 0.09;

const OUT_S = 1.1;
const IN_S = 1.6;

const THINK_S = 5;
const DONE_S = 3.4;

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function TwirlOrb({
  orb = ORB_DEFAULT,
  controls = true,
}: {
  orb?: number;
  /** The bench wants the cycle button and the caption; the chat does not. */
  controls?: boolean;
}) {
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);

  const [thinking, setThinking] = useState(true);
  const thinkingRef = useRef(true);
  useEffect(() => {
    thinkingRef.current = thinking;
  }, [thinking]);

  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const hold = (thinking ? THINK_S : DONE_S) * 1000;
    const t = window.setTimeout(() => setThinking((v) => !v), hold);
    return () => window.clearTimeout(t);
  }, [auto, thinking]);

  /* A little room around the orb for the breathing. */
  const SIZE = Math.round(orb * 1.12);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let cancelled = false;
    let energy = 0;

    const img = new window.Image();
    img.src = SOURCE;

    img.onload = () => {
      if (cancelled) return;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      ctx.scale(dpr, dpr);

      const C = SIZE / 2;
      const R = orb / 2;
      const rings = Math.min(MAX_RINGS, Math.max(8, Math.round(R / RING_PX)));

      const start = performance.now();
      let last = start;
      const TAU = Math.PI * 2;

      const frame = (now: number) => {
        if (cancelled) return;
        const t = (now - start) / 1000;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;

        const target = thinkingRef.current ? 1 : 0;
        const span = target > energy ? OUT_S : IN_S;
        const step = dt / span;
        energy += Math.max(-step, Math.min(step, target - energy));
        energy = Math.max(0, Math.min(1, energy));
        const e = easeInOut(energy);

        /* Hand back to the real component as the twist unwinds. The canvas
           is drawing a flattened capture of the orb; the component is the
           three live layers, and it is noticeably crisper. */
        const crisp = Math.max(0, Math.min(1, 1 - e / 0.18));
        if (orbRef.current) orbRef.current.style.opacity = String(crisp);
        canvas.style.opacity = String(1 - crisp);

        ctx.clearRect(0, 0, SIZE, SIZE);

        const pulse = 1 + e * 0.03 * Math.sin(t * 1.0);

        for (let k = 0; k < rings; k++) {
          const r0 = (k / rings) * R;
          const r1 = ((k + 1) / rings) * R;
          /* Normalised radius at the middle of this ring — every term below
             is a function of it, which is what makes neighbouring rings move
             almost together and distant ones move apart. */
          const rr = (r0 + r1) / 2 / R;

          /* Differential rotation. Two harmonics at rates with no common
             factor, so the twist keeps reshaping instead of winding up. */
          const swirl =
            e *
            SWIRL *
            (Math.sin(rr * 4.5 - t * 0.75) * 0.62 +
              Math.sin(rr * 7.2 + t * 0.54) * 0.38);

          /* Radial, damped to zero at both ends by rr(1-rr²) so the
             silhouette cannot be dented. */
          const w =
            Math.sin(rr * 5.5 - t * 0.8) * 0.6 + Math.sin(rr * 9 + t * 1.1) * 0.4;
          const damp = rr * (1 - rr * rr);
          const scale = pulse * (1 + e * SWELL * w * damp * 2.6);

          ctx.save();
          /* The annulus. Both circles overlap their neighbours by half a
             pixel — without that, antialiasing leaves a hairline of
             background between every pair of rings and the orb comes out
             looking like a dartboard. */
          ctx.beginPath();
          ctx.arc(C, C, r1 + 0.5, 0, TAU);
          ctx.arc(C, C, Math.max(0, r0 - 0.5), 0, TAU, true);
          ctx.clip("evenodd");

          ctx.translate(C, C);
          ctx.rotate(swirl);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -R, -R, R * 2, R * 2);
          ctx.restore();
        }

        raf = requestAnimationFrame(frame);
      };

      if (reduced) {
        energy = 0;
        frame(performance.now());
        cancelAnimationFrame(raf);
      } else {
        raf = requestAnimationFrame(frame);
      }
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [reduced, SIZE, orb]);

  const stack = (
    <div className="relative" style={{ width: SIZE, height: SIZE }} aria-hidden>
      {/* Ships at opacity 1 because the loop starts settled, so the server's
          markup and the first client frame already agree. */}
      <div
        ref={orbRef}
        className="absolute left-1/2 top-1/2"
        style={{ marginLeft: -orb / 2, marginTop: -orb / 2, opacity: 1 }}
      >
        <OrbV2 size={orb} />
      </div>

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: SIZE, height: SIZE, display: "block", opacity: 0 }}
      />
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
        aria-label={thinking ? "Unwind" : "Twist"}
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
