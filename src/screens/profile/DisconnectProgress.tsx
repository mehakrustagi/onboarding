"use client";

import { useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

/* Disconnect in progress — Figma 853:74636.
 *
 * A 440×367 sheet at top 598 over the dimmed profile. It runs itself and
 * then hands back to the account centre, so there is nothing to confirm —
 * the only control is the escape hatch.
 *
 * Sheet-relative geometry (853:74780):
 *   atlys plus  29.997 at (95, 80), turned 90°
 *   wire        152×24 at (136, 83) — dashes + the cut mark, one export
 *   gmail       56×56 at (292, 67)
 *   title       335 wide at (centre, 154), gap 12
 *   button      380×48, sitting clear of the home indicator
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

const SHEET_TOP = 598;
const SHEET_H = 367;
/* How long the "removing data" beat runs before the account centre
   returns. Long enough to read the copy, short enough not to stall. */
const RUN_MS = 3400;

export default function DisconnectProgress({
  open,
  onStop,
  onComplete,
}: {
  open: boolean;
  onStop: () => void;
  onComplete: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    haptic("dragBreak");
    const t = window.setTimeout(() => {
      haptic("tunnelExit");
      onComplete();
    }, RUN_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 90, borderRadius: 44 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: IN_EASE }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(1,1,1,0.8)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
          />

          <motion.div
            className="absolute left-1/2 overflow-hidden bg-white"
            style={{
              top: SHEET_TOP,
              width: 440,
              height: SHEET_H,
              x: "-50%",
              borderRadius: 44,
            }}
            initial={{ y: SHEET_H }}
            animate={{ y: 0 }}
            exit={{ y: SHEET_H }}
            transition={{ duration: 0.5, ease: IN_EASE }}
          >
            <div
              className="absolute"
              style={{ left: 95, top: 80, width: 29.997, height: 29.997 }}
            >
              <Image
                src="/assets/profile/tn-plus.svg"
                alt=""
                width={30}
                height={30}
                style={{
                  width: 29.997,
                  height: 29.997,
                  display: "block",
                  transform: "rotate(90deg)",
                }}
              />
            </div>

            {/* The severed link. The dashes and the cut mark are one export,
                so the whole thing breathes rather than animating internally
                — an <img> gives no handle on its own paths. */}
            <motion.div
              className="absolute"
              style={{ left: 136, top: 83, width: 152, height: 24 }}
              animate={{ opacity: [1, 0.45, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <Image
                src="/assets/profile/dc-wire.svg"
                alt=""
                width={152}
                height={24}
                style={{ width: 152, height: 24, display: "block" }}
              />
            </motion.div>

            <Image
              src="/assets/profile/tn-gmail.png"
              alt=""
              width={56}
              height={56}
              unoptimized
              className="absolute"
              style={{ left: 292, top: 67, width: 56, height: 56, display: "block" }}
            />

            <div
              className="absolute flex flex-col items-center gap-[12px] text-center"
              style={{ left: 220.5, top: 154, width: 335, transform: "translateX(-50%)" }}
            >
              <p
                className="font-medium"
                style={{
                  width: 295,
                  fontSize: 18,
                  lineHeight: "22px",
                  letterSpacing: "-0.72px",
                  color: "#323232",
                }}
              >
                Disconnecting your account...
              </p>
              <p
                className="font-medium"
                style={{ width: 271, fontSize: 12, lineHeight: "16px", color: "#69727b" }}
              >
                Removing synced data and access from your agents, this may take a
                while...
              </p>
            </div>

            <button
              type="button"
              onClick={onStop}
              className="absolute left-1/2 flex items-center justify-center gap-[5.6px]"
              style={{
                top: 269,
                width: 380,
                height: 48,
                transform: "translateX(-50%)",
                borderRadius: 24,
                background: "#ffffff",
                border: "0.828px solid #e5e5e5",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              }}
            >
              {/* Turning, so the button reads as interrupting something that
                  is actually running. */}
              <motion.span
                style={{ width: 20, height: 20, display: "block" }}
                animate={{ rotate: 360 }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
              >
                <Image
                  src="/assets/profile/dc-autostop.svg"
                  alt=""
                  width={20}
                  height={20}
                  style={{ width: 20, height: 20, display: "block" }}
                />
              </motion.span>
              <span
                className="whitespace-nowrap font-semibold"
                style={{
                  fontSize: 14,
                  lineHeight: "19px",
                  letterSpacing: "-0.14px",
                  color: "#000000",
                }}
              >
                Stop deleting process
              </span>
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
