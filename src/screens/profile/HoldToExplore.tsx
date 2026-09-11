"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";

/* Hold to explore — 853:18425 and its two progress states.
 *
 * The pill and the orb on the pass's left edge, inviting the hold that
 * opens the explore view.
 *
 * Geometry from the node (frame coordinates):
 *   block  131×117 at (44, 346)
 *   pill   131×23, label 115×14 at (8, 5)
 *   halo   77 at (70, 386)   → block-local (26, 40)
 *   ring   39 at (89, 405)   → block-local (45, 59)
 *   core   21 at (98, 414)   → block-local (54, 68)
 *
 * The three frames differ only in how far the ring has come round, so
 * progress is a stroke-dashoffset rather than three states.
 */

export const HOLD_MS = 1100;

const BLOCK_X = 44;
const BLOCK_Y = 346;
const HALO = 77;
/* The dark body between the halo and the ring. Not in the node's layer
 * list — it reads there as part of the ring artwork — but it is what gives
 * the orb weight; without it the white ring floats on the halo with
 * nothing behind it. */
const DISC = 55;
const RING = 39;
const CORE = 26;
/* Concentric, so all four share this centre inside the block. */
const CX = 26 + HALO / 2;
const CY = 40 + HALO / 2;

const R = RING / 2 - 1.6;
const CIRC = 2 * Math.PI * R;

export default function HoldToExplore({
  progress,
  held,
  show,
}: {
  /** 0 → 1 across the hold. A MotionValue, not state: this updates every
   *  frame of the press, and re-rendering the profile 60 times a second
   *  would drag the card's whole 3D subtree with it. */
  progress: MotionValue<number>;
  /** True while a finger is down, which is what wakes the orb. */
  held: boolean;
  show: boolean;
}) {
  const dash = useTransform(progress, (p) => CIRC * (1 - p));
  const coreScale = useTransform(progress, [0, 1], [1, 1.34]);
  const coreGlow = useTransform(
    progress,
    (p) =>
      `0 0 ${(6 + p * 20).toFixed(1)}px rgba(107,92,240,${(0.3 + p * 0.6).toFixed(2)})`,
  );

  return (
    <motion.div
      className="pointer-events-none absolute"
      // Above the pass strip (30) and the header (29), below the fixed
      // chrome (34). It is an instruction about the card, so it cannot sit
      // behind the card it is instructing you about.
      style={{ left: BLOCK_X, top: BLOCK_Y, width: 131, height: 117, zIndex: 32 }}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: show ? 1 : 0, x: show ? 0 : -8 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* The pill. Real glass rather than a flat tint: a translucent fill
          over a blurred backdrop, a lit top edge, and a coloured shadow
          under it.

          It straddles the card's left edge, so it has to hold up over
          white paper and black card at once — which is what the violet
          tint is for. Clear or white glass would vanish on the left half.

          Width is intrinsic, not the node's fixed 131: at 11/0.88 the label
          measures 115 in Figma's metrics but not necessarily in the
          browser's, and a fixed box clipped it. Padding sets the shape. */}
      <motion.div
        className="absolute left-0 top-0 flex items-center justify-center"
        style={{
          height: 26,
          paddingLeft: 13,
          paddingRight: 13,
          borderRadius: 13,
          background:
            "linear-gradient(160deg, rgba(160,150,242,0.62) 0%, rgba(116,103,224,0.52) 100%)",
          backdropFilter: "blur(16px) saturate(165%)",
          WebkitBackdropFilter: "blur(16px) saturate(165%)",
          border: "1px solid rgba(255,255,255,0.42)",
          boxShadow:
            "0 8px 20px rgba(44,34,132,0.22), inset 0 1px 0 rgba(255,255,255,0.5)",
        }}
        animate={{ opacity: held ? 0.3 : 1, y: held ? -2 : 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <span
          className="whitespace-nowrap font-bold uppercase text-white"
          style={{
            fontSize: 10,
            lineHeight: "14px",
            letterSpacing: "0.9px",
            textShadow: "0 1px 2px rgba(38,30,110,0.35)",
          }}
        >
          Hold to explore
        </span>
      </motion.div>

      {/* Halo. Breathes while idle and swells under the finger, so the orb
          answers the touch before the ring has gone anywhere. */}
      <motion.div
        className="absolute"
        style={{
          left: CX - HALO / 2,
          top: CY - HALO / 2,
          width: HALO,
          height: HALO,
          borderRadius: HALO / 2,
          background:
            "radial-gradient(circle, rgba(199,192,240,0.9) 0%, rgba(193,185,238,0.78) 58%, rgba(193,185,238,0) 74%)",
        }}
        animate={
          held
            ? { scale: 1.12, opacity: 1 }
            : { scale: [1, 1.055, 1], opacity: [0.8, 1, 0.8] }
        }
        transition={
          held
            ? { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
            : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* The dark body. Lit from the top-left so it reads as a sphere
          rather than a flat hole punched in the halo. */}
      <div
        className="absolute"
        style={{
          left: CX - DISC / 2,
          top: CY - DISC / 2,
          width: DISC,
          height: DISC,
          borderRadius: DISC / 2,
          background:
            "radial-gradient(120% 120% at 32% 26%, #34315f 0%, #24224a 46%, #16152c 100%)",
          boxShadow:
            "0 10px 24px rgba(22,21,44,0.38), inset 0 1px 1px rgba(255,255,255,0.12)",
        }}
      />

      {/* Ring. The white track is the orb at rest; the violet arc over it
          is the hold. Drawn as SVG rather than a conic gradient so the cap
          is round and the sweep starts at twelve o'clock without a seam. */}
      <svg
        className="absolute"
        style={{ left: CX - RING / 2, top: CY - RING / 2, overflow: "visible" }}
        width={RING}
        height={RING}
        viewBox={`0 0 ${RING} ${RING}`}
        fill="none"
      >
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke="rgba(255,255,255,0.94)"
          strokeWidth={2.4}
        />
        <motion.circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke="#7d6dff"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          style={{ strokeDashoffset: dash }}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </svg>

      {/* Core. Grows and lights as the hold fills, so the orb is charging
          rather than only tracing an outline. */}
      <motion.div
        className="absolute"
        style={{
          left: CX - CORE / 2,
          top: CY - CORE / 2,
          width: CORE,
          height: CORE,
          borderRadius: CORE / 2,
          background:
            "radial-gradient(120% 120% at 34% 28%, #8477ff 0%, #6355ea 52%, #4a3cd6 100%)",
          scale: coreScale,
          boxShadow: coreGlow,
        }}
      />
    </motion.div>
  );
}
