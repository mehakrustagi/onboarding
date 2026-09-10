"use client";

import Image from "next/image";
import { motion, type MotionValue } from "framer-motion";
import PaymentSuccess from "../payment-v2/PaymentSuccess";
import { applyMask, outgoingMask, useRippleStyle } from "./ripple";
import BackChip from "@/components/BackChip";
import AskBar from "@/components/AskBar";
import type { HandoffBeat } from "./beats";

/* Frame 947:41798 — where the story starts.
 *
 * Nothing new is built here. The green glass card is the PaymentSuccess
 * component the payment flow already renders (Figma 46:12845, identical
 * geometry to this frame's copy of it), and the ripple field, back chip
 * and composer are the same chrome the rest of the flow carries. Rebuilding
 * any of it would mean the handoff started from a screen that merely looked
 * like the one the user was just on.
 *
 * The layer's whole job during the transition is to LEAVE, and it leaves
 * under the ripple rather than by fading. Its mask is transparent inside
 * the expanding crest and opaque outside it, so the last of this screen is
 * whatever the wave has not reached yet. A fade would have been easier and
 * completely wrong: fading says "this content stopped mattering", where
 * being eaten by a spreading front says the new screen displaced it.
 *
 * Its own blur and scale are gone. The ripple displaces this screen by
 * drawing banded copies of it (see WaveSweep), and a whole-layer blur on
 * top of that just softened the parts the wave had not reached — which is
 * precisely the content that should stay sharp until it does.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function PaymentDoneLayer({
  beat,
  sweep,
  bare = false,
}: {
  beat: HandoffBeat;
  sweep: MotionValue<number>;
  /* Renders the screen with no mask, no blur and no scale of its own.
     The wave's lens draws a second copy of this screen and refracts it;
     that copy has to be the raw, undistorted content, because the lens is
     applying its own mask and magnification on top. Passing the masked
     version would refract a screen that had already been cut in half by
     the same arc doing the refracting. */
  bare?: boolean;
}) {
  const gone = beat === "settled";
  const maskRef = useRippleStyle<HTMLDivElement>(sweep, outgoingMask, applyMask);

  return (
    <motion.div
      className="absolute inset-0"
      ref={bare ? undefined : maskRef}
      style={
        bare
          ? { zIndex: 0 }
          : {
              zIndex: 2,
              /* Nothing of it survives the ripple, and leaving a
                 fully-masked layer mounted keeps its backdrop-filters in
                 the compositor for the rest of the session. */
              display: gone ? "none" : "block",
            }
      }
      aria-hidden
    >
      {/* Ripple field (947:41799) — 620×620, centred low-left.
          Dropped from the lens copy. It is a 620px bitmap on a 440px
          screen, so it has two hard edges inside the frame; magnified by
          the lens those edges become a visible rectangle sliding through
          the glass. The lens only needs the content worth refracting —
          the card, the copy, the chips — and the background behind them is
          handled by the rim's own backdrop-filter anyway. */}
      {!bare && <motion.div
        className="pointer-events-none absolute"
        style={{ width: 620, height: 620, left: 73.72 - 310, top: 576 - 310 }}
        initial={false}
        animate={{
          /* Draws down and in as the other device closes. Small enough that
             you feel the pull rather than watch the image move. */
          scale: beat === "idle" ? 1 : 1.045,
          y: beat === "idle" ? 0 : 10,
        }}
        transition={{ duration: 0.9, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/ripple-orb.png"
          alt=""
          fill
          priority
          style={{ objectFit: "cover", opacity: 0.95 }}
        />
      </motion.div>}

      <BackChip />
      <PaymentSuccess visible />
      <AskBar />
    </motion.div>
  );
}
