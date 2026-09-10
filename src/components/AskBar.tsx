"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* The "Ask anything" composer — 380×125 at (30, 810).
 *
 * Same slot and same artwork on every screen in the flow, which is the
 * point: it's the one element that does NOT change during the handoff, so
 * it acts as the anchor that tells you the two screens are the same app.
 * Everything else can wipe, wobble and recolour around it.
 *
 * The send button is the one variation. It sits at 50% white while the
 * agent is only listening, and goes solid black once there's a live trip
 * to act on — a filled affordance implies there's somewhere for the input
 * to go, and on the success screen there isn't yet.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function AskBar({
  /** Solid black send button — used once a trip is live. */
  sendFilled = false,
  delay = 0.36,
  placeholder = "Ask anything",
}: {
  sendFilled?: boolean;
  delay?: number;
  placeholder?: string;
}) {
  return (
    <motion.div
      className="absolute"
      /* Explicitly interactive: the reveal wrappers that carry this on the
         trips screen are pointer-events:none so they cannot swallow the
         page's scroll, and the composer has to opt back in. */
      style={{ left: 30, top: 810, width: 380, height: 125, zIndex: 6, pointerEvents: "auto" }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.7, ease: IN_EASE }}
    >
      <Image
        src="/assets/payment/input-bar-bg.svg"
        alt=""
        width={380}
        height={125}
        style={{ position: "absolute", inset: 0, width: 380, height: 125 }}
      />

      {/* Caret, then placeholder — Figma puts the caret at x 25 and the
          text at x 30, i.e. the field reads as focused and empty rather
          than as a button waiting to be tapped. */}
      <div
        className="absolute rounded-[3px]"
        style={{ left: 25, top: 23, width: 1.2, height: 25, background: "#0b0b0b" }}
      />
      <p
        className="absolute whitespace-nowrap text-[16px] font-medium text-[#e5e5e5]"
        style={{ top: 25, left: 30, lineHeight: "20px", letterSpacing: "-0.64px" }}
      >
        {placeholder}
      </p>

      <div
        className="absolute rounded-[15px] border border-[#f2f2f2] bg-white"
        style={{ left: 265, top: 60, width: 40, height: 40 }}
      >
        <Image
          src="/assets/payment/mic.svg"
          alt=""
          width={22}
          height={22}
          style={{ position: "absolute", left: 9, top: 9, width: 22, height: 22 }}
        />
      </div>

      <motion.div
        className="absolute rounded-[15px]"
        style={{ left: 315, top: 60, width: 40, height: 40 }}
        initial={false}
        animate={{
          backgroundColor: sendFilled ? "#0b0b0b" : "rgba(255,255,255,0.6)",
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/arrow-up.svg"
          alt=""
          width={22}
          height={22}
          style={{
            position: "absolute",
            left: 9,
            top: 9,
            width: 22,
            height: 22,
            transform: "rotate(90deg)",
            /* The source arrow is dark; inverting is cheaper and stays
               truer to the glyph than shipping a second copy of it. */
            filter: sendFilled ? "invert(1)" : "none",
            transition: "filter 0.5s ease",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
