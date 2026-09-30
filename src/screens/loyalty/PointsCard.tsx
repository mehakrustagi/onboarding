"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import GlowingEdge from "./GlowingEdge";
import { useEffect, useRef, useState } from "react";
import {
  ASSETS,
  CARD,
  CARD_BALANCE_Y,
  CARD_DELTA_Y,
  CARD_DOTS,
  CARD_LOGO,
  CARD_WASH,
  STREAM,
} from "./geometry";

/* The Maharaja Club card — Figma 1503:1176, and 1503:2631 after the drop.
 *
 * ONE INSTANCE, ALWAYS MOUNTED. The two nodes are the same card at two
 * positions, and this component never unmounts between them: the parent
 * animates its x/y/scale and the card carries its own contents along. That
 * is the difference between the card travelling down the screen and one
 * card disappearing while a second fades in somewhere else, and it is the
 * single most important structural decision on this screen.
 *
 * The face is the exported gradient SVG rather than a CSS `linear-gradient`.
 * Figma's gradient is declared in `userSpaceOnUse` coordinates that run well
 * outside the card's own box (x1 −99.8 → x2 373.5 across a 315-wide card),
 * so the four stops do not map onto a CSS gradient's normalised line without
 * being recomputed — and the card changes width during the drop, which would
 * move them again. The SVG carries `preserveAspectRatio="none"`, so stretching
 * it is exact at any size and costs one 759-byte request.
 */

/* The charge texture plays at double speed. The source loop is a leisurely
 * 2.03s drift, which is right for a card sitting still and too slow under a
 * beat where points are arriving every second or so — at 1× the sparks
 * appear to be hanging in the air rather than being drawn upward. */
const CHARGE_RATE = 2;

/* Opacity, and why it is not simply a number.
 *
 * Figma specifies 18%, and 18% is very nearly invisible over gold on a
 * phone — the sparks are small, low-contrast and moving, so faint is the
 * one thing they cannot be. But raising the opacity alone does not make
 * the sparks brighter, it makes the WHOLE FRAME more present, and the
 * frame is mostly a flat mid-grey field: at 42% it desaturated the top
 * half of the card to a muddy grey-gold.
 *
 * So the layer is crushed first and then screened. `brightness(0.5)
 * contrast(2.6)` drives the grey field down near black while leaving the
 * sparks bright, and `screen` adds light without ever darkening — near
 * black it contributes nothing, so the gold passes through untouched, and
 * where a spark is it adds almost all of it. The sparks end up far more
 * visible than at any plain opacity, and the card stays gold.
 *
 * The opacity is then high, because it is no longer carrying a grey
 * rectangle — only the highlights survive the crush. */
const CHARGE_OPACITY = 0.85;

/* Figma's bleed on the wash art, resolved to pixels once. */
const WASH_ART = {
  w: CARD_WASH.w * 1.5086,
  h: CARD_WASH.h * 3.3452,
  left: -CARD_WASH.w * 0.2543,
  top: -CARD_WASH.h * 1.1726,
};

/* The balance ticks up rather than cutting. It is the number the whole
 * screen is about, and a cut gives the eye nothing to follow — you are told
 * the total changed instead of watching it change. */
function useCountUp(target: number, run: boolean, ms: number) {
  const [n, setN] = useState(target);
  const reduced = useReducedMotion() ?? false;

  useEffect(() => {
    /* No `setN` on this path. When the count is not running the hook
       returns `target` directly (see the return below), so there is
       nothing to synchronise — and writing state straight from an effect
       body is a cascading render the compiler is right to reject. */
    if (!run || reduced) return;
    let raf = 0;
    const from = n;
    const delta = target - from;
    if (delta === 0) return;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      /* easeOutCubic — fast at first, then settling. A linear count reads
         as a stopwatch; this reads as an amount arriving. */
      const e = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + delta * e));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    /* `n` is deliberately not a dependency: it is the starting point,
       captured once when the run begins, and listing it would restart the
       animation on every frame it sets. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, run, reduced, ms]);

  /* Idle, or reduced motion: the number IS the target, with no state in
     the path at all. Only a live count reads from `n`. */
  return run && !reduced ? n : target;
}

export default function PointsCard({
  balance,
  delta,
  /** 0 → no green. 1 → the points are arriving. Drives the wash and the
   *  "+N pts" line together, because they are one event. */
  charge,
  /** True while the points are actually flowing, as opposed to merely
   *  having arrived — drives the pulse. */
  pulsing,
  /** The diagonal sheen of 1503:2729 — only on the settled frame. */
  sheen,
  counting,
  width,
}: {
  balance: number;
  delta: number;
  /* A plain number, deliberately, not a MotionValue. framer serialises a
     motion value in `style` differently on the server than React does on
     the client ("51.551px" against 51.551, plus an extra `transform:none`),
     which is a hydration mismatch and a red overlay on first paint. The
     cost of a number is one render per frame during the 620ms ramp, and
     `RadialDial` is memoised so that render never reaches the ruler's two
     hundred elements. */
  charge: number;
  pulsing: boolean;
  sheen: boolean;
  counting: boolean;
  width: number;
}) {
  const shown = useCountUp(balance, counting, 900);
  const reduced = useReducedMotion() ?? false;

  /* `playbackRate` has no JSX prop — it is a property on the element, not
     an attribute — so it has to be set imperatively once the element
     exists. Also re-applied on `loadedmetadata`: several browsers reset
     the rate to 1 when new media loads, so setting it only on mount
     silently reverts the moment the source is ready. */
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const apply = () => {
      v.playbackRate = CHARGE_RATE;
    };
    apply();
    v.addEventListener("loadedmetadata", apply);
    return () => v.removeEventListener("loadedmetadata", apply);
  }, [pulsing]);

  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height: CARD.h, borderRadius: CARD.radius }}
    >
      {/* The gold face.

          IT BRIGHTENS AS IT CHARGES. Very small numbers — 5% brightness,
          9% saturation at full — because this is the surface the balance
          is printed on, and anything stronger starts bleaching numerals
          that have to stay readable through the whole beat.
          The point is that the card itself responds, not just that
          something green is drawn on top of it. */}
      <Image
        src={`${ASSETS}/card-face.svg`}
        alt=""
        width={CARD.w}
        height={CARD.h}
        priority
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          filter: `brightness(${1 + charge * 0.05}) saturate(${1 + charge * 0.09})`,
        }}
      />

      {/* 1503:1186 — the dot field. Exported already rotated 180°, so it is
          placed as it comes rather than re-rotated here. */}
      <Image
        src={`${ASSETS}/card-dots.svg`}
        alt=""
        width={CARD_DOTS.w}
        height={CARD_DOTS.h}
        style={{
          position: "absolute",
          right: 20,
          top: CARD_DOTS.y,
          width: CARD_DOTS.w,
          height: CARD_DOTS.h,
        }}
      />

      {/* 1503:1185 — AIR INDIA / MAHARAJA CLUB. */}
      <Image
        src={`${ASSETS}/maharaja-logo.png`}
        alt="Air India Maharaja Club"
        width={CARD_LOGO.w * 3}
        height={CARD_LOGO.h * 3}
        style={{
          position: "absolute",
          left: CARD_LOGO.x,
          top: CARD_LOGO.y,
          width: CARD_LOGO.w,
          height: CARD_LOGO.h,
          objectFit: "contain",
          objectPosition: "bottom",
        }}
      />

      {/* The green wash — 1503:2042, masked to the card so only the top of
          the ellipse shows above the bottom edge.

          It is a child of the card's `overflow:hidden` box, which IS the
          mask; Figma expresses the same thing as a mask group. Scaling it
          up from nothing as it arrives, rather than only fading it in, is
          what makes it read as something welling up THROUGH the bottom
          edge instead of a green light being switched on.

          IT POOLS AND IT BREATHES. Two layers doing two jobs: the Figma
          ellipse spread wide along the bottom edge, and a tighter core
          sitting on the bottom centre. The core is what makes the green
          read as COLLECTING at one point rather than washing evenly
          across the whole edge — the points are arriving somewhere
          specific, and without it the card just tints green.

          The pulse is on the pair together, so they swell as one body of
          light. Period is 1.3s: slow enough to read as breathing, fast
          enough that three or four beats fit inside the 2.1s pull. A
          slower pulse over a beat this short is a single swell, which
          reads as the animation easing rather than as something alive —
          the same mistake the vault's rays made at 9–11s. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        /* Explicit `initial`, so the server renders a known transform and
           the client hydrates onto the same one. Letting framer infer it
           from the first keyframe of `animate` is what produced a
           `transform:none` / `transform:scale(0)` mismatch here before. */
        initial={{ scale: 1 }}
        animate={pulsing ? { scale: [1, 1.055, 1] } : { scale: 1 }}
        transition={
          pulsing
            ? { duration: 1.3, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.3 }
        }
        style={{ transformOrigin: "50% 100%" }}
      >
        {/* The broad spread — Figma's own ellipse. */}
        <motion.div
          className="absolute"
          style={{
            left: CARD_WASH.x,
            top: CARD_WASH.y,
            width: CARD_WASH.w,
            height: CARD_WASH.h,
            opacity: charge,
            /* NOT branched on `reduced`. `useReducedMotion` is false on the
               server and true on a client with the OS setting on, so any
               RENDERED style computed from it mismatches on hydration —
               this exact line shipped `transform:scale(0)` from the server
               and `transform:none` from the client.

               It does not need the branch: `charge` jumps straight to 1
               for reduced-motion users instead of ramping, so the wash
               arrives without animating either way. */
            scale: charge,
            transformOrigin: "50% 100%",
          }}
        >
          <Image
            src={`${ASSETS}/green-wash.svg`}
            alt=""
            width={Math.round(WASH_ART.w)}
            height={Math.round(WASH_ART.h)}
            style={{
              /* Figma bleeds this art well outside its frame (−117.26% /
                 −25.43%) because the blur needs somewhere to spread, and
                 keeping that bleed is what stops the glow ending on a
                 hard edge.

                 IN PIXELS, NOT PERCENTAGES. Written as percentages the
                 `left` applied and the `width` did not — `next/image`
                 emits its own width/height and the percentage width lost
                 — so the art was shifted 54px left by the negative offset
                 with nothing widening it to compensate. The green pooled
                 off the side of the card instead of under its middle, and
                 it measured 19px off centre against the reference's 4.
                 Percentages here depend on how the Image component
                 resolves them; pixels do not. */
              position: "absolute",
              left: WASH_ART.left,
              top: WASH_ART.top,
              width: WASH_ART.w,
              height: WASH_ART.h,
              /* `maxWidth: none` is REQUIRED, not defensive. Tailwind's
                 preflight sets `img { max-width: 100% }`, which silently
                 clamps any image wider than its container — this art is
                 150.86% of its box, so it was being capped to 100% while
                 the negative `left` still applied. The result was the glow
                 pooled off the left side of the card rather than under its
                 middle, measured 19px off centre against the reference's 4.
                 The same trap is in the vault's shine layer, which carries
                 the same override. */
              maxWidth: "none",
            }}
          />
        </motion.div>

        {/* The core, pooled on the bottom centre. Not in the node — this
            is the "collected" half of the brief. Half the spread's width
            and sitting lower, so it stacks inside the wash rather than
            beside it, and keyed to the same #24B251 the asset is filled
            with so the two read as one light and not as a green patch on
            a green patch. */}
        <motion.div
          className="absolute"
          style={{
            left: "50%",
            bottom: -26,
            width: 132,
            height: 76,
            x: "-50%",
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(68,232,116,0.95) 0%, rgba(36,178,81,0.55) 48%, rgba(36,178,81,0) 100%)",
            filter: "blur(13px)",
            opacity: charge,
            scale: charge,
            transformOrigin: "50% 100%",
          }}
        />
      </motion.div>

      {/* THE CHARGE TEXTURE — Figma 1514:3408, the card's charging fill.

          A 2s h264 loop of sparks drifting up the card, laid over the gold
          at 18% while the points arrive. It is the node's own media: the
          frame renders flat grey through `get_design_context` because the
          fill is a VIDEO, and the only way to get it is `export_video`.

          Mounted only while charging rather than hidden at opacity 0. A
          video element left in the tree decodes frames for the whole life
          of the screen to show nothing, and starting it at the commit also
          means the loop always begins at its first frame instead of
          wherever it happened to be.

          NO TOP-TO-BOTTOM SWEEP. A pass here rebuilt `Card3D`'s
          `activatePulse` — a bright band walking from the card's top edge
          to its bottom, with the dot field flaring as it passed. It was
          removed: this screen's light already travels UPWARD, from the
          gem through the bottom edge into the card, and a second light
          walking down it contradicted that at the exact moment the
          direction is the point. */}
      {pulsing && !reduced && (
        <video
          aria-hidden
          className="pointer-events-none absolute inset-0"
          ref={videoRef}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: CHARGE_OPACITY,
            filter: "brightness(0.5) contrast(2.6)",
            mixBlendMode: "screen",
            /* MASKED OFF BELOW 60%, and this is not optional.
            
               Node 1514:3408 is not a bare texture — it is the whole
               charging card, so the export has Figma's own "+1,800 pts"
               and its green wash BURNED INTO THE FRAMES at 80% down. Laid
               over our card at full height that put a second, frozen
               amount directly under the live one, which read as doubled
               text.

               Only the drifting sparks in the upper part of the frame are
               wanted here: the wash and the amount are already drawn, in
               the right colour and with the right number. The gradient
               fades rather than cuts so the sparks thin out instead of
               ending on a line. */
            maskImage:
              "linear-gradient(180deg, #000 0%, #000 52%, rgba(0,0,0,0.35) 66%, transparent 74%)",
            WebkitMaskImage:
              "linear-gradient(180deg, #000 0%, #000 52%, rgba(0,0,0,0.35) 66%, transparent 74%)",
          }}
          src={`${ASSETS}/charge.mp4`}
          /* All four are load-bearing for autoplay: browsers refuse to
             start an unmuted video without a gesture, and iOS refuses to
             play inline at all without `playsInline` — it would otherwise
             take the video fullscreen the moment Convert was tapped. */
          autoPlay
          muted
          loop
          playsInline
        />
      )}

      {/* NO EXPANDING RIPPLE, and no card-wide wave.

          A pass here drew rings leaving the card's bottom edge and
          spreading across the face. They were not wanted: rings crossing
          the gold read as an effect playing over the card rather than as
          the card receiving something, and they competed with the wash
          underneath for the same space.

          What carries the charge instead all lives ON the edge where the
          points actually arrive — the wash welling up through the bottom,
          a flash per lane at each point of contact, the strike bursting
          above it, and the card's own brightness lift and lit rim. The
          ripple was the only part that travelled into territory the
          design keeps clean. */}

      {/* The contact flash — the moment of each hit, in its own lane, on
          the same schedule as the ripple leaving it and the strike
          bursting above it. Three things, one event. */}
      {STREAM.map((p, i) => (
        <div
          key={`flash-${p.k}-${i}`}
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ opacity: charge, mixBlendMode: "screen" }}
        >
          <motion.div
            className="absolute"
            style={{
              left: `calc(50% + ${p.dx}px)`,
              bottom: -10,
              width: 96,
              height: 24,
              x: "-50%",
              borderRadius: "50%",
              background:
                "radial-gradient(closest-side, rgba(190,255,214,0.55) 0%, rgba(68,232,116,0.24) 55%, rgba(68,232,116,0) 100%)",
              filter: "blur(6px)",
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={pulsing ? { scale: [0.5, 1.15], opacity: [0, 1, 0] } : { scale: 0.5, opacity: 0 }}
            transition={
              pulsing
                ? {
                    scale: {
                      duration: p.dur * 0.55,
                      repeat: Infinity,
                      repeatDelay: p.dur * 0.45,
                      delay: p.delay + p.dur,
                      ease: "easeOut",
                    },
                    opacity: {
                      duration: p.dur * 0.55,
                      repeat: Infinity,
                      repeatDelay: p.dur * 0.45,
                      delay: p.delay + p.dur,
                      times: [0, 0.2, 1],
                      ease: "easeOut",
                    },
                  }
                : { duration: 0.3 }
            }
          />
        </div>
      ))}

      {/* 1503:1184 / 1503:1183 — the balance. */}
      <div
        className="absolute flex items-baseline justify-center"
        style={{ left: 0, right: 0, top: CARD_BALANCE_Y, gap: 4 }}
      >
        <span
          className="text-white"
          style={{
            fontFamily: "var(--font-denton), Georgia, serif",
            fontWeight: 700,
            fontSize: 32,
            lineHeight: "40px",
            /* See the note on the "Using" line — Playfair's default
               old-style figures are wrong for a balance. */
            fontVariantNumeric: "lining-nums",
          }}
        >
          {shown.toLocaleString("en-IN")}
        </span>
        <span
          style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 600,
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.12px",
            /* Figma paints this with a white → 60% white gradient rather
               than a flat grey, so it stays keyed to the white numeral
               beside it instead of reading as a different ink. */
            background: "linear-gradient(90deg, #FFFFFF 0%, rgba(255,255,255,0.6) 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          Pts
        </span>
      </div>

      {/* 1503:2046 — "+1,800 pts". Rises as it appears: it is the amount
          that just came up through the bottom edge, so it enters from
          below, travelling the same direction as the wash under it. */}
      <motion.p
        className="absolute text-center text-white"
        style={{
          left: 0,
          right: 0,
          top: CARD_DELTA_Y,
          fontFamily: "var(--font-inter), Inter, sans-serif",
          fontWeight: 600,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          opacity: charge,
        }}
      >
        +{delta.toLocaleString("en-IN")} pts
      </motion.p>

      {/* THE COMET GLARE — the specular sheet that comes with the tilt.
      
          Aceternity's `CometCard` pairs its 3D tilt with a glare, and the
          pairing is the point: a card that tilts without one reads as a
          flat rectangle being rotated, because a real surface changes how
          it catches light as it turns. This is that highlight.

          It is NOT driven by a pointer. The original tracks the mouse;
          this screen is playing a scripted sequence that nobody is
          hovering, so the glare runs on its own clock, on periods that are
          coprime with the tilt's so the two never lock into a loop you can
          predict. `overlay` rather than `screen` — on gold, screen blows
          the highlight out to white, where overlay keeps the metal in it. */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        /* 0.5, not 0.85. At full strength the sweep lifted the whole
           card toward a flat pale yellow and the gradient's depth went
           with it — the glare is meant to travel ACROSS the gold, not
           replace it. */
        style={{ mixBlendMode: "overlay", opacity: pulsing ? 0.5 : 0 }}
        initial={{ opacity: 0 }}
        transition={{ opacity: { duration: 0.4 } }}
      >
        <motion.div
          className="absolute"
          style={{
            top: "-60%",
            height: "220%",
            width: "34%",
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%)",
            filter: "blur(16px)",
            rotate: -22,
          }}
          initial={{ left: "-20%" }}
          animate={pulsing ? { left: ["-25%", "85%", "-25%"] } : { left: "-25%" }}
          transition={
            pulsing
              ? { left: { duration: 3.7, repeat: Infinity, ease: "easeInOut" } }
              : { duration: 0.4 }
          }
        />
      </motion.div>

      {/* 1503:2729/2730 — the diagonal sheen on the settled card. Two
          copies of one blurred bar on `soft-light`, which is why it
          brightens the gold without bleaching it: soft-light leaves the
          dark end of the gradient almost untouched and only lifts where
          the card is already bright.

          It SWEEPS rather than sitting there. The still frame has it
          parked mid-card, but this arrives at the end of a sequence about
          light, so it crosses once and settles. */}
      {sheen && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            width: "100%",
            height: "100%",
            mixBlendMode: "soft-light",
          }}
          initial={reduced ? { opacity: 1 } : { opacity: 0 }}
          animate={reduced ? { opacity: 1 } : { opacity: [0, 1, 1] }}
          transition={{ duration: 1.1, times: [0, 0.35, 1], ease: "easeOut" }}
        >
          <motion.div
            className="absolute"
            style={{
              top: "-60%",
              height: "220%",
              width: 46,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.95) 50%, rgba(255,255,255,0) 100%)",
              filter: "blur(17px)",
              /* 144.12° in Figma's frame is a bar leaning back to the
                 right; as a CSS rotation about the card's own centre that
                 is the same line at −36°. */
              rotate: -36,
            }}
            initial={reduced ? { left: "58%" } : { left: "-25%" }}
            animate={{ left: "58%" }}
            transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
          />
        </motion.div>
      )}
      {/* The lit edge. Last, so it draws over everything the card
          contains — a rim light that went under the artwork would be
          hidden by it along three of its four sides. */}
      <GlowingEdge radius={CARD.radius} charge={charge} />
    </div>
  );
}
