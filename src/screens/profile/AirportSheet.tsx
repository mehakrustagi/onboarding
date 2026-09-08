"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import Screen7 from "../Screen7";

/* Airport logistics — the onboarding supercar sequence (Screen 7) shown as
 * a bottom sheet rather than a full screen.
 *
 * Screen 7 lays itself out against the 440×965 phone canvas, so it is
 * SCALED to the sheet's 903 rather than clipped: cropping the last 62px
 * would take the "Reserve my car" CTA with it. 903/965 = 0.9358, from the
 * top centre so the cars stay put and only the bottom closes up.
 */

const SHEET_H = 903;
const CANVAS_H = 965;
/* Clears the header before Screen 7's own content begins. */
const HEADER_H = 68;
/* And room at the foot. Fitting the canvas flush to the sheet's bottom put
 * Screen 7's closing caption hard against the edge and the home indicator;
 * the sequence needs the same breathing room the other sheets have. */
const FOOT_H = 44;
const FIT = (SHEET_H - HEADER_H - FOOT_H) / CANVAS_H;

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
              className="absolute left-0"
              style={{
                top: HEADER_H,
                width: 440,
                height: CANVAS_H,
                transform: `scale(${FIT})`,
                transformOrigin: "50% 0%",
              }}
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
                height: 96,
                background:
                  "linear-gradient(180deg, #ffffff 0%, rgba(255,255,255,0.92) 52%, rgba(255,255,255,0) 100%)",
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
