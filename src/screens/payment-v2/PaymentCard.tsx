"use client";

import { motion, AnimatePresence } from "framer-motion";

/* Payment ask — the white card with the breakdown and the pay-via tiles.
 *
 * Lives in its own module because TWO screens need it: the payment flow
 * renders it as phase 8, and the standalone post-payment route renders it
 * as the backdrop its frosted veil sits over. Importing it straight from
 * the flow would have made the two files import each other. */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Matches the flow's own PAY_IN_DELAY — the card waits out the dim lift
 * and a beat of clear air before it arrives. */
const PAY_IN_DELAY = 2.35;

/* The payment copy, pulled out so the liquid-glass lens can render it a
 * SECOND time, flipped, as its reflection. CSS can't sample and mirror its
 * own backdrop — the only way to get a real reflection is to draw the
 * content again inside the lens, which means it has to exist as one
 * component rather than as markup buried in the card. */
export function PaymentCopy() {
  return (
    <>
      Pay the{" "}
      <span className="text-black">
        government fee and we&apos;ll begin processing your visa application
        right away
      </span>
    </>
  );
}

export default function PaymentCard({
  visible,
  onPay,
}: {
  visible: boolean;
  onPay: () => void;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Updated chat copy — replaces the "Ok Noted…" line */}
          <motion.p
            className="absolute text-[20px] font-medium leading-[25px] text-[#808080]"
            style={{ left: 30, top: 130, width: 364, letterSpacing: "-0.8px", zIndex: 15 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            // Waits out the dim lift (0.55 + 0.85 = 1.4s) plus a beat of
            // clear air. The brightening and the ask are two separate
            // statements; overlapping them makes the payment screen feel
            // like part of the transition instead of a new question being
            // put to you.
            transition={{ delay: PAY_IN_DELAY, duration: 0.6, ease: IN_EASE }}
          >
            <PaymentCopy />
          </motion.p>

          {/* Payment card — white rounded panel with breakdown + methods */}
          <motion.div
            className="absolute cursor-pointer bg-white border border-[#f2f2f2] overflow-hidden"
            onClick={(e) => {
              // Stop the root stepper from also firing, so a tap on the
              // card advances exactly one phase.
              e.stopPropagation();
              onPay();
            }}
            style={{
              left: 30,
              top: 318,
              width: 380,
              height: 439,
              borderRadius: 30,
              zIndex: 15,
            }}
            initial={{ opacity: 0, y: 60, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
              delay: PAY_IN_DELAY + 0.12,
              duration: 0.9,
              ease: IN_EASE,
            }}
          >
            {/* Soft color-bloom in the upper-right corner (blurred image 93) */}
            <div
              className="pointer-events-none absolute"
              style={{
                right: -20,
                top: -20,
                width: 220,
                height: 220,
                background:
                  "radial-gradient(circle at 70% 30%, rgba(255,220,140,0.45), rgba(255,180,220,0.3) 40%, transparent 70%)",
                filter: "blur(40px)",
              }}
            />

            {/* TOTAL AMOUNT header */}
            <p
              className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase text-black"
              style={{ top: 30, letterSpacing: "0.88px", lineHeight: "14px" }}
            >
              TOTAL AMOUNT
            </p>
            <p
              className="absolute left-1/2 -translate-x-1/2 text-[24px] font-semibold text-[#0b0b0b] whitespace-nowrap"
              style={{ top: 54, letterSpacing: "-0.96px", lineHeight: "28px" }}
            >
              ₹18,199
            </p>

            {/* Divider */}
            <div
              className="absolute"
              style={{ left: 30, top: 107, width: 320, height: 1, background: "#e5e5e5" }}
            />

            {/* Pay Now row */}
            <div className="absolute" style={{ left: 30, top: 132, width: 320 }}>
              <div className="relative">
                <div
                  className="absolute rounded-full bg-black"
                  style={{ left: 0, top: 6, width: 8, height: 8 }}
                />
                <p
                  className="absolute text-[14px] font-semibold leading-[19px] text-[#0b0b0b]"
                  style={{ left: 21, top: 0, letterSpacing: "-0.14px" }}
                >
                  Pay Now
                </p>
                <p
                  className="absolute text-[12px] font-semibold leading-[16px] opacity-50 text-black"
                  style={{ left: 21, top: 25, letterSpacing: "-0.12px" }}
                >
                  Govt. Fee
                </p>
                <p
                  className="absolute right-0 text-[14px] font-semibold leading-[19px] text-[#0b0b0b] whitespace-nowrap"
                  style={{ top: 0, letterSpacing: "-0.14px" }}
                >
                  ₹12,000
                </p>
              </div>
            </div>

            {/* Pay on Appt booking row */}
            <div className="absolute" style={{ left: 30, top: 198, width: 320 }}>
              <div className="relative">
                <div
                  className="absolute rounded-full border border-black"
                  style={{ left: 0, top: 6, width: 8, height: 8 }}
                />
                <p
                  className="absolute text-[14px] font-semibold leading-[19px] text-[#0b0b0b]"
                  style={{ left: 21, top: 0, letterSpacing: "-0.14px" }}
                >
                  Pay on Appt booking
                </p>
                <p
                  className="absolute text-[12px] font-semibold leading-[16px] opacity-50 text-black"
                  style={{ left: 21, top: 25, letterSpacing: "-0.12px" }}
                >
                  Express Booking Fee
                </p>
                <p
                  className="absolute text-[12px] font-semibold leading-[16px] opacity-50 text-black"
                  style={{ left: 21, top: 47, letterSpacing: "-0.12px" }}
                >
                  GST
                </p>
                <p
                  className="absolute right-0 text-[14px] font-semibold leading-[19px] text-[#0b0b0b] whitespace-nowrap"
                  style={{ top: 0, letterSpacing: "-0.14px" }}
                >
                  ₹6,199
                </p>
                <p
                  className="absolute right-0 text-[12px] font-semibold leading-[16px] opacity-50 text-black whitespace-nowrap"
                  style={{ top: 25, letterSpacing: "-0.12px" }}
                >
                  ₹4,000
                </p>
                <p
                  className="absolute right-0 text-[12px] font-semibold leading-[16px] opacity-50 text-black whitespace-nowrap"
                  style={{ top: 47, letterSpacing: "-0.12px" }}
                >
                  ₹2,100
                </p>
              </div>
            </div>

            {/* Divider */}
            <div
              className="absolute"
              style={{ left: 30, top: 291, width: 320, height: 1, background: "#e5e5e5" }}
            />

            {/* PAY VIA: label */}
            <p
              className="absolute left-1/2 -translate-x-1/2 text-[11px] font-bold uppercase text-black whitespace-nowrap"
              style={{ top: 316, letterSpacing: "0.88px", lineHeight: "14px" }}
            >
              PAY VIA:
            </p>

            {/* 4 payment method squares (Gpay, Amex-shield, UPI, generic card) */}
            {[
              { label: "GPay", left: 30 },
              { label: "Shield", left: 113 },
              { label: "UPI", left: 197 },
              { label: "Card", left: 280 },
            ].map((m, i) => (
              <div
                key={i}
                className="absolute bg-white border border-[#f2f2f2]"
                style={{
                  left: m.left,
                  top: 344,
                  width: 70,
                  height: 70,
                  borderRadius: 15,
                }}
              >
                <p
                  className="absolute left-1/2 -translate-x-1/2 text-[10px] font-semibold text-[#666]"
                  style={{ top: 30 }}
                >
                  {m.label}
                </p>
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
