"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { BenefitCardFace } from "./BenefitDeck";
import { BENEFIT_CARDS } from "./benefitCards";
import BenefitDetail, { type BenefitDetailContent } from "./BenefitDetail";
import { useState } from "react";

/* All benefits — Figma node 853:22811.
 *
 * Opens over the profile screen when "View all 24 benefits" is tapped. It
 * is an OVERLAY, not a route: the design keeps the WorldPass cards visible
 * behind a near-opaque white scrim (853:23039), so the sheet reads as
 * something rising over the profile rather than a page you navigated to.
 *
 * Geometry from the node:
 *   scrim      440×966 at (0,0)
 *   close      50×50 at (360, 80)
 *   content    380 wide at (30.5, 122)
 *   wordmark   153×65, centred
 *   subtitle   y 197.25, "Every visa, flight and hotel on one pass"
 *   Know more  y 228.25, underlined
 *   cards      380×154, first at y 278.25, pitch 178
 *
 * Card internals are consistent across all five:
 *   title      (61, +23.25)  211 wide
 *   body       (61, +53.25)  211×32
 *   ACTIVATE   (61, +105.25) 80×22
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

const CARD_X = 30.5;
const CARD_PITCH = 178;
const FIRST_CARD_Y = 278.25;

/* The cards come from benefitCards.tsx — all 18 of 914:4690, each with
 * its own composed artwork. This sheet only lays them out. */

const DEFAULT_TERMS =
  "Enjoy 5% off on eligible flight bookings. The offer may apply only to selected airlines, routes, travel dates or fare types and is subject to availability. Additional terms, exclusions and booking conditions may apply.";

export default function BenefitsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  /* Which benefit's detail is open. Holding the CONTENT rather than an
     index means the panel keeps its title through the exit animation
     instead of blanking as the selection clears. */
  const [detail, setDetail] = useState<BenefitDetailContent | null>(null);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0"
          style={{ zIndex: 40 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: IN_EASE }}
        >
          {/* Scrim. Near-opaque but not solid, and blurred — the WorldPass
              cards stay faintly readable behind it, which is what makes
              this an overlay rather than a new page. */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(252,252,252,0.94)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
            onClick={onClose}
          />

          {/* Scrollable content */}
          <div
            className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ paddingBottom: 60 }}
          >
            {/* Wordmark — the sparkle and the three-colour lockup are one
                exported asset, since the gradient runs across "world" and
                "pass" as a single sweep that CSS spans can't reproduce
                without splitting the word. */}
            <motion.div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 122, width: 153, height: 65 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12, duration: 0.5, ease: IN_EASE }}
            >
              <Image
                src="/assets/profile/wordmark.png"
                alt="atlys worldpass"
                width={153}
                height={65}
                unoptimized
                style={{ width: 153, height: 65, display: "block" }}
              />
            </motion.div>

            <motion.p
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-semibold"
              style={{
                top: 197.25,
                fontSize: 13,
                lineHeight: "16px",
                letterSpacing: "-0.13px",
                color: "#0b0b0b",
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.17, duration: 0.5, ease: IN_EASE }}
            >
              Every visa, flight and hotel on one pass
            </motion.p>

            <motion.button
              type="button"
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-semibold underline"
              style={{
                top: 228.25,
                fontSize: 13,
                lineHeight: "16px",
                letterSpacing: "-0.13px",
                color: "#0b0b0b",
                textUnderlineOffset: 3,
              }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.5, ease: IN_EASE }}
            >
              Know more
            </motion.button>

            {BENEFIT_CARDS.map((b, i) => (
              <BenefitRow
                key={b.key}
                index={i}
                onActivate={() =>
                  setDetail({
                    title: b.title,
                    terms: DEFAULT_TERMS,
                    art: b.art,
                  })
                }
              >
                <BenefitCardFace
                  benefit={b}
                  onActivate={() =>
                    setDetail({
                      title: b.title,
                      terms: DEFAULT_TERMS,
                      art: b.art,
                    })
                  }
                />
              </BenefitRow>
            ))}

            {/* Gives the scroll container room for the last card. */}
            <div
              style={{ height: FIRST_CARD_Y + BENEFIT_CARDS.length * CARD_PITCH }}
            />
          </div>

          {/* Close. The design uses the "add" glyph turned 45°, which is
              why it reads as an × rather than being a separate icon. */}
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{
              // Above the scroll layer. This button used to be rendered
              // BEFORE the scroller, which is a full-size absolute layer —
              // so it covered the button and ate every click. Nothing was
              // wrong with the handler; it simply never received the tap.
              zIndex: 2,
              left: 360,
              top: 80,
              width: 50,
              height: 50,
              borderRadius: 25,
              background: "#ffffff",
              boxShadow: "0 4px 18px 0 rgba(0,0,0,0.06)",
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: IN_EASE }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 2 16 16M16 2 2 16"
                stroke="#0b0b0b"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </motion.button>

          {/* Benefit detail (853:63181) — mounted above the sheet, so
              closing it returns to the benefits list rather than all the
              way back to the profile. */}
          <BenefitDetail benefit={detail} onClose={() => setDetail(null)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Just placement and the entrance — the card itself is BenefitCardFace,
 * shared with the profile deck so the two can't drift apart. */
function BenefitRow({
  index,
  children,
}: {
  index: number;
  onActivate: () => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ left: CARD_X, top: FIRST_CARD_Y + index * CARD_PITCH }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        // Capped: past the first handful the stagger stops reading as a
        // cascade and just delays the list.
        delay: 0.26 + Math.min(index, 6) * 0.07,
        duration: 0.6,
        ease: IN_EASE,
      }}
    >
      {children}
    </motion.div>
  );
}
