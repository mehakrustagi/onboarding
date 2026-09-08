"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import ActivatePill from "./ActivatePill";
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
const CARD_W = 380;
const CARD_H = 154;
const CARD_PITCH = 178;
const FIRST_CARD_Y = 278.25;

/* Artwork geometry is Figma's exactly, and every piece is deliberately
 * larger than the space it occupies — the card clips it. The plane in
 * particular is 322×181 inside a 380×154 card, hanging off both the right
 * edge and the bottom, which is what gives these cards their depth.
 *
 * Source PNGs are 736×414 (1.778) against Figma's 322×181 (1.779), so the
 * ratio carries over exactly; only the scale had to be corrected. */
type Benefit = {
  title: string;
  body: string;
  /** Copy for the detail panel (853:63181). */
  terms?: string;
  art: {
    src: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  /** The visa card sits its artwork on a pale green disc (853:23095). */
  disc?: { x: number; y: number; d: number };
};

const BENEFITS: Benefit[] = [
  {
    title: "Flat 5% back on flights",
    body: "Book flights in the app and get a flat 5% back in Atlys credits.",
    // image 516 (853:23070): 322×181 at (234, -6)
    art: { src: "/assets/profile/plane.png", x: 234, y: -6, w: 322, h: 181 },
  },
  {
    title: "Flat 10% off on hotels",
    body: "Book flights in the app and get a flat 5% back in Atlys credits.",
    // Group 1991428665 (853:23077): 107.5×113.68 at (262.5, 18.91)
    art: {
      src: "/assets/profile/b-key.png",
      x: 262.5,
      y: 18.91,
      w: 107.5,
      h: 113.68,
    },
  },
  {
    title: "$ 200 every trip",
    body: "Book flights in the app and get a flat 5% back in Atlys credits.",
    // image 518 (853:23087) is 201×246 at (249.39, -8.07), but the export
    // comes back already clipped by the card — so it's placed at the
    // clipped region's own origin and size rather than the node's.
    art: {
      src: "/assets/profile/b-cash.png",
      x: 249.39,
      y: 0,
      w: 130.61,
      h: 154,
    },
  },
  {
    title: "Visa fee, refunded",
    body: "Book flights in the app and get a flat 5% back in Atlys credits.",
    // image 521 (853:23094), likewise clipped on export.
    art: {
      src: "/assets/profile/b-passport.png",
      x: 235,
      y: 0,
      w: 145,
      h: 154,
    },
    // Ellipse 7115 (853:23095): 152×153 at (233.5, 24.75)
    disc: { x: 233.5, y: 24.75, d: 152 },
  },
  {
    title: "Flat 5% back on flights",
    body: "Book flights in the app and get a flat 5% back in Atlys credits.",
    art: { src: "/assets/profile/plane.png", x: 234, y: -6, w: 322, h: 181 },
  },
];

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

            {BENEFITS.map((b, i) => (
              <BenefitCard
                key={i}
                benefit={b}
                index={i}
                onActivate={() =>
                  setDetail({
                    title: b.title,
                    terms: b.terms ?? DEFAULT_TERMS,
                    art: b.art.src,
                  })
                }
              />
            ))}

            {/* Gives the scroll container room for the last card. */}
            <div
              style={{ height: FIRST_CARD_Y + BENEFITS.length * CARD_PITCH }}
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

function BenefitCard({
  benefit,
  index,
  onActivate,
}: {
  benefit: Benefit;
  index: number;
  onActivate: () => void;
}) {
  const { art, disc } = benefit;
  return (
    <motion.div
      className="absolute overflow-hidden"
      style={{
        left: CARD_X,
        top: FIRST_CARD_Y + index * CARD_PITCH,
        width: CARD_W,
        height: CARD_H,
        borderRadius: 30,
        background: "#ffffff",
        boxShadow: "0 4px 26px 0 rgba(0,0,0,0.05)",
      }}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.26 + index * 0.07,
        duration: 0.6,
        ease: IN_EASE,
      }}
    >
      {/* Pale disc behind the artwork on the visa card (853:23095). */}
      {disc && (
        <div
          className="pointer-events-none absolute"
          style={{
            left: disc.x,
            top: disc.y,
            width: disc.d,
            height: disc.d,
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 50% 50%, rgba(206,236,214,0.9) 0%, rgba(226,242,230,0.5) 62%, rgba(255,255,255,0) 100%)",
          }}
        />
      )}

      {/* Artwork. Deliberately allowed to run past the card's right edge
          and be clipped, as the design has it — the plane in particular
          is far wider than the space it sits in. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ left: art.x, top: art.y, width: art.w, height: art.h }}
        // A slow drift, different per card, so the artwork feels placed in
        // space rather than pasted on.
        animate={{ y: [0, -3.5, 0] }}
        transition={{
          duration: 5.2 + index * 0.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Image
          src={art.src}
          alt=""
          width={art.w}
          height={art.h}
          unoptimized
          style={{
            width: art.w,
            height: art.h,
            display: "block",
            objectFit: "contain",
          }}
        />
      </motion.div>

      <p
        className="absolute font-medium"
        style={{
          left: 30.5,
          top: 23.25,
          width: 211,
          fontSize: 16,
          lineHeight: "20px",
          letterSpacing: "-0.32px",
          color: "#0b0b0b",
        }}
      >
        {benefit.title}
      </p>
      <p
        className="absolute"
        style={{
          left: 30.5,
          top: 53.25,
          width: 211,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#9a9aa2",
        }}
      >
        {benefit.body}
      </p>

      <ActivatePill
        left={30.5}
        top={105.25}
        index={index}
        bolt={false}
        onActivate={onActivate}
      />
    </motion.div>
  );
}
