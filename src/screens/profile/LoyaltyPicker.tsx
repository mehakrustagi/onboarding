"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

/* Add a loyalty program — Figma 935:22488 (pick) and 935:22825 (details).
 *
 * Opens from the "+" on the programs back of a pass. Two steps in one
 * sheet, with the progress dots at the top saying which you're on:
 *
 *   1. PICK A LOYALTY PROGRAM — search, category chips, a row of cards
 *   2. ENTER DETAILS — membership number and points
 *
 * Continue on step 2 dismisses back to the card.
 *
 * Sheet geometry (935:22768): 440×880 pinned to the bottom, r40.
 *   handle   24 wide at (208.02, 10.39)
 *   star     centred above the title
 *   title    11px Bold, 0.88 tracking, y 79
 *   dots     16.842×3 at (201, 112.4) and (222.05, 112.4)
 *   close    50×50 at (361, 30)
 *   search   380 at (30, 230), r40, 1px #d6d9dc
 *   chips    at (29.5, 307.77), gap 12
 *   cards    190×301.625 at (112.12, 422.3); next 170×269.875 at 322.13
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;
/* The picker needs room for the card rail; the details step is short, so
 * the sheet shrinks to it. In the design that space is taken by the
 * keyboard — we have none, and leaving 880 would strand Continue at the
 * bottom of a mostly empty sheet. */
const SHEET_H = 880;
const SHEET_H_DETAILS = 592;

const CHIPS = ["All", "Credit cards", "hotels", "flights", "lounges"];

/* The three card faces exported from 935:22786. The row scrolls, and the
 * second is deliberately cut by the frame edge to say there are more. */
const CARDS = [
  {
    key: "maharaja",
    name: "Maharaja Club",
    src: "/assets/profile/lp-card-maharaja.png",
    x: 112.12,
    y: 422.3,
    w: 190,
    h: 301.625,
  },
  {
    key: "krisflyer",
    name: "KrisFlyer",
    src: "/assets/profile/lp-card-kris.png",
    x: 322.13,
    y: 438.17,
    w: 170,
    h: 269.875,
  },
  {
    key: "hdfc",
    name: "HDFC Infinia",
    src: "/assets/profile/lp-card-hdfc.png",
    x: 512.13,
    y: 446,
    w: 162,
    h: 257,
  },
];

function Star() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path
        d="M9 0.6l2.35 5.32 5.79.56-4.35 3.85 1.26 5.67L9 12.98 3.95 16l1.26-5.67L.86 6.48l5.79-.56L9 .6Z"
        fill="#0b0b0b"
      />
    </svg>
  );
}

/** Underlined text field — the label sits above a dotted rule, as
 *  935:22825 draws it. */
function Field({
  label,
  value,
  onChange,
  top,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  top: number;
}) {
  return (
    <div className="absolute" style={{ left: 30, top, width: 380 }}>
      <p
        className="font-bold uppercase"
        style={{ fontSize: 11, lineHeight: "14px", letterSpacing: "0.88px", color: "#0b0b0b" }}
      >
        {label}
      </p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type here"
        className="mt-[14px] w-full bg-transparent outline-none"
        style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.28px", color: "#0b0b0b" }}
      />
      <div
        className="mt-[10px]"
        style={{
          height: 1,
          backgroundImage:
            "repeating-linear-gradient(90deg, #d7d7dc 0 3px, transparent 3px 7px)",
        }}
      />
    </div>
  );
}

export default function LoyaltyPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [step, setStep] = useState<0 | 1>(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [chip, setChip] = useState("All");
  const [member, setMember] = useState("");
  const [points, setPoints] = useState("");

  const reset = () => {
    setStep(0);
    setPicked(null);
    setMember("");
    setPoints("");
  };

  return (
    <AnimatePresence onExitComplete={reset}>
      {open && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 78, borderRadius: 44 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: IN_EASE }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: "rgba(1,1,1,0.8)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={onClose}
          />

          <motion.div
            className="absolute bottom-0 left-0 w-full overflow-hidden bg-white"
            style={{ borderRadius: 40 }}
            initial={{ y: SHEET_H, height: SHEET_H }}
            animate={{ y: 0, height: step === 0 ? SHEET_H : SHEET_H_DETAILS }}
            exit={{ y: SHEET_H }}
            transition={{
              y: { type: "spring", stiffness: 240, damping: 30, mass: 0.9 },
              // Height on a tween, not a spring: a sheet that overshoots
              // its own height wobbles at the edge and reads as a glitch.
              height: { duration: 0.42, ease: IN_EASE },
            }}
          >
            {/* Grab handle */}
            <div
              className="absolute left-1/2 -translate-x-1/2"
              style={{ top: 10.39, width: 24, height: 3, borderRadius: 2, background: "#d9d9de" }}
            />

            <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 48 }}>
              <Star />
            </div>

            <p
              className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase"
              style={{ top: 79, fontSize: 11, lineHeight: "14px", letterSpacing: "0.88px", color: "#0b0b0b" }}
            >
              {step === 0 ? "PICK A LOYALTY PROGRAM" : "ENTER DETAILS"}
            </p>

            {/* Progress. The second fills once you're past the picker, so
                the pair reads as a two-step flow rather than decoration. */}
            {[0, 1].map((i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ left: i === 0 ? 201 : 222.05, top: 112.4, width: 16.842, height: 3, borderRadius: 30 }}
                initial={false}
                animate={{ background: i <= step ? "#000000" : "#e5e5e5" }}
                transition={{ duration: 0.3, ease: IN_EASE }}
              />
            ))}

            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="absolute flex items-center justify-center"
              style={{ zIndex: 4, left: 361, top: 30, width: 50, height: 50, borderRadius: 67.5, background: "#f4f4f6" }}
            >
              <Image
                src="/assets/profile/lp-close.svg"
                alt=""
                width={30}
                height={30}
                style={{ width: 30, height: 30, display: "block", transform: "rotate(-45deg)" }}
              />
            </button>

            <AnimatePresence mode="wait">
              {step === 0 ? (
                <motion.div
                  key="pick"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: IN_EASE }}
                >
                  {/* Search */}
                  <div
                    className="absolute flex items-center gap-[8px]"
                    style={{
                      left: 30,
                      top: 230,
                      width: 380,
                      padding: 12,
                      borderRadius: 40,
                      background: "#ffffff",
                      border: "1px solid #d6d9dc",
                    }}
                  >
                    <Image
                      src="/assets/profile/lp-search.svg"
                      alt=""
                      width={20}
                      height={20}
                      style={{ width: 20, height: 20, display: "block" }}
                    />
                    <input
                      placeholder="Search"
                      className="w-full bg-transparent outline-none"
                      style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.28px", color: "#0b0b0b" }}
                    />
                  </div>

                  {/* Categories */}
                  <div
                    className="absolute flex items-center gap-[12px] overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    style={{ left: 29.5, top: 307.77, width: 410, paddingRight: 30 }}
                  >
                    {CHIPS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setChip(c)}
                        className="flex shrink-0 items-center justify-center whitespace-nowrap font-semibold"
                        style={{
                          height: 39,
                          padding: "0 20px",
                          borderRadius: 30,
                          fontSize: 14,
                          lineHeight: "19px",
                          letterSpacing: "-0.14px",
                          background: chip === c ? "#0b0b0b" : "#ffffff",
                          color: chip === c ? "#ffffff" : "#000000",
                          border: `1px solid ${chip === c ? "#0b0b0b" : "#d6d9dc"}`,
                          transition: "background 160ms, color 160ms, border-color 160ms",
                        }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  {/* Card rail. The second card is cut by the frame edge —
                      that overflow IS the affordance saying there are more,
                      so it scrolls rather than being fitted in. */}
                  <div
                    className="absolute overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    style={{ left: 0, top: 400, width: 440, height: 360, touchAction: "pan-y" }}
                  >
                    <div className="relative" style={{ width: 704, height: 340 }}>
                      {CARDS.map((c) => (
                        <button
                          key={c.key}
                          type="button"
                          onClick={() => {
                            haptic("carouselSnap");
                            setPicked(c.key);
                          }}
                          className="absolute"
                          style={{
                            left: c.x,
                            top: c.y - 400,
                            width: c.w,
                            height: c.h,
                            borderRadius: 19,
                          }}
                        >
                          <motion.div
                            className="relative h-full w-full overflow-hidden"
                            style={{ borderRadius: 19 }}
                            animate={{
                              // The enlargement IS the selected state —
                              // no ring needed on top of it.
                              scale: picked === c.key ? 1.06 : 1,
                              boxShadow:
                                picked === c.key
                                  ? "0 18px 40px -14px rgba(0,0,0,0.35)"
                                  : "0 10px 26px -16px rgba(0,0,0,0.22)",
                            }}
                            transition={{ duration: 0.3, ease: IN_EASE }}
                          >
                            {/* The source art is LANDSCAPE; Figma turns it
                                −90° to fill the portrait card rather than
                                cropping it. Centring the landscape box
                                first means the rotation lands it exactly
                                over the portrait one. */}
                            <div
                              className="absolute"
                              style={{
                                width: c.h,
                                height: c.w,
                                left: (c.w - c.h) / 2,
                                top: (c.h - c.w) / 2,
                                transform: "rotate(-90deg)",
                                transformOrigin: "center",
                              }}
                            >
                              <Image
                                src={c.src}
                                alt={c.name}
                                width={Math.round(c.h)}
                                height={Math.round(c.w)}
                                unoptimized
                                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                              />
                            </div>
                          </motion.div>
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="details"
                  className="absolute inset-0"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: IN_EASE }}
                >
                  <p
                    className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-medium"
                    style={{ top: 159, fontSize: 20, lineHeight: "25px", letterSpacing: "-0.8px", color: "#0b0b0b" }}
                  >
                    {CARDS.find((c) => c.key === picked)?.name ?? "ITC Green Club"}
                  </p>

                  <Field label="MEMBERSHIP NUMBER*" value={member} onChange={setMember} top={241} />
                  <Field label="POINTS/MILES" value={points} onChange={setPoints} top={340} />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Continue */}
            <div
              className="absolute bottom-0 left-0 flex w-full flex-col items-center"
              style={{
                zIndex: 4,
                paddingTop: 110,
                paddingBottom: 34,
                // NO backdrop-filter. A backdrop blur applies across the
                // element's whole box, not only where its background is
                // opaque — so the 110px of transparent top padding was
                // blurring the cards behind it, with a hard edge where the
                // bar starts. The white ramp alone does the fade.
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.72) 34%, #ffffff 58%, #e9e9ea 127.89%)",
              }}
            >
              <motion.button
                type="button"
                onClick={() => {
                  haptic("dragBreak");
                  if (step === 0) setStep(1);
                  else onClose();
                }}
                className="flex items-center justify-center"
                style={{
                  width: 380,
                  height: 48,
                  borderRadius: 24,
                  background: "#ffffff",
                  border: "0.828px solid #e5e5e5",
                  boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                }}
                // Dimmed until a card is chosen — the step cannot be
                // completed without one, and saying so is kinder than
                // letting the tap do nothing.
                animate={{ opacity: step === 0 && !picked ? 0.5 : 1 }}
                transition={{ duration: 0.25, ease: IN_EASE }}
                disabled={step === 0 && !picked}
              >
                <span
                  className="whitespace-nowrap font-semibold"
                  style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.14px", color: "#000000" }}
                >
                  Continue
                </span>
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
