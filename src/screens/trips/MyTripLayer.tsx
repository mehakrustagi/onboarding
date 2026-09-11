"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import TripSheet, { PILL_FILL } from "./TripSheet";
import { useDragScroll } from "./useDragScroll";
import TripOverlays, { type TripOverlay } from "./TripOverlays";
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

         A flow surface is a different shape: it is sized to its content
         and sits inside the scroller, so it covers nothing it should not.
         It has to stay interactive — the agent column's rail nodes and
         action pills live under it, and blanking pointer events there let
         every tap fall through to the white panel behind. */
      style={{ opacity, y, filter: blur, pointerEvents: flow ? "auto" : "none" }}
    >
      {children}
    </motion.div>
  );
}


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

/* The scroll track has to hold the last tab plus the 30 inset the row
   starts with, or Forex butts against the end of the scroll. */
const TABS_W = 382.71 + 101 + 30;

/* The three discs land clustered at the start of the track and then walk
 * it out, pulling the fill along behind them.
 *
 * The start x is not a round number and should not be: the fill's right
 * edge has to keep a constant gap behind the leading disc for the whole
 * slide, or the orbs visibly outrun what they are supposed to be drawing.
 * Figma's rest positions are 114.4 / 138.4 / 162.4 with the fill ending
 * at 108.4, a 6px gap. The fill grows from its own left edge at 44.97, so
 * the leading disc has to start at 44.97 + 6 = 50.97 and travel exactly
 * the fill's own 63.43 — same distance, same gap at both ends and every
 * frame between. */
const ORB_PITCH = 24;
const ORB_START_X = 50.97;
const ORB_ROLL = 63.429;

const ORBS = [
  { src: "/assets/trips/orb-1.png", x: ORB_START_X },
  { src: "/assets/trips/orb-2.png", x: ORB_START_X + ORB_PITCH },
  { src: "/assets/trips/orb-3.png", x: ORB_START_X + ORB_PITCH * 2 },
] as const;

/* One curve for the slide and the fill. They are the same gesture — the
 * orbs are what is drawing the bar — so they cannot be on separate
 * timings without one of them looking like it is reacting to the other. */
const ROLL = { duration: 1.1, ease: [0.4, 0, 0.2, 1] as const };

export default function MyTripLayer({
  beat,
  sweep,
  orbsOnTrack,
  orbsRolled,
}: {
  beat: HandoffBeat;
  sweep: MotionValue<number>;
  /* False until the agents have flown down and come to rest at the start
     of the track. The screen arrives with an empty bar on purpose — the
     agents are what puts anything on it, and a bar that was already
     populated during the handoff makes their arrival decorative. */
  orbsOnTrack: boolean;
  /* And then they set off. This runs the slide and the fill together. */
  orbsRolled: boolean;
}) {
  const revealing = beat === "sweeping" || beat === "settled";
  /* Which panel the column has opened, if any — the rail nodes and the
     action pills both raise one. Held here rather than in TripSheet
     because the sheets have to escape the scroller and cover the whole
     shell, and TripSheet lives inside it. */
  const [overlay, setOverlay] = useState<TripOverlay | null>(null);
  const tabs = useDragScroll<HTMLDivElement>();
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
        /* #F9FAFB is the trip view's own ground, not the shell's. The shell
           stays #ECEAEF because that is the payment screen's background
           (Figma 947:41798) and it has to remain correct for the whole
           charge and knock. Putting the new colour on this layer means the
           ripple's mask reveals the new background along with the screen it
           belongs to, rather than the page changing colour underneath a
           transition that has not happened yet. */
        background: "#f9fafb",
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
          {/* Rectangle 240648228 — the white panel everything from the tab
              row down sits on. Full-bleed 440 wide, r30, starting at y506.5,
              running to the end of the scroll, with the same shadow family
              as the cards.

              This is the layer I had inverted: the page ground is #F9FAFB
              and the PANEL is white, with each section a #F9FAFB tile on
              top of it. Rendering the sections white on a grey page put
              white glass on white and the action pills lost their shape. */}
          <div
            className="absolute"
            style={{
              left: 0,
              width: 440,
              top: 506.5,
              bottom: 0,
              background: "#ffffff",
              borderRadius: 30,
              boxShadow: "0px 4px 30px -2px rgba(0,0,0,0.05)",
            }}
          />

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
        /* Drawn by the orbs, not by the clock. It has no length at all
           until they set off, and then it grows at exactly their pace —
           the bar is the trail they leave, which is why they land at the
           start of it rather than at the end. */
        animate={{ scaleX: orbsRolled ? 1 : 0 }}
        transition={ROLL}
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
          inset, overlapping at a 24px pitch.

          Absent until the agents arrive — through the whole handoff and
          the whole overlay. No crossfade on the handover: the flying orb
          finishes at exactly this position, size and art, so appearing
          underneath it is the thing you cannot see. A fade would be the
          thing you can. */}
      {orbsOnTrack &&
        ORBS.map((o, i) => (
          <motion.div
            key={o.src}
            className="absolute rounded-full bg-white"
            style={{ left: o.x, top: 288.41, width: 30, height: 30, zIndex: 3 - i }}
            initial={false}
            animate={{ x: orbsRolled ? ORB_ROLL : 0 }}
            transition={ROLL}
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
          </motion.div>
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

      {/* The row is 483 wide in a 440 frame: Forex is meant to be clipped
          so the strip reads as scrollable. Kept as an overflow rather than
          squeezed to fit — a row that exactly fits says there is nothing
          more to see.

          It used to be an overflow:hidden clip box, which made that promise
          and then broke it: the strip looked scrollable and was not. It is
          a real scroller now, sized to the tab band rather than the 620 the
          clip box spanned — a full-height box here would sit over the copy
          above the tabs and eat its pointer events. The tabs keep their
          Figma x positions inside a track wide enough for the last one. */}
      <div
        ref={tabs}
        className="absolute overflow-x-auto overscroll-x-contain"
        style={{
          left: 0,
          top: 530,
          right: 0,
          height: 52,
          scrollbarWidth: "none",
          touchAction: "pan-x",
          cursor: "grab",
          /* Its Surface is the absolute variant, which blanks pointer
             events so it cannot swallow the column's scroll. A scroller
             inside one has to opt back in, the same way the composer used
             to — and this box is only the 52px tab band, so re-enabling it
             costs nothing above or below. */
          pointerEvents: "auto",
        }}
      >
        <div className="relative" style={{ width: TABS_W, height: 52 }}>
        {TABS.map((t) => (
          <div key={t.label}>
            <div
              className="absolute rounded-[30px]"
              /* Same material as every other pill in the trip view — see
                 PILL in TripSheet. These were white on an #ECEAEF outline,
                 which read as a different control from the action rows
                 sitting a few hundred pixels below them. */
              style={{
                left: t.x,
                top: 6.61,
                width: t.w,
                height: 39,
                border: "1px solid #ffffff",
                backgroundImage: PILL_FILL,
                boxShadow: "0px 4px 30px -2px rgba(0,0,0,0.05)",
              }}
            />
            <Image
              src={t.icon}
              alt=""
              width={16}
              height={16}
              style={{
                position: "absolute",
                left: t.x + 20,
                top: 18.11,
                width: 16,
                height: 16,
              }}
            />
            <p
              className="absolute whitespace-nowrap font-semibold"
              style={{
                left: t.x + 44,
                top: 16.61,
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
                  top: 6.61,
                  width: 10,
                  height: 10,
                  background: "#ef4444",
                }}
              />
            )}
          </div>
        ))}
        </div>
      </div>

      <div
        className="absolute"
        style={{ left: 30.71, top: 605.71, width: 380, height: 1, background: "rgba(0,0,0,0.07)" }}
      />

      </Surface>

          {/* ── Agent activity sheet ──────────────────────────────────── */}
          <Surface sweep={sweep} at={770} flow>
            <div style={{ marginLeft: 30, width: 380 }}>
              <TripSheet onOpen={setOverlay} />
            </div>
          </Surface>
        </div>
      </div>

      {/* No composer on this screen. It belongs to the detail view, where
          it opens already carrying the tapped action and the row it came
          from — an empty "Ask anything" bar pinned over the column was the
          same control with nothing attached to it. */}

      <TripOverlays overlay={overlay} onClose={() => setOverlay(null)} />
    </motion.div>
  );
}
