"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* Planet cluster — Figma node 856:7647 ("planets").
 *
 * The orb field on the right of the KYC card. A 148×94 window, clipped at
 * r35, holding eight orbs at wildly different sizes and depths.
 *
 * The thing that makes it read as depth rather than as scattered icons is
 * that size, opacity and BLUR all move together: the small orbs are also
 * dim and soft, the large ones sharp and bright. Figma sets the first two
 * explicitly (opacity 56% / 60% on the small ones); the blur is inferred
 * from the render, where the background orbs are visibly out of focus.
 *
 * Two orbs are deliberately cut by the window's edges — one off the right
 * at x 155 in a 148-wide box, one at x 128.9 running past it. That's what
 * makes the field read as continuing past the card rather than being
 * arranged inside it.
 *
 * Positions and sizes are Figma's exactly. */

const W = 148;
const H = 94;

type Orb = {
  src: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  blur: number;
  /** Seconds per drift cycle — all different, so the field never falls
   *  into a visible rhythm. */
  dur: number;
  /** How far it drifts. Nearer orbs move more: parallax. */
  travel: number;
};

const ORBS: Orb[] = [
  // Background — small, dim, soft.
  { src: "/assets/profile/p-orb6.png", x: 48.28, y: 21.46, size: 9.446, opacity: 0.56, blur: 1.1, dur: 9.4, travel: 1.4 },
  { src: "/assets/profile/p-orb6.png", x: 134.6, y: 17.94, size: 9.446, opacity: 0.6, blur: 1.1, dur: 11.2, travel: 1.6 },
  { src: "/assets/profile/p-orb5.png", x: 25.13, y: 31.95, size: 12.429, opacity: 0.78, blur: 0.8, dur: 8.1, travel: 2 },
  { src: "/assets/profile/p-orb4.png", x: 10, y: 50.67, size: 14.914, opacity: 0.85, blur: 0.5, dur: 10.3, travel: 2.4 },
  // Midground.
  { src: "/assets/profile/p-avatar.png", x: 155.18, y: 14, size: 23.928, opacity: 1, blur: 0, dur: 7.6, travel: 3 },
  { src: "/assets/profile/p-avatar.png", x: 37.34, y: 57.33, size: 23.928, opacity: 1, blur: 0, dur: 6.8, travel: 3.4 },
  // Foreground — largest, sharpest, most travel.
  { src: "/assets/profile/p-orb1.png", x: 79.4, y: 54.53, size: 27.346, opacity: 1, blur: 0, dur: 6.2, travel: 3.8 },
  { src: "/assets/profile/p-orb8.png", x: 128.9, y: 42.9, size: 26.325, opacity: 1, blur: 0, dur: 5.6, travel: 4.2 },
];

export default function PlanetCluster() {
  return (
    <div
      className="pointer-events-none relative overflow-hidden"
      style={{ width: W, height: H, borderRadius: 35 }}
    >
      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            opacity: o.opacity,
            filter: o.blur ? `blur(${o.blur}px)` : undefined,
          }}
          // Drifts on two axes with mismatched periods, so each orb traces
          // a slow wander rather than bobbing on a line. Amplitude scales
          // with depth — the near ones move furthest, which is the whole
          // parallax cue.
          animate={{
            y: [0, -o.travel, 0, o.travel * 0.6, 0],
            x: [0, o.travel * 0.5, 0, -o.travel * 0.4, 0],
          }}
          transition={{
            y: { duration: o.dur, repeat: Infinity, ease: "easeInOut" },
            x: {
              duration: o.dur * 1.43,
              repeat: Infinity,
              ease: "easeInOut",
            },
          }}
        >
          <Image
            src={o.src}
            alt=""
            width={o.size}
            height={o.size}
            unoptimized
            // p-avatar is an opaque photo, not orb artwork, so it needs
            // rounding to read as a planet. Everything else is already
            // round with transparent corners and renders as-is.
            style={
              o.src.includes("p-avatar")
                ? {
                    width: o.size,
                    height: o.size,
                    display: "block",
                    borderRadius: "50%",
                    objectFit: "cover",
                  }
                : { width: o.size, height: o.size, display: "block" }
            }
          />
        </motion.div>
      ))}

      {/* The four-point sparkle (856:7649). Its own asset — I'd
          substituted the WorldPass plus-logo, which is a different glyph
          and read as missing at this size. Positioned by its CENTRE,
          which is how the design expresses it: an offset from the
          window's middle. */}
      <motion.div
        className="absolute"
        style={{
          left: W / 2 + 17.76 - 19.75 / 2,
          top: H / 2 - 11.97 - 19.511 / 2,
          width: 19.75,
          height: 19.511,
          transform: "rotate(90deg)",
        }}
        // Twinkles rather than sitting still — a sparkle that doesn't
        // change is just a glyph.
        animate={{ opacity: [0.55, 1, 0.7, 1, 0.55], scale: [0.94, 1, 0.97, 1, 0.94] }}
        transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/profile/sparkle.svg"
          alt=""
          width={19.75}
          height={19.511}
          style={{ width: 19.75, height: 19.511, display: "block" }}
        />
      </motion.div>
    </div>
  );
}
