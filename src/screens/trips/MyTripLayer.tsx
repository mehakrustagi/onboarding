"use client";

import Image from "next/image";
import type { ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import AskBar from "@/components/AskBar";
import TripSheet from "./TripSheet";
import type { HandoffBeat } from "./beats";
import { applyMask, incomingMask, rippleAt, submergence, useRippleStyle } from "./ripple";

/* MyTrip — Figma frame 947:43120 ("4" in the Transition to MyTrip section).
 *
 * Geometry is frame-relative on the same 440×965 shell the rest of the
 * prototype uses, read straight off the node:
 *
 *   country chips  row at y 71–135, Australia selected at 61×61 (191.5, 71.5)
 *   INTERNATIONAL  11px bold, 0.88 tracking, centred, y 160.4
 *   Australia      Inter SemiBold 20/25, -0.8, centred on x 222, y 199.4
 *   dates          Inter SemiBold 12/16, #999, y 232.4, gear 25×25 at (281, 228.4)
 *   progress       track 360×15 at (42, 295.9), fill 63.43×9 at (45, 298.9)
 *   agent orbs     three 30px discs at x 114.4 / 138.4 / 162.4, y 288.4
 *   agent copy     Inter Medium 20/25, -0.8, #808080, w360, centred, y 358.4
 *   tabs           row 453 wide at (30.7, 536.6) — overflows 440 on purpose
 *   rule           380 wide at y 605.7
 *   sheet          380 wide from y 638, r30
 *
 * FIRST PASS. The above-fold is to spec; the tall card stack inside the
 * white sheet is roughed in from the first card only, and the rest of the
 * sheet's content (Called customer care, 3 Sources, Atlys Protect, the
 * action rows) is still to build. It's carrying the transition's landing,
 * which is what this pass needed it to do.
 *
 *
 * THE WATER CHANGES THE PAGE; IT DOES NOT UNCOVER IT
 *
 * Nothing here is on a timer. Every group of content is tied to the
 * waterline: it surfaces when the rising wave reaches its own height on the
 * screen, so the composer comes up first — it is nearest the source — and
 * the country chips last. What you should read is water rising up a page
 * and changing what it passes over, in the order it passes over it.
 *
 * Two earlier versions each got this wrong in the way the other didn't. The
 * first had the finished screen sitting behind the crest, so the wave was a
 * shutter pulled off something that had obviously been there all along. The
 * second moved every element to a fixed delay AFTER the wave had gone,
 * which fixed the pre-loaded feeling but severed the connection — the text
 * arrived because a timer said so, not because the water reached it.
 */

/* One group of content, surfacing as the water passes its height.
 *
 * Absolutely positioned and inset so the children keep the frame
 * coordinates read off Figma; the wrapper is purely a handle for the
 * animation. `at` is the group's height on the shell, which is the only
 * thing that decides when it comes up. */
function Surface({
  sweep,
  at,
  flow = false,
  children,
}: {
  sweep: MotionValue<number>;
  at: number;
  /* In-flow rather than absolutely positioned. The scroll column's height
     has to come from its content, so the sheet cannot be absolute. */
  flow?: boolean;
  children: ReactNode;
}) {
  const p = useTransform(sweep, (v) => submergence(rippleAt(v), at));
  const opacity = useTransform(p, [0, 0.55, 1], [0, 0.6, 1]);
  /* Rises the last few pixels into place as it clears, so it reads as
     something breaking the surface rather than fading up in position. */
  const y = useTransform(p, (v) => (1 - v) * 22);
  const blur = useTransform(p, (v) => `blur(${((1 - v) * 9).toFixed(2)}px)`);

  return (
    <motion.div
      className={flow ? "relative" : "absolute inset-0"}
      /* pointerEvents none is not cosmetic. In absolute mode this wrapper
         is a transparent div covering the entire 965px layer, and there is
         one of these per content group — including the composer's, which
         sits OUTSIDE the scroll container and after it in DOM order. That
         one was swallowing every wheel and touch event on the screen, so
         the column could be scrolled programmatically but not by hand.
         The bar itself re-enables pointer events on its own box. */
      style={{ opacity, y, filter: blur, pointerEvents: "none" }}
    >
      {children}
    </motion.div>
  );
}

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Inactive countries. Figma desaturates them with a mix-blend-saturation
 * ellipse laid over each flag; a filter does the same job in one property
 * and doesn't depend on the blend isolating correctly against whatever the
 * wash is doing underneath at the time. */
const PASSPORT_CHIPS = [
  { src: "/assets/trips/flag-chad.svg", box: 45, glyph: 28, x: 272.47, y: 80.94 },
  { src: "/assets/trips/flag-china.svg", box: 40, glyph: 25, x: 337.47, y: 83.44 },
] as const;

const TABS = [
  { label: "Visa", icon: "/assets/trips/tab-visa.svg", x: 30.71, w: 94, dot: false },
  { label: "Trasport", icon: "/assets/trips/tab-transport.svg", x: 136.71, w: 122, dot: false },
  /* The red dot rides the Hotel pill's top-right corner (Ellipse 7007,
     10×10 at x 360.71) — an unresolved booking, not a tab state. */
  { label: "Hotel", icon: "/assets/trips/tab-hotel.svg", x: 270.71, w: 100, dot: true },
  { label: "Forex", icon: "/assets/trips/tab-forex.svg", x: 382.71, w: 101, dot: false },
] as const;

const ORBS = [
  { src: "/assets/trips/orb-1.png", x: 114.4 },
  { src: "/assets/trips/orb-2.png", x: 138.4 },
  { src: "/assets/trips/orb-3.png", x: 162.4 },
] as const;

export default function MyTripLayer({
  beat,
  sweep,
}: {
  beat: HandoffBeat;
  sweep: MotionValue<number>;
}) {
  const revealing = beat === "sweeping" || beat === "settled";
  const maskRef = useRippleStyle<HTMLDivElement>(sweep, incomingMask, applyMask);

  return (
    <motion.div
      className="absolute inset-0"
      ref={maskRef}
      style={{
        zIndex: 1,
        /* Masked to the inside of the expanding crest, so this screen is
           what the ripple LEAVES BEHIND rather than something faded up
           underneath it. */
        /* Hidden outright until the ripple starts. Before that the mask is
           entirely transparent anyway, but a mounted layer with three
           backdrop-filters in it still costs compositing on every frame of
           the charge — the one second of the sequence that has to stay
           perfectly smooth. */
        display: revealing ? "block" : "none",
      }}
      aria-hidden={!revealing}
    >
      {/* Figma's "Ripples GIF 1" (855×855 at −205.6, −344.1) is deliberately
          NOT here. It is a swirled bitmap standing in for moving water, and
          with a live wave crossing the screen the two read as two different
          bodies of water — a static texture the real one passes through. */}

      {/* THE WHOLE COLUMN SCROLLS, not just the sheet.
          Figma 947:26137 puts everything from the country chips down inside
          one 8003px group — chips, destination, progress, copy, tabs and
          the agent sections all move together, and only the composer is
          pinned. An earlier pass scrolled the sheet alone, which left a
          327px window: technically scrolling, useless to read.
          overscroll-contain stops a flick at either end from scrolling the
          review page behind the phone. */}
      <div
        className="absolute inset-0 overflow-y-auto overscroll-contain"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="relative">
          {/* Holds open the height the absolutely-positioned header needs;
              everything below it is in flow and sets the scroll length. */}
          <div style={{ height: 638 }} />

      {/* ── Country chips ─────────────────────────────────────────────── */}
      <Surface sweep={sweep} at={104}>

      <Image
        src="/assets/trips/chip-add.svg"
        alt=""
        width={47}
        height={47}
        style={{ position: "absolute", left: 125.47, top: 79.94, width: 47, height: 47 }}
      />

      {PASSPORT_CHIPS.map((c) => (
        <div
          key={c.src}
          className="absolute rounded-full"
          style={{
            left: c.x,
            top: c.y,
            width: c.box,
            height: c.box,
            background: "rgba(255,255,255,0.1)",
          }}
        >
          <Image
            src={c.src}
            alt=""
            width={c.glyph}
            height={c.glyph}
            style={{
              position: "absolute",
              left: (c.box - c.glyph) / 2,
              top: (c.box - c.glyph) / 2,
              width: c.glyph,
              height: c.glyph,
              filter: "saturate(0)",
              opacity: 0.55,
            }}
          />
        </div>
      ))}

      {/* Selected. The plate underneath (Rectangle 240648130) is the chip's
          cast shadow, and it sits BEHIND the flag — it's what lifts the
          selected country off the row rather than just enlarging it. */}
      <Image
        src="/assets/trips/chip-australia-plate.svg"
        alt=""
        width={67.5}
        height={48.9}
        style={{ position: "absolute", left: 188.21, top: 94.01, width: 67.5, height: 48.9 }}
      />
      <Image
        src="/assets/trips/chip-australia.svg"
        alt=""
        width={117}
        height={117}
        priority
        style={{ position: "absolute", left: 163.47, top: 47.46, width: 117, height: 117 }}
      />

      </Surface>

      {/* ── Destination ───────────────────────────────────────────────── */}
      <Surface sweep={sweep} at={205}>

      <p
        className="absolute -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase"
        style={{
          left: 221.97,
          top: 160.41,
          fontSize: 11,
          lineHeight: "14px",
          letterSpacing: "0.88px",
          color: "#808080",
        }}
      >
        International
      </p>

      <p
        className="absolute -translate-x-1/2 whitespace-nowrap text-center font-semibold"
        style={{
          left: 221.97,
          top: 199.41,
          fontSize: 20,
          lineHeight: "25px",
          letterSpacing: "-0.8px",
          color: "#0b0b0b",
        }}
      >
        Australia
      </p>

      <p
        className="absolute whitespace-nowrap font-semibold"
        style={{
          left: 170.97,
          top: 232.41,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#999999",
        }}
      >
        24th Jun - 01 Aug
      </p>
      <Image
        src="/assets/trips/gear.svg"
        alt=""
        width={25}
        height={25}
        style={{ position: "absolute", left: 280.97, top: 228.39, width: 25, height: 25 }}
      />

      </Surface>

      {/* ── Progress ──────────────────────────────────────────────────── */}
      <Surface sweep={sweep} at={300}>

      <div
        className="absolute"
        style={{
          left: 41.97,
          top: 295.91,
          width: 360,
          height: 15,
          borderRadius: 7.5,
          background: "rgba(255,255,255,0.5)",
          border: "1px solid #d6d9dc",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      />
      <motion.div
        className="absolute origin-left"
        style={{ left: 44.97, top: 298.91, width: 63.429, height: 9 }}
        initial={false}
        /* Draws itself once the screen has landed — the trip is already in
           progress, and a bar that arrives full says nothing about that. */
        animate={{ scaleX: beat === "settled" ? 1 : 0.18 }}
        transition={{ delay: 0.35, duration: 0.9, ease: IN_EASE }}
      >
        <Image
          src="/assets/trips/progress-fill.svg"
          alt=""
          width={63.429}
          height={9}
          style={{ width: 63.429, height: 9 }}
        />
      </motion.div>

      {/* Agent orbs riding the track — 30px white discs with the orb art
          inset, overlapping at a 24px pitch. */}
      {ORBS.map((o, i) => (
        <div
          key={o.src}
          className="absolute rounded-full bg-white"
          style={{ left: o.x, top: 288.41, width: 30, height: 30, zIndex: 3 - i }}
        >
          <Image
            src={o.src}
            alt=""
            width={21.5}
            height={21.5}
            style={{
              position: "absolute",
              left: 4.25,
              top: 4.25,
              width: 21.5,
              height: 21.5,
              borderRadius: "50%",
            }}
          />
        </div>
      ))}

      </Surface>

      {/* ── What the agent is doing ───────────────────────────────────── */}
      <Surface sweep={sweep} at={405}>

      <p
        className="absolute -translate-x-1/2 text-center font-medium"
        style={{
          left: 221.97,
          top: 358.41,
          width: 360,
          fontSize: 20,
          lineHeight: "25px",
          letterSpacing: "-0.8px",
          color: "#808080",
        }}
      >
        Your visa protection is <span style={{ color: "#090909" }}>active</span>.
        Visa agents have already{" "}
        {/* Figma layers a separately-coloured copy of this phrase over the
            paragraph (947:43234) to get the gradient. Same result, one node:
            the project already ships --gradient-text in the same hue order. */}
        <span
          style={{
            backgroundImage: "var(--gradient-text)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            WebkitTextFillColor: "transparent",
          }}
        >
          called the embassy
        </span>{" "}
        and keeping a close eye on your visa application
      </p>

      </Surface>

      {/* ── Category tabs ─────────────────────────────────────────────── */}
      <Surface sweep={sweep} at={565}>

      {/* The row is 453 wide in a 440 frame: Forex is meant to be clipped so
          the strip reads as scrollable. Kept as an overflow rather than
          squeezed to fit — a row that exactly fits says there is nothing
          more to see. */}
      <div className="absolute" style={{ left: 0, top: 0, right: 0, height: 620, overflow: "hidden" }}>
        {TABS.map((t) => (
          <div key={t.label}>
            <div
              className="absolute rounded-[30px] border border-[#eceaef] bg-white"
              style={{ left: t.x, top: 536.61, width: t.w, height: 39 }}
            />
            <Image
              src={t.icon}
              alt=""
              width={16}
              height={16}
              style={{
                position: "absolute",
                left: t.x + 20,
                top: 548.11,
                width: 16,
                height: 16,
              }}
            />
            <p
              className="absolute whitespace-nowrap font-semibold"
              style={{
                left: t.x + 44,
                top: 546.61,
                fontSize: 14,
                lineHeight: "19px",
                letterSpacing: "-0.14px",
                color: "#090909",
              }}
            >
              {t.label}
            </p>
            {t.dot && (
              <div
                className="absolute rounded-full"
                style={{
                  left: t.x + 90,
                  top: 536.61,
                  width: 10,
                  height: 10,
                  background: "#ef4444",
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div
        className="absolute"
        style={{ left: 30.71, top: 605.71, width: 380, height: 1, background: "rgba(0,0,0,0.07)" }}
      />

      </Surface>

          {/* ── Agent activity sheet ──────────────────────────────────── */}
          <Surface sweep={sweep} at={770} flow>
            <div style={{ marginLeft: 30, width: 380 }}>
              <TripSheet />
            </div>
          </Surface>
        </div>
      </div>

      {/* Pinned: the composer floats over the scroll, as in Figma. */}
      <Surface sweep={sweep} at={872}>
        <AskBar sendFilled delay={0} />
      </Surface>
    </motion.div>
  );
}
