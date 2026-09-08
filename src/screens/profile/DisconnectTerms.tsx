"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { haptic } from "@/lib/haptics";

/* Disconnect terms — Figma 853:74070 (top), 853:74251 (scrolled),
 * 853:74435 (agreed).
 *
 * A full-bleed 440×965 page, so it sits OVER the settings sheet rather
 * than inside it.
 *
 * The three frames disagree about how far the content has scrolled — the
 * header moves 230 between 1566 and 1590, the body 380, the labels 270.
 * That drift is the designer nudging pieces frame to frame, not a real
 * scroll offset. So the content is laid out ONCE in 1566's coordinates
 * (which is the top-of-scroll state) and actual scrolling does the rest;
 * baking in the deltas would just reproduce the inconsistency.
 *
 * Geometry from 1566, frame-relative:
 *   back      50×50 at (30, 72)
 *   gmail     56×56 at (192, 73)
 *   title     335 wide at (centre, 140), gap 12
 *   cancels   24×24 at y265, x 86 / 202 / 324
 *   labels    y306, centred on x 98 / 214 / 336
 *   body      360 wide at (40, 379)
 *   checkbox  (40, 1050) — 1590 has it at 670 against a body at -1,
 *             i.e. 380 below the body's own origin
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

const BULLETS = [
  "Flight and travel history",
  "Hotel stays and booking preferences",
  "Loyalty programmes, points and rewards",
  "Credit card benefits and travel-related offers",
  "Travel documents, passes and credentials",
  "Itineraries, bookings and trip information",
  "Saved food preferences and dietary requirements",
  "Personal preferences and agent-learned travel context",
  "Medical information and documents previously shared for travel-related assistance",
  "Airport, immigration and other travel logistics information",
];

const CONSEQUENCES = [
  { x: 86, cx: 98, lines: ["No automated", "slot booking"] },
  { x: 202, cx: 214, lines: ["No visa", "applications"] },
  { x: 324, cx: 336, lines: ["No personalised", "offers"] },
];

export default function DisconnectTerms({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const [agreed, setAgreed] = useState(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 overflow-hidden bg-white"
          style={{ zIndex: 80, borderRadius: 44 }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 18 }}
          transition={{ duration: 0.42, ease: IN_EASE }}
          onAnimationComplete={() => {
            if (!open) setAgreed(false);
          }}
        >
          {/* Scroll layer */}
          <div className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Image
              src="/assets/profile/tn-gmail.png"
              alt=""
              width={56}
              height={56}
              unoptimized
              className="absolute"
              style={{ left: 192, top: 73, width: 56, height: 56, display: "block" }}
            />

            <div
              className="absolute flex flex-col items-center gap-[12px] text-center"
              style={{ left: 220.5, top: 140, width: 335, transform: "translateX(-50%)" }}
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
                Are you sure you want to disconnect your email?
              </p>
              <p
                className="font-medium"
                style={{ width: 271, fontSize: 12, lineHeight: "16px", color: "#69727b" }}
              >
                Deleting your account will delete all of it&rsquo;s data. You will
                have to re-enter your documents to apply for a visa again.
              </p>
            </div>

            {CONSEQUENCES.map((c) => (
              <div key={c.x}>
                <Image
                  src="/assets/profile/dc-cancel.svg"
                  alt=""
                  width={24}
                  height={24}
                  className="absolute"
                  style={{ left: c.x, top: 265, width: 24, height: 24 }}
                />
                <div
                  className="absolute text-center font-medium"
                  style={{
                    left: c.cx,
                    top: 306,
                    transform: "translateX(-50%)",
                    fontSize: 12,
                    lineHeight: "16px",
                    color: "#69727b",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.lines.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                </div>
              </div>
            ))}

            <div
              className="absolute font-medium"
              style={{
                left: 40,
                top: 379,
                width: 360,
                fontSize: 14,
                lineHeight: "19px",
                letterSpacing: "-0.28px",
                color: "#666666",
              }}
            >
              <p>
                By proceeding with disconnection, the selected account connection
                will be revoked and the associated data will no longer be
                available to your agents for future use.
              </p>
              <p>This may include, where applicable:</p>
              <ul className="list-disc" style={{ paddingLeft: 21 }}>
                {BULLETS.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
              <p>
                Once disconnected, agents may no longer be able to use this
                information to personalise recommendations, identify relevant
                benefits, prepare trips, complete workflows or provide
                context-aware assistance. Previously synced information may also
                need to be reconnected or provided again before certain features
                can be restored.
              </p>
              <p>
                Disconnection revokes future access to the connected source.
                Processing, retention and deletion of previously received data
                will continue in accordance with the applicable privacy policy,
                consent settings and legal or operational requirements.
              </p>
              <p>
                You may reconnect supported services at any time. Reconnecting
                does not guarantee that previously available data, preferences or
                agent context will be automatically restored.
              </p>
            </div>

            {/* Agreement (853:74607) */}
            <button
              type="button"
              className="absolute flex items-center gap-[8px]"
              style={{ left: 40, top: 1050 }}
              onClick={() => {
                setAgreed((v) => !v);
                haptic("dragGrab");
              }}
            >
              {agreed ? (
                <Image
                  src="/assets/profile/dc-check.svg"
                  alt=""
                  width={24}
                  height={24}
                  style={{ width: 24, height: 24, display: "block" }}
                />
              ) : (
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    border: "2px solid #333333",
                    display: "block",
                  }}
                />
              )}
              <span
                className="whitespace-nowrap font-medium"
                style={{
                  fontSize: 12,
                  lineHeight: "16px",
                  letterSpacing: "-0.24px",
                  backgroundImage: "linear-gradient(90deg, #333333, #999999)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                I have read the terms and agree to it
              </span>
            </button>

            {/* Clears the sticky bar — two buttons plus its 110 top pad. */}
            <div style={{ height: 1050 + 24 + 290 }} />
          </div>

          {/* Back. White rather than 1566's translucent fill, which is what
              1590 switches to once content can scroll beneath it. */}
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{
              zIndex: 2,
              left: 30,
              top: 72,
              width: 50,
              height: 50,
              borderRadius: 27,
              background: "#ffffff",
            }}
          >
            <Image
              src="/assets/profile/arrow-back.svg"
              alt=""
              width={24}
              height={24}
              style={{ width: 24, height: 24, display: "block" }}
            />
          </button>

          {/* Sticky bar (853:74610) */}
          <div
            className="absolute bottom-0 left-0 flex w-full flex-col items-center justify-center gap-[16px] px-[30px]"
            style={{
              zIndex: 2,
              paddingTop: 110,
              paddingBottom: 34,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 15.263%, #ffffff 127.89%)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          >
            {/* Only once the terms are agreed (1590). */}
            <AnimatePresence initial={false}>
              {agreed && (
                <motion.button
                  type="button"
                  onClick={() => {
                    haptic("dragBreak");
                    onConfirm();
                  }}
                  className="flex items-center justify-center gap-[5.6px] overflow-hidden"
                  style={{
                    width: 380,
                    borderRadius: 24,
                    background: "#ffffff",
                    border: "0.828px solid #e5e5e5",
                    boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
                    flexShrink: 0,
                  }}
                  // Height and margin animate together so the button pushes
                  // "Don't delete" down as it grows, instead of appearing on
                  // top of it.
                  initial={{ height: 0, opacity: 0, marginBottom: -16 }}
                  animate={{ height: 48, opacity: 1, marginBottom: 0 }}
                  exit={{ height: 0, opacity: 0, marginBottom: -16 }}
                  transition={{ duration: 0.34, ease: IN_EASE }}
                >
                  <Image
                    src="/assets/profile/tn-split.svg"
                    alt=""
                    width={20}
                    height={20}
                    style={{ width: 20, height: 20, display: "block" }}
                  />
                  <span
                    className="whitespace-nowrap font-semibold"
                    style={{
                      fontSize: 14,
                      lineHeight: "19px",
                      letterSpacing: "-0.14px",
                      color: "#ef4444",
                    }}
                  >
                    Disconnect email
                  </span>
                </motion.button>
              )}
            </AnimatePresence>

            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center"
              style={{
                width: 380,
                height: 48,
                flexShrink: 0,
                borderRadius: 24,
                background: "#ffffff",
                border: "0.828px solid #e5e5e5",
                boxShadow: "0 4px 15px rgba(0,0,0,0.05)",
              }}
            >
              <span
                className="whitespace-nowrap font-semibold"
                style={{
                  fontSize: 14,
                  lineHeight: "19px",
                  letterSpacing: "-0.14px",
                  color: "#000000",
                }}
              >
                Don&rsquo;t delete
              </span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
