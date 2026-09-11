"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";

/* Hold to explore — 853:18425 and its two progress states.
 *
 * The pill and the orb that sit on the pass's left edge, inviting the
 * hold that opens the explore view.
 *
 * Geometry from the node (frame coordinates):
 *   block  131×117 at (44, 346)
 *   pill   131×23, label 115×14 at (8, 5)
 *   halo   77 at (70, 386)   → block-local (26, 40)
 *   ring   39 at (89, 405)   → block-local (45, 59)
 *   core   21 at (98, 414)   → block-local (54, 68)
 *
 * The three frames differ only in how far the ring has come round, so
 * progress is a stroke-dashoffset on the ring rather than three states.
 */

export const HOLD_MS = 1100;

const BLOCK_X = 44;
const BLOCK_Y = 346;
const HALO = 77;
/* The dark disc between the halo and the ring. Not in the node's layer
 * list — it reads there as part of the ring artwork — but it is what gives
 * the orb its weight, and without it the white ring floats on the pale
 * halo with nothing behind it. */
const DISC = 55;
const RING = 39;
const CORE = 26;
/* Concentric, so all three share this centre inside the block. */
const CX = 26 + HALO / 2;
const CY = 40 + HALO / 2;

const R = RING / 2 - 2;
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
  const coreScale = useTransform(progress, [0, 1], [1, 1.38]);

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
      {/* The pill. Fades as the hold takes hold — once you are holding, the
          instruction has been followed and the ring is the thing to watch. */}
      <motion.div
        className="absolute left-0 top-0 flex items-center"
        style={{
          width: 131,
          height: 23,
          borderRadius: 11.5,
          paddingLeft: 8,
          background: "#cfc8f2",
        }}
        animate={{ opacity: held ? 0.25 : 1 }}
        transition={{ duration: 0.25 }}
      >
        <span
          className="whitespace-nowrap font-bold uppercase"
          style={{
            // 11/0.88 is what makes the label 115 wide inside a 131 pill,
            // which is how the node sizes it.
            fontSize: 11,
            lineHeight: "14px",
            letterSpacing: "0.88px",
            color: "#ffffff",
          }}
        >
          HOLD TO EXPLORE
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
            "radial-gradient(circle, rgba(199,192,240,0.85) 0%, rgba(199,192,240,0.78) 62%, rgba(199,192,240,0) 76%)",
        }}
        animate={
          held
            ? { scale: 1.14, opacity: 1 }
            : { scale: [1, 1.06, 1], opacity: [0.75, 1, 0.75] }
        }
        transition={
          held
            ? { duration: 0.24 }
            : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
        }
      />

      {/* The dark body the ring sits on. */}
      <div
        className="absolute"
        style={{
          left: CX - DISC / 2,
          top: CY - DISC / 2,
          width: DISC,
          height: DISC,
          borderRadius: DISC / 2,
          background: "#262447",
        }}
      />

      {/* Ring. The track is always there; the stroke on top is the hold.
          Drawn as SVG rather than a conic gradient so the cap is round and
          the sweep starts at twelve o'clock without a seam. */}
      <svg
        className="absolute"
        style={{ left: CX - RING / 2, top: CY - RING / 2 }}
        width={RING}
        height={RING}
        viewBox={`0 0 ${RING} ${RING}`}
        fill="none"
      >
        <circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          stroke="#ffffff"
          strokeWidth={3}
        />
        <motion.circle
          cx={RING / 2}
          cy={RING / 2}
          r={R}
          // Violet over the white, so at rest the ring is the solid white
          // one the design draws and the hold is an arc travelling over it
          // — rather than the ring being absent until you press.
          stroke="#6b5cf0"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={CIRC}
          style={{ strokeDashoffset: dash }}
          transform={`rotate(-90 ${RING / 2} ${RING / 2})`}
        />
      </svg>

      {/* Core. Grows with the hold, so the orb is visibly filling rather
          than only tracing an outline. */}
      <motion.div
        className="absolute"
        style={{
          left: CX - CORE / 2,
          top: CY - CORE / 2,
          width: CORE,
          height: CORE,
          borderRadius: CORE / 2,
          background: "#5b4fe0",
          scale: coreScale,
        }}
      />
    </motion.div>
  );
}
