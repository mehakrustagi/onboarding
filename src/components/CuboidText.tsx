"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { CSSProperties } from "react";

/**
 * Swap-text animation styled like a physical cuboid rotating on its X axis:
 *   • The old face rotates down (rotateX: 0 → -90) and out of view
 *   • The new face rotates in from above (rotateX: 90 → 0)
 * Both play simultaneously so it reads as one continuous solid flip.
 *
 * Note: parent needs a fixed height (the component uses absolute positioning
 * so a natural height would collapse during the swap).
 */
export default function CuboidText({
  text,
  className,
  style,
  duration = 0.7,
  height,
  delay = 0,
}: {
  text: string;
  className?: string;
  style?: CSSProperties;
  duration?: number;
  height: number;
  /** Seconds to wait before revealing new text. */
  delay?: number;
}) {
  return (
    <div
      className="relative"
      style={{
        height,
        perspective: 800,
        ...style,
      }}
    >
      <AnimatePresence initial={false}>
        <motion.div
          key={text}
          className="absolute inset-0"
          style={{
            transformOrigin: "50% 50%",
            transformStyle: "preserve-3d",
            backfaceVisibility: "hidden",
          }}
          initial={{ rotateX: 90, opacity: 0 }}
          animate={{
            rotateX: 0,
            opacity: 1,
            transition: { delay, duration, ease: [0.22, 1, 0.36, 1] },
          }}
          exit={{
            rotateX: -90,
            opacity: 0,
            transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
          }}
        >
          <p className={className}>{text}</p>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
