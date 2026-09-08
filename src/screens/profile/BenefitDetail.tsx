"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/* Benefit detail — Figma node 853:63181.
 *
 * Opens when ACTIVATE is tapped, on a benefit card either in the profile
 * or in the all-benefits sheet.
 *
 * Geometry from the node:
 *   rings    464×464 at 12% opacity, centred (220, 258)
 *   title    28px Inter Medium, -1.12 tracking, 36 line-height, 211 wide,
 *            centred on (220.5, 528)
 *   T&C      11px Inter Bold at y 604, 299 wide
 *   Redeem   pill spanning the width, label 14px SemiBold at y 861.83
 *
 * The background is a warm bloom — amber at the top through rose into
 * lavender — sampled from the render rather than guessed: rgb(255,243,209)
 * high up, (238,214,228) and (229,224,248) lower down, resolving to white
 * by y 450.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* The bloom's colour fields — amber high and slightly left, rose through
 * the middle, lavender low, matching the render. Sized well beyond the
 * area they light and heavily blurred, so you see the glow and never the
 * shape making it. */
const BLOOM_FIELDS = [
  {
    color: "rgba(255,216,138,0.9)",
    fade: "rgba(255,216,138,0.28)",
    x: 20,
    y: -80,
    w: 380,
    h: 340,
    blur: 44,
    drift: 46,
    lift: 34,
    swell: 1.16,
    dur: 11,
  },
  {
    color: "rgba(248,188,204,0.85)",
    fade: "rgba(248,188,204,0.26)",
    x: 130,
    y: 40,
    w: 360,
    h: 320,
    blur: 48,
    drift: -54,
    lift: 42,
    swell: 1.19,
    dur: 13.5,
  },
  {
    color: "rgba(200,190,248,0.85)",
    fade: "rgba(200,190,248,0.26)",
    x: -60,
    y: 150,
    w: 380,
    h: 330,
    blur: 46,
    drift: 60,
    lift: 30,
    swell: 1.14,
    dur: 9.5,
  },
] as const;

export type BenefitDetailContent = {
  title: string;
  terms: string;
  art: string;
};

export default function BenefitDetail({
  benefit,
  onClose,
}: {
  /** null closes the sheet — passing the content in rather than an `open`
   *  flag means the panel can't render with a stale title mid-exit. */
  benefit: BenefitDetailContent | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {benefit && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 50, background: "#ffffff", borderRadius: 44 }}
          // Rises from below: this is a detail opening OUT of the card you
          // tapped, so it should arrive from the direction of the list
          // rather than fading in on the spot.
          initial={{ opacity: 0, y: 26 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.42, ease: IN_EASE }}
        >
          {/* Warm bloom. Each colour is its own drifting field rather
              than a stop in one static stack — the amber, rose and
              lavender move on separate periods, so where they overlap
              keeps changing and the background never settles into a
              fixed image. A single animated gradient can only slide as a
              whole; this actually re-mixes. */}
          <div
            className="pointer-events-none absolute overflow-hidden"
            style={{ left: 0, top: 0, width: 440, height: 560 }}
          >
            {BLOOM_FIELDS.map((f, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: f.x,
                  top: f.y,
                  width: f.w,
                  height: f.h,
                  borderRadius: "50%",
                  background: `radial-gradient(closest-side, ${f.color} 0%, ${f.fade} 52%, rgba(255,255,255,0) 100%)`,
                  filter: `blur(${f.blur}px)`,
                }}
                animate={{
                  x: [0, f.drift, -f.drift * 0.6, 0],
                  y: [0, -f.lift, f.lift * 0.7, 0],
                  scale: [1, f.swell, 1 / f.swell, 1],
                }}
                transition={{
                  x: { duration: f.dur, repeat: Infinity, ease: "easeInOut" },
                  // Periods deliberately don't divide into each other, so
                  // the fields never return to the same arrangement.
                  y: {
                    duration: f.dur * 1.37,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                  scale: {
                    duration: f.dur * 0.79,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              />
            ))}

            {/* Fades the whole bloom out before the title, so the colour
                dissolves into the page rather than ending on a line. */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0) 55%, rgba(255,255,255,0.85) 84%, #ffffff 100%)",
              }}
            />
          </div>

          {/* Concentric rings, held at the design's 12% — they're a texture
              behind the artwork, not a feature in their own right. */}
          <motion.div
            className="pointer-events-none absolute"
            style={{ left: 220 - 232, top: 258 - 232, width: 464, height: 464 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            transition={{ delay: 0.1, duration: 0.8, ease: IN_EASE }}
          >
            {/* Turning slowly, and breathing on a different period. The
                rings are concentric, so rotation alone would be almost
                invisible — it's the scale that makes the pattern read as
                alive, and the rotation that stops the breathing looking
                like a pulse. */}
            <motion.div
              style={{ width: 464, height: 464 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 90, repeat: Infinity, ease: "linear" }}
            >
              <motion.div
                style={{ width: 464, height: 464 }}
                animate={{ scale: [1, 1.06, 0.98, 1] }}
                transition={{
                  duration: 13,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src="/assets/profile/d-rings.png"
                  alt=""
                  width={464}
                  height={464}
                  unoptimized
                  style={{ width: 464, height: 464, display: "block" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Hero artwork. Same 736×414 source as the cards, so the ratio
              carries over exactly; only the scale differs. */}
          <motion.div
            className="pointer-events-none absolute"
            style={{ left: 42, top: 176, width: 356, height: 200 }}
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.14, duration: 0.7, ease: IN_EASE }}
          >
            {/* Floats, so the artwork sits in the bloom rather than on it. */}
            <motion.div
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src={benefit.art}
                alt=""
                width={356}
                height={200}
                unoptimized
                style={{
                  width: 356,
                  height: 200,
                  display: "block",
                  objectFit: "contain",
                }}
              />
            </motion.div>
          </motion.div>

          {/* Close */}
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{
              zIndex: 2,
              left: 360,
              top: 80,
              width: 50,
              height: 50,
              borderRadius: 25,
              background: "rgba(255,255,255,0.9)",
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

          {/* Title — centred on (220.5, 528), so a two-line block of
              36px leading starts at 492. */}
          <motion.p
            className="absolute left-1/2 -translate-x-1/2 text-center font-medium"
            style={{
              top: 492,
              width: 211,
              fontSize: 28,
              lineHeight: "36px",
              letterSpacing: "-1.12px",
              color: "#000000",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: IN_EASE }}
          >
            {benefit.title}
          </motion.p>

          <motion.p
            className="absolute left-1/2 -translate-x-1/2 text-center font-bold uppercase"
            style={{
              top: 604,
              width: 299,
              fontSize: 11,
              lineHeight: "14px",
              letterSpacing: "0.88px",
              color: "#0b0b0b",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26, duration: 0.6, ease: IN_EASE }}
          >
            Terms &amp; Conditions
          </motion.p>

          <motion.p
            className="absolute left-1/2 -translate-x-1/2 text-center"
            style={{
              top: 634,
              width: 299,
              fontSize: 14,
              lineHeight: "20px",
              letterSpacing: "-0.14px",
              color: "#9a9aa2",
            }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.31, duration: 0.6, ease: IN_EASE }}
          >
            {benefit.terms}
          </motion.p>

          {/* Redeem. Its fill is the same palette as the pills' travelling
              border, but laid flat across the button and pale — the
              gradient IS the button here, so it carries at low saturation
              where the dark pills need it at full. */}
          <motion.button
            type="button"
            className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
            style={{ top: 848, width: 380, height: 48, borderRadius: 24 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36, duration: 0.6, ease: IN_EASE }}
          >
            <motion.div
              className="absolute"
              style={{
                inset: 0,
                background:
                  "linear-gradient(90deg, #eae9fc 0%, #efe6f6 26%, #f6ecec 50%, #faf0dc 74%, #f9f2d1 100%)",
                backgroundSize: "220% 100%",
              }}
              // The wash drifts across, so the button reads as lit rather
              // than printed.
              animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
            />
            <span
              className="absolute inset-0 flex items-center justify-center font-semibold"
              style={{
                fontSize: 14,
                lineHeight: "20px",
                letterSpacing: "-0.14px",
                color: "#0b0b0b",
              }}
            >
              Redeem
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
