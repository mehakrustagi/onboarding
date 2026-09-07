"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* ACTIVATE — Figma node 862:7833.
 *
 *   fill    vertical gradient #70706b → #333330, r20
 *   bolt    12×12, 4px gap before the label
 *   label   Inter Bold 11, 0.88 tracking, white, uppercase
 *   padding 4 left / 8 right
 *
 * The border travels. A gradient STROKE can't move around a path without
 * animating the gradient itself, so this spins a conic gradient behind the
 * pill and lets a 1px rim of it show past the dark fill — the colours then
 * sweep continuously around the boundary, which is what the design does.
 *
 * Shared: the benefits sheet, the agent grid and the profile's benefit
 * card all use this, so the pill can't drift between them.
 */
export default function ActivatePill({
  left,
  top,
  index = 0,
  bolt = true,
  onActivate,
}: {
  left: number;
  top: number;
  onActivate?: () => void;
  /** Offsets the spin so a column of pills doesn't turn in lockstep. */
  index?: number;
  /** The benefit cards use the plain label with no bolt. Dropping the
   *  glyph also drops its 12px + 4px gap, so the pill narrows to match
   *  rather than sitting with dead space where the icon was. */
  bolt?: boolean;
}) {
  const width = bolt ? 92 : 76;
  return (
    <button
      type="button"
      onClick={(e) => {
        // The benefit card behind this opens the all-benefits sheet, so
        // activating must not also trigger that.
        e.stopPropagation();
        onActivate?.();
      }}
      className="absolute overflow-hidden"
      style={{ left, top, width, height: 22, borderRadius: 20 }}
    >
      {/* Spinning conic gradient. Inset well beyond the pill so the
          rotating square's own corners never sweep into view. */}
      <motion.div
        className="absolute"
        style={{
          inset: -46,
          background:
            "conic-gradient(from 0deg, #14163A, #4E55E5, #AB4D8C, #EE874E, #4E55E5, #14163A)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 4.5 + index * 0.4,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Dark face, inset 1px — the uncovered rim IS the border. */}
      <div
        className="absolute flex items-center justify-center gap-[4px]"
        style={{
          inset: 1,
          borderRadius: 19,
          background: "linear-gradient(180deg, #70706b 0%, #333330 100%)",
          paddingLeft: bolt ? 4 : 8,
          paddingRight: 8,
        }}
      >
        {bolt && (
          <Image
            src="/assets/profile/bolt.svg"
            alt=""
            width={12}
            height={12}
            style={{ width: 12, height: 12, display: "block", flexShrink: 0 }}
          />
        )}
        <span
          className="whitespace-nowrap font-bold uppercase text-white"
          style={{ fontSize: 11, lineHeight: "14px", letterSpacing: "0.88px" }}
        >
          Activate
        </span>
      </div>
    </button>
  );
}
