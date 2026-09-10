"use client";

import { useEffect, useRef } from "react";
import type { MotionValue } from "framer-motion";

/* The fluid ripple, ported from the WebGL reference (Fluid Ripple,
 * index.html) onto live DOM.
 *
 * The reference is a fragment shader that displaces a texture of the whole
 * screen. Its physics, verbatim:
 *
 *   origin  = ripple.xy + vec2(0., age * .19)      // source floats upward
 *   front   = age * .64                            // crest expands
 *   d       = length(uv - origin) - front          // distance to the crest
 *   envelope= exp(-.92 * age) * exp(-(d / .09)^2)  // decay × Gaussian ring
 *   wave    = sin(d * 74.) * envelope
 *   offset += normalize(ray) * wave * .34          // radial displacement
 *   glint  += max(wave, 0.) * .19                  // specular on crests
 *
 * Everything here is that, in pixels on the 440×965 shell. The uv units are
 * height-normalised, so 0.09 → 87px, 74 rad/uv → an 82px wavelength, 0.64
 * uv/s → 618px/s.
 *
 *
 * WHAT IS FAITHFUL AND WHAT IS NOT
 *
 * Faithful: the wave equation, the expanding crest, the rising origin, the
 * Gaussian envelope, the exponential decay, the ring spacing, the glint
 * riding only the positive lobes, and the fact that the whole thing is
 * radial from a point near the bottom rather than a band crossing the
 * screen.
 *
 * Not faithful: the displacement is BANDED, not per-pixel. The shader
 * displaces every fragment by its own `wave`; here the screen is drawn a
 * few times over, each copy masked to one lobe of the ring and scaled about
 * the ripple's origin — and scaling about the origin IS radial
 * displacement, `normalize(ray) * amount`, just quantised to a handful of
 * amounts instead of continuous. Per-pixel would mean rasterising the DOM
 * to a texture, which breaks on cross-origin webfonts.
 *
 * Positions are written straight to element styles from a MotionValue
 * subscription rather than through React or motion templates. A ring
 * gradient is ~30 stops; putting that through the render path 60 times a
 * second would cost far more than the string concatenation does.
 */

export const SHELL_W = 440;
export const SHELL_H = 965;

/* Source sits just above the composer, centred — where the reference puts
 * it on the mic button. */
export const ORIGIN_X = SHELL_W / 2;
export const ORIGIN_Y0 = 900;

/* age * .19 uv/s over the reference's 2.5s life ≈ 0.475 uv. Scaled to this
 * sweep, the source climbs 300px while the crest runs. */
const RISE = 300;

/* Far enough that the crest clears the top corners — the furthest point
 * from the source is about 990px away — with margin for the rise. */
const FRONT_MAX = 1240;

/* 0.09 uv. The Gaussian is at 37% by one sigma and 2% by two, so the ring
 * is meaningfully present across roughly ±150px. */
const SIGMA = 87;

/* 2π / 74 uv ≈ 0.085 uv. */
const WAVELENGTH = 82;

/* exp(-.92 * age) over the reference's life, expressed against sweep. */
const DECAY = 1.45;

/* Where the gradients stop being defined. Beyond this the last stop holds. */
const EXTENT = 1400;

export type RippleState = {
  /** Crest radius, px from the origin. */
  front: number;
  /** Origin y, px — climbs as the crest expands. */
  originY: number;
  /** exp decay of the whole ripple, 1 → 0. */
  amplitude: number;
};

export function rippleAt(sweep: number): RippleState {
  const p = Math.min(1, Math.max(0, sweep));
  return {
    front: p * FRONT_MAX,
    originY: ORIGIN_Y0 - p * RISE,
    amplitude: Math.exp(-DECAY * p),
  };
}

/* wave(d) — the shader's `sin(d * 74.) * exp(-(d/.09)^2)`, in px. */
export function waveAt(d: number, amplitude: number) {
  const envelope = Math.exp(-((d / SIGMA) ** 2));
  return Math.sin((d / WAVELENGTH) * Math.PI * 2) * envelope * amplitude;
}

/* ── Masks for the screen swap ──────────────────────────────────────────
 *
 * The reference does not swap screens — it only ripples one. The swap is
 * ours, and hanging it on the crest is what makes the ripple the cause of
 * the transition rather than decoration over it: MyTrip is what the wave
 * leaves behind, so it is revealed INSIDE the expanding front and the
 * payment screen survives outside it. Circular from the bottom centre,
 * which is why it reads as something spreading rather than a line crossing.
 */

function circle(originY: number, stops: string) {
  return `radial-gradient(${EXTENT}px ${EXTENT}px at ${ORIGIN_X}px ${originY}px, ${stops})`;
}

/* Stops just outside the bands. Everything from BAND_OUTER inward is drawn
 * by the displacement bands instead, so this layer hands that ring over
 * rather than painting under it. */
export function outgoingMask(s: RippleState) {
  const inner = Math.max(0, s.front + BAND_OUTER);
  const outer = Math.max(0.1, inner + SIGMA);
  return circle(
    s.originY,
    `transparent 0px, transparent ${inner}px, #000 ${outer}px, #000 ${EXTENT}px`,
  );
}

/* Only the SURFACE of the incoming screen is revealed here — its content
 * arrives separately, after the wave has gone (see MyTripLayer). Held well
 * inside the bands so the new screen never shows through the ring the wave
 * is actively bending. */
export function incomingMask(s: RippleState) {
  const outer = Math.max(0.1, s.front + BAND_INNER);
  const inner = Math.max(0, outer - SIGMA);
  return circle(
    s.originY,
    `#000 0px, #000 ${inner}px, transparent ${outer}px, transparent ${EXTENT}px`,
  );
}

/* ── Glint ──────────────────────────────────────────────────────────────
 *
 * `max(wave, 0.) * .19` in vec3(.92, .98, 1.) — a cool white that only
 * appears on the crests of the ripple, never in its troughs. That
 * one-sidedness is most of why the reference reads as light on water
 * rather than as a pattern: real specular highlights come off the faces
 * tilted toward you, and only half a wave is.
 *
 * Sampled at a fixed set of offsets from the crest and emitted as gradient
 * stops. The pattern's SHAPE never changes — only its distance from the
 * origin — so the sample offsets are computed once at module load and each
 * frame just adds `front` to them.
 */

const GLINT_SAMPLES = (() => {
  const out: { d: number; w: number }[] = [];
  /* ±2.2σ covers the envelope down to about 1%; four samples per wavelength
     is enough that the stops read as a smooth sinusoid once painted. */
  const step = WAVELENGTH / 4;
  for (let d = -2.2 * SIGMA; d <= 2.2 * SIGMA; d += step) {
    out.push({ d, w: waveAt(d, 1) });
  }
  return out;
})();

export function glintGradient(s: RippleState) {
  const stops = GLINT_SAMPLES.map(({ d, w }) => {
    const r = Math.max(0, s.front + d);
    const a = Math.max(0, w) * 0.42 * s.amplitude;
    return `rgba(235,250,255,${a.toFixed(3)}) ${r.toFixed(1)}px`;
  });
  return circle(s.originY, `transparent 0px, ${stops.join(", ")}, transparent ${EXTENT}px`);
}

/* ── Displacement bands ─────────────────────────────────────────────────
 *
 * Each band is one lobe of the ring: a copy of the screen masked to the
 * radii where the wave has a given sign, scaled about the ripple's origin
 * so the content inside it is pushed out or pulled in. Two lobes either
 * side of the crest is enough to see the alternation without paying for
 * more full-screen copies than the beat can afford.
 */
/* Offsets from the crest, in px, with the displacement each one carries.
 *
 * The bands ABUT rather than overlap — every overlap draws the screen twice,
 * and text in an overlapping ring comes out doubled rather than bent.
 *
 * There are four of them, spanning 460px rather than the 140px an earlier
 * pass used, and that width is the point. With a narrow band the only thing
 * that moves is a thin ring: text is static, snaps into distortion as the
 * crest crosses it, and snaps back. You see a ring travelling over the UI
 * instead of the UI being dragged by it. Graded across 460px, a line of text
 * starts leaning while the wave is still approaching, is thrown hardest as
 * the crest arrives, gets pulled back in the trough, and settles in the
 * wake — so the type is visibly carried, which is what the reference shows
 * and what "I don't feel the text moving with it" meant.
 *
 * Amplitudes fall off either side of the crest. The `lead` band is
 * deliberately gentle: content ahead of the wave should be stirring, not
 * yet displaced. */
export const BANDS = [
  /* Ahead of the crest — the water lifting before the wave gets there. */
  { key: "lead", from: 45, to: 200, push: 0.016, twist: 0.4 },
  /* The crest itself: the hardest throw. */
  { key: "crest", from: -25, to: 45, push: 0.075, twist: 1.6 },
  /* The trough behind it, pulled back in and counter-rotated. */
  { key: "trough", from: -95, to: -25, push: -0.048, twist: -1.2 },
  /* The wake: still bent, settling. */
  { key: "wake", from: -260, to: -95, push: -0.018, twist: -0.45 },
] as const;

/* The full extent the bands cover. The outgoing screen must not paint
 * anywhere inside this — the bands ARE the outgoing screen there, displaced.
 * Painting both is what produced the doubling. */
export const BAND_INNER = -260;
export const BAND_OUTER = 200;

export function bandMask(s: RippleState, from: number, to: number) {
  const a = Math.max(0, s.front + from);
  const b = Math.max(0.1, s.front + to);
  /* Feathered inside each end so neighbouring bands cross-fade into one
     another instead of butting up as visible rings. Wider now that the
     bands themselves are wider — the grading between them has to be
     invisible or the displacement reads as steps. */
  const f = 26;
  return circle(
    s.originY,
    `transparent 0px, transparent ${a}px, #000 ${Math.min(a + f, b)}px, #000 ${Math.max(a + f, b - f)}px, transparent ${b}px, transparent ${EXTENT}px`,
  );
}

/* Displacement magnitude for a band, as a scale factor about the origin.
 * A scale of 1 + k moves a point at radius r outward by k·r, so at a crest
 * a few hundred px out, 0.07 is a ~30px shove.
 *
 * Five times what the first pass used. That pass was reading the shader's
 * `wave * .34` too literally and forgetting the shader applies it to every
 * fragment continuously; two banded copies at the same magnitude barely
 * register. The reference frame shows text bent well out of line — that is
 * the effect, and it needs the amplitude to show. */
export function bandScale(s: RippleState, push: number) {
  return 1 + push * s.amplitude;
}

/* A little rotation with the push. Pure radial scaling moves everything
 * along its own ray, which is correct but reads oddly flat on blocks of
 * text — the reference's bent lines are shearing as well as displacing.
 * Small, and opposite on the trough so the two lobes counter-rotate. */
export function bandRotate(s: RippleState, twist: number) {
  return twist * s.amplitude;
}

/* ── Wash ───────────────────────────────────────────────────────────────
 *
 * The milky white the wave leaves behind it. In the reference frame the
 * screen behind the crest is not the old content dimmed — it is gone,
 * bleached into a soft white field that the next screen then emerges from.
 *
 * That is also what fixes the "page was already loaded" read: without it,
 * the incoming screen is simply uncovered by the crest and so appears to
 * have been sitting there the whole time. With it, the wave leaves blank
 * light, and the new screen has to arrive into that afterwards. */
export function washGradient(s: RippleState) {
  const crest = s.front;
  /* Starts behind the wake rather than just behind the crest, so the bleach
     comes in under content the wave has finished bending instead of cutting
     across content it is still working on. */
  const back = Math.max(0, crest + BAND_INNER - SIGMA);
  const a = 0.92 * s.amplitude;
  return circle(
    s.originY,
    `rgba(255,255,255,${(a * 0.55).toFixed(3)}) 0px, rgba(255,255,255,${a.toFixed(3)}) ${back.toFixed(1)}px, rgba(255,255,255,${a.toFixed(3)}) ${Math.max(0.1, crest - SIGMA * 0.6).toFixed(1)}px, rgba(255,255,255,0) ${Math.max(0.2, crest + SIGMA * 0.7).toFixed(1)}px, rgba(255,255,255,0) ${EXTENT}px`,
  );
}

/* ── Wiring ─────────────────────────────────────────────────────────────
 *
 * Subscribes to the sweep and writes one CSS property on one element. Kept
 * out of React entirely: these change every frame, and the strings are long
 * enough that re-rendering two full screen layouts to deliver them would
 * cost more than the whole effect.
 */
export function useRippleStyle<T extends HTMLElement>(
  sweep: MotionValue<number>,
  build: (s: RippleState) => string,
  apply: (el: T, value: string) => void,
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const write = (v: number) => {
      const el = ref.current;
      if (el) apply(el, build(rippleAt(v)));
    };
    write(sweep.get());
    return sweep.on("change", write);
  }, [sweep, build, apply]);

  return ref;
}

/** Both mask properties at once — Chromium still wants the prefixed one. */
export const applyMask = (el: HTMLElement, value: string) => {
  el.style.maskImage = value;
  el.style.webkitMaskImage = value;
};

export const applyBackground = (el: HTMLElement, value: string) => {
  el.style.background = value;
};
