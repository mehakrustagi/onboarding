"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Screen7 from "../Screen7";

/* Airport logistics — the onboarding supercar sequence (Screen 7) shown as
 * a bottom sheet.
 *
 * FULL FRAME HEIGHT, and NOT scaled. Screen 7 lays out against 440×965;
 * squeezing that into a 903 sheet shrank everything with it — a 72px orb
 * rendered at 59, the type at 82%, and fitting the height narrowed the
 * canvas so the cars stopped short of the edges. Every one of those was a
 * symptom of the scale, so the scale goes: at 1:1 the orb and copy match
 * the other agent sheets exactly and the cars span the screen. It still
 * rises from the bottom, so it still reads as a sheet.
 */

const SHEET_H = 965;
/* The chrome overlays the canvas rather than displacing it — Screen 7's
 * airport header is positioned to start below it. */

export default function AirportSheet({
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
          style={{ zIndex: 72, borderRadius: 44 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={onClose}
          />

          <motion.div
            className="absolute bottom-0 left-0 w-full overflow-hidden bg-white"
            style={{ height: SHEET_H, borderRadius: 44 }}
            initial={{ y: SHEET_H }}
            animate={{ y: 0 }}
            exit={{ y: SHEET_H }}
            transition={{ type: "spring", stiffness: 240, damping: 30, mass: 0.9 }}
          >
            {/* Screen 7's own canvas, offset below the sheet header so its
                content starts where every other sheet's does.

                POSITIONED, not margin-pushed: the sheet has no padding or
                border, so a marginTop here collapses straight through it
                and the offset silently does nothing — which put Screen 7
                back at the top edge, over the header. */}
            <div
              className="absolute left-0 top-0"
              style={{ width: 440, height: SHEET_H }}
            >
              <Screen7 onComplete={onClose} variant="airport" />
            </div>

            {/* White fade at the sheet's head, so content passes under the
                header rather than colliding with it. Tall enough to clear
                the eyebrow and dies out well before the copy starts. */}
            <div
              className="pointer-events-none absolute left-0 top-0 w-full"
              style={{
                zIndex: 10,
                height: 132,
                background:
                  "linear-gradient(180deg, #ffffff 0%, #ffffff 38%, rgba(255,255,255,0.86) 58%, rgba(255,255,255,0.5) 78%, rgba(255,255,255,0) 100%)",
              }}
            />

            {/* Header chrome, identical to the agent sheets: handle at 12,
                back at (30,30), eyebrow centred at 41. Sits ABOVE the fade
                and above anything Screen 7 stacks internally. */}
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{ zIndex: 20, top: 12, width: 40, height: 4, borderRadius: 2, background: "#d9d9de" }}
            />

            <button
              type="button"
              aria-label="Back"
              onClick={onClose}
              className="absolute flex items-center justify-center"
              style={{
                zIndex: 20,
                left: 30,
                top: 30,
                width: 50,
                height: 50,
                borderRadius: 25,
                background: "#f4f4f6",
              }}
            >
              <Image
                src="/assets/profile/arrow-back.svg"
                alt=""
                width={22}
                height={22}
                style={{ width: 22, height: 22, display: "block" }}
              />
            </button>

            <p
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase"
              style={{
                zIndex: 20,
                top: 41,
                fontSize: 11,
                lineHeight: "14px",
                letterSpacing: "0.88px",
                color: "#0b0b0b",
              }}
            >
              AIRPORT LOGISTICS
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
