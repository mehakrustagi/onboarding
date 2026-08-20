"use client";

import { motion } from "framer-motion";
import type { CSSProperties } from "react";

/**
 * Word-by-word text reveal. Each word animates opacity + blur + subtle y-drop
 * in sequence with a tight stagger. Fast but dramatic — Apple keynote style.
 */
export default function WordReveal({
  text,
  className,
  style,
  delay = 0,
  staggerMs = 60,
  perWordDurationMs = 320,
  as: Tag = "p",
}: {
  /** Text to reveal. Multi-line supported via "\n". */
  text: string;
  className?: string;
  style?: CSSProperties;
  /** Delay before the first word appears (seconds). */
  delay?: number;
  /** Stagger between words (ms). */
  staggerMs?: number;
  /** Duration of each word's reveal (ms). */
  perWordDurationMs?: number;
  as?: "p" | "h1" | "h2" | "h3" | "div";
}) {
  const lines = text.split("\n");
  let wordCount = 0;
  return (
    <Tag className={className} style={style}>
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split(" ").map((word, wi) => {
            const idx = wordCount++;
            return (
              <motion.span
                key={`${li}-${wi}`}
                className="inline-block"
                initial={{ opacity: 0, filter: "blur(10px)", y: 8 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{
                  delay: delay + idx * (staggerMs / 1000),
                  duration: perWordDurationMs / 1000,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {word}
                {wi < line.split(" ").length - 1 && " "}
              </motion.span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
