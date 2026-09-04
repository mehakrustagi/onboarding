"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import FolderTicket from "./payment/FolderTicket";
import AgentOrb from "@/components/AgentOrb";

/* Payment transition flow — 17-frame Figma storyboard rendered as a
 * single seamless animation. Each Figma frame maps to a `phase` step;
 * transitions between phases are motion beats, not screen swaps.
 *
 * Canvas is the same 440×965 mobile shell we use for the onboarding
 * prototype. Every frame layers atop the previous state so the sequence
 * reads as one continuous stream. */

type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

const PHASE_DURATION_MS: Record<Phase, number> = {
  1: 900, // setup
  2: 1000, // folder + caption settle
  3: 450, // photo1 pops
  4: 400, // photo2 pops
  5: 450, // photo3 pops
  6: 400, // photo4 pops
  7: 400, // breathing room before the orbs arrive
  8: 300, // flight orb — 3× faster clean fade + rise
  9: 300, // safety orb
  10: 300, // forex orb
  11: 900, // final orb + hold on the full set before whirlpool
  12: 1000, // whirlpool + suck into folder
  13: 999_999, // payment card revealed
};

const MAX_PHASE: Phase = 13;

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function PaymentTransitionFlow() {
  const [phase, setPhase] = useState<Phase>(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPhase((p) => (p < MAX_PHASE ? ((p + 1) as Phase) : p));
    }, PHASE_DURATION_MS[phase]);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <div
      className="relative h-[965px] w-[440px] cursor-pointer select-none overflow-hidden rounded-[44px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
      style={{ background: "#eceaef" }}
      onClick={() => setPhase((p) => (p < MAX_PHASE ? ((p + 1) as Phase) : p))}
    >
      <PersistentLayer phase={phase} />
      <PhotoStack phase={phase} />
      <Frame3Elements visible={phase >= 3} />
      <DimOverlay />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Persistent layer — everything from Frame 1 that stays on screen throughout
 * the sequence: ripple orb, chat message, booking details, plane+flag icon,
 * back button, input bar. Ripple pulses subtly on every phase advance so the
 * background "breathes" with the story.
 * -------------------------------------------------------------------------*/
function PersistentLayer({ phase }: { phase: Phase }) {
  return (
    <>
      {/* Ripple orb background (620×620) — slight scale pulse on each new
          phase so the sequence has a subtle "breath" between beats. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          width: 620,
          height: 620,
          left: 73.72 - 310,
          top: 576 - 310,
        }}
        animate={{ scale: 1 + (phase - 1) * 0.02 }}
        transition={{ duration: 1.4, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/ripple-orb.png"
          alt=""
          fill
          priority
          style={{ objectFit: "cover", opacity: 0.95 }}
        />
      </motion.div>

      {/* Chat message — clears out once the photo cards start arriving
          (phase 3) so the stack lands on a clean background instead of
          sitting over live copy. */}
      <motion.div
        className="absolute"
        style={{ left: 30, top: 130, width: 364, zIndex: 1 }}
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{
          opacity: phase >= 3 ? 0 : 1,
          y: 0,
          filter: "blur(0px)",
        }}
        transition={{ duration: 0.7, ease: IN_EASE }}
      >
        <p
          className="text-[20px] font-medium leading-[25px] text-[#808080]"
          style={{ letterSpacing: "-0.8px" }}
        >
          Ok Noted,{" "}
          <span className="text-black">I will book this date</span>
        </p>
        <p
          className="mt-[25px] text-[20px] font-medium leading-[25px] text-black"
          style={{ letterSpacing: "-0.8px" }}
        >
          Everything is set. Just review the details below and i&apos;ll take
          care of the rest.
        </p>
      </motion.div>

      {/* Booking details — fades with the chat message on phase 3. */}
      <motion.div
        className="absolute flex flex-col gap-[19px]"
        style={{ left: 30.64, top: 255, width: 349, zIndex: 1 }}
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{
          opacity: phase >= 3 ? 0 : 1,
          y: 0,
          filter: "blur(0px)",
        }}
        transition={
          phase >= 3
            ? { duration: 0.7, ease: IN_EASE }
            : { delay: 0.24, duration: 0.7, ease: IN_EASE }
        }
      >
        <DetailRow label="Destination:" value="Switzerland" />
        <DetailRow label="Visa Type:" value="Tourist Visa" valueColor="#0e0e0e" />
        <DetailRow label="Travelers:" value="You, Malik and Siddhi" />
        <DetailRow label="Travel Date:" value="26 July 2026" />
        <DetailRow
          label="Visa Appointment:"
          value="Monday, 25 June at Mumbai BKC"
        />
      </motion.div>

      {/* Airplane + Switzerland flag icons */}
      <motion.div
        className="absolute"
        style={{ left: 30, top: 561, width: 67, height: 40, zIndex: 1 }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.48, duration: 0.6, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/plane-flag.svg"
          alt=""
          width={67}
          height={40}
          style={{ width: 67, height: 40 }}
        />
      </motion.div>

      {/* Back button */}
      <motion.div
        className="absolute"
        style={{
          left: 30,
          top: 50,
          width: 50,
          height: 50,
          borderRadius: 40,
          border: "1px solid rgba(255,255,255,0.85)",
          background:
            "linear-gradient(133deg, rgba(255,255,255,0.4) 10%, rgba(255,255,255,0.1) 72%)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          boxShadow: "0 4px 30px -2px rgba(78,78,78,0.05)",
          zIndex: 3,
        }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.12, duration: 0.5, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/back-arrow.svg"
          alt=""
          width={20}
          height={20}
          style={{
            position: "absolute",
            left: 15,
            top: 15,
            width: 20,
            height: 20,
          }}
        />
      </motion.div>

      {/* Input bar */}
      <motion.div
        className="absolute"
        style={{ left: 30, top: 810, width: 380, height: 125, zIndex: 3 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.7, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/input-bar-bg.svg"
          alt=""
          width={380}
          height={125}
          style={{ position: "absolute", inset: 0, width: 380, height: 125 }}
        />
        <p
          className="absolute text-[16px] font-medium text-[#e5e5e5] whitespace-nowrap"
          style={{
            top: 25,
            left: 30,
            lineHeight: "20px",
            letterSpacing: "-0.64px",
          }}
        >
          Ask anything
        </p>
        <div
          className="absolute rounded-[3px]"
          style={{
            left: 25,
            top: 23,
            width: 1.2,
            height: 25,
            background: "#0b0b0b",
          }}
        />
        <div
          className="absolute rounded-[15px] border border-[#f2f2f2] bg-white"
          style={{ left: 265, top: 60, width: 40, height: 40 }}
        >
          <Image
            src="/assets/payment/mic.svg"
            alt=""
            width={22}
            height={22}
            style={{ position: "absolute", left: 9, top: 9, width: 22, height: 22 }}
          />
        </div>
        <div
          className="absolute rounded-[15px] bg-white/60"
          style={{ left: 315, top: 60, width: 40, height: 40 }}
        >
          <Image
            src="/assets/payment/arrow-up.svg"
            alt=""
            width={22}
            height={22}
            style={{
              position: "absolute",
              left: 9,
              top: 9,
              width: 22,
              height: 22,
              transform: "rotate(90deg)",
            }}
          />
        </div>
      </motion.div>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Photo stack — manages ALL photos + folder + stars across phases 2-7. Each
 * new photo pops on top (spring scale-in from below), while previous photos
 * recede (progressive blur + slight opacity drop) so they read as a
 * background stack of "images the AI has already surfaced".
 *
 * Photo timeline:
 *   phase 2: photo1 arrives (Erebus, top-left)
 *   phase 3: photo1 holds; folder shifts up, caption arrives
 *   phase 4: photo2 pops (Erebus, offset right/down)
 *   phase 5: photo3 pops (small square, below-left)
 *   phase 6: photo4 not yet — but photo1 starts blurring back
 *   phase 7: photo4 pops (small square, offset right); photo2 also blurs
 * -------------------------------------------------------------------------*/

// Per-phase geometry (position + visual state) for each photo card.
type CardState = {
  left: number;
  top: number;
  width: number;
  height: number;
  radius: number;
  opacity: number;
  scale: number;
  blur: number;
};

const CARD_HIDDEN: CardState = {
  left: 0,
  top: 0,
  width: 0,
  height: 0,
  radius: 10,
  opacity: 0,
  scale: 0.6,
  blur: 0,
};

// photo1 = Erebus card (top-left) — appears at phase 2, progressively
// blurs into the background from phase 6 onward.
/* Photo lifecycle — every card STAYS on screen from arrival until the
 * whirlpool sucks it into the folder, so the full collection is still
 * visible when the orbs arrive. Older cards recede via opacity + scale
 * only — the photos stay CRISP at every age, since blurring them made
 * the stack read as out-of-focus rather than layered. They never
 * disappear, then all four streak into the folder on phase 12. */
function lifecycle(
  arrivalPhase: number,
  currentPhase: number,
  base: Omit<CardState, "opacity" | "scale" | "blur">,
): CardState {
  const age = currentPhase - arrivalPhase;
  if (age < 0) return { ...CARD_HIDDEN, ...base };
  if (age === 0) return { ...base, opacity: 1, scale: 1, blur: 0 };
  if (age === 1) return { ...base, opacity: 0.85, scale: 0.98, blur: 0 };
  if (age === 2) return { ...base, opacity: 0.7, scale: 0.96, blur: 0 };
  // age >= 3 — still visible in the background stack (never fully gone).
  return { ...base, opacity: 0.55, scale: 0.94, blur: 0 };
}

// photo1 — arrives phase 3, lives 3 beats.
function photo1State(phase: Phase): CardState {
  return lifecycle(3, phase, {
    left: 28,
    top: 82,
    width: 234,
    height: 143,
    radius: 10,
  });
}

// photo2 — arrives phase 4.
function photo2State(phase: Phase): CardState {
  return lifecycle(4, phase, {
    left: 136,
    top: 181,
    width: 234,
    height: 143,
    radius: 10,
  });
}

// photo3 (small square) — arrives phase 5.
function photo3State(phase: Phase): CardState {
  return lifecycle(5, phase, {
    left: 58,
    top: 243,
    width: 124,
    height: 123,
    radius: 16,
  });
}

// photo4 (small square) — arrives phase 6.
function photo4State(phase: Phase): CardState {
  return lifecycle(6, phase, {
    left: 168,
    top: 293,
    width: 124,
    height: 123,
    radius: 16,
  });
}

/* Stacked drop shadow — a tight contact shadow plus two progressively
 * wider, softer casts. One flat shadow reads as a sticker; the stack is
 * what sells a card sitting ABOVE the surface rather than printed on it.
 * The inset pair gives the card an edge: lit along the top, dark along
 * the bottom, as a physical object under a light from above would be. */
const CARD_SHADOW = [
  "0 1px 2px rgba(0,0,0,0.22)",
  "0 6px 12px -3px rgba(0,0,0,0.26)",
  "0 18px 34px -10px rgba(0,0,0,0.34)",
  "inset 0 1px 0 rgba(255,255,255,0.50)",
  "inset 0 -1px 0 rgba(0,0,0,0.28)",
].join(", ");

/* Card surface — the physical object itself, shared by the resting card
 * and the one streaking into the folder so both read identically.
 *
 * Three stacked pieces give it volume: a dark slab offset down-right for
 * paper thickness, the photo surface with layered shadow + rim, and a
 * diagonal specular sheen so light appears to graze across it. */
function CardSurface({
  src,
  radius,
  border,
}: {
  src: string;
  radius: number;
  border: boolean;
}) {
  return (
    <>
      {/* Thickness — the card's own edge, peeking out down-right. */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: radius,
          background: "linear-gradient(160deg, #6c6c72 0%, #47474c 100%)",
          transform: "translate(2px, 3px)",
        }}
      />

      {/* Photo face */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: radius,
          border: border ? "1.095px solid #8d8d8d" : "none",
          boxShadow: CARD_SHADOW,
        }}
      >
        <Image src={src} alt="" fill style={{ objectFit: "cover" }} />

        {/* Specular sheen — bright at the top-left corner falling to a
            faint shade bottom-right, on overlay so it rides the photo's
            own tones instead of washing them out. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(128deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 26%, rgba(255,255,255,0) 46%, rgba(0,0,0,0.12) 100%)",
            mixBlendMode: "overlay",
          }}
        />
      </div>
    </>
  );
}

function PhotoCard({
  state,
  src,
  border = true,
  zIndex,
  entryRotate = 0,
  tiltX = 8,
  tiltY = 0,
}: {
  state: CardState;
  src: string;
  border?: boolean;
  zIndex: number;
  /** Slight tilt on the resting card so the stack feels scattered by hand */
  entryRotate?: number;
  /** Resting 3D attitude — each card faces the viewer at its own angle. */
  tiltX?: number;
  tiltY?: number;
}) {
  return (
    <motion.div
      className="absolute"
      style={{
        width: state.width,
        height: state.height,
        zIndex,
        // Perspective on the card itself, so each one has its own
        // vanishing point and the tilts don't share a single flat plane.
        transformPerspective: 900,
      }}
      initial={{
        opacity: 0,
        scale: 0.4,
        left: state.left,
        top: state.top + 20,
        rotate: entryRotate - 8,
        // Enters steeply angled and swings up to its resting attitude —
        // the card turns to face you rather than just scaling up.
        rotateX: tiltX + 26,
        rotateY: tiltY - 14,
        filter: "blur(0px)",
      }}
      animate={{
        opacity: state.opacity,
        scale: state.scale,
        left: state.left,
        top: state.top,
        rotate: entryRotate,
        rotateX: tiltX,
        rotateY: tiltY,
        filter: `blur(${state.blur}px)`,
      }}
      transition={{
        // Punchy spring — snaps in fast then settles with a hint of bounce.
        type: "spring",
        stiffness: 560,
        damping: 24,
        mass: 0.7,
      }}
    >
      <CardSurface src={src} radius={state.radius} border={border} />
    </motion.div>
  );
}

// Folder centre on the canvas — the point everything streaks toward
// on phase 12 (Apple-style "portal suck-in"). Folder body sits at
// (93, 613) 271×162 after phase 3 shift; centre ≈ (228, 694).
const FOLDER_CX = 228;
const FOLDER_CY = 694;

// Mouth of the front pocket — the barcode capsule sits 91px down the
// folder body and stands 87 tall, so its opening is ~y 708. Photos aim
// HERE rather than at the body centre: they should disappear behind the
// pocket lip, which is where a card actually goes when it's filed.
const FOLDER_MOUTH_CY = 708;

// Direct streak vector — folder-facing travel for photos.
function streakToFolder(
  startCX: number,
  startCY: number,
  targetCY: number = FOLDER_CY,
) {
  const dx = FOLDER_CX - startCX;
  const dy = targetCY - startCY;
  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  return { dx, dy, angleDeg };
}

// Spiral keyframes — orbits into the folder centre on a smooth curved
// path (radius shrinks on a cubic curve, angle sweeps a full ~1.15
// revolutions). Produces enough keyframes for a silky whirlpool.
function spiralWhirlpoolKeyframes(
  startCX: number,
  startCY: number,
  targetCY: number = FOLDER_CY,
  turns: number = 2.3,
) {
  const dx0 = startCX - FOLDER_CX;
  const dy0 = startCY - targetCY;
  const r0 = Math.hypot(dx0, dy0);
  const a0 = Math.atan2(dy0, dx0);
  const steps = 28;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    // Radius eases in — slow contraction at first, sharp collapse at end.
    const r = r0 * (1 - Math.pow(p, 2.6));
    // Sweep a full whirlpool arc on the way down.
    const a = a0 + p * Math.PI * turns;
    xs.push(FOLDER_CX + r * Math.cos(a) - startCX);
    ys.push(targetCY + r * Math.sin(a) - startCY);
  }
  return { xs, ys };
}

/* Agent orb wrapper — reuses the glass AgentOrb component from the
 * onboarding flow. Pops in with a snappy spring, idles on a scale
 * pulse, then on `whirlpool` swirls into the folder's centre. */
/* Per-orb idle character. Four orbs breathing on one shared 2.4s loop
 * read as a mechanism; giving each its own period, phase offset and
 * drift distance means they never line up, so the group looks alive
 * rather than driven. Periods are deliberately non-multiples of each
 * other so the pattern doesn't visibly re-sync. */
const ORB_IDLE = [
  { pulse: 2.9, drift: 4.6, sway: 3.2, offset: 0 },
  { pulse: 2.2, drift: 3.4, sway: 5.1, offset: 0.7 },
  { pulse: 3.4, drift: 5.4, sway: 2.6, offset: 1.3 },
  { pulse: 2.6, drift: 3.9, sway: 4.4, offset: 0.35 },
] as const;

function PaymentAgentOrb({
  x,
  y,
  size = 90,
  blob,
  visible,
  entryRotate = 0,
  idleSeed = 0,
  suckIn = false,
  suckDelay = 0,
}: {
  x: number;
  y: number;
  size?: number;
  blob: string;
  visible: boolean;
  entryRotate?: number;
  /** Picks this orb's idle personality out of ORB_IDLE. */
  idleSeed?: number;
  suckIn?: boolean;
  suckDelay?: number;
}) {
  const startCX = x + size / 2;
  const startCY = y + size / 2;
  const idle = ORB_IDLE[idleSeed % ORB_IDLE.length];

  // Whirlpool path into the pocket mouth — the same destination the
  // photo cards target, so everything converges on one point. Orbs
  // spiral where the cards streak straight: they're weightless, so a
  // curved orbit suits them and keeps the two reads distinct.
  const { xs, ys } = spiralWhirlpoolKeyframes(
    startCX,
    startCY,
    FOLDER_MOUTH_CY,
  );

  // Entry approach vector — each orb drifts in from further OUT along
  // its own folder axis, so it looks summoned toward the folder rather
  // than dropped from above like the previous uniform 14px rise.
  const outLen = Math.hypot(FOLDER_CX - startCX, FOLDER_MOUTH_CY - startCY);
  const outX = ((startCX - FOLDER_CX) / outLen) * 26;
  const outY = ((startCY - FOLDER_MOUTH_CY) / outLen) * 26;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute"
          style={{
            left: x,
            top: y,
            width: size,
            height: size,
            // Above everything on arrival, but BELOW the folder (z 2)
            // once it's being pulled in — so it disappears behind the
            // pocket lip exactly like the cards do.
            zIndex: suckIn ? 1 : 14,
            transformOrigin: "center",
          }}
          initial={{
            opacity: 0,
            scale: 0.55,
            rotate: entryRotate - 18,
            x: outX,
            y: outY,
          }}
          animate={
            suckIn
              ? {
                  // Held opaque almost the whole way in — the folder
                  // hides it, rather than it dissolving in open space.
                  opacity: [1, 1, 1, 1, 0],
                  scale: [1, 0.88, 0.58, 0.3, 0.14],
                  // Spins up as the orbit tightens.
                  rotate: [entryRotate, entryRotate + 140, entryRotate + 430],
                  x: xs,
                  y: ys,
                }
              : {
                  opacity: 1,
                  scale: 1,
                  rotate: entryRotate,
                  x: 0,
                  y: 0,
                }
          }
          exit={{ opacity: 0, scale: 0.9 }}
          transition={
            suckIn
              ? {
                  duration: 1.15,
                  delay: suckDelay,
                  // Linear on purpose: the acceleration is already baked
                  // into the spiral's radius curve, so easing on top
                  // would double up and stutter the arc.
                  ease: "linear",
                }
              : {
                  // Spring arrival with a touch of overshoot, matching
                  // the cards' weight instead of a flat 0.3s fade.
                  type: "spring",
                  stiffness: 420,
                  damping: 22,
                  mass: 0.8,
                }
          }
        >
          {/* Idle drift — a slow figure-eight wander. Separate wrapper
              from the pulse so the two loops run on different periods
              and compound into motion that never quite repeats. */}
          <motion.div
            className="absolute inset-0"
            animate={{
              x: [0, idle.drift, 0, -idle.drift, 0],
              y: [0, -idle.sway, 0, idle.sway, 0],
            }}
            transition={{
              duration: idle.pulse * 2.3,
              delay: idle.offset,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <motion.div
              className="absolute inset-0"
              animate={{ scale: [1, 1.05, 1], rotate: [0, 2.5, 0, -2.5, 0] }}
              transition={{
                duration: idle.pulse,
                delay: idle.offset,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <AgentOrb size={size} blob={blob} />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Photo streak — a photo that "gets sucked" into the folder on phase 12.
 * Wraps the base PhotoCard state and overrides its final motion with a
 * streak toward the folder centre (stretch + blur + fade). */
function PhotoStreak({
  state,
  src,
  border = true,
  zIndex,
  entryRotate = 0,
  tiltX = 8,
  tiltY = 0,
  suckIn,
  suckDelay = 0,
}: {
  state: CardState;
  src: string;
  border?: boolean;
  zIndex: number;
  entryRotate?: number;
  tiltX?: number;
  tiltY?: number;
  suckIn: boolean;
  suckDelay?: number;
}) {
  const startCX = state.left + state.width / 2;
  const startCY = state.top + state.height / 2;
  const { dx, dy, angleDeg } = streakToFolder(
    startCX,
    startCY,
    FOLDER_MOUTH_CY,
  );

  if (!suckIn) {
    return (
      <PhotoCard
        state={state}
        src={src}
        border={border}
        zIndex={zIndex}
        entryRotate={entryRotate}
        tiltX={tiltX}
        tiltY={tiltY}
      />
    );
  }

  return (
    <motion.div
      className="absolute"
      style={{
        left: state.left,
        top: state.top,
        width: state.width,
        height: state.height,
        // BEHIND the folder (which sits at zIndex 2) for the whole
        // journey. The cards start well above the folder so nothing
        // overlaps early, and arriving underneath is what makes the
        // finish read as filed INTO the pocket instead of fading out
        // in mid-air on top of it.
        zIndex: 1,
        transformOrigin: "center",
        transformPerspective: 900,
      }}
      initial={{
        opacity: state.opacity,
        scale: state.scale,
        rotate: entryRotate,
        rotateX: 8,
        x: 0,
        y: 0,
        filter: `blur(${state.blur}px)`,
      }}
      animate={{
        // Held fully opaque until the card is at the pocket mouth — the
        // folder lip does the hiding, so the last beat is only a short
        // fade covering whatever pixels clear the edge.
        opacity: [state.opacity, state.opacity, state.opacity, 0],
        scale: [state.scale, state.scale * 0.62, state.scale * 0.3, 0.22],
        rotate: angleDeg,
        // Pitches away from the viewer as it's drawn down, so the card
        // tips edge-on into the slot rather than sliding in flat.
        rotateX: [8, 34, 62, 74],
        x: [0, dx * 0.7, dx * 0.95, dx],
        y: [0, dy * 0.7, dy * 0.95, dy],
        filter: "blur(0px)",
      }}
      transition={{
        duration: 1.2,
        delay: suckDelay,
        ease: [0.6, 0, 0.85, 0.35],
        times: [0, 0.6, 0.88, 1],
      }}
    >
      <CardSurface src={src} radius={state.radius} border={border} />
    </motion.div>
  );
}

function PhotoStack({ phase }: { phase: Phase }) {
  const folderY = phase >= 3 ? 613 : 655;
  const suckIn = phase >= 12;
  return (
    <>
      {/* Photos gated behind the caption (phase 3+). On phase 12 every
          photo streaks into the folder — direct-line travel with
          stretch + blur + fade like a portal suck-in. */}
      {phase >= 3 && (
        <PhotoStreak
          state={photo1State(phase)}
          src="/assets/payment/photo-card.png"
          zIndex={10}
          entryRotate={-3}
          tiltX={9}
          tiltY={7}
          suckIn={suckIn}
          suckDelay={0}
        />
      )}
      {phase >= 4 && (
        <PhotoStreak
          state={photo2State(phase)}
          src="/assets/payment/photo-card.png"
          zIndex={11}
          entryRotate={4}
          tiltX={6}
          tiltY={-9}
          suckIn={suckIn}
          suckDelay={0.05}
        />
      )}
      {phase >= 5 && (
        <PhotoStreak
          state={photo3State(phase)}
          src="/assets/payment/photo-square.png"
          border={false}
          zIndex={12}
          entryRotate={-5}
          tiltX={11}
          tiltY={10}
          suckIn={suckIn}
          suckDelay={0.1}
        />
      )}
      {phase >= 6 && (
        <PhotoStreak
          state={photo4State(phase)}
          src="/assets/payment/photo-square.png"
          border={false}
          zIndex={13}
          entryRotate={6}
          tiltX={5}
          tiltY={-6}
          suckIn={suckIn}
          suckDelay={0.15}
        />
      )}

      {/* Agent orbs — glass AgentOrb from Screen 4. Positions are
          scattered off-grid at varied sizes and tilts so the four orbs
          feel loose and hand-placed, not locked to a 2×2 layout. */}
      <PaymentAgentOrb
        x={128}
        y={348}
        size={98}
        visible={phase >= 8}
        blob="/assets/orb/blob-flight.png"
        entryRotate={-11}
        idleSeed={0}
        suckIn={suckIn}
        suckDelay={0}
      />
      <PaymentAgentOrb
        x={318}
        y={386}
        size={72}
        visible={phase >= 9}
        blob="/assets/orb/blob-safety.png"
        entryRotate={14}
        idleSeed={1}
        suckIn={suckIn}
        suckDelay={0.1}
      />
      <PaymentAgentOrb
        x={35}
        y={512}
        size={110}
        visible={phase >= 10}
        blob="/assets/orb/blob-forex.png"
        entryRotate={-4}
        idleSeed={2}
        suckIn={suckIn}
        suckDelay={0.2}
      />
      <PaymentAgentOrb
        x={244}
        y={594}
        size={80}
        visible={phase >= 11}
        blob="/assets/orb/ellipse.png"
        entryRotate={17}
        idleSeed={3}
        suckIn={suckIn}
        suckDelay={0.3}
      />

      {/* Sparkle stars — rise with the folder on phase 2, stay after */}
      {phase >= 2 && (
        <motion.div
          className="pointer-events-none absolute"
          style={{ left: 64, top: 870.4, width: 321, height: 87, zIndex: 11 }}
          initial={{ opacity: 0, y: 140 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.85, ease: IN_EASE }}
        >
          <Image
            src="/assets/payment/stars.svg"
            alt=""
            width={321}
            height={87}
            style={{ width: 321, height: 87 }}
          />
        </motion.div>
      )}

      {/* ATLYS folder ticket — arrives with photo1, glides up on phase 3.
          On phase 13 the folder holds a fanned stack of "memories" (the
          sandwich plate image) BETWEEN its backside and its front barcode
          capsule — so the front pocket visually covers the bottom of
          each photo, reading as cards tucked into a real folder pocket. */}
      {phase >= 2 && (
        <motion.div
          className="absolute inset-0"
          style={{ zIndex: 10 }}
          animate={{ y: folderY - 655 }}
          transition={{ duration: 0.9, ease: IN_EASE }}
        >
          <FolderTicket
            delay={0}
            middleContent={
              phase >= 13 ? <FolderMemoryStack /> : undefined
            }
          />
        </motion.div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Frame 3 additions — "advanced AI agents are already working to get you
 * travel-ready" caption slides in below the ticket, positioned at the same
 * vertical the folder used to occupy so the folder shifts up cleanly to
 * make room for it.
 * -------------------------------------------------------------------------*/
function Frame3Elements({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.p
          key="frame3-caption"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center text-white"
          style={{
            // Sits below the folder ticket, generously sized so it reads
            // as the hero line — big display type breaking into three
            // clean lines centered under the folder.
            top: 810,
            width: 360,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 500,
            fontSize: 22,
            lineHeight: "28px",
            letterSpacing: "-0.88px",
            zIndex: 11,
          }}
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.8, ease: IN_EASE }}
        >
          advanced AI agents are
          <br />
          already working to get you
          <br />
          travel-ready
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/* Full-canvas dim overlay — sits on top of persistent + frame elements so
   everything reads as dimmed. Kept out of both layers so it never re-mounts
   between phases. */
function DimOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 5 }}>
      <Image
        src="/assets/payment/overlay-dim.svg"
        alt=""
        width={440}
        height={965}
        style={{ width: 440, height: 965 }}
      />
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * FolderMemoryStack — a fan of landscape "photo" cards rendered inside
 * the FolderTicket's middleContent slot. Coordinates are LOCAL to the
 * folder (271×162), so cards sit right on the folder's frost surface
 * with their bottoms tucked under the barcode capsule pocket.
 * -------------------------------------------------------------------------*/
function FolderMemoryStack() {
  // Folder-local coordinates. Backside is 271×162 (top-left at 0,0).
  // Cards fan around the middle so the pocket (capsule at top:91) hides
  // their bottom halves.
  const cards = [
    { w: 200, h: 122, cx: 135, cy: 70, rot: -9, delay: 0 },
    { w: 210, h: 128, cx: 135, cy: 74, rot: -4, delay: 0.05 },
    { w: 218, h: 132, cx: 135, cy: 78, rot: 2, delay: 0.1 },
    { w: 224, h: 136, cx: 135, cy: 82, rot: 7, delay: 0.15 },
    { w: 230, h: 140, cx: 135, cy: 86, rot: 12, delay: 0.2 },
  ];
  return (
    <>
      {cards.map((c, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute overflow-hidden"
          style={{
            left: c.cx - c.w / 2,
            top: c.cy - c.h / 2,
            width: c.w,
            height: c.h,
            borderRadius: 8,
            boxShadow: "0 6px 16px rgba(0,0,0,0.28)",
          }}
          initial={{ opacity: 0, scale: 0.7, rotate: c.rot - 18 }}
          animate={{ opacity: 1, scale: 1, rotate: c.rot }}
          transition={{
            delay: c.delay,
            type: "spring",
            stiffness: 380,
            damping: 24,
            mass: 0.8,
          }}
        >
          <Image
            src="/assets/payment/folder-material.png"
            alt=""
            fill
            style={{ objectFit: "cover", borderRadius: 8 }}
          />
        </motion.div>
      ))}
    </>
  );
}

/* Deprecated — kept only for reference; FolderMemoryStack replaces this. */
function FolderPhotoStack({ visible }: { visible: boolean }) {
  // Folder body sits at (93, 613) 271×162 after phase-3 shift; the
  // frosted-glass front lets photos placed BEHIND it show through
  // softly. Cards are landscape-oriented, fanned tightly around the
  // folder's centre, and sized close to the folder body so they read
  // like a bundle of memories tucked inside the pocket.
  const FOLDER_CX = 228;
  // Move the fan slightly DOWN so the bottom halves of the photos sit
  // BEHIND the folder's barcode-capsule "front" — the front then
  // visually covers the photo bottoms and reads as a real folder pocket
  // with cards tucked inside.
  const FOLDER_CENTER_Y = 720;

  const cards = [
    { w: 234, h: 143, dx: -14, dy: -6, rot: -8, delay: 0 },
    { w: 240, h: 146, dx: -6, dy: -3, rot: -3, delay: 0.05 },
    { w: 246, h: 149, dx: 0, dy: 0, rot: 2, delay: 0.1 },
    { w: 252, h: 152, dx: 8, dy: 3, rot: 6, delay: 0.15 },
    { w: 258, h: 155, dx: 14, dy: 6, rot: 11, delay: 0.2 },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {cards.map((c, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute overflow-hidden"
              style={{
                left: FOLDER_CX + c.dx - c.w / 2,
                top: FOLDER_CENTER_Y + c.dy - c.h / 2,
                width: c.w,
                height: c.h,
                borderRadius: 8,
                // Sits BEHIND the folder ticket (folder wrapper is
                // zIndex 10 inside PhotoStack) so the frosted front
                // panel softly veils the cards.
                zIndex: 6 + i * 0.1,
                boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
              }}
              initial={{ opacity: 0, scale: 0.7, rotate: c.rot - 20 }}
              animate={{ opacity: 0.9, scale: 1, rotate: c.rot }}
              transition={{
                delay: c.delay,
                type: "spring",
                stiffness: 380,
                damping: 24,
                mass: 0.8,
              }}
            >
              <Image
                src="/assets/payment/folder-material.png"
                alt=""
                fill
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            </motion.div>
          ))}
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------------
 * Frame 12/13 — Payment card. After the folder swallows everything, the
 * dim overlay clears and this bright white card rises up with the totals,
 * Pay Now / Pay on Appt booking split, and payment method row.
 * -------------------------------------------------------------------------*/
function PaymentCard({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Updated chat copy — replaces the "Ok Noted…" line */}
          <motion.p
            className="absolute text-[20px] font-medium leading-[25px] text-[#808080]"
            style={{ left: 30, top: 130, width: 364, letterSpacing: "-0.8px", zIndex: 15 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6, ease: IN_EASE }}
          >
            Pay the{" "}
            <span className="text-black">
              government fee and we&apos;ll begin processing your visa
              application right away
            </span>
          </motion.p>

          {/* Payment card — white rounded panel with breakdown + methods */}
          <motion.div
            className="absolute bg-white border border-[#f2f2f2] overflow-hidden"
            style={{
              left: 30,
              top: 318,
              width: 380,
              height: 439,
              borderRadius: 30,
              zIndex: 15,
            }}
            initial={{ opacity: 0, y: 60, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: 0.2,
              duration: 0.9,
              ease: IN_EASE,
            }}
          >
            {/* Soft color-bloom in the upper-right corner (blurred image 93) */}
            <div
              className="pointer-events-none absolute"
              style={{
                right: -20,
                top: -20,
                width: 220,
                height: 220,
                background:
                  "radial-gradient(circle at 70% 30%, rgba(255,220,140,0.45), rgba(255,180,220,0.3) 40%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* TOTAL AMOUNT header */}
            <p
              className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase text-black"
              style={{ top: 30, letterSpacing: "0.88px", lineHeight: "14px" }}
            >
              TOTAL AMOUNT
            </p>
            <p
              className="absolute left-1/2 -translate-x-1/2 text-[24px] font-semibold text-[#0b0b0b] whitespace-nowrap"
              style={{ top: 54, letterSpacing: "-0.96px", lineHeight: "28px" }}
            >
              ₹18,199
            </p>

            {/* Divider */}
            <div
              className="absolute"
              style={{ left: 30, top: 107, width: 320, height: 1, background: "#e5e5e5" }}
            />

            {/* Pay Now row */}
            <div className="absolute" style={{ left: 30, top: 132, width: 320 }}>
              <div className="relative">
                <div
                  className="absolute rounded-full bg-black"
                  style={{ left: 0, top: 6, width: 8, height: 8 }}
                />
                <p
                  className="absolute text-[14px] font-semibold leading-[19px] text-[#0b0b0b]"
                  style={{ left: 21, top: 0, letterSpacing: "-0.14px" }}
                >
                  Pay Now
                </p>
                <p
                  className="absolute text-[12px] font-semibold leading-[16px] opacity-50 text-black"
                  style={{ left: 21, top: 25, letterSpacing: "-0.12px" }}
                >
                  Govt. Fee
                </p>
                <p
                  className="absolute right-0 text-[14px] font-semibold leading-[19px] text-[#0b0b0b] whitespace-nowrap"
                  style={{ top: 0, letterSpacing: "-0.14px" }}
                >
                  ₹12,000
                </p>
              </div>
            </div>

            {/* Pay on Appt booking row */}
            <div className="absolute" style={{ left: 30, top: 198, width: 320 }}>
              <div className="relative">
                <div
                  className="absolute rounded-full border border-black"
                  style={{ left: 0, top: 6, width: 8, height: 8 }}
                />
                <p
                  className="absolute text-[14px] font-semibold leading-[19px] text-[#0b0b0b]"
                  style={{ left: 21, top: 0, letterSpacing: "-0.14px" }}
                >
                  Pay on Appt booking
                </p>
                <p
                  className="absolute text-[12px] font-semibold leading-[16px] opacity-50 text-black"
                  style={{ left: 21, top: 25, letterSpacing: "-0.12px" }}
                >
                  Express Booking Fee
                </p>
                <p
                  className="absolute text-[12px] font-semibold leading-[16px] opacity-50 text-black"
                  style={{ left: 21, top: 47, letterSpacing: "-0.12px" }}
                >
                  GST
                </p>
                <p
                  className="absolute right-0 text-[14px] font-semibold leading-[19px] text-[#0b0b0b] whitespace-nowrap"
                  style={{ top: 0, letterSpacing: "-0.14px" }}
                >
                  ₹6,199
                </p>
                <p
                  className="absolute right-0 text-[12px] font-semibold leading-[16px] opacity-50 text-black whitespace-nowrap"
                  style={{ top: 25, letterSpacing: "-0.12px" }}
                >
                  ₹4,000
                </p>
                <p
                  className="absolute right-0 text-[12px] font-semibold leading-[16px] opacity-50 text-black whitespace-nowrap"
                  style={{ top: 47, letterSpacing: "-0.12px" }}
                >
                  ₹2,100
                </p>
              </div>
            </div>

            {/* Divider */}
            <div
              className="absolute"
              style={{ left: 30, top: 291, width: 320, height: 1, background: "#e5e5e5" }}
            />

            {/* PAY VIA: label */}
            <p
              className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase text-black whitespace-nowrap"
              style={{ top: 316, letterSpacing: "0.88px", lineHeight: "14px" }}
            >
              PAY VIA:
            </p>

            {/* 4 payment method squares (Gpay, Amex-shield, UPI, generic card) */}
            {[
              { label: "GPay", left: 30 },
              { label: "Shield", left: 113 },
              { label: "UPI", left: 197 },
              { label: "Card", left: 280 },
            ].map((m, i) => (
              <div
                key={i}
                className="absolute bg-white border border-[#f2f2f2]"
                style={{
                  left: m.left,
                  top: 344,
                  width: 70,
                  height: 70,
                  borderRadius: 15,
                }}
              >
                <p
                  className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#666]"
                  style={{ top: 30 }}
                >
                  {m.label}
                </p>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function DetailRow({
  label,
  value,
  valueColor = "#000",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col">
      <p
        className="text-[14px] font-medium leading-[19px] text-[#999]"
        style={{ letterSpacing: "-0.28px" }}
      >
        {label}
      </p>
      <p
        className="text-[14px] font-medium leading-[19px]"
        style={{ letterSpacing: "-0.28px", color: valueColor }}
      >
        {value}
      </p>
    </div>
  );
}
