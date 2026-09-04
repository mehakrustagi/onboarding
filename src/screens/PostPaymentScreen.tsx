"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import PaymentCard from "./payment-v2/PaymentCard";
import PaymentSuccess from "./payment-v2/PaymentSuccess";

/* Post-payment beat — Figma frame 1220 (node 70:21172).
 *
 * The design builds it as two layers dropped on top of the live payment
 * screen, which is why it reads as a state change rather than a new page:
 *
 *   70:21315  a full-bleed frosted veil — backdrop-blur(20px) over
 *             rgba(255,255,255,0.74) — which softens the payment card
 *             underneath instead of hiding it
 *   70:21316  "gradient screen": the copy, the gradient ellipse, and the
 *             sparkle row
 *
 * The ellipse (70:21318 / Ellipse 6988) is a 351px circle carrying a
 * 150px-wide stroke on a black → #5057EA → #EF4646 → #EDD758 gradient,
 * blurred at stdDeviation 99.95 and held at 50% opacity — so it renders in
 * a 750.783px box and sits centred at (229.5, 911.5), mostly BELOW the
 * bottom edge. Only its upper bloom is on screen, which is what makes it
 * read as light coming up from under the phone. */

type Beat = "rise" | "settled" | "fired" | "cleared";

const RISE_MS = 620;
/* How long the wash sits pooled at the bottom before it launches. It needs
 * a real beat down there first — fire it too early and there's no sense of
 * something having gathered, which is what makes the launch land. */
const HOLD_MS = 1500;
const FIRE_MS = 780;
/* Travel for the launch. The wash's mass sits around screen y 780 at rest;
 * 740 carries it to roughly y 40, which pushes the top ~30% of the colour
 * off the top edge. Bleeding out is the point — a gradient that stops
 * neatly inside the frame reads as a shape that has arrived somewhere,
 * where one running off the edge reads as still going. */
const FIRE_Y = 740;
/* Once the wash is up and out, the success screen takes over. The handover
 * starts BEFORE the launch has fully finished — waiting for the gradient
 * to be completely gone would leave a blank white beat in between, which
 * reads as a load rather than a transition. */
const CLEAR_MS = 520;
/* How much further the wash travels on its way out, past the launch. */
const CLEAR_Y = 420;

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Bottom-bloom colour fields — the pastel wash across the lower half.
 *
 * These are the brand hues (#5057EA / #EF4646 / #EDD758) lifted toward
 * pastel rather than used at full strength. The screen is near-white, and
 * saturated colour on white reads as a graphic pasted on top; the same
 * hues tinted up read as light diffusing through the surface, which is
 * what the reference shows. Lavender left, rose through the middle, peach
 * on the right. */
const BLOOM_FIELDS = [
  {
    color: "rgba(150,120,224,0.95)",
    fade: "rgba(150,120,224,0.34)",
    x: -230,
    y: 250,
    w: 660,
    h: 360,
    blur: 64,
    drift: 250,
    lift: 70,
    swell: 1.14,
    dur: 5.6,
  },
  {
    color: "rgba(244,158,192,0.95)",
    fade: "rgba(244,158,192,0.34)",
    x: 30,
    y: 300,
    w: 630,
    h: 330,
    blur: 70,
    drift: -215,
    lift: 84,
    swell: 1.17,
    dur: 7.1,
  },
  {
    color: "rgba(253,186,124,0.95)",
    fade: "rgba(253,186,124,0.34)",
    x: 170,
    y: 235,
    w: 640,
    h: 350,
    blur: 66,
    drift: 230,
    lift: 62,
    swell: 1.12,
    dur: 4.8,
  },
] as const;

/* Standalone route version — the stage in its own phone shell, for
 * iterating on this beat without replaying the whole flow. */
export default function PostPaymentScreen() {
  return (
    <div
      className="relative h-[965px] w-[440px] select-none overflow-hidden rounded-[44px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
      style={{ background: "#eceaef" }}
    >
      {/* The payment screen, sitting behind the veil exactly as it does
          in the flow. Without it this route renders the frost over an
          empty page — which looks like a plain white screen and tells you
          nothing about how the overlay actually reads. */}
      <PaymentCard visible onPay={() => {}} />
      <PostPaymentStage active />
    </div>
  );
}

/* The beat itself, with no shell of its own — so the payment flow can drop
 * it straight into its existing 440×965 container and this file stays the
 * single source for the animation. */
export function PostPaymentStage({ active }: { active: boolean }) {
  const [beat, setBeat] = useState<Beat>("rise");

  useEffect(() => {
    if (!active || beat !== "rise") return;
    const t = window.setTimeout(() => setBeat("settled"), RISE_MS);
    return () => window.clearTimeout(t);
  }, [active, beat]);

  useEffect(() => {
    if (!active || beat !== "settled") return;
    const t = window.setTimeout(() => setBeat("fired"), HOLD_MS);
    return () => window.clearTimeout(t);
  }, [active, beat]);

  useEffect(() => {
    if (!active || beat !== "fired") return;
    const t = window.setTimeout(() => setBeat("cleared"), CLEAR_MS);
    return () => window.clearTimeout(t);
  }, [active, beat]);

  const fired = beat === "fired" || beat === "cleared";
  const cleared = beat === "cleared";

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
      {/* Frosted veil (70:21315). Prominent, but carrying its weight in
          BLUR rather than in flat white — Figma's rgba(255,255,255,0.74)
          is close enough to opaque that the payment screen is effectively
          painted over, which makes it a background rather than an overlay.
          At 0.44 white over blur(38px) it dominates the screen while the
          card, the amounts and the pay-via tiles still read as shapes
          underneath it. */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: -1.79,
          width: 440.908,
          height: 968,
          // WHITE and bright, close to Figma's own 0.74. The reference is
          // a near-white screen with the payment content ghosted behind
          // it — the grey I had it at was reading as a dimmed screen, a
          // different thing entirely. Slightly under Figma's value plus a
          // heavier blur, so the copy, the card and the pay-via tiles are
          // still discernible as shapes rather than painted out.
          // Eased off toward the bottom so the wash beneath it comes through
          // at full strength. Holding a flat 0.70 over the whole screen
          // was capping how prominent the colour could ever get — no
          // amount of tinting reads through a uniform white sheet.
          // Falls away sharply over the bottom half. The veil is a white
          // sheet sitting between the wash and the eye — every point of
          // opacity here is colour you can't see, so it holds full
          // strength where the payment card needs muting and gets out of
          // the way where the gradient lives.
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.76) 0%, rgba(255,255,255,0.70) 38%, rgba(255,255,255,0.40) 72%, rgba(255,255,255,0.22) 100%)",
          backdropFilter: "blur(30px) saturate(105%)",
          WebkitBackdropFilter: "blur(30px) saturate(105%)",
        }}
        initial={{ opacity: 0 }}
        // Breathes rather than sitting flat. The swing is deliberately
        // small — a veil that pulses hard makes the content underneath
        // flicker in and out of legibility, which reads as a rendering
        // fault. 0.88 → 1 is enough to feel alive without the payment
        // card appearing to strobe.
        animate={
          !active
            ? { opacity: 0 }
            : fired
              ? // Held flat while the wash flies. The blackout sheet above
                // it is doing the concealing now, so this only has to stop
                // breathing — a pulsing veil under a solid sheet is work
                // nobody can see.
                { opacity: 1 }
              : { opacity: [1, 0.88, 1] }
        }
        transition={
          fired
            ? { duration: FIRE_MS / 1000, ease: "easeOut" }
            : active
              ? {
                  opacity: {
                    duration: 3.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }
              : { duration: 0.55, ease: IN_EASE }
        }
      />

      {/* Breathing bloom on top of the veil — a soft white swell that
          scales and fades on its own period. This is what carries most of
          the pulse: brightening a localised area reads as the frost
          thickening and thinning, where pulsing the whole veil's opacity
          alone just dims the screen. Its period is deliberately offset
          from the veil's so the two never peak together. */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: -1.79,
          width: 440.908,
          height: 968,
          background:
            "radial-gradient(58% 38% at 50% 34%, rgba(255,255,255,0.40) 0%, rgba(255,255,255,0.12) 52%, rgba(255,255,255,0) 100%)",
        }}
        initial={{ opacity: 0, scale: 0.94 }}
        animate={
          active
            ? fired
              ? { opacity: 0, scale: 1 }
              : { opacity: [0.4, 0.8, 0.4], scale: [0.97, 1.04, 0.97] }
            : { opacity: 0, scale: 0.94 }
        }
        transition={
          active
            ? {
                opacity: { duration: 2.4, repeat: Infinity, ease: "easeInOut" },
                scale: { duration: 3.7, repeat: Infinity, ease: "easeInOut" },
              }
            : { duration: 0.55, ease: IN_EASE }
        }
      />



      {/* Blackout sheet. Solid white, fading in as the wash launches, so
          the payment card is gone by the time the colour is travelling.
          It sits BELOW the gradient and above everything else: the fields
          blend with multiply, and multiply against pure white returns the
          colour unchanged — so this hides the card at zero cost to the
          gradient. Raising the frosted veil instead would have dimmed
          both, which is the trade that made it look faded before. */}
      <motion.div
        className="absolute"
        style={{
          left: 0,
          top: -1.79,
          width: 440.908,
          height: 968,
          background: "#ffffff",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: fired ? 1 : 0 }}
        transition={{ duration: 0.42, ease: IN_EASE }}
      />

      {/* Payment success (46:12845). Starts arriving while the wash is
          still on its way out, so the two overlap and the screen is never
          empty between them. */}
      <PaymentSuccess visible={cleared} />

      {/* Gradient screen (70:21316) */}
      <div
        className="absolute overflow-hidden"
        style={{ left: 1, top: 1, width: 440, height: 965, borderRadius: 44 }}
      >
        {/* Bottom bloom — the Siri-style glow. Three soft colour fields
            drifting behind a bright luminous bar, all heavily blurred.
            Brand palette, taken from the gradient ellipse's own stops so
            it can't drift off-brand: #5057EA, #EF4646, #EDD758.

            The fields are much larger than the area they light and sit
            partly below the bottom edge — you see the glow, never the
            shape making it. Each drifts on its own period so the colours
            keep re-mixing instead of holding one arrangement. */}
        <motion.div
          className="absolute"
          style={{
            left: 0,
            // Starts well above the halfway line so the wash owns the
            // bottom half of the screen outright rather than hugging the
            // edge — that reach is most of what makes it prominent.
            top: 360,
            width: 440,
            // Runs way past the bottom edge on purpose. At rest the
            // surplus is off-screen and costs nothing; once the wash
            // fires 560px upward that surplus is exactly what keeps the
            // lower half covered. At 640 tall it cleared the bottom of
            // the screen on the way up and left a hole behind it.
            height: 1240,
            // Feathered along its top edge. In the reference the colour
            // has no boundary at all — it just becomes the white screen
            // somewhere around the middle. Without this mask the fields
            // end on a visible line no matter how much they're blurred.
            // isolation:auto — the wrapper animates opacity on entry,
            // and an animated-opacity group becomes its own stacking
            // context, which would trap the fields' multiply inside it and
            // blend them against nothing.
            isolation: "auto",
            // Feathering flips once it's fired. The mask fades the wash
            // out at whichever edge it's travelling AWAY from — pointing
            // down while it pools at the bottom, up once its mass is at
            // the top. Leaving it fixed would put a hard edge across the
            // top of the screen the moment it arrived.
            transition: "mask-image 0.5s ease",
            maskImage: fired
              ? // Mass is at the top now and its body still runs off the
                // bottom edge — so no feather at all. Fading the lower
                // end here is what put the gap on screen.
                "linear-gradient(to bottom, black 0px, black 100%)"
              : "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.10) 90px, rgba(0,0,0,0.34) 190px, rgba(0,0,0,0.72) 290px, black 380px, black 100%)",
            WebkitMaskImage: fired
              ? // Mass is at the top now and its body still runs off the
                // bottom edge — so no feather at all. Fading the lower
                // end here is what put the gap on screen.
                "linear-gradient(to bottom, black 0px, black 100%)"
              : "linear-gradient(to bottom, transparent 0px, rgba(0,0,0,0.10) 90px, rgba(0,0,0,0.34) 190px, rgba(0,0,0,0.72) 290px, black 380px, black 100%)",
          }}
          initial={{ opacity: 0, y: 120 }}
          animate={
            !active
              ? { opacity: 0, y: 120 }
              : cleared
                ? {
                    // Carries on out of frame and dissolves — it has to
                    // actually LEAVE, not stop at the top and vanish in
                    // place.
                    opacity: 0,
                    y: -(FIRE_Y + CLEAR_Y),
                    scaleY: 1.12,
                    scaleX: 1.05,
                  }
                : fired
                ? {
                    opacity: 1,
                    y: -FIRE_Y,
                    // Stretches on the way up and recovers at the top —
                    // the smear of something moving faster than it can
                    // hold its shape. A rigid block travelling the same
                    // distance just reads as a slide.
                    scaleY: [1, 1.28, 1.04],
                    // Was [1, 0.94, 1] — a horizontal squeeze to sell the
                    // smear, which is exactly what made the colour pull
                    // in from both edges on the way up. Spreading reads
                    // as pressure just as well and keeps the sides full.
                    scaleX: [1, 1.07, 1.03],
                  }
                : { opacity: 1, y: 0, scaleY: 1, scaleX: 1 }
          }
          transition={
            cleared
              ? {
                  y: { duration: 0.72, ease: [0.4, 0, 0.7, 1] },
                  opacity: { duration: 0.6, ease: "easeIn" },
                  scaleY: { duration: 0.72, ease: "easeOut" },
                  scaleX: { duration: 0.72, ease: "easeOut" },
                }
              : fired
              ? {
                  // Fired, not lifted: near-zero initial slope then a hard
                  // pull away. An ease-out would make it look released
                  // rather than launched.
                  y: { duration: FIRE_MS / 1000, ease: [0.72, 0, 0.24, 1] },
                  scaleY: { duration: FIRE_MS / 1000, ease: "easeOut" },
                  scaleX: { duration: FIRE_MS / 1000, ease: "easeOut" },
                }
              : { duration: RISE_MS / 1000, ease: [0.4, 0, 0.2, 1] }
          }
        >
          {BLOOM_FIELDS.map((f, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: f.x,
                top: f.y,
                width: f.w,
                height: f.h,
                borderRadius: "50%",
                background: `radial-gradient(closest-side, ${f.color} 0%, ${f.fade} 55%, rgba(0,0,0,0) 100%)`,
                filter: `blur(${f.blur}px)`,
                mixBlendMode: "multiply",
              }}
              animate={{
                // Long sweeps across the full width rather than a gentle
                // wobble in place. The fields have to physically cross
                // each other for the colours to mix — drifting 50px never
                // let them overlap enough to make a new hue.
                x: [0, f.drift, -f.drift * 0.75, f.drift * 0.4, 0],
                y: [0, -f.lift * 0.35, f.lift, -f.lift * 0.2, 0],
                scale: [1, f.swell, 1 / f.swell, f.swell * 0.94, 1],
              }}
              transition={{
                x: { duration: f.dur, repeat: Infinity, ease: "easeInOut" },
                y: {
                  duration: f.dur * 1.31,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                scale: {
                  duration: f.dur * 0.83,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
              }}
            />
          ))}

          {/* Floor pool. The three drifting fields give the wash its
              movement, but movement alone reads as weightless — this is
              the ballast: a wide, flat, near-static band pinned to the
              bottom edge that the moving colour sits ON. Its own travel is
              tiny and horizontal only, so the bottom never lifts off. */}
          <motion.div
            className="absolute"
            style={{
              left: -150,
              top: 340,
              width: 740,
              height: 320,
              borderRadius: "50%",
              background:
                "radial-gradient(closest-side, rgba(190,158,236,0.9) 0%, rgba(242,172,198,0.58) 52%, rgba(253,196,146,0.24) 100%)",
              filter: "blur(72px)",
              mixBlendMode: "multiply",
            }}
            animate={{ x: [0, 46, -34, 0], scaleX: [1, 1.06, 0.97, 1] }}
            transition={{
              x: { duration: 9.5, repeat: Infinity, ease: "easeInOut" },
              scaleX: { duration: 7.2, repeat: Infinity, ease: "easeInOut" },
            }}
          />

          {/* Light travelling through the colour. A soft warm-white
              highlight sweeping left to right on plus-lighter, so it ADDS
              light where it passes rather than painting over — colour it
              crosses brightens and blooms instead of being covered. Wide
              and heavily blurred, so it reads as illumination moving
              through the wash rather than as an object sliding across it.
              Its period is off the fields' so the light never keeps
              catching the same one. */}
          <motion.div
            className="absolute"
            style={{
              // Much wider and shorter than before (300×360 → 560×300).
              // A tall narrow highlight reads as a beam with a definite
              // position; spreading it across half the screen means you
              // register the brightening, not the thing causing it.
              left: -340,
              top: 290,
              width: 560,
              height: 300,
              borderRadius: "50%",
              // The falloff does most of the diffusing. The old ramp held
              // near-full brightness to 48% and then dropped, which put a
              // discernible core in the middle. This one starts lower and
              // bleeds the whole way out, so there's no core to find.
              background:
                "radial-gradient(closest-side, rgba(255,246,232,0.62) 0%, rgba(255,242,224,0.4) 30%, rgba(255,238,214,0.2) 62%, rgba(255,255,255,0) 100%)",
              filter: "blur(96px)",
              mixBlendMode: "plus-lighter",
            }}
            animate={{
              x: [0, 820],
              // Peaks softly in the middle of the run and is already
              // dimming by the time it reaches either side, so it never
              // has a hard start or stop — light welling up and receding
              // rather than a highlight entering and leaving frame.
              opacity: [0, 0.35, 0.62, 0.4, 0],
              scaleY: [0.92, 1.2, 1, 1.12, 0.92],
              scaleX: [1, 1.18, 1],
            }}
            transition={{
              // Slower, so the brightening is something you notice having
              // happened rather than something you watch travel.
              x: { duration: 9.4, repeat: Infinity, ease: "easeInOut" },
              opacity: {
                duration: 9.4,
                repeat: Infinity,
                ease: "easeInOut",
                times: [0, 0.22, 0.5, 0.78, 1],
              },
              scaleY: { duration: 5.7, repeat: Infinity, ease: "easeInOut" },
              scaleX: { duration: 7.9, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        </motion.div>

        {/* "Your application is in!" (70:21317) — Inter Medium 20/25,
            -0.8 tracking, #0b0b0b, centred at x 222, y 464. */}
        <motion.p
          className="absolute -translate-x-1/2 whitespace-nowrap text-center"
          style={{
            left: 222,
            top: 464,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 500,
            fontSize: 20,
            lineHeight: "25px",
            letterSpacing: "-0.8px",
            color: "#0b0b0b",
          }}
          initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          animate={
            active && !fired
              ? { opacity: 1, y: 0, filter: "blur(0px)" }
              : { opacity: 0, y: 10, filter: "blur(6px)" }
          }
          // Lands as the ellipse arrives, so the light and the line read
          // as one event.
          transition={{ delay: 0.3, duration: 0.6, ease: IN_EASE }}
        >
          Your application is in!
        </motion.p>

        {/* Sparkle row (70:21319) */}
        <motion.div
          className="absolute"
          style={{ left: 60.02, top: 868.2, width: 319.951, height: 87.75 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0 }}
          transition={{ delay: 0.45, duration: 0.8, ease: IN_EASE }}
        >
          <Image
            src="/assets/payment/success-stars.svg"
            alt=""
            width={319.951}
            height={87.75}
            style={{ width: 319.951, height: 87.75, display: "block" }}
          />
        </motion.div>
      </div>
    </div>
  );
}
