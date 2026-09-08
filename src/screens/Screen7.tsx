"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import AgentOrb from "@/components/AgentOrb";
import WordReveal from "@/components/WordReveal";
import { haptic } from "@/lib/haptics";
import {
  animate,
  AnimatePresence,
  motion,
  useMotionValue,
  useTime,
  useTransform,
  type PanInfo,
} from "framer-motion";

/* -----------------------------------------------------------------------------
 * Screen 7 — Supercar arrival transfer selection
 *   Sits between Screen 4 (Team perks) and Screen 5 (WorldPass card rise).
 *   Four internal phases:
 *     - "tesla"    → Tesla Cybertruck hero + swipe hint
 *     - "porsche"  → Porsche 911 GT3 hero
 *     - "ferrari"  → Ferrari 296 GTB hero
 *     - "staged"   → "Your ride is staged" locked-in state (built later)
 *   Users drag horizontally between the three cars (infinite wrap-around),
 *   then tap "Reserve my car" to advance to Screen 5.
 * ---------------------------------------------------------------------------*/

export type Screen7Phase = "tesla" | "porsche" | "ferrari" | "staged";

const IN_EASE = [0.22, 1, 0.36, 1] as const;

// Carousel geometry — center car bounding box, at canvas y (car area top).
// STRIDE keeps the peek cars tight against the hero (matches Figma).
const CAR_W = 320;
const CAR_H = 440;
const CAR_TOP = 220;
const STRIDE = 230;
const HALO_TOP = 296.5;

/* The airport sheet wears the agent-sheet header — 72px orb, 18px/25
 * headline, 12px body — which runs ~40px deeper than onboarding's. The
 * SELECT phase therefore gets its own car geometry: lower and shorter, so
 * the header clears it and the info panel at 659.8 still has room. The
 * staged phase has no header and keeps the originals. */
const AIRPORT_CAR_TOP = 265;
const AIRPORT_CAR_H = 380;
const AIRPORT_HALO_TOP = 341.5;

/* The airport variant's header is taller than onboarding's: a 72px agent
 * orb in place of the 24px seat glyph, plus the "Available only in
 * eligible regions" line. That pushes the copy to ~y263 while the car
 * starts at 220, so the two collide. The carousel and its halo drop by
 * this much to clear it — the header is the fixed thing here, not the
 * car's position. */

const HALO_SIZE = 260;

type Car = {
  key: "tesla" | "porsche" | "ferrari";
  src: string;
  name: string;
  brand: string;
  tagline: string;
  /** Per-car scale multiplier for the hero image inside the fixed slot.
   *  Tesla's PNG has a narrower aspect than the sports cars, so
   *  object-contain fits it to full slot height and it visually reads as
   *  much bigger. Shrinking Tesla brings all three to similar perceived size. */
  imgScale?: number;
};

const CARS: Car[] = [
  {
    key: "tesla",
    src: "/assets/supercar/tesla.png",
    name: "Tesla Cybertruck",
    brand: "/assets/supercar/brand-tesla.png",
    tagline: "All-electric performance • 4+ luggage slots",
    imgScale: 0.84,
  },
  {
    key: "porsche",
    src: "/assets/supercar/porsche.png",
    name: "Porsche 911 GT3",
    brand: "/assets/supercar/brand-porsche.png",
    tagline: "V6 Hybrid • 2 Carry-ons",
  },
  {
    key: "ferrari",
    src: "/assets/supercar/ferrari.png",
    name: "Ferrari 296 GTB",
    brand: "/assets/supercar/brand-ferrari.png",
    tagline: "VIP curb clearance • 2 Luggage slots",
  },
];

const STRIP_LEN = CARS.length * STRIDE; // 960 px worth of virtual carousel
const HALF_STRIP = STRIP_LEN / 2;

// Positive-modulo helper — JS `%` yields negative for negative dividends.
const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function Screen7({
  onComplete,
  variant = "onboarding",
}: {
  initialPhase?: Screen7Phase;
  onComplete?: () => void;
  /** "airport" is the same screen reused inside the Travel preferences
   *  sheet: different copy, an extra eligibility line, the car washed out
   *  under white, and no agent orbs in the staged state — that handoff
   *  only means something when Screen 5 is next. */
  variant?: "onboarding" | "airport";
} = {}) {
  const airport = variant === "airport";
  // `x` = drag offset (unbounded). Negative x = swiped left = next car.
  const x = useMotionValue(0);
  const [activeIdx, setActiveIdx] = useState(0);
  // "select" = swipeable carousel; "staged" = locked-in state after Reserve.
  const [phase, setPhase] = useState<"select" | "staged">("select");

  // Entrance thump when the carousel first mounts (featured car scales in).
  useEffect(() => {
    haptic("screenMount");
  }, []);

  // Auto-advance from the staged screen after 9.5s. Full timeline:
  //   0.0–1.75s  car drives off + tracks/smoke bloom
  //   1.85–2.86s orbs bloom in staggered (car has left the frame)
  //   2.95–3.85s "Your ride is staged" word-reveal
  //   3.5–5.0s   "Ferrari 296 GTB locked for your airport pickup" word-reveal
  //   5.0–8.0s   full staged view held (user reads the copy, orbs bob,
  //              smoke keeps drifting — nothing rushed)
  //   8.0s       decor (car trail, tracks, smoke, text) starts fading out
  //   9.5s       decor fully faded → Screen 5 mounts (orbs handoff at 425)
  useEffect(() => {
    if (phase !== "staged" || !onComplete) return;
    const t = window.setTimeout(onComplete, 6500);
    return () => window.clearTimeout(t);
  }, [phase, onComplete]);

  // Fractional car index — how far along the carousel we've scrolled,
  // wrapped to [0, CARS.length). Used to derive per-car scale/opacity/gray.
  const carProgress = useTransform(x, (xVal) =>
    mod(-xVal / STRIDE, CARS.length),
  );

  // Per-car x offset — each car wraps into the [-HALF_STRIP, +HALF_STRIP]
  // window so it reappears on the opposite side once it scrolls off.
  const carXs = CARS.map((_, idx) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(x, (xVal) => {
      const raw = idx * STRIDE + xVal;
      return mod(raw + HALF_STRIP, STRIP_LEN) - HALF_STRIP;
    }),
  );

  // Per-car signed distance from center in slot units (fractional).
  // Wrapped to [-CARS.length/2, +CARS.length/2] so the "closest" copy wins.
  const carDists = CARS.map((_, idx) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(carProgress, (p) => {
      let d = idx - p;
      if (d > CARS.length / 2) d -= CARS.length;
      if (d < -CARS.length / 2) d += CARS.length;
      return d;
    }),
  );

  // Track the x at pan start so onPan applies a delta rather than an absolute.
  const panStartX = useRef(0);
  const handlePanStart = () => {
    panStartX.current = x.get();
  };
  const handlePan = (_: unknown, info: PanInfo) => {
    x.set(panStartX.current + info.offset.x);
  };
  const handlePanEnd = (_: unknown, info: PanInfo) => {
    const projected = x.get() + info.velocity.x * 0.12;
    const target = Math.round(projected / STRIDE) * STRIDE;
    animate(x, target, { type: "spring", stiffness: 320, damping: 32 });
    const nextIdx = mod(-target / STRIDE, CARS.length);
    if (nextIdx !== activeIdx) haptic("carouselSnap");
    setActiveIdx(nextIdx);
  };


  return (
    <div
      className={`relative h-full w-full overflow-hidden ${
        airport ? "" : "rounded-[44px]"
      }`}
      style={{
        // Inside the sheet this canvas is scaled, so its own 44px radius
        // and grey head read as a second card floating in a white sheet.
        // Flat white lets it meet the sheet's edges — and lets the peek
        // cars bleed off the sides, as 853:66675 has them.
        background: airport
          ? "#ffffff"
          : "linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)",
      }}
      onClick={(e) => {
        // Block the OnboardingFlow's global click-to-advance on the select
        // phase (car must be reserved first). On the staged phase, taps
        // still advance to Screen 5 alongside the 4s auto-advance timer.
        if (phase === "select") {
          e.stopPropagation();
        } else if (onComplete) {
          e.stopPropagation();
          onComplete();
        }
      }}
    >
      {/* SELECT phase — carousel, header, reserve CTA. On phase change to
          staged, everything softly recedes (fade + slight downward drift). */}
      <AnimatePresence>
      {phase === "select" && (
      <motion.div
        key="select"
        className="absolute inset-0"
        exit={{
          opacity: 0,
          y: 12,
          filter: "blur(6px)",
          transition: { duration: 0.55, ease: [0.4, 0, 0.2, 1] },
        }}
      >

      {/* Header — seat icon + title + subtitle */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center"
        // The airport header carries a 72px orb where onboarding has a
        // 24px glyph, plus the eligibility line — 43px more than the
        // layout below it can give up. Everything under the header is
        // fixed against the CTA at y833, so the HEADER compresses to fit
        // the car's start at 220 rather than the car moving down.
        style={{ top: airport ? 56 : 70 }}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: IN_EASE }}
      >
        {/* The agent orb, as every other Travel preferences sheet has in
            this slot — the seat glyph belongs to the onboarding run, where
            the screen is about the transfer rather than about an agent. */}
        {airport ? (
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <AgentOrb size={72} />
          </motion.div>
        ) : (
          <SeatIcon />
        )}
        <p
          className={
            airport
              ? "text-center font-medium"
              : "whitespace-nowrap text-[20px] font-medium leading-[25px] tracking-[-0.04em] text-[#0b0b0b] text-center"
          }
          // Airport wears the agent sheets' type: 18/25 at -0.72, over a
          // 216 column, so it reads as one of them rather than as a
          // borrowed onboarding screen.
          style={
            airport
              ? {
                  marginTop: 14,
                  width: 216,
                  fontSize: 18,
                  lineHeight: "25px",
                  letterSpacing: "-0.72px",
                  color: "#0b0b0b",
                }
              : { marginTop: 20 }
          }
        >
          {airport ? "Select your airport pickup" : "Select your arrival supercar"}
        </p>
        <p
          className={
            airport
              ? "text-center font-medium"
              : "mt-[10px] text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[#999]"
          }
          style={
            airport
              ? {
                  marginTop: 10,
                  width: 310,
                  fontSize: 12,
                  lineHeight: "16px",
                  letterSpacing: "-0.24px",
                  color: "#8a8a90",
                }
              : { width: 360 }
          }
        >
          Bypass standard taxi queues with an on-demand
          <br />
          exotic transfer waiting at arrival
        </p>
        {airport && (
          <p
            className="text-center font-medium"
            style={{
              marginTop: 10,
              width: 310,
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.24px",
              color: "#8a8a90",
            }}
          >
            Available only in eligible regions
          </p>
        )}
      </motion.div>

      {/* Ripple halo behind hero car — 5 concentric rings expand and fade.
          Rings are darker + staggered tighter so at any moment 3–4 are on
          screen at different radii, giving a continuous water-drop feel. */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          top: airport ? AIRPORT_HALO_TOP : HALO_TOP,
          width: HALO_SIZE,
          height: HALO_SIZE,
        }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: HALO_SIZE,
              height: HALO_SIZE,
              marginLeft: -HALO_SIZE / 2,
              marginTop: -HALO_SIZE / 2,
              border: "1.5px solid rgba(0,0,0,0.28)",
              willChange: "transform, opacity",
            }}
            initial={{ scale: 0.2, opacity: 0 }}
            animate={{
              scale: [0.2, 1],
              // Opacity is 0 at BOTH endpoints so the loop restart is
              // invisible — no more flicker/glitch when scale snaps back
              // from 1 → 0.2. The ring blooms in, holds visible around
              // half-radius, then fades out before the ring fully expands.
              opacity: [0, 0.75, 0],
            }}
            transition={{
              scale: {
                duration: 3.5,
                delay: i * 0.7,
                repeat: Infinity,
                ease: "easeOut",
              },
              opacity: {
                duration: 3.5,
                delay: i * 0.7,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.35, 1],
              },
            }}
          />
        ))}
      </div>

      {/* Full-width drag surface — car layer sits behind title, above halo.
          Each car floats at its own wrap-around x, driven by the shared drag. */}
      <motion.div
        className="absolute left-0 cursor-grab active:cursor-grabbing"
        style={{
          top: airport ? AIRPORT_CAR_TOP : CAR_TOP,
          width: "100%",
          height: airport ? AIRPORT_CAR_H : CAR_H,
          touchAction: "pan-y",
        }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7, ease: IN_EASE }}
      >
        {CARS.map((car, i) => (
          <CarSlot
            key={car.key}
            car={car}
            wrappedX={carXs[i]}
            dist={carDists[i]}
          />
        ))}
      </motion.div>

      {/* Info panel — brand logo + car name + tagline. Three copies, one per
          car, panning left/right with the carousel so the text tracks the
          swipe direction (fades in the direction the user drags). */}
      {CARS.map((car, i) => (
        <InfoSlot
          key={car.key}
          car={car}
          wrappedX={carXs[i]}
          dist={carDists[i]}
        />
      ))}

      {/* Reserve my car — 380×50 pill at y 833 (left 30). */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          haptic("carDriveOff");
          setPhase("staged");
        }}
        whileTap={{ scale: 0.97 }}
        className="absolute overflow-hidden rounded-full text-[14px] font-semibold tracking-[-0.01em] text-black"
        style={{
          top: 833,
          // Centre-anchored rather than left:30. Identical on the 440
          // canvas, but the airport sheet renders this canvas WIDER than
          // 440 so the peek cars can reach the screen edges — and a
          // left-anchored CTA would drift off with it. marginLeft rather
          // than a translate, so it can't fight framer's own transform.
          left: "50%",
          marginLeft: -190,
          width: 380,
          height: 50,
          background:
            "linear-gradient(90deg, rgba(80,87,234,0.35) 0%, rgba(217,70,239,0.28) 35%, rgba(239,68,68,0.32) 65%, rgba(237,215,88,0.35) 100%)",
          boxShadow: "0 12px 30px -14px rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7, ease: IN_EASE }}
      >
        {airport ? "Select my car" : "Reserve my car"}
      </motion.button>

      {/* Footer note — Inter Semibold 12/16 #999, centered, at y 903. */}
      <motion.p
        className="absolute left-1/2 -translate-x-1/2 text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[#999]"
        style={{ top: 903, width: 242 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: IN_EASE }}
      >
        Included with membership. Switch models anytime in Settings
      </motion.p>

      </motion.div>
      )}
      </AnimatePresence>

      {/* STAGED phase — the reserved car drives forward off-screen, tire
          tracks trail behind, agent orbs + confirmation text fade in, and
          exhaust cloud billows up from the bottom. */}
      {phase === "staged" && <StagedView car={CARS[activeIdx]} airport={airport} />}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Staged phase — "Your ride is staged" locked-in state.
 * -------------------------------------------------------------------------*/
function StagedView({ car, airport = false }: { car: Car; airport?: boolean }) {
  // Fade the Staged decor (car trail, tracks, smoke, text) out in the last
  // ~1s before Screen 5 mounts, so the orbs are the only element still on
  // screen when the swap happens — clean, seamless handoff.
  const [isExiting, setIsExiting] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setIsExiting(true), 5000);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <>
    <motion.div
      className="pointer-events-none absolute inset-0"
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Twin tire tracks — laid down UNDERNEATH the car (rendered first so
          the car sits on top of them). Bloom in during the car's forward
          drive so the tracks appear to reveal from behind the wheels. */}
      <TireTracks />

      {/* Car drives forward — settle-back-and-launch: a small preview dip
          before it accelerates off the top of the phone. Ease-in curve gives
          a real "hitting the throttle" feel (slow start → whoosh). */}
      <motion.div
        className="pointer-events-none absolute left-1/2"
        style={{
          top: CAR_TOP,
          width: CAR_W,
          height: CAR_H,
          translateX: "-50%",
        }}
        initial={{ y: 0, scaleY: 1 }}
        animate={{
          y: [0, 8, -320],
          scaleY: [1, 1, 1.06],
        }}
        transition={{
          duration: 1.75,
          times: [0, 0.14, 1],
          ease: [0.55, 0, 0.9, 0.4],
        }}
      >
        <Image
          src={car.src}
          alt={car.name}
          width={CAR_W}
          height={CAR_H}
          priority
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            objectPosition: "center",
            transform: car.imgScale ? `scale(${car.imgScale})` : undefined,
            transformOrigin: "center",
            // The car dissolves as it drives up and off. Masking the
            // SPRITE, not overlaying a white band: a band is a rectangle,
            // and its vertical edges show against the car and the tracks.
            // The mask travels with the car, so there is no box at all.
            ...(airport
              ? {
                  maskImage:
                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 26%, rgba(0,0,0,0.85) 54%, #000 76%)",
                  WebkitMaskImage:
                    "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.35) 26%, rgba(0,0,0,0.85) 54%, #000 76%)",
                }
              : null),
          }}
        />
      </motion.div>

      {/* White wash over the departing car — the airport sheet's staged
          state (right frame of the reference). Transparent at the roof and
          solid by the tail, so the car reads as dissolving forward into
          the page rather than being covered by a panel. Only here: on the
          selector the car is the thing you are choosing. */}

      {/* "Your ride is staged" — grey caption below the orb row. Figma
          spec: (137.82, 589.6), 164×25. */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center"
        style={{ top: 589.6, width: 300 }}
      >
        <WordReveal
          text="Your ride is staged"
          className="text-[20px] font-medium leading-[25px] tracking-[-0.04em] text-[#787878] whitespace-nowrap"
          delay={3.2}
          staggerMs={140}
          perWordDurationMs={480}
        />
      </div>

      {/* "<car> locked for your airport pickup" — Figma: (101.66, 634.6),
          236.67×50, always 2 lines (\n split + whitespace-nowrap keeps each
          line intact regardless of the car name's width). */}
      <div
        className="absolute left-1/2 -translate-x-1/2 text-center"
        style={{ top: 634.6, width: 320 }}
      >
        <WordReveal
          text={`${car.name} locked for\nyour airport pickup`}
          className="whitespace-nowrap text-[20px] font-medium leading-[25px] tracking-[-0.04em] text-black"
          delay={3.9}
          staggerMs={140}
          perWordDurationMs={480}
        />
      </div>

      {/* Exhaust cloud — billows in from bottom, then keeps drifting/
          breathing so it feels alive. Two layers offset horizontally for
          parallax so the smoke reads as three-dimensional. */}
      {!airport && (
        <>
          <SmokeLayer delay={0.35} offsetX={-14} scaleAmp={0.06} drift={12} loopMs={10400} />
          <SmokeLayer delay={0.55} offsetX={14} scaleAmp={0.05} drift={-10} loopMs={13600} opacity={0.45} />
        </>
      )}
    </motion.div>

      {/* Agent orbs — mount at Screen 4's team-perks positions
          (cx ∈ {130,190,250,310}, cy=425, size 48) and STAY there. When
          Screen 5 mounts (cardEmpty phase) its queue orbs start at these
          exact same positions and glide up to y=205 as part of its own
          card-rise entrance — so the transition is one continuous motion
          across the screen boundary. Orbs sit OUTSIDE the decor fade
          wrapper so they persist through the handoff. */}
      {/* The orb row is a HANDOFF: these four mount at Screen 4's team-perks
          positions and Screen 5 picks them up from here. Inside the airport
          sheet there is no Screen 5 to hand off to, so they would just be
          four orbs appearing for no reason — text only. */}
      {!airport &&
        STAGED_ORBS.map((orb, i) => (
          <FloatingOrb key={orb.blob} orb={orb} orbIndex={i} />
        ))}
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Staged orb — enters after the car has left the frame, then bobs on a
 * shared sine-wave clock. Screen 5 uses the exact same wall-clock so the
 * wave phase is continuous across the screen swap: when Screen 5 mounts,
 * every orb is at the same sub-pixel position, and the card rises up
 * behind them — nothing else changes.
 * -------------------------------------------------------------------------*/
function FloatingOrb({
  orb,
  orbIndex,
}: {
  orb: { blob: string; cx: number };
  orbIndex: number;
}) {
  const time = useTime();
  const waveY = useTransform(time, (t) => {
    const phase = orbIndex * 1.2;
    return Math.sin(t * 0.0022 + phase) * 5;
  });
  return (
    <motion.div
      className="absolute"
      style={{
        left: orb.cx - STAGED_ORB_SIZE / 2,
        top: STAGED_ORB_CY - STAGED_ORB_SIZE / 2,
        width: STAGED_ORB_SIZE,
        height: STAGED_ORB_SIZE,
        y: waveY,
      }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        // Car finishes driving off at ~1.75s; orbs bloom in after that.
        delay: 1.85 + orbIndex * 0.12,
        duration: 0.65,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <AgentOrb size={STAGED_ORB_SIZE} blob={orb.blob} />
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
 * Tire tracks — single PNG containing BOTH tread strips, matches Figma
 * node 617:27284. Bloom-in as the car pulls away, top/bottom soft-fade
 * mask so the tracks feel laid down and dissipating.
 * -------------------------------------------------------------------------*/
/* ---------------------------------------------------------------------------
 * Tire tracks — twin vertical tread strips baked into one PNG (Figma node
 * 633:27899, `tracks.png`). Sized to match Figma's rectangle bounds
 * (157×258, at y 207). Bloom-in as the car pulls away.
 * -------------------------------------------------------------------------*/
function TireTracks() {
  // Figma spec (node 633:27899): (143, 207.6), 157×258.
  return (
    <motion.div
      className="pointer-events-none absolute overflow-hidden"
      style={{
        // Centre-anchored, not left:143. That value assumed a 440-wide
        // canvas; the airport sheet renders it wider so the cars can
        // reach the edges, which slid the tracks away from the wheels.
        // 143 + 157/2 = 221.5 against a 220 centre, hence the 1.5.
        left: "50%",
        marginLeft: -157 / 2 + 1.5,
        top: 207.6,
        width: 157,
        height: 258,
        transformOrigin: "top center",
      }}
      initial={{ opacity: 0, scaleY: 0.55, y: -16 }}
      animate={{ opacity: 1, scaleY: 1, y: 0 }}
      transition={{
        delay: 0.4,
        duration: 1.2,
        ease: [0.4, 0, 0.2, 1],
      }}
    >
      <Image
        src="/assets/supercar/tracks.png"
        alt=""
        width={157}
        height={258}
        style={{ width: "100%", height: "100%", objectFit: "fill" }}
      />
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
 * Smoke layer — bloom-in from below, then keep breathing (subtle horizontal
 * drift + scale-pulse) so the exhaust cloud feels alive.
 * -------------------------------------------------------------------------*/
function SmokeLayer({
  delay,
  offsetX,
  scaleAmp,
  drift,
  loopMs,
  opacity = 0.55,
}: {
  delay: number;
  offsetX: number;
  scaleAmp: number;
  drift: number;
  loopMs: number;
  opacity?: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2"
      style={{
        // Anchored to the phone floor (Figma places smoke at y=710, height
        // 275 — bottom of 985 = 20px past the 965 frame). Cloud starts a
        // full band BELOW that anchor and rises up + out.
        bottom: -20,
        width: 488,
        height: 275,
        marginLeft: -244,
      }}
      initial={{ opacity: 0 }}
      animate={{
        // Cloud starts fully off-screen below (top edge sits at the base
        // of the phone), rises up, and fully fades out by the time its
        // top edge reaches the text at y≈635 — the cloud never bleeds
        // above the "Ferrari … locked" line. Seamless loop: opacity is 0
        // at both endpoints so the reset is invisible.
        //
        // Natural cloud top when y=0 sits at ~710 (bottom:-20 anchor,
        // height 275 → top = 985 − 20 − 275 = 690). y: -60 lifts top to
        // ~630, right at the text baseline.
        y: [275, -60],
        opacity: [0, opacity, opacity, 0],
        x: [offsetX, offsetX + drift, offsetX],
        scale: [0.92, 1 + scaleAmp, 1.12],
      }}
      transition={{
        y: {
          delay,
          duration: loopMs / 1000,
          repeat: Infinity,
          ease: "easeOut",
        },
        opacity: {
          delay,
          duration: loopMs / 1000,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.18, 0.75, 1],
        },
        x: {
          delay,
          duration: loopMs / 1000,
          repeat: Infinity,
          ease: "easeInOut",
        },
        scale: {
          delay,
          duration: loopMs / 1000,
          repeat: Infinity,
          ease: "easeOut",
        },
      }}
    >
      <Image
        src="/assets/supercar/smoke.png"
        alt=""
        width={488}
        height={275}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "bottom",
        }}
      />
    </motion.div>
  );
}

/** Staged-screen agent orbs — size matches Screen 4 team-perks and
 *  Screen 5 queue orbs (48), same X centers (130/190/250/310) so the
 *  orbs look identical across Team perks → Staged → Card rise. cy stays
 *  at Figma's 530 (staged row Y). */
const STAGED_ORB_SIZE = 48;
const STAGED_ORB_CY = 530;
const STAGED_ORBS: Array<{ blob: string; cx: number }> = [
  { blob: "/assets/orb/blob-safety.png", cx: 130 },   // safety (leftmost)
  { blob: "/assets/orb/blob-forex.png", cx: 190 },    // forex
  { blob: "/assets/orb/blob-flight.png", cx: 250 },   // flight
  { blob: "/assets/orb/ellipse.png", cx: 310 },       // visa (rightmost)
];

/* ---------------------------------------------------------------------------
 * Car slot in the infinite carousel. Its x wraps around; scale, opacity, and
 * grayscale come from the signed distance to the center of the strip.
 * -------------------------------------------------------------------------*/
function CarSlot({
  car,
  wrappedX,
  dist,
}: {
  car: Car;
  wrappedX: import("framer-motion").MotionValue<number>;
  dist: import("framer-motion").MotionValue<number>;
}) {
  const absDist = useTransform(dist, (d) => Math.abs(d));
  const scale = useTransform(absDist, [0, 1], [1, 0.72], { clamp: true });
  const opacity = useTransform(absDist, [0, 1, 1.6], [1, 0.55, 0], {
    clamp: true,
  });
  const filter = useTransform(absDist, (d) => {
    const gray = Math.min(1, Math.max(0, d));
    return `grayscale(${gray.toFixed(2)})`;
  });

  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-1/2"
      style={{
        width: CAR_W,
        height: CAR_H,
        x: wrappedX,
        translateX: `-50%`,
        scale,
        opacity,
        filter,
      }}
    >
      <Image
        src={car.src}
        alt={car.name}
        width={CAR_W}
        height={CAR_H}
        priority={car.key === "tesla"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          transform: car.imgScale ? `scale(${car.imgScale})` : undefined,
          transformOrigin: "center",
        }}
      />
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
 * Info slot in the infinite carousel — mirrors CarSlot's wrap/fade so the
 * brand logo, car name, and tagline all pan sideways with the swipe, and
 * fade out on whichever side they drift toward.
 * -------------------------------------------------------------------------*/
function InfoSlot({
  car,
  wrappedX,
  dist,
}: {
  car: Car;
  wrappedX: import("framer-motion").MotionValue<number>;
  dist: import("framer-motion").MotionValue<number>;
}) {
  const absDist = useTransform(dist, (d) => Math.abs(d));
  // Aggressive fade — text is fully gone by 40% of the way to the next slot,
  // so the side info never lingers as a visible ghost.
  const opacity = useTransform(absDist, [0, 0.2, 0.4], [1, 0.3, 0], {
    clamp: true,
  });

  return (
    <>
      {/* Brand logo — Figma y 659.8 */}
      <motion.div
        className="pointer-events-none absolute top-0 left-1/2"
        style={{
          top: 659.8,
          width: 50,
          height: 50,
          x: wrappedX,
          translateX: "-50%",
          opacity,
        }}
      >
        <BrandMark src={car.brand} alt={car.name} />
      </motion.div>
      {/* Car name — Figma y 729.8 */}
      <motion.p
        className="pointer-events-none absolute left-1/2 text-center font-serif text-[20px] leading-[25px] font-bold text-black whitespace-nowrap"
        style={{
          top: 729.8,
          x: wrappedX,
          translateX: "-50%",
          opacity,
        }}
      >
        {car.name}
      </motion.p>
      {/* Tagline — Figma y 764.8 */}
      <motion.p
        className="pointer-events-none absolute left-1/2 text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[#999] whitespace-nowrap"
        style={{
          top: 764.8,
          x: wrappedX,
          translateX: "-50%",
          opacity,
        }}
      >
        {car.tagline}
      </motion.p>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Brand logo — 50×50 PNG (Tesla T, Porsche shield, Ferrari shield).
 * -------------------------------------------------------------------------*/
function BrandMark({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={50}
      height={50}
      style={{ width: 50, height: 50, objectFit: "contain" }}
    />
  );
}

/* ---------------------------------------------------------------------------
 * Seat icon — small "airline_seat_recline_extra" glyph above the title.
 * -------------------------------------------------------------------------*/
function SeatIcon() {
  return (
    <div style={{ width: 24, height: 24 }}>
      <Image
        src="/assets/supercar/seat-icon.svg"
        alt=""
        width={24}
        height={24}
        style={{ width: 24, height: 24 }}
      />
    </div>
  );
}
