"use client";

import Image from "next/image";
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

/* GRAIN DENSITY IS SET IN DEVICE PIXELS, and it tightens as the orb shrinks.
 *
 * Two wrong answers came before this one.
 *
 * Fixed count and fixed radius: 5,200 grains at 0.85px whatever the orb
 * was. At the chat's 26px that is five thousand dots in a sphere an eighth
 * of the width, each proportionally eight times too fat — a solid blob.
 *
 * Count by area, radius by length: proportionally exact, and it looks
 * worse. Holding the spacing constant means a 26px orb gets eighty grains,
 * which is not enough to read as a surface at all — it is a scatter of
 * chunky specks, and at that radius each one is under a device pixel, so
 * the renderer draws it as a blocky square rather than a dot.
 *
 * The thing worth holding constant is not the spacing, it is whether the
 * sphere READS as one. A small sphere needs relatively more grains to do
 * that, so spacing is compressed by a fractional power of the scale rather
 * than tracking it: at 211px the grains sit about 5.2 device pixels apart,
 * at 26px about 2, which is 500 grains instead of 80. The radius is tied to
 * that spacing, with a floor of half a CSS pixel — below that a dot stops
 * being drawn as a dot and the squares come back. */

/** Grain spacing in DEVICE pixels at the default size. */
const SPACING_AT_DEFAULT = 5.2;

/* 1 would hold the spacing proportional and give the scatter above; 0 would
   hold it absolute and make a small orb a solid mass. 0.45 keeps a 26px orb
   dense enough to read while leaving the bench version as sparse as it is
   meant to look. */
const SPACING_FALLOFF = 0.45;

function grainPlan(orbD: number, dpr: number) {
  const k = orbD / ORB_DEFAULT;
  const spacing = Math.max(
    1.9,
    SPACING_AT_DEFAULT * Math.pow(k, SPACING_FALLOFF),
  );
  const areaDev = Math.PI * Math.pow((orbD * dpr) / 2, 2);
  const count = Math.min(
    9000,
    Math.max(300, Math.round(areaDev / (spacing * spacing))),
  );
  /* Back to CSS pixels for the draw call, floored so it stays a dot. */
  const radius = Math.max(0.5, spacing / 3 / dpr);
  return { count, radius };
}

/* Perspective: the eye's distance from the sphere's centre in sphere radii.
   Lower is a wider lens and a more dramatic near/far difference. Below about
   2.2 the near face balloons and it stops looking like a ball. */
const EYE = 3.2;

/** Height-field amplitude, as a fraction of the radius. */
const WOBBLE = 0.13;

/** Degrees per second about the vertical, at full energy. */
const SPIN = 22;

/* The merge. `FLASH_AT` is where in the condense the cloud is considered
   to have arrived; `FLASH_S` is how long the bloom takes to die. */
const FLASH_AT = 0.14;
const FLASH_S = 0.62;

/** How far the cloud draws in on itself just before it lands. */
const GATHER_PULL = 0.055;

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
  /** Final `rgb(...)` string, computed once at build time — there are five
   *  thousand of these and the arithmetic does not change per frame. */
  fill: string;
  /** Per-grain phase for the micro-jitter. */
  seed: number;
};

/* COLOUR IS REBUILT IN HSL, NOT ADJUSTED IN RGB.
 *
 * Three passes at this failed for the same reason, and it is worth stating
 * plainly: a large part of the orb is NEUTRAL. The glare across its upper
 * left and the wash through its middle are near-grey, and a grey has no
 * chroma — so saturating it does nothing, scaling it does nothing but
 * change how light the grey is, and the centre of the sphere stayed a pale
 * wash however hard either dial was turned. You cannot make a grey shine by
 * multiplying it.
 *
 * So each grain is taken apart and reassembled:
 *
 *   hue          kept from the source pixel where the pixel actually has a
 *                colour, and otherwise taken from WHERE THE GRAIN SITS on
 *                the sphere, interpolated along a ramp that runs violet →
 *                magenta → burnt orange → amber. The neutral middle picks
 *                up the hues of the regions around it instead of going
 *                grey, and the orb's own colour structure survives wherever
 *                it had one.
 *   saturation   forced, not scaled. The whole point is that it no longer
 *                depends on how much colour the source happened to have.
 *   lightness    pushed into a dark band, which is what makes a grain read
 *                against white at all. The source's own lightness still
 *                modulates within that band, so the orb's light and shade
 *                are still legible — they are just both dark now.
 *
 * Dark and saturated is what reads as jewelled. Light and saturated only
 * ever reads as pastel, which is where the first three passes ended up. */

/** Hue stops, in degrees, as the grain's angle goes once round. */
const HUES = [272, 316, 368, 396];

/** Forced saturation, and the lightness band. */
const SAT = 0.6;
const L_LO = 0.3;
const L_HI = 0.53;

/** Below this much chroma a pixel is treated as having no hue of its own. */
const NEUTRAL = 0.16;

function rgbToHsl(r: number, g: number, b: number) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l };
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
  else if (max === gg) h = ((bb - rr) / d + 2) / 6;
  else h = ((rr - gg) / d + 4) / 6;
  return { h, s, l };
}

function hue2rgb(p: number, q: number, t: number) {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v] as const;
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ] as const;
}

/** Hue for a grain with no colour of its own, from where it sits. */
function rampHue(t: number) {
  const n = HUES.length;
  const f = t * n;
  const i = Math.floor(f) % n;
  const j = (i + 1) % n;
  const k = f - Math.floor(f);
  /* The stops run past 360 deliberately, so the interpolation from amber
     back round to violet goes the short way through red rather than
     reversing through the whole wheel. */
  const a = HUES[i];
  const b = HUES[j] < a ? HUES[j] + 360 : HUES[j];
  return (((a + (b - a) * k) % 360) + 360) % 360 / 360;
}

/** `px`/`py` are the grain's home position on the unit disc. */
/* Inside the glass the ground is the orb's own dark base, so the grains go
 * the other way: lifted toward white rather than pushed into a dark band.
 * Clamped, so the pale parts of the orb saturate at the limb where the
 * grains stack up — which is where a real one would blow out anyway. */
function shadeOnDark(r: number, g: number, b: number) {
  const k = 1.4;
  const c = (v: number) => Math.min(255, (v * k) | 0);
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}

function shade(r: number, g: number, b: number, px: number, py: number) {
  const src = rgbToHsl(r, g, b);
  const t = (Math.atan2(py, px) + Math.PI) / (Math.PI * 2);
  const h = src.s < NEUTRAL ? rampHue(t) : src.h;
  const l = L_LO + (L_HI - L_LO) * src.l;
  const [R, G, B] = hslToRgb(h, SAT, l);
  return `rgb(${R},${G},${B})`;
}

/** Smooth 0→1. */
function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export default function CoreOrb({
  orb = ORB_DEFAULT,
  controls = true,
  skin = "plain",
}: {
  orb?: number;
  /** The bench wants the cycle button and the caption; the chat does not. */
  controls?: boolean;
  /* "plain" is the grain sphere on the open page, with a silver rim and the
     real orb fading in when it settles.

     "glass" puts the same sphere INSIDE the orb: the orb's own base gradient
     behind it, its front glass — the SVG line work — over the top, and the
     photograph that normally sits between them replaced by the grains.

     The two differ in more than their chrome, and they have to. On the page
     the ground is white, so the grains are dark, saturated and composited
     normally. Inside the orb the ground is the orb's own near-black base,
     so they are bright and composited ADDITIVELY — which is the only way
     grains glow, and it is also what makes the white line work on top read,
     since white on white is nothing. */
  skin?: "plain" | "glass";
}) {
  const glass = skin === "glass";
  const reduced = useReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

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

  /* On the page the cell is bigger than the orb so the wobble has somewhere
     to go. Inside the glass there is nowhere to go — the orb's circle IS the
     boundary — so the cell is the orb and the sphere is drawn smaller
     instead, with the slack left as room for the wobble. */
  const SIZE = Math.round(glass ? orb : orb * 1.28);

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
    /* The merge. `flash` is set to 1 the moment the cloud arrives and then
       decays on its own clock — it is an event, not a function of energy,
       because energy passes through the same values on the way out and
       firing it then would flash the orb as it came APART. */
    let flash = 0;
    let prevEnergy = 0;

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
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      ctx.scale(dpr, dpr);

      const golden = Math.PI * (3 - Math.sqrt(5));
      const built: Grain[] = [];
      const half = SRC_PX / 2;
      const { count: grainCount, radius: grainR } = grainPlan(orb, dpr);
      for (let i = 0; i < grainCount; i++) {
        const y = 1 - ((i + 0.5) / grainCount) * 2;
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
          fill: glass
            ? shadeOnDark(data[o], data[o + 1], data[o + 2])
            : shade(data[o], data[o + 1], data[o + 2], x, y),
          seed: Math.random() * Math.PI * 2,
        });
      }
      grains = built;

      const C = SIZE / 2;
      const R = glass ? (orb / 2) * 0.86 : orb / 2;

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

        /* Arrival: condensing, and this frame is the one that crossed the
           threshold. */
        if (!thinkingRef.current && prevEnergy > FLASH_AT && energy <= FLASH_AT) {
          flash = 1;
        }
        prevEnergy = energy;
        flash = Math.max(0, flash - dt / FLASH_S);
        /* Sharp attack, long tail — a linear decay reads as a lamp being
           turned down rather than as something igniting. */
        const fl = flash * flash;

        /* GATHER. Over the last third of the condense the cloud draws in on
           itself slightly and comes back out, so the grains visibly close
           ranks before they land instead of simply stopping. The bump is
           zero at both ends, so it cannot disturb the arrival. */
        const gather = thinkingRef.current
          ? 0
          : Math.max(0, Math.min(1, 1 - e / 0.3));
        const squeeze = 1 - GATHER_PULL * 4 * gather * (1 - gather);

        spin += SPIN * e * dt * (Math.PI / 180);

        /* Hand over to the real orb as the sphere reforms.
           The orb is brought in on the flash rather than on a plain fade:
           `crisp` still sets the floor, but the flash lifts it the rest of
           the way at once, so the orb APPEARS in the bloom instead of
           ghosting up underneath a cloud that is still there. */
        const crisp = Math.max(0, Math.min(1, 1 - e / 0.22));
        if (glass) {
          /* Nothing is handed over. The grains ARE the orb's interior in
             this skin, so when it settles they settle — they do not get
             faded out from under a photograph that is not there. */
          canvas.style.opacity = "1";
        } else {
          const orbIn = Math.min(1, crisp + fl * 0.9);
          if (orbRef.current) orbRef.current.style.opacity = String(orbIn);
          if (fieldRef.current)
            fieldRef.current.style.opacity = String(1 - crisp);
          /* The cloud leaves faster than the orb arrives, so there is a
             beat of pure bloom between the two rather than a dissolve. */
          canvas.style.opacity = String(Math.max(0, 1 - crisp - fl * 0.75));
        }

        if (flashRef.current) {
          flashRef.current.style.opacity = String(fl);
          /* Expands as it dies — a bloom that holds its size reads as a
             circle being faded, not as light. */
          const k = 1 + (1 - flash) * 0.35;
          flashRef.current.style.transform = `translate(-50%,-50%) scale(${k})`;
        }

        ctx.clearRect(0, 0, SIZE, SIZE);
        /* Additive inside the glass: overlapping grains sum, so density
           becomes brightness and the limb lights itself. */
        ctx.globalCompositeOperation = glass ? "lighter" : "source-over";

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
          const h = pulse * squeeze * (1 + e * WOBBLE * (w + micro));

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
          /* Through the flash the grains swell and brighten, so the cloud
             blooms into the orb rather than being wiped off it. */
          const rad = grainR * p * (0.72 + depth * 0.55) * (1 + fl * 0.9);
          /* Depth, carried entirely by alpha now. On a white page a faint
             grain fades toward the paper, which is what reads as distance —
             the same cue the dark field used to get from dimming. */
          const a = Math.min(
            1,
            (glass ? 0.14 + depth * 0.62 : 0.22 + depth * 0.7) *
              (1 + fl * 1.1),
          );

          ctx.globalAlpha = a;
          ctx.fillStyle = gr.fill;
          ctx.beginPath();
          ctx.arc(sx, sy, rad, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
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
  }, [reduced, SIZE, orb, glass]);

  /* Both skins get the same controls, so the button and the caption are
     written once and wrapped around whichever stack is built. */
  function wrap(inner: React.ReactNode) {
    if (!controls) return inner;
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
          {inner}
        </button>
        <p className="text-[12px] text-[#9a9aa2]">
          {auto ? "Cycling — click to drive it" : thinking ? "Thinking" : "Done"}
        </p>
      </div>
    );
  }

  /* THE GLASS SKIN.
   *
   * The orb's own stack with its middle layer swapped out. `OrbV2` is three
   * things: a base gradient, a rotated blurred photograph, and an SVG of
   * white line work over the top. Here the base and the line work are kept
   * exactly as that component has them, and the photograph is replaced by
   * the grain sphere.
   *
   * The line work HAS to have something dark under it — every stroke in
   * that SVG is white or a gradient to white, so on an open page it is
   * invisible. That is why the base gradient stays even though the
   * "background" is what was asked to go: the background that goes is the
   * photograph. Take the base as well and the front glass disappears with
   * it.
   *
   * The sphere is drawn at 0.86 of the orb's radius. The circle is a hard
   * boundary here, and a wobble that reaches it gets sliced flat against
   * the inside of the glass. */
  if (glass) {
    const k = orb / 137.685;
    return wrap(
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: orb,
          height: orb,
          /* OrbV2's own base, verbatim. */
          background: "linear-gradient(to bottom, #181818, #525edf)",
        }}
        aria-hidden
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0"
          style={{ width: SIZE, height: SIZE, display: "block" }}
        />

        {/* The bloom, inside the glass with everything else. */}
        <div
          ref={flashRef}
          className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: orb * 1.1,
            height: orb * 1.1,
            background:
              "radial-gradient(circle, rgba(255,252,246,0.9) 0%, rgba(255,232,200,0.5) 40%, rgba(255,216,170,0) 74%)",
            transform: "translate(-50%,-50%)",
            opacity: 0,
          }}
        />

        {/* The front glass. Same asset, same geometry, same overhang as
            OrbV2 — it hangs off the top-left and the parent's clip trims it
            back to the sphere. `maxWidth: none`, because the CSS reset
            would otherwise squash art that is oversized on purpose. */}
        <Image
          src="/assets/orb-v2/overlay.svg"
          alt=""
          width={152.351 * k}
          height={156.941 * k}
          style={{
            position: "absolute",
            left: -7.614068508148193 * k,
            top: -9.941974639892578 * k,
            width: 152.351 * k,
            height: 156.941 * k,
            maxWidth: "none",
            pointerEvents: "none",
          }}
        />
      </div>,
    );
  }

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

      {/* THE BLOOM. Above the orb, below nothing — it is the moment of
          formation and it should wash over everything. Ships at opacity 0,
          which is what the loop starts it at too, so the server's markup
          and the first client frame agree. */}
      <div
        ref={flashRef}
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full"
        style={{
          width: orb * 1.25,
          height: orb * 1.25,
          background:
            "radial-gradient(circle, rgba(255,252,246,0.95) 0%, rgba(255,232,200,0.55) 38%, rgba(255,216,170,0) 72%)",
          transform: "translate(-50%,-50%)",
          opacity: 0,
          zIndex: 2,
        }}
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ width: SIZE, height: SIZE, display: "block", opacity: 0 }}
      />
    </div>
  );

  return wrap(stack);
}
