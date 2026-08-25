"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type MotionValue,
  type PanInfo,
} from "framer-motion";
import { haptic } from "@/lib/haptics";

/* -----------------------------------------------------------------------------
 * Screen 6 — "Your WorldPass is issued"
 *   Two-card horizontal carousel:
 *     0) WorldPass card (shared visual with Screen 5's finale card)
 *     1) "Build your household" (dashed placeholder, + icon)
 *   As user drags left, the strip snaps to the next card. When scrolled,
 *   the header subtitle stays, the CTA switches to "Confirm & Claim", and the
 *   Skip link becomes a scarier "No, I want to lose my benefits".
 * ---------------------------------------------------------------------------*/

const IN_EASE = [0.22, 1, 0.36, 1] as const;
const STAGGER = 0.15;

const CARD_W = 230;
const CARD_H = 330;
const CARD_GAP = 22;
const STRIDE = CARD_W + CARD_GAP;
const PHONE_W = 440;
const STRIP_PAD_X = (PHONE_W - CARD_W) / 2; // center the first card
const CARD_TOP = 317; // matches Screen 5's finale card position

export default function Screen6({
  screen5CardX,
}: {
  /** MotionValue owned by OnboardingFlow — Screen 6 drives this to the
   *  strip's x offset so Screen 5's WorldPass card slides horizontally
   *  in perfect sync with the carousel (no fade ghosting). */
  screen5CardX?: MotionValue<number>;
} = {}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const x = useMotionValue(0);
  const scrollProgress = useTransform(x, [-STRIDE, 0], [1, 0], { clamp: true });
  const s5NameOpacity = useTransform(scrollProgress, [0, 0.2], [1, 0]);

  // Slide Screen 5's card along with the strip. Values are identical to `x`
  // so the two cards move as one — no crossfade required.
  useEffect(() => {
    if (!screen5CardX) return;
    const unsub = x.on("change", (v) => screen5CardX.set(v));
    return () => unsub();
  }, [x, screen5CardX]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const projected = info.offset.x + info.velocity.x * 0.12;
    const target = Math.max(
      -STRIDE,
      Math.min(0, projected < -STRIDE / 2 ? -STRIDE : 0),
    );
    animate(x, target, { type: "spring", stiffness: 320, damping: 32 });
    const nextIdx = target === 0 ? 0 : 1;
    if (nextIdx !== activeIdx) haptic("cardSwipeReveal");
    setActiveIdx(nextIdx);
  };

  const scrolled = activeIdx > 0;

  return (
    <div className="relative h-full w-full overflow-hidden rounded-[44px]">
      {/* Scan icon pill */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full text-[color:var(--ink)]"
        style={{
          top: 60,
          width: 65,
          height: 65,
          background: "#fff",
          boxShadow:
            "0 4.643px 13.929px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.03)",
        }}
        initial={{ opacity: 0, y: -10, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: IN_EASE }}
      >
        <ScanIcon />
      </motion.div>

      {/* Title with laurel decorations */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
        style={{ top: 155, width: 330, height: 64 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: STAGGER, duration: 0.6, ease: IN_EASE }}
      >
        <Image
          src="/assets/worldpass/laurels.svg"
          alt=""
          width={330}
          height={64}
          style={{ width: 330, height: "auto", opacity: 0.55 }}
        />
        <p
          className="absolute text-center text-[20px] font-medium leading-[25px] tracking-[-0.03em] text-[color:var(--ink)]"
          style={{ maxWidth: 200 }}
        >
          Your WorldPass is
          <br />
          issued
        </p>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        className="absolute left-1/2 -translate-x-1/2 text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-neutral-500"
        style={{ top: 232, maxWidth: 210 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: STAGGER * 1.5, duration: 0.6, ease: IN_EASE }}
      >
        Complete quick KYC to activate your pass and unlock all benefits
      </motion.p>

      {/* Name + divider + ID overlay — pinned to Screen 5's card interior.
          Screen 5's card shifts UP by 128px in the final phase, so its
          effective top is 435 − 128 = 307. Overlay lives inside the
          shifted card at Figma-relative y=253 (canvas y ≈ 560).
          Positions per Figma node 633:27923. Slides horizontally with
          the shared x MotionValue. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{ top: 307 + 253, width: 212, opacity: s5NameOpacity, x }}
      >
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: STAGGER * 2, duration: 0.6, ease: IN_EASE }}
        >
          <p
            className="text-white font-medium"
            style={{
              fontSize: 18,
              lineHeight: "22px",
              letterSpacing: "-0.72px",
            }}
          >
            mohak n.
          </p>
          <div
            className="mt-[15px]"
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 100%)",
            }}
          />
          <p className="worldpass-id mt-[15px]">6190001</p>
        </motion.div>
      </motion.div>

      {/* Card strip — draggable horizontally with snap to two positions.
          Slot 0: our own WorldPass replica, hidden while at rest (Screen 5's
                  card shows through), fades in as user starts to drag so
                  the card travels WITH the strip.
          Slot 1: Build your household. */}
      <motion.div
        className="absolute cursor-grab active:cursor-grabbing"
        style={{
          top: CARD_TOP,
          left: 0,
          x,
          paddingLeft: STRIP_PAD_X,
          paddingRight: STRIP_PAD_X,
          display: "flex",
          gap: CARD_GAP,
          touchAction: "pan-y",
        }}
        drag="x"
        dragConstraints={{ left: -STRIDE, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: STAGGER * 2, duration: 0.6, ease: IN_EASE }}
      >
        {/* Slot 0 — phantom that leaves Screen 5's card visible; the card
            itself slides via the shared screen5CardX MotionValue. */}
        <div style={{ width: CARD_W, height: CARD_H, flexShrink: 0 }} />
        {/* Slot 1 — Build your household */}
        <div style={{ flexShrink: 0 }}>
          <HouseholdCard />
        </div>
      </motion.div>

      {/* Scroll hint (only when not scrolled) */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-[6px]"
        style={{ top: 685 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: scrolled ? 0 : 1, y: 0 }}
        transition={{ delay: STAGGER * 3, duration: 0.6, ease: IN_EASE }}
      >
        <p className="text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[color:var(--ink)]">
          Scroll to view all benefits
        </p>
        <ChevronDown />
      </motion.div>

      {/* Bottom sheet — CTA + link. Text swaps once user is on household card. */}
      <motion.div
        className="absolute bottom-0 left-0 w-full pt-6 pb-8"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0) 100%)",
        }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: STAGGER * 4, duration: 0.75, ease: IN_EASE }}
      >
        <div className="flex flex-col items-center gap-4 px-[30px]">
          <button
            className="relative h-[50px] w-full overflow-hidden rounded-full text-[14px] font-semibold tracking-[-0.01em] text-[color:var(--ink)]"
            style={{
              background:
                "linear-gradient(90deg, rgba(80,87,234,0.35) 0%, rgba(217,70,239,0.28) 35%, rgba(239,68,68,0.32) 65%, rgba(237,215,88,0.35) 100%)",
              boxShadow: "0 12px 30px -14px rgba(0,0,0,0.18)",
              border: "1px solid rgba(255,255,255,0.7)",
            }}
          >
            {scrolled
              ? "Confirm Details & Claim Benefits"
              : "Confirm Details & Activate Benefits"}
          </button>
          <button className="text-[14px] font-semibold underline underline-offset-4 text-[color:var(--ink)]">
            {scrolled ? "No, I want to lose my benefits" : "Skip"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Cards
 * -------------------------------------------------------------------------*/

function HouseholdCard() {
  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 30,
        border: "1px dashed #D6D9DC",
        background: "transparent",
      }}
    >
      {/* + icon in a bordered circle */}
      <div
        className="mb-6 flex items-center justify-center rounded-full"
        style={{
          width: 60,
          height: 60,
          border: "1px solid #D6D9DC",
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 5v14M5 12h14"
            stroke="#1a1a1a"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-center text-[14px] font-semibold leading-[19px] tracking-[-0.01em] text-black">
        Build your household
      </p>
      <p
        className="mt-2 text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-neutral-500"
        style={{ maxWidth: 190 }}
      >
        Add family members to extend WorldPass perks and automate their travel
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Icons
 * -------------------------------------------------------------------------*/

function ScanIcon() {
  return (
    <div className="relative" style={{ width: 24, height: 24 }}>
      <svg
        className="absolute"
        style={{
          left: (24 - 18.068) / 2,
          top: (24 - 18.068) / 2,
          width: 18.068,
          height: 18.068,
        }}
        viewBox="0 0 12.0452 12.0452"
        fill="currentColor"
      >
        <path d="M6.02262 6.02262C7.68637 6.02262 9.03393 4.67506 9.03393 3.01131C9.03393 1.34756 7.68637 0 6.02262 0C4.35887 0 3.01131 1.34756 3.01131 3.01131C3.01131 4.67506 4.35887 6.02262 6.02262 6.02262ZM6.02262 7.52827C4.01257 7.52827 0 8.53706 0 10.5396V12.0452H12.0452V10.5396C12.0452 8.53706 8.03267 7.52827 6.02262 7.52827Z" />
      </svg>
      <Bracket style={{ top: 0, left: 0 }} />
      <Bracket style={{ top: 0, right: 0, transform: "rotate(90deg)" }} />
      <Bracket style={{ bottom: 0, right: 0, transform: "rotate(180deg)" }} />
      <Bracket style={{ bottom: 0, left: 0, transform: "rotate(-90deg)" }} />
    </div>
  );
}

function Bracket({ style }: { style: React.CSSProperties }) {
  return (
    <svg
      className="absolute"
      style={{ width: 6.73, height: 6.73, ...style }}
      viewBox="0 0 7 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M6.5 1 L1 1 L1 6.5" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      width="18"
      height="10"
      viewBox="0 0 18 10"
      fill="none"
      className="text-[color:var(--ink)]/60"
    >
      <path
        d="M2 2l7 6 7-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
