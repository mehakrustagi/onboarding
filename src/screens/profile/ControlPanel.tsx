"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useAnimationFrame,
} from "framer-motion";
import { haptic } from "@/lib/haptics";

/* Control panel — Figma section 878:8084 (frames 1556–1565), tunnel
 * interior from 853:72590.
 *
 * THE TUNNEL IS A CYLINDER, built from three parts stacked on one axis:
 *
 *   Union    274×328.5 — the fire column ABOVE the rim. Its bottom edge
 *            overlaps the rim by 26px (Figma: union bottom 107, rim top 81).
 *   rim      289×30 + 274×23 ellipses, flat #D9D9D9 — a solid platform,
 *            not a ring. This is the floor you drag the icon onto.
 *   wall     289×444 starting at the rim's centre line — the INSIDE of the
 *            shaft. Its two gradients are what make the dark frame read as
 *            a tube: a vertical falloff plus a specular stripe at 34.3%
 *            across. Without that stripe it's just a black rectangle.
 *
 * All three move as one unit, so the camera descending is a single y.
 *
 * Card-relative geometry (card 360×611 at sheet 40,146):
 *   rim rests at y 471, so the column sits at 471+26-328.5 = 168.5
 *   icon 80×80 at x 140 — CENTRED in the card — y 129
 *   title y 300, body 223 wide, hint y 540
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

const CARD = { x: 40, y: 146, w: 360, h: 611 };
const ICON_SIZE = 80;
const ICON_X = (CARD.w - ICON_SIZE) / 2;
const ICON_Y = 129;

const COL_W = 274;
const COL_H = 328.5;
const RIM_W = 289;
const RIM_H = 30;
/* How far the column's bottom edge sinks past the rim's top edge. */
const COL_OVERLAP = 26;

const WALL_W = 289;
const WALL_REST_H = 105; // the plinth in frame 1556
const WALL_DEEP_H = 444; // the full shaft (853:72593)

const RIM_REST_Y = 471;
const RIM_TOP_Y = 81;
/* Coming out the far end (1560→1562) the whole tunnel is MIRRORED — Figma
 * carries -scale-y-100 / rotate-180 on every element, so the column hangs
 * BELOW the rim with gold at the top. 1562 pins the rotated column at card
 * y 87.5, and since a flip about the rim's centre maps the column's near
 * edge to rim+4, that puts the rim at 83.5. It enters low and rises. */
const RIM_EXIT_Y = 83.5;
const RIM_ENTER_Y = 300;

/* The far platform (853:73415) — 297×120 at card y 491. Its asset is the
 * same rim ellipses over the same 289×105 plinth: the tunnel's other mouth,
 * seen from above. */
const PLATFORM_Y = 491;
/* The descent out of the far end, as three Figma waypoints:
 *   1562 (853:73407) top 209.5 — still inside the column, masked, tinted
 *   1563 (853:73618) top 311.5 — clear of it, unmasked, plain white
 *   1564 (853:73830) top 381.5 — at rest, ~30px clear of the platform
 * The gaps shrink 102 → 70, so stepping through them decelerates into the
 * landing on its own; no easing has to fake it. */
const ICON_EXIT_Y = 209.5;
const ICON_MID_Y = 311.5;
const ICON_LAND_Y = 381.5;

/* Frame 1557 puts the icon at card (140, 435) — dead centre horizontally,
 * sunk so its middle sits 11px above the rim's centre line. That travel is
 * the drag's full throw. */
const ICON_SUNK_Y = 435;
const BREAK_AT = ICON_SUNK_Y - ICON_Y;

/* The column's origin in card space. 1557 masks the icon with the Union
 * shape pinned here, so the icon's bottom is clipped by the same curve
 * that wraps the rim — that's what makes it read as sinking IN rather
 * than resting on top. */
const COL_X = 43;
const COL_Y = 168.5;

/* The icon's mask is NOT the column shape. Using the column directly puts
 * its top edge at icon-y 39.5 at rest, which slices the icon in half —
 * Figma dodges this by simply not masking frame 1556 and only masking
 * 1557. What is actually meant is that the column's BOTTOM CURVE clips the
 * icon as it sinks, and the top edge never does.
 *
 * So this mask carries the same bottom arc with the body extended 400px
 * upward: the arc still lands exactly where the column's does, but there
 * is no top edge left to cut against. */
const ICON_MASK = "url(/assets/profile/tn-icon-mask.svg)";
const ICON_MASK_H = 728.5;
const ICON_MASK_LIFT = ICON_MASK_H - COL_H; // 400 — keeps the arc aligned

const ORB_BG = "linear-gradient(180deg, #ffffff 0%, #999999 100%)";
const ORB_SHADOW = "0 5px 7.5px rgba(0,0,0,0.06)";

/* Union's gradient, exactly: axis (165,29.5)→(147.038,350.062) over
 * 274×328.5 — 3.2° off vertical, leaning left — with #5D64FF at 10.7%
 * carrying stop-opacity 0, so the top dissolves into black rather than
 * ending on a colour. */
const FIRE =
  "linear-gradient(183.2deg, rgba(93,100,255,0) 10.7%, rgba(255,89,89,1) 74.5%, rgba(255,226,61,1) 92.6%)";

/* The column is NOT a rectangle — Union's path closes on an elliptical arc
 * so its bottom wraps the rim, and Figma stacks it ON TOP of both
 * ellipses. That's why the rim reads gold in the render: it's #D9D9D9 with
 * the column's bright bottom laid over it. The flame layers are masked to
 * the same path so they can't spill past that curve. */
const COL_MASK = "url(/assets/profile/tn-col-mask.svg)";

/* The flame layers ride UP the column, which means the slice of gradient
 * sitting at the column's top edge is no longer the transparent one — it
 * has colour, and the shape mask cuts it dead, drawing a hard horizontal
 * line across the tunnel mouth (and across the icon, which straddles it).
 *
 * So the flames get a SECOND mask layer intersected with the shape: a
 * vertical fade that takes them to zero well before the top edge. Now
 * there is nothing left to cut, whatever they do. */
const FLAME_MASK = `${COL_MASK}, linear-gradient(180deg, transparent 0%, transparent 6%, black 34%)`;
const FLAME_MASK_STYLE = {
  maskImage: FLAME_MASK,
  WebkitMaskImage: FLAME_MASK,
  maskSize: "100% 100%, 100% 100%",
  WebkitMaskSize: "100% 100%, 100% 100%",
  maskRepeat: "no-repeat, no-repeat",
  WebkitMaskRepeat: "no-repeat, no-repeat",
  maskComposite: "intersect",
  WebkitMaskComposite: "source-in",
} as const;

/* Node 853:72593 verbatim. The 90deg layer is a specular stripe running
 * down the tube at 34.3% across — the single detail that turns a black
 * rectangle into the inside of a cylinder. */
const WALL =
  "linear-gradient(0deg, rgba(217,217,217,0) 0%, rgba(115,115,115,0.4) 100%), " +
  "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(195,187,187,0.2) 34.322%, rgba(102,102,102,0) 100%)";

/* 1565 (853:74017). The Gmail orb slides right to x210, the Atlys plus
 * arrives at x70, a link joins them at y423.49, and the warning lands at
 * y242 — all while the tunnel's gradient goes out. */
const ICON_SPLIT_X = 70;
const LINK_Y = 423.49;

type Stage = "idle" | "plunge" | "dark" | "exit" | "land" | "done" | "final";

const SEQ: Partial<Record<Stage, [Stage, number]>> = {
  plunge: ["dark", 1050],
  dark: ["exit", 780],
  exit: ["land", 820],
  land: ["done", 1150],
  /* A real rest. The icon has landed, and the tunnel's light drains out
     around it before anything else happens — 650ms read as a stumble
     between two states rather than as an arrival. */
  done: ["final", 1700],
};

export default function ControlPanel({
  onBack,
  onDisconnect,
}: {
  onBack?: () => void;
  /** Opens the disconnect terms (853:74070). That page is full-bleed
   *  440×965, so it is hosted by ProfileScreen rather than by the settings
   *  sheet this panel lives in. */
  onDisconnect?: () => void;
}) {
  const [stage, setStage] = useState<Stage>("idle");

  /* Raw drag offset, and the SPRUNG value everything reads from. The lag
     between finger and icon is the friction, before any curve applies. */
  const dragY = useMotionValue(0);
  const y = useSpring(dragY, { stiffness: 260, damping: 32, mass: 1.1 });

  /* The icon moves less than the finger, and progressively less the
     further it goes — a magnet fights harder the more you pull. Linear
     drag would only read as "heavy". */
  const pulled = useTransform(y, (v) => {
    const t = Math.max(0, v);
    return t - (t * t) / (BREAK_AT * 2.6);
  });
  const progress = useTransform(pulled, [0, BREAK_AT], [0, 1]);
  const iconScale = useTransform(progress, [0, 1], [1, 0.9]);
  /* The fire rises to meet the icon — frame 1556 → 1557 is one scrub, not
     two states. */
  const fireLit = useTransform(progress, [0, 1], [0.85, 1]);
  const copyFade = useTransform(progress, [0, 0.55], [1, 0]);

  /* The icon never sits still — it floats, and the closer it gets to the
     mouth the faster and tighter that float becomes, so the magnet reads
     as vibrating the thing it's fighting.

     PHASE IS ACCUMULATED rather than computed from elapsed time. Feeding a
     changing frequency into sin(t * hz) makes the wave jump every time hz
     moves; integrating it keeps the curve continuous through the speed-up. */
  const bob = useMotionValue(0);
  const phase = useRef(0);
  useAnimationFrame((_, delta) => {
    const p = stage === "idle" ? progress.get() : 0;
    const hz = 0.42 + p * 3.1;
    phase.current += (delta / 1000) * hz * Math.PI * 2;
    // Amplitude shrinks as speed rises — held tighter, not thrown harder.
    bob.set(Math.sin(phase.current) * (6.5 - p * 3.6));
  });
  const iconY = useTransform([pulled, bob], ([a, b]) => (a as number) + (b as number));

  /* Keeps the Union mask pinned to card space while the icon moves through
     it, so the clip stays put rather than travelling with the sprite. */
  /* 1556 → 1557: the fade grows 39→53 and rises 81→67 above the rim. */
  const fadeY = useTransform(progress, [0, 1], [81, 67]);
  const fadeH = useTransform(progress, [0, 1], [39, 53]);

  const maskPos = useTransform(
    iconY,
    (v) => `${COL_X - ICON_X}px ${COL_Y - ICON_Y - v - ICON_MASK_LIFT}px`,
  );

  /* Many small ticks read as friction; one long buzz reads as an error. */
  const lastTick = useRef(0);
  /* Where the drag let go, so the plunge continues the gesture instead of
     teleporting to a hard-coded start. State rather than a ref: the flight
     element reads it as its `initial` during render, and a ref cannot be
     read there. Both updates batch inside commit(), so the element mounts
     already knowing where the icon was. */
  const [releaseY, setReleaseY] = useState(0);
  useEffect(() => {
    if (stage !== "idle") return;
    return pulled.on("change", (v) => {
      if (v <= 8) return;
      const step = Math.floor(v / 14);
      if (step !== lastTick.current) {
        lastTick.current = step;
        haptic("dragResist");
      }
    });
  }, [pulled, stage]);

  useEffect(() => {
    const next = SEQ[stage];
    if (!next) return;
    const t = window.setTimeout(() => {
      if (next[0] === "done") haptic("tunnelExit");
      setStage(next[0]);
    }, next[1]);
    return () => window.clearTimeout(t);
  }, [stage]);

  const commit = () => {
    setReleaseY(pulled.get());
    haptic("dragBreak");
    setStage("plunge");
    window.setTimeout(() => haptic("tunnelEnter"), 90);
  };

  /* Where the rim sits. At rest it's the floor you drag toward; every
     other stage has it near the top with the shaft running down below,
     which is the whole camera move. */
  const flipped =
    stage === "exit" || stage === "land" || stage === "done" || stage === "final";
  const rimY =
    stage === "idle"
      ? RIM_REST_Y
      : stage === "plunge"
        ? RIM_TOP_Y
        : stage === "dark"
          ? // Snapped low and mirrored while the shaft hides it, so the
            // exit can rise into frame instead of sliding down into it.
            RIM_ENTER_Y
          : RIM_EXIT_Y;
  /* Deep while travelling — the shaft opens up beneath you. */
  const wallH = stage === "idle" ? WALL_REST_H : WALL_DEEP_H;

  return (
    <div className="absolute inset-0 overflow-hidden bg-white" style={{ borderRadius: 44 }}>
      <button
        type="button"
        aria-label="Back"
        onClick={onBack}
        className="absolute flex items-center justify-center"
        style={{
          zIndex: 10,
          left: 30,
          top: 30,
          width: 50,
          height: 50,
          borderRadius: 27,
          background: "#f4f4f6",
        }}
      >
        <Image
          src="/assets/profile/arrow-back.svg"
          alt=""
          width={24}
          height={24}
          style={{ width: 24, height: 24, display: "block" }}
        />
      </button>

      <Image
        src="/assets/profile/cn-db.svg"
        alt=""
        width={24}
        height={24}
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: 40, width: 24, height: 24 }}
      />
      <p
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase"
        style={{
          top: 80,
          fontSize: 11,
          lineHeight: "14px",
          letterSpacing: "0.88px",
          color: "#000000",
        }}
      >
        Connectors
      </p>

      <div
        className="absolute overflow-hidden"
        style={{
          left: CARD.x,
          top: CARD.y,
          width: CARD.w,
          height: CARD.h,
          borderRadius: 30,
          background: "#000000",
        }}
      >
        {/* ── The tunnel. Column, wall and rim ride one y. ───────────── */}
        <motion.div
          className="absolute left-0 w-full"
          style={{
            top: 0,
            height: 0,
            // About the rim's centre, so the rim itself stays put and
            // everything else mirrors around it.
            transformOrigin: `50% ${RIM_H / 2}px`,
          }}
          initial={false}
          animate={{
            y: rimY,
            scaleY: flipped ? -1 : 1,
            opacity: stage === "dark" ? 0 : 1,
          }}
          transition={
            stage === "dark"
              ? { duration: 0 }
              : stage === "plunge"
              ? // Accelerating — a descent has to build, not glide.
                { duration: 1.05, ease: [0.5, 0, 0.85, 0.35] }
              : { duration: 0.85, ease: IN_EASE }
          }
        >
          {/* Heat spilling off the top of the column into the black. */}
          <motion.div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2"
            style={{
              width: COL_W + 120,
              height: 190,
              top: COL_OVERLAP - 150,
              borderRadius: "50%",
              background:
                "radial-gradient(closest-side, rgba(255,226,61,0.4) 0%, rgba(255,137,60,0.2) 46%, rgba(255,137,60,0) 100%)",
              filter: "blur(18px)",
            }}
            animate={{
              scale: [1, 1.09, 0.97, 1],
              opacity: stage === "done" || stage === "final" ? 0 : 1,
            }}
            transition={{
              scale: { duration: 5.6, repeat: Infinity, ease: "easeInOut" },
              opacity: { duration: 1.35, ease: "linear" },
            }}
          />

          {/* The shaft wall — 853:72593 verbatim. Grows from the plinth in
              frame 1556 to the full 444 as you go down. */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ width: WALL_W, top: RIM_H / 2, background: WALL }}
            initial={false}
            animate={{ height: wallH }}
            transition={{ duration: 0.9, ease: IN_EASE }}
          />

          {/* Rim. Flat #D9D9D9 — a solid platform, and opaque, which is
              why the shaft below it is only visible once you're through. */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ width: RIM_W, height: RIM_H, top: 0 }}
          >
            <Image
              src="/assets/profile/f1556-e18.svg"
              alt=""
              width={RIM_W}
              height={RIM_H}
              style={{ width: RIM_W, height: RIM_H, display: "block" }}
            />
          </div>
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ width: 274, height: 23, top: 3 }}
          >
            <Image
              src="/assets/profile/f1556-e19.svg"
              alt=""
              width={274}
              height={23}
              style={{ width: 274, height: 23, display: "block" }}
            />
          </div>

          {/* Fire column. The base is Figma's own Union asset, so the
              path, the gradient axis and its fill-opacity 0.6 are exact.
              The flames are the SAME gradient masked to that path, creeping
              upward under plus-lighter — light adding to light is what
              flame does, where cross-fading opacity only reads as a
              dimmer. */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              width: COL_W,
              height: COL_H,
              top: COL_OVERLAP - COL_H,
              isolation: "isolate",
              overflow: "hidden",
              opacity: stage === "idle" ? fireLit : 1,
            }}
          >
            <Image
              src="/assets/profile/f1556-u.svg"
              alt=""
              width={COL_W}
              height={COL_H}
              style={{ width: COL_W, height: COL_H, display: "block" }}
            />

            {FLAMES.map((f, i) => (
              <motion.div
                key={i}
                className="absolute left-0 top-0 w-full"
                style={{
                  height: COL_H,
                  background: FIRE,
                  opacity: f.opacity,
                  mixBlendMode: "plus-lighter",
                  transformOrigin: "50% 100%",
                  ...FLAME_MASK_STYLE,
                }}
                // Rises and stretches — heat leaving the source. The three
                // periods are deliberately incommensurate, so the layers
                // never resynchronise into a visible pulse.
                animate={{
                  y: [0, -f.rise, 0],
                  scaleY: [1, f.stretch, 1],
                  scaleX: [1, f.lick, 1],
                }}
                transition={{
                  y: { duration: f.dur, repeat: Infinity, ease: "easeInOut" },
                  scaleY: {
                    duration: f.dur * 1.37,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                  scaleX: {
                    duration: f.dur * 0.81,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              />
            ))}

            {/* The gradient going out. Figma models this as a "Mask group"
                over the column from 1563 onward — its fill is a
                backdrop-filter, which exports as an EMPTY <g>, so the
                asset is no help and the four renders are the only record:
                bright at 1562, dimmer through 1563–64, gone by 1565.
                Matching that ramp rather than the (unchanged) Union. */}
            <motion.div
              className="absolute inset-0"
              style={{
                background: "#000000",
                maskImage: COL_MASK,
                WebkitMaskImage: COL_MASK,
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%",
                maskRepeat: "no-repeat",
                WebkitMaskRepeat: "no-repeat",
              }}
              initial={false}
              animate={{
                opacity:
                  stage === "final" || stage === "done"
                    ? 1
                    : stage === "land"
                      ? 0.35
                      : 0,
              }}
              // Slow on the way out — this IS the light dying, and it
              // should be the only thing happening while it does.
              transition={{ duration: stage === "done" ? 1.35 : 1.1, ease: "linear" }}
            />

            {/* Flicker. Small and irregular — a big swing reads as a fault
                in the render rather than as fire. */}
            <motion.div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(0deg, rgba(255,226,61,0.45) 0%, rgba(255,137,60,0.14) 38%, rgba(255,137,60,0) 70%)",
                mixBlendMode: "plus-lighter",
                ...FLAME_MASK_STYLE,
              }}
              // Renders AFTER the veil under plus-lighter, so left running
              // it would add light straight back over the blackout.
              animate={
                stage === "done" || stage === "final"
                  ? { opacity: 0 }
                  : { opacity: [0.3, 0.55, 0.36, 0.62, 0.32, 0.5, 0.3] }
              }
              transition={
                stage === "done" || stage === "final"
                  ? { duration: 1.35, ease: "linear" }
                  : { duration: 4.3, repeat: Infinity, ease: "easeInOut" }
              }
            />
          </motion.div>

        </motion.div>

        {/* Copy (1556). Gone by 1557, so it rides the drag out. */}
        <motion.div
          className="absolute left-0 w-full text-center"
          style={{ top: 300, opacity: stage === "idle" ? copyFade : 0 }}
        >
          <p
            className="font-semibold text-white"
            style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.14px" }}
          >
            Atlys x Gmail
          </p>
          <p
            className="mx-auto font-semibold"
            style={{
              marginTop: 10,
              width: 223,
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              backgroundImage: "linear-gradient(90deg, #eaeaea, #666)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Your travel details, bookings and updates are already there.
            Connecting email helps the agent understand and act on them
            without asking you to find or share everything manually.
          </p>
        </motion.div>

        {/* Bottom fade. 1556 has it 297×39 at rim+81 (853:71820); by
            1557 it has grown and risen to 297×53 at rim+67 (853:72425), so
            it tracks the drag rather than cutting between two states. Kept
            as its own element from the travel fade — one div can't take a
            MotionValue and an `animate` on the same property. */}
        <motion.div
          className="pointer-events-none absolute"
          style={{
            left: 31,
            width: 297,
            top: RIM_REST_Y,
            y: fadeY,
            height: fadeH,
            opacity: stage === "idle" ? 1 : 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000000 100%)",
          }}
        />

        {/* The deep fade, once you're inside the shaft (853:72608). */}
        <motion.div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            width: 297,
            height: 220,
            top: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0) 0%, #000000 100%)",
          }}
          initial={false}
          animate={{ y: rimY + 239, opacity: stage === "idle" ? 0 : 1 }}
          transition={
            stage === "plunge"
              ? { duration: 1.05, ease: [0.5, 0, 0.85, 0.35] }
              : { duration: 0.85, ease: IN_EASE }
          }
        />

        {/* Frame 1559 — deep inside, no rim at either end. NOT a black
            overlay: it's the shaft wall filling the card, so the specular
            stripe still curves the tube around you. Painting it flat black
            loses the tunnel entirely and reads as a dropped frame. */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ backgroundColor: "#000000" }}
          initial={false}
          animate={{ opacity: stage === "dark" ? 1 : 0 }}
          transition={{ duration: stage === "dark" ? 0.42 : 0.5, ease: "linear" }}
        >
          {/* WIDTH 289, not the card's 360. The shaft is a fixed-bore tube
              — painting this edge to edge makes the tunnel appear to flare
              open in the middle of the fall and close again on the way out.
              Same width at every depth is what keeps it one tunnel. */}
          <div
            className="absolute left-1/2 -translate-x-1/2"
            style={{ top: 0, bottom: 0, width: WALL_W, backgroundImage: WALL }}
          />
        </motion.div>

        {/* The far platform (853:73415). Rises out of the dark once you're
            through, then the icon settles onto it. */}
        <motion.div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{ top: PLATFORM_Y, width: 297, height: 120 }}
          initial={false}
          animate={{
            opacity: flipped ? 1 : 0,
            y: flipped ? 0 : 40,
          }}
          transition={{ duration: 0.75, ease: IN_EASE }}
        >
          <Image
            src="/assets/profile/tn-platform.svg"
            alt=""
            width={297}
            height={120}
            style={{ width: 297, height: 120, display: "block" }}
          />
        </motion.div>

        {/* ── The icon. Centred in the card. ───────────────────────── */}
        {/* The icon is TWO elements, not one.
            The drag needs frame-accurate MotionValues on `style`; the
            stage sequence needs `animate` on the same properties. A
            MotionValue handed to `style` stays bound to the element for
            its lifetime — setting it to undefined later does NOT detach
            it — so a single element leaves the two fighting over y, and
            the sequence renders from wherever the motion value happens to
            sit rather than from its own target. Splitting them keeps each
            binding clean. */}
        {stage === "idle" ? (
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: BREAK_AT + 70 }}
            dragElastic={0}
            dragMomentum={false}
            onDragStart={() => haptic("dragGrab")}
            onDrag={(_, info) => dragY.set(info.offset.y)}
            onDragEnd={(_, info) => {
              if (info.offset.y >= BREAK_AT) commit();
              else {
                // Didn't clear the threshold — the magnet wins.
                dragY.set(0);
                lastTick.current = 0;
              }
            }}
            className="absolute flex items-center justify-center"
            style={{
              left: ICON_X,
              top: ICON_Y,
              width: ICON_SIZE,
              height: ICON_SIZE,
              borderRadius: 100,
              background: ORB_BG,
              boxShadow: ORB_SHADOW,
              cursor: "grab",
              zIndex: 3,
              y: iconY,
              maskImage: ICON_MASK,
              WebkitMaskImage: ICON_MASK,
              maskSize: `274px ${ICON_MASK_H}px`,
              WebkitMaskSize: `274px ${ICON_MASK_H}px`,
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              maskPosition: maskPos,
              WebkitMaskPosition: maskPos,
            }}
          >
            <motion.div
              className="flex items-center justify-center"
              style={{ scale: iconScale }}
            >
              <Image
                src="/assets/profile/tn-gmail.png"
                alt=""
                width={56}
                height={56}
                unoptimized
                style={{ width: 56, height: 56, display: "block" }}
              />
            </motion.div>

            {/* The field pushing back, so the resistance is visible as
                well as felt. */}
            <motion.span
              className="pointer-events-none absolute"
              style={{
                inset: -13,
                borderRadius: 100,
                border: "1px solid rgba(255,226,61,0.7)",
                opacity: progress,
              }}
            />
          </motion.div>
        ) : (
          <motion.div
            className="absolute flex items-center justify-center"
            style={{
              left: ICON_X,
              top: ICON_Y,
              width: ICON_SIZE,
              height: ICON_SIZE,
              borderRadius: 100,
              background: ORB_BG,
              boxShadow: ORB_SHADOW,
              zIndex: 3,
            }}
            initial={{ x: 0, y: releaseY, scale: 0.9, opacity: 1 }}
            animate={
              stage === "plunge"
                ? { x: 0, y: BREAK_AT + 170, scale: 0.28, opacity: 0 }
                : stage === "dark"
                  ? // Parked just under the exit rim, waiting to drop out.
                    { x: 0, y: RIM_EXIT_Y - ICON_Y + 30, scale: 0.32, opacity: 0 }
                  : stage === "exit"
                    ? // 1562 — emerges inside the column.
                      { x: 0, y: ICON_EXIT_Y - ICON_Y, scale: 1, opacity: 1 }
                    : stage === "final"
                      ? // 1565 — steps aside for the Atlys orb.
                        { x: ICON_SPLIT_X, y: ICON_LAND_Y - ICON_Y, scale: 1, opacity: 1 }
                      : stage === "done"
                        ? // Landed. Holds exactly where the fall left it;
                          // re-running the keyframes here restarts them.
                          { x: 0, y: ICON_LAND_Y - ICON_Y, scale: 1, opacity: 1 }
                        : // 1563 then 1564, as one continuous fall.
                          {
                            x: 0,
                            y: [
                              ICON_EXIT_Y - ICON_Y,
                              ICON_MID_Y - ICON_Y,
                              ICON_LAND_Y - ICON_Y,
                            ],
                            scale: 1,
                            opacity: 1,
                          }
            }
            transition={
              stage === "plunge"
                ? { duration: 0.62, ease: [0.5, 0, 0.9, 0.4] }
                : stage === "final"
                  ? // Waits for the warning to land before stepping aside.
                    { duration: 0.72, ease: IN_EASE, delay: 0.62 }
                  : stage === "done"
                    ? { duration: 0 }
                    : stage === "land"
                      ? {
                          duration: 1.15,
                          // Even split; the shrinking gaps supply the
                          // deceleration, so the easing stays gentle
                          // rather than doubling up on it.
                          times: [0, 0.5, 1],
                          ease: "easeOut",
                        }
                      : stage === "exit"
                        ? { duration: 0.7, ease: IN_EASE }
                        : { duration: 0.01 }
            }
          >
            <Image
              src="/assets/profile/tn-gmail.png"
              alt=""
              width={56}
              height={56}
              unoptimized
              style={{ width: 56, height: 56, display: "block" }}
            />

            {/* 1562 stacks the icon UNDER the column, so the 0.6-alpha
                gradient tints it; by 1564 it is drawn over everything,
                clean and white. Flipping z-order mid-descent would pop, so
                the tint rides the icon and fades as it clears the column. */}
            <motion.span
              className="pointer-events-none absolute inset-0"
              style={{ borderRadius: 100, background: FIRE, mixBlendMode: "multiply" }}
              initial={false}
              animate={{ opacity: stage === "exit" ? 0.55 : 0 }}
              transition={{ duration: stage === "exit" ? 0.7 : 0.45, ease: IN_EASE }}
            />
          </motion.div>
        )}

        {/* 1565 — the Atlys orb arrives on the left (853:74044). Same
            shell as the Gmail one, carrying the four-colour plus turned
            90°. */}
        <motion.div
          className="pointer-events-none absolute flex items-center justify-center"
          style={{
            left: 70,
            top: ICON_LAND_Y,
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: 100,
            zIndex: 3,
            background: "linear-gradient(180deg, #ffffff 0%, #999999 100%)",
            boxShadow: "0 5px 7.5px rgba(0,0,0,0.06)",
          }}
          initial={false}
          animate={{
            opacity: stage === "final" ? 1 : 0,
            // Slides out from behind the Gmail orb, so the pair reads as
            // one thing separating rather than two arriving.
            x: stage === "final" ? 0 : ICON_SPLIT_X * 2,
            scale: stage === "final" ? 1 : 0.6,
          }}
          // Lands with the Gmail orb's slide, not before it.
          transition={{ delay: stage === "final" ? 0.62 : 0, duration: 0.72, ease: IN_EASE }}
        >
          <Image
            src="/assets/profile/tn-plus.svg"
            alt=""
            width={30}
            height={30}
            style={{ width: 30, height: 30, display: "block", transform: "rotate(90deg)" }}
          />
        </motion.div>

        {/* The link between them (853:74052) — a 29px run with a dot at
            each end, drawn vertically and turned on its side. */}
        <motion.div
          className="pointer-events-none absolute"
          style={{
            left: 180.5,
            top: LINK_Y,
            width: 5.333,
            height: 34.333,
            zIndex: 3,
            transformOrigin: "50% 50%",
          }}
          initial={false}
          animate={{ opacity: stage === "final" ? 1 : 0 }}
          transition={{ delay: stage === "final" ? 1.06 : 0, duration: 0.5, ease: IN_EASE }}
        >
          <div style={{ transform: "translate(-50%, -50%) rotate(90deg)" }}>
            <Image
              src="/assets/profile/tn-link.svg"
              alt=""
              width={5.333}
              height={34.333}
              style={{ width: 5.333, height: 34.333, display: "block" }}
            />
          </div>
        </motion.div>

        {/* The warning (853:74053) */}
        <motion.p
          className="pointer-events-none absolute -translate-x-1/2 text-center font-medium"
          style={{
            left: 181,
            top: 242,
            width: 292,
            zIndex: 3,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#ef4444",
          }}
          initial={false}
          animate={{
            opacity: stage === "final" ? 1 : 0,
            y: stage === "final" ? 0 : 10,
          }}
          transition={{ delay: stage === "final" ? 0.12 : 0, duration: 0.6, ease: IN_EASE }}
        >
          Disconnecting means your agents lose access to the travel history,
          preferences, documents and rewards that help make every trip more
          personal.
        </motion.p>

        <motion.p
          className="pointer-events-none absolute left-0 w-full text-center font-semibold"
          style={{
            top: 540,
            zIndex: 4,
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.12px",
            color: "#808080",
            opacity: stage === "idle" ? copyFade : 0,
          }}
        >
          Drag icon to disconnect
        </motion.p>
      </div>

      {/* Disconnect (853:74008). Hidden until 1565 — Figma carries it at
          opacity-0 on every earlier frame. */}
      <motion.button
        type="button"
        className="absolute left-1/2 flex items-center justify-center gap-[5.6px]"
        style={{
          top: 805,
          width: 380,
          height: 48,
          x: "-50%",
          borderRadius: 24,
          background: "#ffffff",
          border: "0.828px solid #e5e5e5",
          boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
        }}
        initial={false}
        animate={{
          opacity: stage === "final" ? 1 : 0,
          y: stage === "final" ? 0 : 14,
        }}
        transition={{ delay: stage === "final" ? 1.32 : 0, duration: 0.5, ease: IN_EASE }}
        onClick={onDisconnect}
        disabled={stage !== "final"}
      >
        <Image
          src="/assets/profile/tn-split.svg"
          alt=""
          width={20}
          height={20}
          style={{ width: 20, height: 20, display: "block" }}
        />
        <span
          className="font-semibold"
          style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.14px", color: "#ef4444" }}
        >
          Disconnect email
        </span>
      </motion.button>
    </div>
  );
}

/* Flame layers. Slow and small — the brief is slow-motion, and fire that
 * moves fast at this scale reads as a glitching gradient. */
const FLAMES = [
  { opacity: 0.34, rise: 26, stretch: 1.1, lick: 1.03, dur: 5.2 },
  { opacity: 0.22, rise: 44, stretch: 1.17, lick: 0.97, dur: 7.9 },
] as const;
