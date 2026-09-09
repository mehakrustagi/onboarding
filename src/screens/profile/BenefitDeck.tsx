"use client";

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

export default function BenefitDeck({
  benefit = FLIGHT_BENEFIT,
  onOpen,
  onActivate,
}: {
  benefit?: BenefitFace;
  /** Tapping the card anywhere but ACTIVATE. */
  onOpen?: () => void;
  onActivate?: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen?.();
        }
      }}
      className="relative mx-auto cursor-pointer"
      style={{ width: DECK_W, height: DECK_H }}
    >
      <div
        className="pointer-events-none absolute"
        style={{ left: 37, top: 70, width: 306, height: 116, ...SHELL }}
      />
      <div
        className="pointer-events-none absolute"
        style={{ left: 12, top: 26, width: 356, height: 144, ...SHELL }}
      />
      <div className="absolute left-0 top-0">
        <BenefitCardFace benefit={benefit} onActivate={onActivate} />
      </div>
    </div>
  );
}
