"use client";

import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { haptic } from "@/lib/haptics";
import { playTick, primeTicker } from "@/lib/tick";
import {
  DIAL_CX,
  DIAL_CY,
  DIAL_R,
  HANDLE_R,
  MAJOR_EVERY,
  MAX_RUPEES,
  POINTER_R_INNER,
  POINTER_R_OUTER,
  POINTER_W,
  RUPEES_PER_TICK,
  SHELL_H,
  SHELL_W,
  TICK_COUNT,
  TICK_FADE_DEG,
  TICK_PITCH_DEG,
  TICK_R_INNER,
  TICK_R_OUTER,
  TICK_W,
} from "./geometry";

/* The radial slider — Figma 1503:1139.
 *
 * A ruler wrapped onto a circle whose centre is 236px BELOW the bottom of
 * the screen, so you only ever see the top ~110° of it. The pointer is
 * fixed at twelve o'clock and the RULER turns underneath it, which is the
 * only arrangement that lets the value change without the thing you are
 * reading moving away from where you are looking.
 *
 *
 * WHY THE FALLOFF IS A MASK AND NOT PER-TICK OPACITY.
 *
 * Ticks fade with their angular distance from the pointer: full white
 * under it, gone by ±55°. That distance changes for every tick on every
 * frame as the ruler turns — so computing it per tick would mean writing
 * ~200 opacity values per frame through React, which is exactly the kind
 * of thing that turns a 120Hz drag into a slideshow.
 *
 * But the falloff is fixed in SCREEN space. It is a property of where you
 * are looking, not of which tick is there. So it is a `conic-gradient`
 * mask anchored to the dial's centre, and the ruler rotates underneath it
 * as a single composited transform. Nothing per-tick changes, ever; React
 * renders the ruler once and never touches it again.
 *
 * Two masked layers, not one, because minor and major ticks do not fade at
 * the same rate — measured on the render, the majors are still at 0.47
 * where the minors around them are at 0.11. One mask cannot express both.
 *
 *
 * ON "SMOOTH, LIKE AN APPLE DIAL": three things, and dropping any one of
 * them is what makes a web slider feel cheap.
 *
 *   1. It has MOMENTUM. Releasing mid-flick hands the velocity to an
 *      inertia animation rather than stopping dead at the finger.
 *   2. It SNAPS, but only at the end of that glide — `modifyTarget` moves
 *      the resting point to the nearest detent. Snapping during the drag
 *      makes the ruler stutter under the thumb.
 *   3. The detents are FELT AND HEARD, one per tick, at the moment the
 *      tick crosses the pointer — during the drag AND through the glide.
 *      See `lib/tick.ts` for why the click is synthesised.
 */

/* ── The falloff, measured ──────────────────────────────────────────────── */

/* Peak luminance per tick, sampled along arcs about the centre on the
 * 1503:544 render, converted to alpha over the scrim's own value of 36:
 * alpha = (L − 36) / (255 − 36). Normalised here so 0° is 1.0 and the
 * layer's own base opacity carries the absolute level.
 *
 * These are samples of a real curve, not a formula someone liked — the
 * minors fall off close to linearly in the middle and then flatten into a
 * long tail, which no single easing expression fits well. */
const MINOR_FALLOFF: Array<[number, number]> = [
  [0, 1], [3.5, 0.875], [7, 0.75], [11, 0.625], [15, 0.525], [19, 0.431],
  [23, 0.338], [28, 0.238], [34, 0.16], [40, 0.0875], [48, 0.0375], [TICK_FADE_DEG, 0],
];

const MAJOR_FALLOFF: Array<[number, number]> = [
  [0, 1], [9, 1], [17.75, 0.9], [26.6, 0.68], [35.6, 0.466], [44.5, 0.26],
  [TICK_FADE_DEG, 0.05], [60, 0],
];

/** A conic gradient, centred on the dial, that is opaque at twelve o'clock
 *  and fades away symmetrically either side of it. Conic stops run
 *  clockwise from the top, so the right-hand half is written forwards and
 *  the left-hand half is the same table mirrored into 360−a. */
function conicMask(table: Array<[number, number]>) {
  const stops: string[] = [];
  for (const [deg, a] of table) stops.push(`rgba(0,0,0,${a}) ${deg}deg`);
  const [lastDeg] = table[table.length - 1];
  stops.push(`rgba(0,0,0,0) ${360 - lastDeg}deg`);
  for (let i = table.length - 1; i >= 0; i--) {
    const [deg, a] = table[i];
    stops.push(`rgba(0,0,0,${a}) ${360 - deg}deg`);
  }
  return `conic-gradient(from 0deg at ${DIAL_CX}px ${DIAL_CY}px, ${stops.join(", ")})`;
}

/* ── The ruler ──────────────────────────────────────────────────────────── */

/* THE RULER IS A COMPLETE RING, not a strip with two ends.
 *
 * 400 ticks at 0.9° is exactly 360°, so whatever angle the dial is turned
 * to, the visible arc is full. Drawing only the live range left the ruler
 * visibly running out — at the top of the scale the right-hand half of the
 * arc was simply empty, which reads as a rendering fault rather than as
 * the end of a scale.
 *
 * The RANGE is still finite and still clamped: ₹0–₹12,800 is 256 of these
 * 400 ticks. The other 144 are ruler, not values. The limit is felt
 * (`dialLimit`) and enforced, never drawn — which is also what 1503:1880
 * shows, an evenly weighted ruler with no visible ends.
 *
 * Every tick is drawn at full strength for the same reason. The only thing
 * that varies the brightness is the mask, and the mask is a property of
 * where you are looking, not of which tick is there. */type Tick = { i: number; major: boolean };

/** 400 at 0.9° — one full turn. */
const RING = Math.round(360 / TICK_PITCH_DEG);

function buildTicks(): Tick[] {
  const out: Tick[] = [];
  for (let i = 0; i < RING; i++) out.push({ i, major: i % MAJOR_EVERY === 0 });
  return out;
}

/* Coordinates are rounded before they reach the DOM, and that is a
 * correctness fix rather than tidiness.
 *
 * `Math.sin`/`Math.cos` are not required by the spec to be correctly
 * rounded, and Node and V8-in-Chrome genuinely disagree in the last
 * couple of bits: this ruler server-rendered a tick at x1=40.936978984335326
 * and re-computed it as 40.936978984335354 on the client, which React
 * reports as a hydration mismatch — a red overlay on a screen where
 * nothing is actually wrong. Three decimals is far finer than a physical
 * pixel at any density and is identical on both sides.
 *
 * It is the same class of bug as the `useReducedMotion()` tree-branch in
 * `animation-visibility-traps`: invisible in normal development, because
 * it only appears once the server and the client have both had a turn. */
const round = (n: number) => Math.round(n * 1000) / 1000;

function Ruler({ ticks, major }: { ticks: Tick[]; major: boolean }) {
  return (
    <svg
      width={SHELL_W}
      height={SHELL_H}
      viewBox={`0 0 ${SHELL_W} ${SHELL_H}`}
      className="absolute inset-0"
      style={{ overflow: "visible" }}
      aria-hidden
    >
      {ticks
        .filter((t) => t.major === major)
        .map((t) => {
          /* Higher values clockwise — to the RIGHT of the pointer, in
             number-line order, the way a tape measure is printed. The
             ruler is then rotated by MINUS the value angle to bring them
             down to the pointer (see `spin` below), so the two signs
             disagree and the tick under the pointer is always the one the
             readout is showing.

             Getting both signs the same is the bug this had first: the
             tick landing under the pointer at value-angle A was the one
             at index −A, so raising the value scrolled the out-of-range
             lead-in ticks into view while the live ones fled the other
             way. */
          const a = t.i * TICK_PITCH_DEG;
          const rad = (a * Math.PI) / 180;
          const sin = Math.sin(rad);
          const cos = Math.cos(rad);
          /* Majors run a little longer at both ends. They read as brighter
             partly because they ARE brighter and partly because there is
             more of them to catch. */
          /* Majors are BRIGHTER, not longer. An earlier pass extended
             them 1.5px at each end and they read as a different kind of
             mark entirely — the reference keeps every tick the same
             length and separates the tens by weight alone. */
          const rIn = TICK_R_INNER;
          const rOut = TICK_R_OUTER;
          return (
            <line
              key={t.i}
              x1={round(DIAL_CX + rIn * sin)}
              y1={round(DIAL_CY - rIn * cos)}
              x2={round(DIAL_CX + rOut * sin)}
              y2={round(DIAL_CY - rOut * cos)}
              stroke="#FFFFFF"
              strokeWidth={major ? TICK_W + 0.4 : TICK_W}
              strokeLinecap="round"
            />
          );
        })}
    </svg>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

const MAX_ANGLE = TICK_COUNT * TICK_PITCH_DEG;

function RadialDial({
  value,
  onValue,
  interactive,
}: {
  /** Rupees. Owned by the parent so the readout and the dial cannot drift. */
  value: MotionValue<number>;
  onValue: (v: number) => void;
  interactive: boolean;
}) {
  const reduced = useReducedMotion() ?? false;
  const ticks = useMemo(() => buildTicks(), []);
  const minorMask = useMemo(() => conicMask(MINOR_FALLOFF), []);
  const majorMask = useMemo(() => conicMask(MAJOR_FALLOFF), []);

  /* Degrees the ruler has turned. The single source of truth for the
     gesture; `value` is derived from it, never the other way round. */
  const angle = useMotionValue(0);
  /* What the ruler is actually rotated by: minus the value angle.
     `angle` counts UP with the value; the ruler has to turn the other way
     to carry the higher ticks — drawn clockwise — back down to a pointer
     that never moves. */
  const spin = useTransform(angle, (v) => -v);
  const surface = useRef<HTMLDivElement>(null);

  const drag = useRef({
    active: false,
    pointerAngle: 0,
    startAngle: 0,
    /* Velocity as an EMA over recent samples rather than the last pair.
       A single frame's delta is dominated by whatever jitter the digitiser
       had on that frame, and handing that to the inertia animation makes
       identical flicks glide different distances. */
    velocity: 0,
    lastT: 0,
  });

  const lastTick = useRef(0);
  const atLimit = useRef(false);

  /* Where the pointer is, as an angle about the dial's centre. The centre
     is far below the screen, so a horizontal swipe near the top of the arc
     maps almost linearly onto rotation — which is why this reads as a
     swipe even though it is really a rotation. */
  const pointerAngleOf = useCallback((clientX: number, clientY: number) => {
    const el = surface.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    /* The shell may be scaled to fit the viewport, so frame coordinates
       have to come back through that scale before any trigonometry. */
    const sx = r.width / SHELL_W;
    const sy = r.height / SHELL_H;
    const x = (clientX - r.left) / sx;
    const y = (clientY - r.top) / sy;
    return (Math.atan2(x - DIAL_CX, DIAL_CY - y) * 180) / Math.PI;
  }, []);

  /* One detent crossed. Fires from the drag and from the inertia glide
     alike — a dial that only clicks while your finger is down feels dead
     the moment you let go, which is precisely when it is moving fastest. */
  const emitDetent = useCallback(
    (index: number, speedDegPerSec: number) => {
      const clamped = Math.min(TICK_COUNT, Math.max(0, index));
      const major = clamped % MAJOR_EVERY === 0;
      const speed = Math.min(1, Math.abs(speedDegPerSec) / 600);
      playTick(speed, major);
      haptic(major ? "dialMajor" : "dialDetent");
    },
    [],
  );

  /* Angle → value, plus the detent edge detection. Subscribing to the
     motion value rather than doing this in the pointer handler is what
     makes the glide click too: inertia drives `angle` directly. */
  useEffect(() => {
    const unsub = angle.on("change", (deg) => {
      const raw = deg / TICK_PITCH_DEG;
      const index = Math.round(raw);
      const clamped = Math.min(TICK_COUNT, Math.max(0, index));
      /* Everything downstream is quantised to the detent, so it only
         changes when the detent does. Publishing on every frame instead
         would put a React render behind each of the ~120 angle updates a
         second that a drag produces, to report a number that was the same
         117 of those times. */
      if (clamped !== lastTick.current) {
        emitDetent(clamped, angle.getVelocity());
        lastTick.current = clamped;
        value.set(clamped * RUPEES_PER_TICK);
        onValue(clamped * RUPEES_PER_TICK);
      }

      /* Held against either end. Announced once per arrival, not once per
         frame, or the limit buzzes continuously while you push into it. */
      const hard = deg <= 0.01 || deg >= MAX_ANGLE - 0.01;
      if (hard && !atLimit.current) {
        atLimit.current = true;
        haptic("dialLimit");
      } else if (!hard) {
        atLimit.current = false;
      }
    });
    return unsub;
  }, [angle, emitDetent, onValue, value]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!interactive) return;
      /* An AudioContext created outside a gesture is born suspended and
         plays nothing, silently. This is the gesture. */
      primeTicker();
      e.currentTarget.setPointerCapture(e.pointerId);
      angle.stop();
      drag.current = {
        active: true,
        pointerAngle: pointerAngleOf(e.clientX, e.clientY),
        startAngle: angle.get(),
        velocity: 0,
        lastT: performance.now(),
      };
    },
    [angle, interactive, pointerAngleOf],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d.active) return;
      const now = performance.now();
      const pa = pointerAngleOf(e.clientX, e.clientY);
      const prev = angle.get();
      /* Subtracted, so the RULER FOLLOWS THE FINGER. Drag right and the
         ruler slides right, carrying the lower values back under the
         pointer; drag left and it raises. That is how a tape measure and
         an iOS picker both behave, and it is the direction the surface
         moving with your thumb implies — the alternative reads as the
         ruler fighting you. */
      const next = Math.min(MAX_ANGLE, Math.max(0, d.startAngle - (pa - d.pointerAngle)));
      angle.set(next);

      const dt = (now - d.lastT) / 1000;
      if (dt > 0) {
        const v = (next - prev) / dt;
        /* 0.7 favours the recent sample enough to stay responsive while
           still rejecting a single bad frame. */
        d.velocity = d.velocity * 0.3 + v * 0.7;
        d.lastT = now;
      }
    },
    [angle, pointerAngleOf],
  );

  const endDrag = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;

    const snap = (t: number) =>
      Math.min(MAX_ANGLE, Math.max(0, Math.round(t / TICK_PITCH_DEG) * TICK_PITCH_DEG));

    if (reduced) {
      angle.set(snap(angle.get()));
      return;
    }

    animate(angle, snap(angle.get()), {
      type: "inertia",
      velocity: d.velocity,
      /* Tuned as a pair. `power` sets how far a flick throws and
         `timeConstant` how long it takes to give that distance back;
         raising one without the other either overshoots the whole scale
         or glides so long the dial feels greasy. These land a hard flick
         around 25–30 detents, which is roughly a third of the range. */
      power: 0.45,
      timeConstant: 330,
      min: 0,
      max: MAX_ANGLE,
      /* The ends are a wall, not a trampoline. A rubber-band bounce at ₹0
         is charming on a scroll view and wrong on a value you are
         choosing — it means the number briefly shows something you cannot
         actually pick. */
      bounceStiffness: 0,
      bounceDamping: 0,
      modifyTarget: snap,
      restDelta: 0.01,
    });
  }, [angle, reduced]);

  return (
    <div
      ref={surface}
      className="absolute inset-0"
      style={{
        /* The whole shell is the grab surface, but only where nothing else
           wants the pointer — the parent puts the card, the CTA and the
           close button above this in z-order, so they take their own
           events first. */
        touchAction: "none",
        cursor: interactive ? "ew-resize" : "default",
        zIndex: 2,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      role="slider"
      aria-label="Rupees to convert to points"
      aria-valuemin={0}
      aria-valuemax={MAX_RUPEES}
      aria-valuenow={Math.round(value.get())}
      tabIndex={interactive ? 0 : -1}
      onKeyDown={(e) => {
        if (!interactive) return;
        const step = e.shiftKey ? TICK_PITCH_DEG * MAJOR_EVERY : TICK_PITCH_DEG;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          primeTicker();
          angle.set(Math.min(MAX_ANGLE, angle.get() + step));
        } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          primeTicker();
          angle.set(Math.max(0, angle.get() - step));
        } else if (e.key === "Home") {
          e.preventDefault();
          angle.set(0);
        } else if (e.key === "End") {
          e.preventDefault();
          angle.set(MAX_ANGLE);
        }
      }}
    >
      {/* 1503:1141 — the thin arc the ruler stands on. It is a circle
          concentric with everything else, so rotating it would be a no-op;
          it stays out of the turning layers and takes the minor falloff. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ maskImage: minorMask, WebkitMaskImage: minorMask }}
        aria-hidden
      >
        <svg width={SHELL_W} height={SHELL_H} className="absolute inset-0">
          <circle
            cx={DIAL_CX}
            cy={DIAL_CY}
            r={DIAL_R}
            fill="none"
            stroke="rgba(255,255,255,0.45)"
            strokeWidth={1}
          />
        </svg>
      </div>

      {/* The two rulers.
      
          THE MASK IS ON THE STATIC PARENT AND THE RULER TURNS INSIDE IT.
          That nesting is the whole point and it was wrong at first: a CSS
          mask is resolved in the element's own coordinate space, so a mask
          on the rotating element ROTATES WITH IT — the bright zone slid
          off to one side as the dial turned and the ticks under the
          pointer went dim. The falloff has to live in screen space,
          because it describes where you are LOOKING, not which tick is
          there. Outer div masks, inner div spins.

          `rotate` on a MotionValue means framer writes a transform
          straight to the element every frame without a React render — the
          ruler is built once and never reconciled again. */}
      {[
        { major: false, mask: minorMask, opacity: 0.8 },
        { major: true, mask: majorMask, opacity: 1 },
      ].map((layer) => (
        <div
          key={String(layer.major)}
          className="pointer-events-none absolute inset-0"
          style={{
            maskImage: layer.mask,
            WebkitMaskImage: layer.mask,
            opacity: layer.opacity,
          }}
          aria-hidden
        >
          <motion.div
            className="absolute inset-0"
            style={{
              rotate: spin,
              /* The turn is about the dial's centre, which is off-screen
                 below — not about the element's own middle. */
              transformOrigin: `${DIAL_CX}px ${DIAL_CY}px`,
            }}
          >
            <Ruler ticks={ticks} major={layer.major} />
          </motion.div>
        </div>
      ))}

      {/* 1503:1145 and 1503:1167 — the pointer and its handle. Fixed at
          twelve o'clock, above both masks, never rotated and never faded:
          this is the thing you are reading the ruler against. */}
      <svg
        width={SHELL_W}
        height={SHELL_H}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <rect
          x={DIAL_CX - POINTER_W / 2}
          y={DIAL_CY - POINTER_R_OUTER}
          width={POINTER_W}
          height={POINTER_R_OUTER - POINTER_R_INNER}
          rx={1}
          fill="#FFFFFF"
        />
        <circle cx={DIAL_CX} cy={DIAL_CY - DIAL_R + 0.6} r={HANDLE_R} fill="#FFFFFF" />
      </svg>
    </div>
  );
}

/* Memoised, and that is load-bearing rather than a micro-optimisation.
 *
 * The parent re-renders on every frame of the green ramp and on every
 * detent. Without this, each of those renders would reconcile the ruler's
 * ~400 <line> elements — for a component whose output depends on nothing
 * that changed. Its three props are all stable: `value` is a motion value,
 * `onValue` is a `useState` setter, and `interactive` only flips when the
 * beat does. */
export default memo(RadialDial);
