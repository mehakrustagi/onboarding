"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* Frosted 50×50 back button at (30, 50) — Figma 947:41886.
 *
 * Glass rather than a solid chip so it picks up whatever colour is passing
 * underneath it. During the handoff the wash climbs right through this
 * corner, and a solid button would sit on top of that as a dead spot. */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function BackChip({
  delay = 0.12,
  onClick,
}: {
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label="Back"
      onClick={onClick}
      className="absolute"
      style={{
        left: 30,
        top: 50,
        width: 50,
        height: 50,
        borderRadius: 40,
        border: "1px solid rgba(255,255,255,0.85)",
        background:
          "linear-gradient(133deg, rgba(255,255,255,0.4) 10%, rgba(255,255,255,0.1) 72%)",
        backdropFilter: "blur(25px)",
        WebkitBackdropFilter: "blur(25px)",
        boxShadow: "0 4px 30px -2px rgba(78,78,78,0.05)",
        zIndex: 6,
      }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.5, ease: IN_EASE }}
    >
      <Image
        src="/assets/payment/back-arrow.svg"
        alt=""
        width={20}
        height={20}
        style={{ position: "absolute", left: 15, top: 15, width: 20, height: 20 }}
      />
    </motion.button>
  );
}
