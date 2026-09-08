"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import AgentOrb from "@/components/AgentOrb";
import { CardFace, PROGRAMS, LP_W, LP_H } from "./ProgramsConnected";

/* Program detail — Figma 853:75340.
 *
 * What tapping either face of a loyalty card opens. Full-bleed 440×965.
 *
 * Geometry, frame-relative:
 *   close    50×50 at (360, 86)
 *   card     380×253 centred at top 159 — the BACK face, insight showing
 *   body     263 wide at (30, 451), grey with the offer in black
 *   orb      68×68 at (346, 433)
 *   label    "Get more points" at (30, 613)
 *   offer    268 wide at (30, 642)
 *   expiry   at (30, 700)
 *   sources  132×30 pill at (30, 752)
 *   bar      Continue, 380×48
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function ProgramDetail({
  index,
  onClose,
}: {
  /** null closes it — passing the index rather than a flag keeps the card
   *  on screen through the exit instead of blanking mid-animation. */
  index: number | null;
  onClose: () => void;
}) {
  const program = index === null ? null : PROGRAMS[index];

  return (
    <AnimatePresence>
      {program && (
        <motion.div
          className="absolute inset-0 overflow-hidden bg-white"
          style={{ zIndex: 75, borderRadius: 44 }}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.4, ease: IN_EASE }}
        >
          {/* The card, back face. Same component the deck renders, so the
              two can't drift apart. */}
          <div
            className="absolute left-1/2 overflow-hidden"
            style={{
              top: 159,
              width: LP_W,
              height: LP_H,
              transform: "translateX(-50%)",
              borderRadius: 30,
            }}
          >
            <Image
              src={program.art}
              alt=""
              width={LP_W}
              height={LP_H}
              style={{ width: LP_W, height: LP_H, display: "block" }}
            />
            <CardFace program={program} back />
          </div>

          {/* Body (853:75444). The offer itself is black inside grey
              surroundings — that contrast IS the hierarchy, so it is three
              spans rather than one colour. */}
          <p
            className="absolute font-medium"
            style={{
              left: 30,
              top: 451,
              width: 263,
              fontSize: 16,
              lineHeight: "22px",
              letterSpacing: "-0.64px",
              color: "#808080",
            }}
          >
            You have 50,000 Chase Ultimate Rewards points. There&rsquo;s
            currently a{" "}
            <span style={{ color: "#000000" }}>
              70% transfer bonus to IHG One Rewards,
            </span>{" "}
            so I can turn them into 85,000 IHG points instead of the usual
            50,000.
          </p>

          {/* The agent that found it (853:75459). */}
          <motion.div
            className="pointer-events-none absolute"
            style={{ left: 346, top: 433, width: 68, height: 68 }}
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 5.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <AgentOrb size={68} />
          </motion.div>

          <p
            className="absolute font-medium"
            style={{
              left: 30,
              top: 613,
              fontSize: 16,
              lineHeight: "22px",
              letterSpacing: "-0.64px",
              color: "#808080",
            }}
          >
            Get more points
          </p>

          <p
            className="absolute font-medium"
            style={{
              left: 30,
              top: 642,
              width: 268,
              fontSize: 16,
              lineHeight: "22px",
              letterSpacing: "-0.64px",
              color: "#000000",
            }}
          >
            Transfer 50,000 Chase points &rarr; 85,000 IHG points
          </p>

          <p
            className="absolute font-medium"
            style={{ left: 30, top: 700, width: 346, fontSize: 11, lineHeight: "16px", color: "#999999" }}
          >
            70% bonus available until Aug 31
          </p>

          {/* Sources (853:75479) — glass pill, two stacked provider marks. */}
          <div
            className="absolute flex items-center"
            style={{
              left: 30,
              top: 752,
              width: 132,
              height: 30,
              borderRadius: 30,
              border: "1px solid #ffffff",
              backdropFilter: "blur(25px)",
              WebkitBackdropFilter: "blur(25px)",
              backgroundImage:
                "linear-gradient(166.3deg, rgba(255,255,255,0.7) 10.5%, rgba(255,255,255,0.3) 72%)",
              boxShadow: "0 4px 30px -2px rgba(0,0,0,0.05)",
            }}
          >
            {["/assets/profile/prov-gmail.png", "/assets/profile/prov-google.png"].map(
              (src, i) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={20}
                  height={20}
                  unoptimized
                  className="absolute"
                  // Overlapped by 8px, so the pair reads as a stack.
                  style={{
                    left: 6 + i * 12,
                    top: 5,
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    objectFit: "cover",
                    background: "#ffffff",
                  }}
                />
              ),
            )}
            <span
              className="absolute whitespace-nowrap font-semibold"
              style={{ left: 46, fontSize: 12, lineHeight: "16px", letterSpacing: "-0.12px", color: "#999999" }}
            >
              3 Sources
            </span>
            <Image
              src="/assets/profile/lp-chev.svg"
              alt=""
              width={18}
              height={18}
              className="absolute"
              style={{ left: 109, width: 18, height: 18 }}
            />
          </div>

          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{ left: 360, top: 86, width: 50, height: 50, borderRadius: 25, background: "#f4f4f6" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2 16 16M16 2 2 16" stroke="#0b0b0b" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>

          {/* Continue (853:75455). The bar fades to #c6c6c6 rather than
              white here — Figma's own stop. */}
          <div
            className="absolute bottom-0 left-0 flex w-full flex-col items-center"
            style={{
              paddingTop: 110,
              paddingBottom: 34,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 15.263%, #c6c6c6 127.89%)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center"
              style={{
                width: 380,
                height: 48,
                borderRadius: 24,
                background: "#ffffff",
                border: "0.828px solid #e5e5e5",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              }}
            >
              <span
                className="whitespace-nowrap font-semibold"
                style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.14px", color: "#000000" }}
              >
                Continue
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
