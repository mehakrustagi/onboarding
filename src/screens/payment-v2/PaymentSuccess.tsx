"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* Payment success — Figma node 46:12845.
 *
 * The green glass card replaces the payment ask in the same slot, and the
 * agent's reply lands underneath it. Geometry is Figma's throughout:
 *   card    380×311 at (30, 130), r30, backdrop-blur 25, white border
 *   fill    linear-gradient(138.72deg, #D6FFD5 0.7 → #D6FFD5 0.3)
 *   check   32×32 at (204, 160)
 *   ₹12,000 Inter SemiBold 24/28, -0.96 tracking, centred, y 231
 *   rules   (60, 289) w320 and (30, 481) w380
 *   copy    (30, 521) w363.662
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Rows under NEXT PAYMENT. Label on the left, amount hard right against
 * x=380; the two muted rows carry 50% opacity in the design. */
const NEXT_ROWS = [
  { label: "Pay on Appt booking", amount: "₹6,199", y: 348, muted: false },
  { label: "Express Booking Fee", amount: "₹4,000", y: 373, muted: true },
  { label: "GST", amount: "₹2,100", y: 395, muted: true },
] as const;

export default function PaymentSuccess({ visible }: { visible: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 16 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.6, ease: IN_EASE }}
    >
      {/* Green glass card */}
      <motion.div
        className="absolute overflow-hidden"
        style={{
          left: 30,
          top: 130,
          width: 380,
          height: 311,
          borderRadius: 30,
          border: "1px solid #ffffff",
          background:
            "linear-gradient(138.72deg, rgba(214,255,213,0.7) 10.513%, rgba(214,255,213,0.3) 72.053%)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          boxShadow: "0 4px 30px -2px rgba(0,0,0,0.05)",
        }}
        initial={{ opacity: 0, y: 26, scale: 0.96 }}
        animate={
          visible
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 26, scale: 0.96 }
        }
        transition={{ delay: 0.08, duration: 0.7, ease: IN_EASE }}
      >
        {/* Check mark — lands a beat after the card so the confirmation
            reads as a result rather than as part of the panel arriving. */}
        <motion.div
          className="absolute"
          style={{ left: 174, top: 30, width: 32, height: 32 }}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={
            visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }
          }
          transition={{
            delay: 0.34,
            type: "spring",
            stiffness: 420,
            damping: 18,
            mass: 0.7,
          }}
        >
          <Image
            src="/assets/payment/success-check.svg"
            alt=""
            width={32}
            height={32}
            style={{ width: 32, height: 32, display: "block" }}
          />
        </motion.div>

        <p
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase text-black"
          style={{
            top: 77,
            fontSize: 11,
            lineHeight: "14px",
            letterSpacing: "0.88px",
          }}
        >
          payment successful
        </p>

        <p
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-semibold"
          style={{
            top: 101,
            fontSize: 24,
            lineHeight: "28px",
            letterSpacing: "-0.96px",
            color: "#0b0b0b",
          }}
        >
          ₹12,000
        </p>

        {/* Card-local coords: Figma's (60, 289) against a card at (30, 130). */}
        <div
          className="absolute"
          style={{
            left: 30,
            top: 159,
            width: 320,
            height: 1,
            background: "rgba(0,0,0,0.08)",
          }}
        />

        <p
          className="absolute whitespace-nowrap font-bold uppercase text-black"
          style={{
            left: 31.2,
            top: 189,
            fontSize: 11,
            lineHeight: "14px",
            letterSpacing: "0.88px",
          }}
        >
          NEXT PAYMENT:
        </p>

        {NEXT_ROWS.map((row) => (
          <div key={row.label}>
            <p
              className="absolute whitespace-nowrap font-semibold"
              style={{
                left: 30,
                top: row.y - 130,
                fontSize: row.muted ? 12 : 14,
                lineHeight: row.muted ? "16px" : "19px",
                letterSpacing: row.muted ? "-0.12px" : "-0.14px",
                color: row.muted ? "rgba(0,0,0,0.6)" : "#0b0b0b",
                opacity: row.muted ? 0.5 : 1,
              }}
            >
              {row.label}
            </p>
            <p
              className="absolute -translate-x-full whitespace-nowrap text-right font-semibold"
              style={{
                left: 350,
                top: row.y - 130,
                fontSize: row.muted ? 12 : 14,
                lineHeight: row.muted ? "16px" : "19px",
                letterSpacing: row.muted ? "-0.12px" : "-0.14px",
                color: row.muted ? "rgba(0,0,0,0.6)" : "#0b0b0b",
                opacity: row.muted ? 0.5 : 1,
              }}
            >
              {row.amount}
            </p>
          </div>
        ))}
      </motion.div>

      {/* Rule under the card (30, 481) */}
      <motion.div
        className="absolute"
        style={{
          left: 30,
          top: 481,
          width: 380,
          height: 1,
          background: "rgba(0,0,0,0.08)",
        }}
        initial={{ opacity: 0, scaleX: 0.7 }}
        animate={
          visible ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0.7 }
        }
        transition={{ delay: 0.4, duration: 0.6, ease: IN_EASE }}
      />

      {/* The agent's reply */}
      <motion.div
        className="absolute"
        style={{
          left: 30,
          top: 521,
          width: 363.662,
          fontSize: 20,
          lineHeight: "25px",
          letterSpacing: "-0.8px",
          fontWeight: 500,
          color: "#808080",
        }}
        initial={{ opacity: 0, y: 12 }}
        animate={visible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        transition={{ delay: 0.52, duration: 0.7, ease: IN_EASE }}
      >
        <p>Great!</p>
        <p>
          Your application has been successfully submitted.
          <span className="text-black">
            {" "}
            I&apos;ll keep track of every step and keep you updated along the
            way.
          </span>
        </p>
      </motion.div>
    </motion.div>
  );
}
