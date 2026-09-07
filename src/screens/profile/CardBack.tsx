"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* WorldPass card — reverse face. Figma node 853:16751.
 *
 * Where the front is a black slab with the globe, the back is light: a
 * pastel bloom at the top fading to white, a "+" in a gradient ring, the
 * connect copy, and a scatter of embossed partner seals along the bottom.
 *
 *   copy   14px Inter Medium, 19 line-height, -0.28 tracking, 182 wide,
 *          card-relative y 98. "Connect your" and the closing clause are
 *          grey; the list of programmes between them is black.
 *   seals  ~40px, staggered in two loose rows, some running past the
 *          card's bottom edge.
 */

const CARD_W = 252.325;

/* The partner seals are one supplied composite (1000×551) rather than
 * seven placed images — the arrangement, overlaps and shadows are part of
 * the artwork, so reproducing them by hand would only approximate it.
 *
 * Converted to greyscale at export rather than with a CSS filter: a
 * filter on an element flattens 3D for its subtree, and this sits inside
 * the card's flip plane where preserve-3d has to survive. */
const SEALS_W = 286;
const SEALS_H = Math.round((551 / 1000) * SEALS_W);

export default function CardBack({ onConnect }: { onConnect?: () => void }) {
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ borderRadius: 30, background: "#ffffff" }}
    >
      {/* Pastel bloom across the top, fading to white by mid-card. Two
          overlapping fields rather than one ramp — the render has rose to
          the right of the lavender, which a single gradient can't hold. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: 0,
          top: 0,
          width: CARD_W,
          height: 190,
          background: [
            "radial-gradient(66% 70% at 26% 8%, rgba(214,206,246,0.75) 0%, rgba(214,206,246,0) 100%)",
            "radial-gradient(62% 66% at 82% 4%, rgba(248,196,214,0.8) 0%, rgba(248,196,214,0) 100%)",
            "radial-gradient(50% 60% at 54% 0%, rgba(255,226,178,0.5) 0%, rgba(255,226,178,0) 100%)",
          ].join(", "),
        }}
      />

      {/* "+" in a gradient ring — same palette as the agent orbits, so the
          affordance reads as one family across the product. */}
      <button
        type="button"
        aria-label="Connect a programme"
        onClick={(e) => {
          // The card sits inside a drag handler; a tap on the "+" must
          // open the gate rather than being read as the start of a swipe.
          e.stopPropagation();
          onConnect?.();
        }}
        className="absolute left-1/2 -translate-x-1/2 cursor-pointer"
        style={{ top: 44, width: 34, height: 34 }}
      >
        <svg width="34" height="34" viewBox="0 0 44 44" fill="none">
          <defs>
            <linearGradient id="cardback-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#14163A" />
              <stop offset="50%" stopColor="#4E55E5" />
              <stop offset="75%" stopColor="#AB4D8C" />
              <stop offset="100%" stopColor="#EE874E" />
            </linearGradient>
          </defs>
          <circle
            cx="22"
            cy="22"
            r="21"
            fill="rgba(255,255,255,0.6)"
            stroke="url(#cardback-ring)"
            strokeWidth="1"
          />
          <path
            d="M22 14v16M14 22h16"
            stroke="#0b0b0b"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </button>

      <p
        className="absolute left-1/2 -translate-x-1/2 text-center font-medium"
        style={{
          top: 92,
          width: 196,
          fontSize: 14,
          lineHeight: "19px",
          letterSpacing: "-0.28px",
          color: "#808080",
        }}
      >
        Connect your{" "}
        <span style={{ color: "#0b0b0b" }}>
          airline and hotel programmes, credit card rewards and travel
          passes,
        </span>{" "}
        I&apos;ll bring them all together for you.
      </p>

      {/* Seals. Anchored to the bottom and allowed to run past both
          side edges, as the design has them — the group reads as
          continuing beyond the card rather than being arranged inside it.
          Drifts very slightly: these are pressed INTO the card, not
          floating above it. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          left: (CARD_W - SEALS_W) / 2,
          bottom: -6,
          width: SEALS_W,
          height: SEALS_H,
        }}
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/profile/seals.png"
          alt=""
          width={SEALS_W}
          height={SEALS_H}
          unoptimized
          style={{ width: SEALS_W, height: SEALS_H, display: "block" }}
        />
      </motion.div>
    </div>
  );
}
