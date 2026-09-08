"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* Medical card — Figma 853:65145.
 *
 * A dark card, not a panel of rows: #1e1e1e at r30 with a caduceus bleeding
 * off the right edge, a diagonal sheen across it, and the lock-screen
 * toggle built into its foot below a rule.
 *
 * Card-relative geometry:
 *   name      18px Medium at (32, 30), flag 18×18 at (121, 33)
 *   rows      y 73 / 103 / 133 / 163 — label at x32 (70% white),
 *             value at x196, both 11px Bold, 0.88 tracking
 *   caduceus  109×109 at (306, 73), with a 50×73 fade at (330, 105)
 *             pulling its lower half back into the card
 *   sheen     430.967×14 blurred 17 at 20%, turned 33.43°
 *   rule      321 wide at y204
 *   toggle    track 34×18 at (316, 226), knob 13 at (335, 228.5)
 */

const CARD_W = 380;
const CARD_H = 270;

export type MedicalField = { label: string; value: string };

export default function MedicalCard({
  fields,
  toggleLabel,
  on,
  onToggle,
}: {
  fields: MedicalField[];
  toggleLabel?: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ width: CARD_W, height: CARD_H, borderRadius: 30, background: "#1e1e1e" }}
    >
      {/* Caduceus, cropped by the card's right edge, with its lower half
          pulled back into the dark so it reads as embossed rather than
          pasted on. */}
      <Image
        src="/assets/profile/md-caduceus.png"
        alt=""
        width={109}
        height={109}
        unoptimized
        className="pointer-events-none absolute"
        style={{ left: 306, top: 73, width: 109, height: 109, objectFit: "cover" }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          left: 330,
          top: 105,
          width: 50,
          height: 73,
          background: "linear-gradient(180deg, rgba(30,30,30,0) 0%, #1e1e1e 100%)",
        }}
      />

      {/* Sheen. Drifts slowly across — a fixed highlight on a dark card
          reads as a printed streak. */}
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{ left: 35, top: -19, width: 367.382, height: 249.108 }}
      >
        <motion.div
          style={{
            width: 430.967,
            height: 14,
            background: "#ffffff",
            filter: "blur(17px)",
            opacity: 0.2,
            transform: "rotate(33.43deg)",
          }}
          animate={{ x: [-26, 26, -26] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <p
        className="absolute whitespace-nowrap font-medium text-white"
        style={{ left: 32, top: 30, fontSize: 18, lineHeight: "22px", letterSpacing: "-0.72px" }}
      >
        mohak n.
      </p>
      <Image
        src="/assets/profile/md-india.svg"
        alt=""
        width={18}
        height={18}
        className="absolute"
        style={{ left: 121, top: 33, width: 18, height: 18 }}
      />

      {fields.map((f, i) => (
        <div key={f.label}>
          <p
            className="absolute whitespace-nowrap font-bold uppercase text-white"
            style={{
              left: 32,
              top: 73 + i * 30,
              fontSize: 11,
              lineHeight: "14px",
              letterSpacing: "0.88px",
              opacity: 0.7,
            }}
          >
            {f.label}
          </p>
          <p
            className="absolute whitespace-nowrap font-bold uppercase text-white"
            style={{
              left: 196,
              top: 73 + i * 30,
              fontSize: 11,
              lineHeight: "14px",
              letterSpacing: "0.88px",
            }}
          >
            {f.value}
          </p>
        </div>
      ))}

      <div
        className="absolute"
        style={{ left: 29.5, top: 204, width: 321, height: 1, background: "rgba(255,255,255,0.14)" }}
      />

      {toggleLabel && (
        <>
          <p
            className="absolute whitespace-nowrap font-medium text-white"
            style={{ left: 29, top: 227, fontSize: 12, lineHeight: "16px", letterSpacing: "-0.24px", opacity: 0.5 }}
          >
            {toggleLabel}
          </p>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={on}
            className="absolute"
            style={{
              left: 316,
              top: 226,
              width: 34,
              height: 18,
              borderRadius: 80,
              background: "#8b8b8b",
              opacity: on ? 0.75 : 0.4,
              transition: "opacity 180ms",
            }}
          >
            <motion.span
              className="absolute block"
              style={{ top: 2.5, width: 13, height: 13, borderRadius: 58, background: "#ffffff" }}
              animate={{ left: on ? 19 : 2.5 }}
              transition={{ type: "spring", stiffness: 420, damping: 32 }}
            />
          </button>
        </>
      )}
    </div>
  );
}
