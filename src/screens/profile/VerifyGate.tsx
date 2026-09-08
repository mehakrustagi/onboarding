"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BenefitCardFace } from "./BenefitDeck";

/* Verification gate — Figma node 853:22081.
 *
 * Opens from the "+" on the WorldPass card's back face. The agents grid
 * stays visible behind a warm scrim, so this reads as a gate placed in
 * front of the thing you were reaching for rather than a page swap.
 *
 * Geometry from the node:
 *   ring     110×110 at (165), vertically centred on 414
 *   orb       48×48, centred inside it
 *   headline  20px Inter Medium, 25 leading, -0.8 tracking, 242 wide,
 *             top 630
 *   redirect  14px Inter SemiBold on a four-stop gradient:
 *             #000 → rgb(80,87,234) → rgb(239,70,70) → rgb(237,215,88)
 *   close     50×50 at (361, 80)
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

const ORB_CX = 220;
const ORB_CY = 414;

export default function VerifyGate({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 60, borderRadius: 44 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: IN_EASE }}
        >
          {/* Scrim. Warm rather than neutral, and heavily blurred — the
              grid behind stays legible as shape and colour but not as
              content, which is what a gate should do. */}
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(255,253,250,0.86)",
              backdropFilter: "blur(18px) saturate(115%)",
              WebkitBackdropFilter: "blur(18px) saturate(115%)",
            }}
            onClick={onClose}
          />

          {/* The glow behind the orb. Three coloured fields orbiting the
              orb's centre at different radii and speeds, heavily blurred
              and blended so the light behind it keeps re-mixing rather
              than sitting as a fixed halo.

              Sized far larger than the orb and centred on it, so what you
              see is light spilling out from behind the object — never the
              shapes making it. */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: ORB_CX - 210,
              top: ORB_CY - 210,
              width: 420,
              height: 420,
            }}
          >
            {GLOW_FIELDS.map((f, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{
                  left: 210 - f.size / 2,
                  top: 210 - f.size / 2,
                  width: f.size,
                  height: f.size,
                  borderRadius: "50%",
                  background: `radial-gradient(closest-side, ${f.color} 0%, ${f.fade} 48%, rgba(255,255,255,0) 100%)`,
                  filter: `blur(${f.blur}px)`,
                  mixBlendMode: "multiply",
                }}
                // Orbits its own small circle rather than drifting on a
                // line, so the glow rotates around the orb instead of
                // sliding past it.
                animate={{
                  x: [0, f.orbit, 0, -f.orbit, 0],
                  y: [0, -f.orbit, 0, f.orbit, 0],
                  scale: [1, f.swell, 1 / f.swell, 1],
                }}
                transition={{
                  x: { duration: f.dur, repeat: Infinity, ease: "easeInOut" },
                  // A quarter-period offset on y is what turns two
                  // straight oscillations into a circle.
                  y: {
                    duration: f.dur,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: f.dur * 0.25,
                  },
                  scale: {
                    duration: f.dur * 1.31,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              />
            ))}
          </div>

          {/* The benefit card itself, lifted onto the scrim (853:21578) —
              380×154 centred at top 334. The gate is about THIS benefit,
              so the card has to come with it. */}
          <motion.div
            className="absolute left-1/2"
            style={{ top: 334, x: "-50%" }}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.08, duration: 0.55, ease: IN_EASE }}
          >
            <BenefitCardFace />
          </motion.div>

          <motion.p
            className="absolute left-1/2 -translate-x-1/2 text-center font-medium"
            style={{
              top: 630,
              width: 242,
              fontSize: 20,
              lineHeight: "25px",
              letterSpacing: "-0.8px",
              color: "#000000",
            }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.6, ease: IN_EASE }}
          >
            A quick verification is needed before this agent can be activated.
          </motion.p>

          {/* Redirect line. The gradient sweeps across on a loop, so the
              copy reads as an action in progress rather than a label. */}
          <motion.p
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-semibold"
            style={{
              bottom: 199,
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
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              backgroundPositionX: ["0%", "100%", "0%"],
            }}
            transition={{
              opacity: { delay: 0.26, duration: 0.6, ease: IN_EASE },
              y: { delay: 0.26, duration: 0.6, ease: IN_EASE },
              backgroundPositionX: {
                duration: 6,
                repeat: Infinity,
                ease: "easeInOut",
              },
            }}
          >
            Redirecting you to KYC completion...
          </motion.p>

          <motion.button
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
              background: "rgba(255,255,255,0.7)",
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Glow fields behind the orb. The orb itself is rose (rgb(230,173,181)),
 * so the glow leads with that and opens out through amber and lavender —
 * the light reads as coming FROM the object rather than being a backdrop
 * it happens to sit on. */
const GLOW_FIELDS = [
  {
    color: "rgba(248,176,190,0.75)",
    fade: "rgba(248,176,190,0.3)",
    size: 250,
    blur: 34,
    orbit: 22,
    swell: 1.14,
    dur: 7.5,
  },
  {
    color: "rgba(255,214,158,0.7)",
    fade: "rgba(255,214,158,0.28)",
    size: 300,
    blur: 42,
    orbit: 30,
    swell: 1.18,
    dur: 10.5,
  },
  {
    color: "rgba(206,196,246,0.7)",
    fade: "rgba(206,196,246,0.26)",
    size: 340,
    blur: 46,
    orbit: 26,
    swell: 1.12,
    dur: 13,
  },
] as const;
