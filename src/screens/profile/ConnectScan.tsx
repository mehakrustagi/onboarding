"use client";

import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useTime,
  useTransform,
  useMotionValue,
  animate,
} from "framer-motion";
import { useEffect, useState } from "react";
import AgentOrb from "@/components/AgentOrb";

/* Connecting / scanning — Figma node 853:17974.
 *
 * Opens from the "+" on the WorldPass card's back face: the agent goes
 * looking through your mail for travel programmes.
 *
 * Geometry from the node:
 *   column    258 wide at x 91, centred on y 465, 38px between blocks
 *   ring      110×110, orb 48×48 centred inside it (offset 31)
 *   headline  20px Inter Medium, 25 leading, -0.8 tracking, centred;
 *             "bringing all your" grey, the rest black
 *   status    14px SemiBold on the four-stop gradient
 *   found     two 16px provider marks overlapped by 13, then 12px grey
 *
 * The orb is onboarding's own AgentOrb — the layered glass one from
 * Screens 4 and 5 — rather than the flat export, so it carries the same
 * bezel, inner ring and glare as everywhere else it appears.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Onboarding's orb motion, lifted from Screen 4.
 *
 * Two parts, and both matter:
 *   · a cubic-Bézier ARC entrance — the orb sweeps in along a curve from
 *     off to the left, growing from ENTRY_SIZE and with its blur clearing
 *     as it arrives, so it reads as travelling into place rather than
 *     fading up on the spot;
 *   · a continuous sine BOB on a shared clock, at Screen 4's own
 *     constants (0.0022 rad/ms, amplitude 11), so the orb never settles.
 */
const ENTRY_SIZE = 10;
const ORB_SIZE = 48;
const RING_SIZE = 110;

/* The orb changes face once per bob cycle. The sine runs at 0.0022
 * rad/ms, so a full up-and-down is 2π/0.0022 ≈ 2856ms — the swap is timed
 * to that rather than to a round number, so the change always lands at
 * the bottom of the travel where the orb is momentarily still. Changing
 * mid-flight would read as a glitch. */
const BOB_PERIOD_MS = (2 * Math.PI) / 0.0022;
const ORB_BLOBS = [
  "/assets/orb/ellipse.png",
  "/assets/orb/blob-flight.png",
  "/assets/orb/blob-forex.png",
  "/assets/orb/blob-safety.png",
];
/* Control points for the entrance arc, in the orb's local frame: it comes
 * in from the left and below, bows upward, and lands at the origin. */
const ARC = {
  P0: { x: -190, y: 66 },
  P1: { x: -110, y: -54 },
  P2: { x: -34, y: -30 },
  P3: { x: 0, y: 0 },
} as const;

const arcAt = (t: number) => {
  const u = 1 - t;
  const b = (a: number, b1: number, c: number, d: number) =>
    u * u * u * a + 3 * u * u * t * b1 + 3 * u * t * t * c + t * t * t * d;
  return {
    x: b(ARC.P0.x, ARC.P1.x, ARC.P2.x, ARC.P3.x),
    y: b(ARC.P0.y, ARC.P1.y, ARC.P2.y, ARC.P3.y),
  };
};
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/* How long the scan runs before it resolves (853:18010). */
const SCAN_MS = 4000;
/* How long the found state holds before the card lifts away. */
const FOUND_HOLD_MS = 1600;
/* Ring colour on the found state, sampled from the render. */
const FOUND_GREEN = "rgb(16,185,129)";

export default function ConnectScan({
  open,
  onClose,
  onComplete,
  lifted = false,
}: {
  open: boolean;
  onClose: () => void;
  /** Fires once the found state has been read, so the caller can lift the
   *  card away and show what was behind it. */
  onComplete?: () => void;
  /** Once true, the whole screen recedes in z — see below. */
  lifted?: boolean;
}) {
  /* The scan resolves into the found state after four seconds. That
     state lives in ScanBody, which only mounts while `open` — so
     reopening starts a fresh search rather than needing to be reset,
     which would mean writing state synchronously in an effect. */
  const [found, setFound] = useState(false);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setFound(true), SCAN_MS);
    return () => {
      window.clearTimeout(t);
      setFound(false);
    };
  }, [open]);

  /* Once the result has been read, hand off. Separate from the scan timer
     so the hold is measured from the RESULT rather than from open — the
     two would drift apart the moment either duration changed. */
  useEffect(() => {
    if (!found || !onComplete) return;
    const t = window.setTimeout(onComplete, FOUND_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [found, onComplete]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{
            zIndex: 60,
            background: "#ffffff",
            borderRadius: 44,
            // Real perspective, so the lift is a Z translation rather than
            // a scale pretending to be one. Under perspective the screen's
            // edges converge as it recedes, which a scale can't do.
            transformPerspective: 1200,
            transformStyle: "preserve-3d",
          }}
          initial={{ opacity: 0, z: 0 }}
          animate={
            lifted
              ? {
                  // Pushed AWAY from the viewer and up, so it clears the
                  // frame like a card being lifted off a stack. Tilting
                  // slightly on X is what reveals it as a plane with a
                  // near and far edge rather than a flat rectangle
                  // shrinking.
                  opacity: 0,
                  z: -520,
                  y: -190,
                  rotateX: 14,
                }
              : { opacity: 1, z: 0, y: 0, rotateX: 0 }
          }
          exit={{ opacity: 0 }}
          transition={{
            duration: lifted ? 0.9 : 0.4,
            ease: lifted ? [0.5, 0, 0.2, 1] : IN_EASE,
          }}
        >
          {/* Column: orb, headline, then the status pair. */}
          <div
            className="absolute flex flex-col items-center"
            style={{ left: 91, top: 465, width: 258, transform: "translateY(-50%)" }}
          >
            <ScanOrb found={found} />

            <motion.p
              className="text-center font-medium"
              style={{
                marginTop: 24,
                width: "100%",
                fontSize: 20,
                lineHeight: "25px",
                letterSpacing: "-0.8px",
                color: "#808080",
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.6, ease: IN_EASE }}
            >
              {found ? (
                <>
                  Found
                  <br />
                  <span style={{ color: "#000000" }}>6 programs</span>
                </>
              ) : (
                <>
                  bringing all your{" "}
                  <span style={{ color: "#000000" }}>
                    travel benefits together.
                  </span>
                </>
              )}
            </motion.p>

            <motion.div
              className="flex flex-col items-center"
              style={{ marginTop: 38, width: 244 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: found ? 0 : 1, y: found ? 6 : 0 }}
              transition={{
                delay: found ? 0 : 0.22,
                duration: found ? 0.35 : 0.6,
                ease: IN_EASE,
              }}
            >
              {/* Status. The gradient sweeps, so the line reads as work
                  happening rather than a caption sitting still. */}
              <motion.p
                className="whitespace-nowrap text-center font-semibold"
                style={{
                  fontSize: 14,
                  lineHeight: "19px",
                  letterSpacing: "-0.14px",
                  backgroundImage:
                    "linear-gradient(90deg, rgb(0,0,0) 0%, rgb(80,87,234) 33%, rgb(239,70,70) 66%, rgb(237,215,88) 99%)",
                  backgroundSize: "220% 100%",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
                animate={{ backgroundPositionX: ["0%", "100%", "0%"] }}
                transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
              >
                Going through emails...
              </motion.p>

              <div
                className="flex items-center"
                style={{ marginTop: 15, gap: 12 }}
              >
                {/* Provider marks, overlapped by 13 of their 16 — they read
                    as a stack of connected accounts rather than a row. */}
                <div className="relative" style={{ width: 29, height: 16 }}>
                  <Image
                    src="/assets/profile/prov-gmail.png"
                    alt=""
                    width={16}
                    height={16}
                    unoptimized
                    className="absolute"
                    style={{ left: 0, width: 16, height: 16, borderRadius: "50%" }}
                  />
                  <Image
                    src="/assets/profile/prov-google.png"
                    alt=""
                    width={16}
                    height={16}
                    unoptimized
                    className="absolute"
                    style={{ left: 13, width: 16, height: 16, borderRadius: "50%" }}
                  />
                </div>
                <p
                  className="whitespace-nowrap text-center font-semibold"
                  style={{
                    fontSize: 12,
                    lineHeight: "16px",
                    letterSpacing: "-0.12px",
                    color: "#808080",
                  }}
                >
                  Found 1 program...
                </p>
              </div>
            </motion.div>
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{
              left: 361,
              top: 80,
              width: 50,
              height: 50,
              borderRadius: 25,
              background: "rgba(0,0,0,0.04)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 2 16 16M16 2 2 16"
                stroke="#0b0b0b"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* The orb assembly — ring, border and orb — with onboarding's entrance
 * and idle.
 *
 * The arc and the bob are applied to the WHOLE assembly rather than to
 * the orb alone. Moving only the orb left the ring and the green border
 * sitting still around it, which reads as an orb rattling inside a fixed
 * frame; moving all three together reads as one object with a halo.
 *
 * Kept as its own component because it owns a clock and a progress value,
 * and hooks can't live inside the conditional AnimatePresence branch
 * above.
 */
function ScanOrb({ found }: { found: boolean }) {
  const time = useTime();
  const [blobIndex, setBlobIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(
      () => setBlobIndex((i) => (i + 1) % ORB_BLOBS.length),
      BOB_PERIOD_MS,
    );
    return () => window.clearInterval(id);
  }, []);

  /* Entrance progress, driven by an explicit animate() rather than read
     from the clock — the arc has to run exactly once on mount, where the
     bob runs forever. */
  const arc = useMotionValue(0);
  useEffect(() => {
    const controls = animate(arc, 1, {
      duration: 1.15,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [arc]);

  const x = useTransform(arc, (t) => arcAt(clamp01(t)).x);
  /* Bob added to the arc's y, so the two compose: the assembly is already
     breathing as it flies in, rather than starting to move only once it
     has landed. */
  const y = useTransform([arc, time], (vals: number[]) => {
    const [t, ms] = vals;
    const bob = Math.sin(ms * 0.0022) * 11 * clamp01(t);
    return arcAt(clamp01(t)).y + bob;
  });
  const scale = useTransform(
    arc,
    (t) => (ENTRY_SIZE + (RING_SIZE - ENTRY_SIZE) * clamp01(t)) / RING_SIZE,
  );
  // Blur clears as it arrives — Screen 4's restBlurAt, same 6px ceiling.
  const filter = useTransform(
    arc,
    (t) => `blur(${((1 - clamp01(t)) * 6).toFixed(2)}px)`,
  );
  const opacity = useTransform(arc, [0, 0.12, 1], [0, 1, 1]);

  return (
    <motion.div
      className="relative"
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        transformOrigin: "center",
        x,
        y,
        scale,
        filter,
        opacity,
        willChange: "transform, filter, opacity",
      }}
    >
      {/* Searching: the ring turns while the orb inside stays upright. A
          ring that only pulsed would read as waiting rather than looking.
          It stops the moment the result lands — motion continuing past
          the answer would say the work is still going. */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: found ? 0 : 360, opacity: found ? 0 : 1 }}
        transition={{
          rotate: found
            ? { duration: 0.4, ease: IN_EASE }
            : { duration: 22, repeat: Infinity, ease: "linear" },
          opacity: { duration: 0.35, ease: IN_EASE },
        }}
      >
        <Image
          src="/assets/profile/verify-orb.png"
          alt=""
          width={RING_SIZE}
          height={RING_SIZE}
          unoptimized
          style={{ width: RING_SIZE, height: RING_SIZE, display: "block" }}
        />
      </motion.div>

      {/* Found: a clean green ring, drawn on rather than faded in. A
          stroke that draws reads as the loop closing — the search
          completing — where a fade would just be a colour change. */}
      <svg
        className="absolute inset-0"
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        fill="none"
        style={{ transform: "rotate(-90deg)" }}
      >
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={42}
          stroke={FOUND_GREEN}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 42}
          initial={false}
          animate={{ strokeDashoffset: found ? 0 : 2 * Math.PI * 42 }}
          transition={{ duration: 0.75, ease: IN_EASE }}
        />
      </svg>

      {/* Cross-faded rather than swapped: at 48px a hard cut between two
          different blobs reads as a flicker, where a short dissolve reads
          as the orb turning to show another face. */}
      <div
        className="absolute"
        style={{
          left: (RING_SIZE - ORB_SIZE) / 2,
          top: (RING_SIZE - ORB_SIZE) / 2,
          width: ORB_SIZE,
          height: ORB_SIZE,
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={blobIndex}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.06 }}
            transition={{ duration: 0.55, ease: IN_EASE }}
          >
            <AgentOrb size={ORB_SIZE} blob={ORB_BLOBS[blobIndex]} />
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
