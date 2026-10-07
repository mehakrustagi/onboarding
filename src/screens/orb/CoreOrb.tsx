"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import OrbV2 from "@/components/OrbV2";

/* Variant 5 — core.
 *
 * The orb disintegrates into a few thousand fine grains arranged on a real
 * sphere — a surface plot of itself — which turns, wobbles on a height
 * field, and glows where the grains pile up. When it finishes thinking the
 * wobble dies, the sphere comes back to a perfect ball, and the orb resolves
 * out of it.
 *
 * HOW IT DIFFERS FROM `AtomOrb`, which also makes the orb out of particles:
 * that one is flat. Its atoms live in the 2D disc, and its movement is a
 * swirl in the plane, which is why it reads as a picture being stirred. This
 * one is genuinely three-dimensional — points on a unit sphere, rotated as
 * vectors, displaced along their own normals, and projected with
 * perspective. You see the back of it through the front, the grains near the
 * limb bunch up the way they do on a real sphere, and the rotation is a
 * rotation rather than a shear.
 *
 * WHY THE GRAINS SIT ON A FIBONACCI SPIRAL: the obvious constructions —
 * latitude/longitude bands, or anything built from two nested loops — crowd
 * at the poles and leave the equator sparse, and the seams show as soon as
 * it turns. The spiral puts every point at an equal share of the surface
 * with no axis and no seam.
 *
 * IT USED TO SIT ON A DARK DISC, and the two go together: the grains were
 * composited ADDITIVELY, which is the only way to make overlapping ones
 * glow, and additive light summing toward white is invisible on a white
 * ground. The disc was what the light was light against.
 *
 * The disc had to go — it read as a black plate behind the orb, which is a
 * heavy thing to put on a white page for an effect that is meant to be a
 * status. So the compositing went with it. Grains are drawn normally now,
 * in their own colours, and DEPTH IS CARRIED BY ALPHA: a grain on the far
 * side is faint, which on white means it fades toward the page, which is
 * exactly how something behind something else should look. The sphere reads
 * as a volume for the same reason it did before, without needing the dark.
 *
 * What is lost is the bloom where grains stacked up. What replaces it is the
 * rim: a thin silver-white ring on the sphere's edge with a soft shadow
 * under it, which gives the orb its lift without putting anything heavy
 * behind it. */

/** Default orb diameter. */
const ORB_DEFAULT = 211;

/** Colour source — a capture of OrbV2's own render. Generated, not authored. */
const SOURCE = "/assets/orb-v2/orb-composed.png";
const SRC_PX = 400;

/** Grains. Enough to read as a surface, few enough to hold 60fps. */
const GRAINS = 5200;

/** Grain radius in CSS px, before depth scaling. */
const GRAIN_R = 0.85;

/* Perspective: the eye's distance from the sphere's centre in sphere radii.
   Lower is a wider lens and a more dramatic near/far difference. Below about
   2.2 the near face balloons and it stops looking like a ball. */
const EYE = 3.2;

/** Height-field amplitude, as a fraction of the radius. */
const WOBBLE = 0.13;

/** Degrees per second about the vertical, at full energy. */
const SPIN = 22;

/** Seconds to come apart, and to reform. */
const OUT_S = 1.1;
const IN_S = 1.6;

const THINK_S = 5.5;
const DONE_S = 3.4;

type Grain = {
  /** Unit vector on the sphere. */
  x: number;
  y: number;
  z: number;
  r: number;
  g: number;
  b: number;
  /** Per-grain phase for the micro-jitter. */
  seed: number;
};

function clamp255(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0;
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function CoreOrb({
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
  const fieldRef = useRef<HTMLDivElement>(null);

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

  /* The cell is bigger than the orb so the wobble has somewhere to go. */
  const SIZE = Math.round(orb * 1.28);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let grains: Grain[] = [];
    let cancelled = false;
    /* 1 is fully disintegrated and moving, 0 is a still sphere. */
    let energy = 0;
    /* Integrated, not keyframed, so the spin can decelerate to rest from
       wherever it happens to be instead of rewinding to an identity. */
    let spin = 0;

    const img = new window.Image();
    img.src = SOURCE;

    img.onload = () => {
      if (cancelled) return;
      const off = document.createElement("canvas");
      off.width = SRC_PX;
      off.height = SRC_PX;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx) return;
      octx.drawImage(img, 0, 0, SRC_PX, SRC_PX);
      const data = octx.getImageData(0, 0, SRC_PX, SRC_PX).data;

      /* FIBONACCI SPHERE. `i + 0.5` over the count gives evenly spaced
         heights, and the golden angle between successive points is what
         stops them lining up into rows at any scale. */
      const golden = Math.PI * (3 - Math.sqrt(5));
      const built: Grain[] = [];
      const half = SRC_PX / 2;
      for (let i = 0; i < GRAINS; i++) {
        const y = 1 - ((i + 0.5) / GRAINS) * 2;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const th = golden * i;
        const x = Math.cos(th) * rad;
        const z = Math.sin(th) * rad;

        /* Colour sampled where the grain sits when the sphere is at rest.
           `|z|` rather than z, so a grain on the far side takes the colour
           of the point it is directly behind — the skin wraps instead of
           leaving the back half grey. */
        const sx = Math.min(SRC_PX - 1, Math.max(0, (x + 1) * half)) | 0;
        const sy = Math.min(SRC_PX - 1, Math.max(0, (-y + 1) * half)) | 0;
        const o = (sy * SRC_PX + sx) * 4;
        built.push({
          x,
          y,
          z,
          r: data[o],
          g: data[o + 1],
          b: data[o + 2],
          seed: Math.random() * Math.PI * 2,
        });
      }
      grains = built;

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      ctx.scale(dpr, dpr);

      const C = SIZE / 2;
      const R = orb / 2;

      const start = performance.now();
      let last = start;

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

        spin += SPIN * e * dt * (Math.PI / 180);

        /* Hand over to the real orb as the sphere reforms. */
        const crisp = Math.max(0, Math.min(1, 1 - e / 0.22));
        if (orbRef.current) orbRef.current.style.opacity = String(crisp);
        if (fieldRef.current) fieldRef.current.style.opacity = String(1 - crisp);
        canvas.style.opacity = String(1 - crisp);

        ctx.clearRect(0, 0, SIZE, SIZE);

        const cosA = Math.cos(spin);
        const sinA = Math.sin(spin);
        /* A fixed tilt, so the axis is not dead vertical and the rotation
           is legible as a rotation rather than as a horizontal slide. */
        const tilt = 0.32;
        const cosT = Math.cos(tilt);
        const sinT = Math.sin(tilt);
        const pulse = 1 + e * 0.035 * Math.sin(t * 1.15);

        for (let i = 0; i < grains.length; i++) {
          const gr = grains[i];

          /* Spin about the vertical, then tilt the whole thing toward the
             viewer. Vectors, not pixels — this is the part that makes it a
             sphere rather than a picture of one. */
          const x1 = gr.x * cosA + gr.z * sinA;
          const z1 = -gr.x * sinA + gr.z * cosA;
          const y2 = gr.y * cosT - z1 * sinT;
          const z2 = gr.y * sinT + z1 * cosT;

          /* Height field along the grain's own normal: low-frequency
             harmonics for the shape, plus a fast low-amplitude term that is
             the "micro" movement — it keeps the surface alive at a scale
             the big wobble is too slow to cover. */
          const w =
            Math.sin(x1 * 2.6 + t * 0.85) * 0.4 +
            Math.sin(y2 * 3.1 - t * 0.67) * 0.34 +
            Math.sin(z2 * 2.2 + t * 1.05) * 0.26;
          const micro = Math.sin(t * 3.4 + gr.seed) * 0.16;
          const h = pulse * (1 + e * WOBBLE * (w + micro));

          const X = x1 * h;
          const Y = y2 * h;
          const Z = z2 * h;

          /* Perspective. Nearer grains land further from the centre and are
             drawn larger, which is the whole reason this reads as a volume
             and not as a disc of dots. */
          const p = EYE / (EYE - Z);
          const sx = C + X * R * p;
          const sy = C + Y * R * p;

          /* Depth: 0 at the far pole, 1 at the near one. */
          const depth = (Z + 1) / 2;
          const rad = GRAIN_R * p * (0.72 + depth * 0.55);
          /* Depth, carried entirely by alpha now. On a white page a faint
             grain fades toward the paper, which is what reads as distance —
             the same cue the dark field used to get from dimming. */
          const a = 0.16 + depth * 0.72;

          ctx.globalAlpha = a;
          /* Saturated and very slightly deepened rather than brightened.
             Against black the grains had to be lifted to glow; against
             white the opposite is true — the orb's pale regions are the
             ones at risk of vanishing, and pushing each channel away from
             its own luminance is what keeps them present without turning
             the whole sphere muddy. */
          const lum = gr.r * 0.299 + gr.g * 0.587 + gr.b * 0.114;
          const sat = 1.35;
          const dim = 0.94;
          ctx.fillStyle = `rgb(${clamp255(
            (lum + (gr.r - lum) * sat) * dim,
          )},${clamp255((lum + (gr.g - lum) * sat) * dim)},${clamp255(
            (lum + (gr.b - lum) * sat) * dim,
          )})`;
          ctx.beginPath();
          ctx.arc(sx, sy, rad, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
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
      {/* THE RIM. A thin silver-white ring on the sphere's edge, with a
          soft shadow under it — the whole of the orb's lift, and the thing
          that replaced the dark disc that used to sit behind it.

          Two highlights on opposite sides rather than one. A single bright
          point reads as a light passing by; two opposed ones read as a
          turned metal edge, which is what gives it the elevation.

          `closest-side` and `100%` on the mask: a bare radial-gradient
          sizes to the farthest CORNER, so a stop at 50% lands at 0.354 of
          the width and the ring comes out as a disc. */}
      <div
        ref={fieldRef}
        className="absolute left-1/2 top-1/2 rounded-full"
        style={{
          /* OUTSIDE the grain sphere, not on it. The grains' silhouette
             sits at about 1.13 of the orb's radius once the height field
             is at full amplitude, so a ring drawn at `orb` is buried in
             the cloud and invisible. This rings it. */
          width: orb * 1.17,
          height: orb * 1.17,
          marginLeft: -(orb * 1.17) / 2,
          marginTop: -(orb * 1.17) / 2,
          background:
            "conic-gradient(from 212deg," +
            " rgba(255,255,255,0.95) 0deg," +
            " rgba(176,182,196,0.45) 52deg," +
            " rgba(255,255,255,0.9) 120deg," +
            " rgba(158,166,184,0.35) 198deg," +
            " rgba(252,251,255,0.92) 286deg," +
            " rgba(255,255,255,0.95) 360deg)",
          WebkitMaskImage: `radial-gradient(circle closest-side, transparent calc(100% - 1.5px), #000 100%)`,
          maskImage: `radial-gradient(circle closest-side, transparent calc(100% - 1.5px), #000 100%)`,
          /* Below the ring, not around it — an elevation shadow, offset
             down, not a glow. */
          boxShadow: `0 ${orb * 0.045}px ${orb * 0.1}px ${-orb * 0.03}px rgba(64,56,78,0.22)`,
          opacity: 0,
        }}
      />

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
        aria-label={thinking ? "Reform" : "Disintegrate"}
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
