"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import ActivatePill from "./ActivatePill";
import { BENEFIT_CARDS, type BenefitCard } from "./benefitCards";

/* Benefit deck — Figma 853:20914.
 *
 * Three stacked cards, not one. The two behind are empty shells whose only
 * job is to say "there are more of these": 306×116 at (37,70) and 356×144
 * at (12,26), under a 380×154 front. Same radius, same border, same
 * shadow, so the stack reads as one object seen edge-on.
 *
 * The front's geometry (853:20917):
 *   copy      211 wide at (29.5, 22.25), gap 10
 *   ACTIVATE  at (29.5, 104.25)
 *   artwork   322×181 at (233, -7) — deliberately larger than the card,
 *             which clips it
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export const DECK_W = 380;
export const DECK_H = 186; // 70 + 116, the deepest of the three

const SHELL = {
  background: "#ffffff",
  border: "1px solid #f4f5f6",
  borderRadius: 35.065,
  boxShadow: "0 4.675px 28px 0 rgba(0,0,0,0.05)",
} as const;

export type BenefitFace = BenefitCard;

/* The deck's front card. Figma leads the set with this one (914:4691). */
export const FLIGHT_BENEFIT: BenefitFace = BENEFIT_CARDS[0];

/** The 380×154 front on its own — reused by the verification gate, which
 *  lifts this exact card onto the scrim (853:21578). */
export function BenefitCardFace({
  benefit = FLIGHT_BENEFIT,
  onActivate,
}: {
  benefit?: BenefitFace;
  onActivate?: () => void;
}) {
  const lines = Array.isArray(benefit.body) ? benefit.body : [benefit.body];
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: 380, height: 154, ...SHELL }}
    >
      {/* Artwork first — the copy and the pill sit over it. */}
      {benefit.art}

      <div
        className="absolute flex flex-col gap-[10px]"
        style={{ left: 29.5, top: 22.25, width: 211 }}
      >
        <p
          className="font-medium"
          style={{
            fontSize: 16,
            lineHeight: "20px",
            letterSpacing: "-0.64px",
            color: "#000000",
          }}
        >
          {benefit.title}
        </p>
        <div
          className="font-medium"
          style={{
            // Figma sets this per card, from 165 to 262 — two cards
            // deliberately run wider than the 211 column.
            width: benefit.bodyW ?? 211,
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.24px",
            color: "#999999",
          }}
        >
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      </div>

      {/* Activating is a different action from opening the card, so the
          pill swallows the click rather than letting it bubble. */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          onActivate?.();
        }}
      >
        <ActivatePill left={29.5} top={104.25} bolt={false} onActivate={onActivate} />
      </div>
    </div>
  );
}

/* The three stack positions, as Figma draws them (853:20915/16/17):
 *   front 380×154 at (0, 0)
 *   mid   356×144 at (12, 26)
 *   back  306×116 at (37, 70)
 *
 * Expressed as a transform of the front card rather than as three
 * different boxes, so one card can travel between them. Each slot's
 * centre and scale is derived from those rects: mid is centred 21px lower
 * at 0.937×0.935, back 51px lower at 0.805×0.753. */
const SLOTS = [
  { y: 0, sx: 1, sy: 1, opacity: 1 },
  { y: 21, sx: 356 / 380, sy: 144 / 154, opacity: 1 },
  { y: 51, sx: 306 / 380, sy: 116 / 154, opacity: 1 },
  /* A fourth, fully hidden, so a card leaving the back has somewhere to
     go and re-enters from — without it the cycle would pop. */
  { y: 68, sx: 0.72, sy: 0.66, opacity: 0 },
];

/* How long each card holds the front. Slow: this is ambient motion behind
 * the reading, not a carousel asking to be watched. */
const HOLD_MS = 3600;

export default function BenefitDeck({
  cards = BENEFIT_CARDS,
  onOpen,
  onActivate,
}: {
  cards?: BenefitCard[];
  /** Tapping the card anywhere but ACTIVATE — receives the card in front. */
  onOpen?: (card: BenefitCard) => void;
  onActivate?: (card: BenefitCard) => void;
}) {
  /* Which card is at the front. Advancing this rotates the whole stack:
     the front recedes, everything behind moves up one, and the card that
     fell off the back re-enters — a loop rather than a queue. */
  const [front, setFront] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || cards.length < 2) return;
    const t = window.setInterval(
      () => setFront((f) => (f + 1) % cards.length),
      HOLD_MS,
    );
    return () => window.clearInterval(t);
  }, [paused, cards.length]);

  const top = cards[front];

  return (
    <div
      className="relative mx-auto"
      style={{ width: DECK_W, height: DECK_H }}
      // Holds while you're reading it, and while a menu is open over it.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {cards.map((c, i) => {
        // Distance from the front, wrapping — so the stack is circular
        // rather than running out at the end of the list.
        const pos = (i - front + cards.length) % cards.length;
        const slot = SLOTS[Math.min(pos, SLOTS.length - 1)];
        const isFront = pos === 0;
        return (
          <motion.div
            key={c.key}
            className="absolute left-0 top-0"
            style={{
              width: 380,
              height: 154,
              transformOrigin: "50% 50%",
              // Later cards sit behind, and the one wrapping round is
              // furthest back so it never crosses in front of the stack.
              zIndex: cards.length - pos,
              pointerEvents: isFront ? "auto" : "none",
              cursor: isFront ? "pointer" : "default",
            }}
            initial={false}
            animate={{
              y: slot.y,
              scaleX: slot.sx,
              scaleY: slot.sy,
              opacity: slot.opacity,
            }}
            transition={{
              duration: 0.72,
              ease: IN_EASE,
              // The card dropping out of sight fades first, so it is gone
              // before it has to travel back to the front.
              opacity: { duration: slot.opacity === 0 ? 0.28 : 0.5, ease: IN_EASE },
            }}
            onClick={isFront ? () => onOpen?.(c) : undefined}
            onKeyDown={
              isFront
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen?.(c);
                    }
                  }
                : undefined
            }
            role={isFront ? "button" : undefined}
            tabIndex={isFront ? 0 : -1}
            aria-hidden={!isFront}
          >
            <BenefitCardFace benefit={c} onActivate={() => onActivate?.(c)} />
          </motion.div>
        );
      })}
      {/* Keeps the deck's box the design's height regardless of transforms. */}
      <span className="sr-only">{top.title}</span>
    </div>
  );
}
