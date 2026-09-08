"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { haptic } from "@/lib/haptics";

/* Save pill — Figma 887:8086 / 887:8092 / 887:8096.
 *
 * Three states of one control, not three controls:
 *   idle   check glyph + "save changes"
 *   saving the same pill with a spinner in the check's place
 *   saved  "Changes saved", no icon, on a pastel bloom
 *
 * It is content-width (~160), not a full-width bar — the design centres a
 * pill, and the width changing between states is part of the transition,
 * so the wrapper animates its own size rather than being pinned.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Pastel wash for the saved state — mint, lemon, sky. Kept pale: this
 * tints the pill, it is not a coloured button. */
const PASTELS = [
  { color: "rgba(150,225,180,0.95)", fade: "rgba(150,225,180,0.4)", x: -18, drift: 14, dur: 7.4 },
  { color: "rgba(238,238,158,0.9)", fade: "rgba(238,238,158,0.38)", x: 46, drift: -12, dur: 9.1 },
  { color: "rgba(168,206,244,0.9)", fade: "rgba(168,206,244,0.36)", x: 104, drift: 16, dur: 11.3 },
] as const;

const SAVING_MS = 1100;
const SAVED_MS = 1500;

type State = "idle" | "saving" | "saved";

export default function SavePill({ onSaved }: { onSaved?: () => void }) {
  const [state, setState] = useState<State>("idle");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(window.clearTimeout);
  }, []);

  const run = () => {
    if (state !== "idle") return;
    haptic("dragGrab");
    setState("saving");
    timers.current.push(
      window.setTimeout(() => {
        haptic("dragBreak");
        setState("saved");
      }, SAVING_MS),
      window.setTimeout(() => onSaved?.(), SAVING_MS + SAVED_MS),
    );
  };

  const saved = state === "saved";

  return (
    <motion.button
      type="button"
      onClick={run}
      className="relative flex items-center justify-center overflow-hidden"
      style={{
        height: 48,
        gap: saved ? 10 : 5.6,
        paddingLeft: saved ? 31 : 14.4,
        paddingRight: saved ? 31 : 24,
        borderRadius: saved ? 100 : 24,
        background: "#ffffff",
        border: `${saved ? 1 : 0.828}px solid ${saved ? "#ffffff" : "#e5e5e5"}`,
        boxShadow: saved
          ? "0 8px 16px 0 rgba(0,0,0,0.06)"
          : "0 4px 15px rgba(0,0,0,0.05)",
        cursor: state === "idle" ? "pointer" : "default",
      }}
      // Width is content-driven, so the pill shrinks into "Changes saved"
      // on its own; only the chrome needs easing.
      transition={{ duration: 0.45, ease: IN_EASE }}
      layout
    >
      {/* The bloom behind "Changes saved" (887:8098). Three pastel fields
          — green, lemon, blue — rather than one blurred bitmap, so they
          can drift against each other. Periods are deliberately
          incommensurate (7.4 / 9.1 / 11.3), so the three never
          resynchronise into a visible pulse; at this size a loop you can
          spot reads as a glitch rather than as motion. */}
      {saved && (
        <span
          className="pointer-events-none absolute inset-0"
          style={{ borderRadius: 100, overflow: "hidden" }}
        >
          {PASTELS.map((f, i) => (
            <motion.span
              key={i}
              className="absolute"
              style={{
                left: f.x,
                top: -26,
                width: 150,
                height: 100,
                borderRadius: "50%",
                background: `radial-gradient(closest-side, ${f.color} 0%, ${f.fade} 55%, rgba(255,255,255,0) 100%)`,
                filter: "blur(16px)",
              }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: 0.85,
                x: [0, f.drift, -f.drift * 0.6, 0],
                scale: [1, 1.12, 0.95, 1],
              }}
              transition={{
                opacity: { duration: 0.5, ease: IN_EASE },
                x: { duration: f.dur, repeat: Infinity, ease: "easeInOut" },
                scale: {
                  duration: f.dur * 0.83,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            />
          ))}
        </span>
      )}

      {state === "idle" && (
        <Image
          src="/assets/profile/ag-check.svg"
          alt=""
          width={24}
          height={24}
          style={{ width: 24, height: 24, display: "block", flexShrink: 0 }}
        />
      )}

      {state === "saving" && (
        <motion.span
          style={{ width: 24.797, height: 24.797, display: "block", flexShrink: 0 }}
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
        >
          <Image
            src="/assets/profile/ag-spin.svg"
            alt=""
            width={25}
            height={25}
            style={{ width: 24.797, height: 24.797, display: "block" }}
          />
        </motion.span>
      )}

      <span
        className="relative whitespace-nowrap font-semibold"
        style={{
          fontSize: 14,
          lineHeight: "19px",
          letterSpacing: "-0.14px",
          color: "#000000",
        }}
      >
        {saved ? "Changes saved" : "save changes"}
      </span>
    </motion.button>
  );
}
