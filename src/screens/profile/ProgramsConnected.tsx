"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  type MotionValue,
} from "framer-motion";

/* Programs connected — Figma node 853:74983.
 *
 * The result of the scan. The WorldPass card has lifted away in z, so all
 * that's left of it is the edge at the top of the screen — the two 216×7
 * slivers at y 148. Everything below is what the card was hiding.
 *
 * Geometry from the node:
 *   header    "mohak n." 18px Medium at y 95, back button (30, 86)
 *   card edge two 216×7 strips at y 148, second offset +244
 *   stats     column at y 190, 320 wide: "06" 32px SemiBold, then the
 *             two captions, then the 412K / ₹3.1 Lakh pair
 *   cards     380×253 at y 445, 718, 991 — pitch 273
 *   footer    "Connect more programs" + edit, over a bottom scrim
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

const LP_W = 380;
const LP_H = 253;
const LP_FIRST_Y = 445;
const LP_PITCH = 273;

/* Where a card is "in focus" — the slot the first card occupies at rest.
 * Everything above this recedes; everything below is on its way up to it. */
const FOCUS_Y = LP_FIRST_Y;

/* The wheel. As a card passes the focus line it turns away from the
 * viewer and sinks into the background, while the one below rises to take
 * its place.
 *
 * The travel is deliberately compressed: a card that has gone past focus
 * moves UP less than the scroll would carry it (GATHER), so the outgoing
 * cards bunch together at the top like a stack being laid down rather
 * than sliding off the screen at full speed. That difference in rate is
 * what makes it read as a wheel rather than a list. */
const RECEDE_Z = 420;
const RECEDE_TILT = 16;
const GATHER = 0.62;
/* How far past focus a card stays fully opaque and sharp. It is still the
 * front card for most of this travel, so it should look like it. */
const FRONT_HOLD = 0.55;
/* Gap between slides in the horizontal track. */
const LP_GAP = 14;
/* How far the track hangs past the card on each side — the width of the
 * neighbouring card you can see. */
const PEEK = 30;

const PROGRAMS = [
  {
    insight:
      "You have 50,000 Chase points. I found a 70% transfer bonus to IHG — turning them into 85,000 points.",
    art: "/assets/profile/lp-gold.svg",
    logo: "/assets/profile/lg-maharaja.png",
    logoW: 48,
    logoH: 48,
    logoX: 22,
    logoY: 24,
  },
  {
    insight:
      "Your 15,000 KrisFlyer miles cover a one-way to Singapore on your April dates.",
    art: "/assets/profile/lp-blue.svg",
    logo: "/assets/profile/lg-krisflyer.png",
    logoW: 81,
    logoH: 29,
    logoX: 19,
    logoY: 18,
  },
  {
    insight:
      "Your 15,000 Aeroplan miles expire in 74 days. We found three trips in your upcoming travel calendar where they could be used.",
    art: "/assets/profile/lp-bonvoy.svg",
    logo: "/assets/profile/lg-bonvoy.png",
    logoW: 62,
    logoH: 22,
    logoX: 19,
    logoY: 18,
  },
];

export default function ProgramsConnected({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  /* Scroll position, fed by the container's own onScroll rather than
     useScroll({ container }).
     
     useScroll needs its container ref populated when the hook first runs,
     and this whole screen mounts conditionally inside AnimatePresence — so
     on the first render the ref is still null, the hook subscribes to
     nothing, and the wheel never moves. Reading the event directly has no
     such ordering problem. */
  const scrollY = useMotionValue(0);
  /* Which card is open. One at a time — two expanded cards would overlap,
     and the point of expanding is to single one out. */
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 70, background: "#ffffff", borderRadius: 44 }}
          // Arrives as the card recedes: this screen was always behind it,
          // so it comes forward rather than sliding in from an edge.
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.55, ease: IN_EASE }}
        >
          {/* Fixed chrome. Deliberately OUTSIDE the scroller: the header
              and the summary hold position while only the cards move, and
              a receding card passes up BEHIND this rather than over it.
              It carries an opaque white base for exactly that reason —
              without it the cards would still be visible sliding under
              the type. */}
          <div
            className="pointer-events-none absolute left-0 top-0 w-full"
            style={{ height: 420, zIndex: 5 }}
          >
            <div
              className="absolute inset-0"
              style={{
                // Lighter than before: the scroller's mask now stops cards
                // reaching this band, so this only has to seat the type
                // rather than hide anything.
                background:
                  "linear-gradient(180deg, #ffffff 0%, #ffffff 88%, rgba(255,255,255,0) 100%)",
              }}
            />
            <div className="pointer-events-auto absolute inset-0">
          {/* Header */}
          <button
            type="button"
            aria-label="Back"
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{
              left: 30,
              top: 86,
              width: 50,
              height: 50,
              borderRadius: 27,
              background: "rgba(0,0,0,0.04)",
              zIndex: 2,
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

          <p
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-medium"
            style={{
              top: 95,
              fontSize: 18,
              lineHeight: "22px",
              letterSpacing: "-0.72px",
              color: "#000000",
            }}
          >
            mohak n.
          </p>

          {/* The card's remaining edge. It is the SAME object that just
              lifted away — showing only its lip is what tells you the
              card is still there, above the screen rather than gone. */}
          {[0, 244].map((dx, i) => (
            <motion.div
              key={i}
              className="absolute left-1/2"
              style={{
                top: 148,
                width: 216,
                height: 7,
                marginLeft: -108 + dx,
              }}
              initial={{ opacity: 0, y: -14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1 + i * 0.05,
                duration: 0.6,
                ease: IN_EASE,
              }}
            >
              <Image
                src="/assets/profile/card-edge.svg"
                alt=""
                width={216}
                height={7}
                style={{ width: 216, height: 7, display: "block" }}
              />
            </motion.div>
          ))}

          {/* Summary */}
          <motion.div
            className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center"
            style={{ top: 190, width: 320, gap: 31 }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: IN_EASE }}
          >
            <div
              className="flex flex-col items-center text-center"
              style={{ width: 253, gap: 17 }}
            >
              <p
                className="w-full font-semibold"
                style={{
                  fontSize: 32,
                  lineHeight: "40px",
                  letterSpacing: "-1.28px",
                  color: "#000000",
                }}
              >
                06
              </p>
              <div
                className="flex w-full flex-col items-center font-medium"
                style={{ gap: 9, lineHeight: "16px" }}
              >
                <p style={{ fontSize: 12, letterSpacing: "-0.24px", color: "#666" }}>
                  programs connected
                </p>
                <p style={{ fontSize: 11, color: "#999" }}>
                  Read 6 statements, inboxes and checked upcoming trips...
                </p>
              </div>
            </div>

            <div
              className="flex w-full items-center justify-center"
              style={{ gap: 32 }}
            >
              {[
                { value: "412K", label: "Points/miles" },
                { value: "₹ 3.1 Lakh", label: "Est. value" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center whitespace-nowrap"
                  style={{ gap: 4 }}
                >
                  <p
                    className="font-semibold"
                    style={{
                      fontSize: 20,
                      lineHeight: "25px",
                      letterSpacing: "-0.8px",
                      color: "#000000",
                    }}
                  >
                    {s.value}
                  </p>
                  <p
                    className="text-center font-medium"
                    style={{ fontSize: 11, lineHeight: "16px", color: "#999" }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

            </div>
          </div>

          <div
            onScroll={(e) => scrollY.set(e.currentTarget.scrollTop)}
            className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            // Perspective on the SCROLLER, so every card shares one
            // vanishing point. Per-card perspective would give each its
            // own, and they'd recede along diverging axes instead of into
            // a common distance.
            style={{
              perspective: 1400,
              perspectiveOrigin: "50% 34%",
              // Cards are masked out before they reach the summary text.
              // The chrome's white fade alone wasn't enough — it only held
              // full opacity to ~344 while the stats run to ~364, so a
              // receding card showed through underneath them. Masking the
              // SCROLLER means the card simply isn't painted up there,
              // rather than being painted and then covered.
              maskImage:
                "linear-gradient(to bottom, transparent 0px, transparent 372px, rgba(0,0,0,0.45) 400px, black 424px, black 100%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0px, transparent 372px, rgba(0,0,0,0.45) 400px, black 424px, black 100%)",
            }}
          >
            {PROGRAMS.map((p, i) => (
              <ProgramCard
                key={i}
                program={p}
                index={i}
                scrollY={scrollY}
                expanded={expanded === i}
                onTap={() => setExpanded(expanded === i ? null : i)}
              />
            ))}

            <div style={{ height: LP_FIRST_Y + PROGRAMS.length * LP_PITCH + 60 }} />
          </div>

          {/* Footer, over a scrim so the last card fades under it. */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 flex w-full flex-col items-center justify-center"
            style={{
              paddingTop: 110,
              paddingLeft: 30,
              paddingRight: 30,
              gap: 16,
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 15.263%, #c6c6c6 127.89%)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          >
            <div
              className="pointer-events-auto flex items-center justify-between"
              style={{ width: 380, paddingBottom: 22 }}
            >
              <button
                type="button"
                className="flex items-center justify-center bg-white"
                style={{
                  height: 48,
                  gap: 5.6,
                  paddingLeft: 14.4,
                  paddingRight: 24,
                  borderRadius: 24,
                  border: "0.828px solid #e5e5e5",
                  filter: "drop-shadow(0 4px 15px rgba(0,0,0,0.05))",
                }}
              >
                <Image
                  src="/assets/profile/icon-link.svg"
                  alt=""
                  width={24}
                  height={24}
                  style={{ width: 24, height: 24, display: "block" }}
                />
                <span
                  className="whitespace-nowrap text-center font-semibold"
                  style={{
                    fontSize: 14,
                    lineHeight: "19px",
                    letterSpacing: "-0.14px",
                    color: "#000000",
                  }}
                >
                  Connect more programs
                </span>
              </button>
              <button
                type="button"
                className="flex items-center justify-center bg-white"
                style={{
                  width: 65,
                  height: 48,
                  borderRadius: 24,
                  border: "0.828px solid #e5e5e5",
                  filter: "drop-shadow(0 4px 15px rgba(0,0,0,0.05))",
                }}
              >
                <Image
                  src="/assets/profile/icon-edit.svg"
                  alt=""
                  width={24}
                  height={24}
                  style={{ width: 24, height: 24, display: "block" }}
                />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ProgramCard({
  program,
  index,
  scrollY,
  expanded,
  onTap,
}: {
  program: (typeof PROGRAMS)[number];
  index: number;
  scrollY: MotionValue<number>;
  expanded: boolean;
  onTap: () => void;
}) {
  const baseTop = LP_FIRST_Y + index * LP_PITCH;

  /* How far this card has travelled past the focus line, in slots.
     0 = sitting in focus, 1 = one card-height beyond it, negative = still
     below and coming up. */
  const p = useTransform(scrollY, (v) => (v + FOCUS_Y - baseTop) / LP_PITCH);

  // Only cards at or past focus recede; the ones below stay flat.
  const past = useTransform(p, (v) => Math.max(0, v));

  const z = useTransform(past, (v) => -Math.min(v, 2.2) * RECEDE_Z);
  const rotateX = useTransform(past, (v) => Math.min(v, 2.2) * RECEDE_TILT);
  /* Held at full through the whole time the card is the front one, and
     only fading once it has genuinely gone past. Fading from the instant
     scrolling starts made the card you are actually looking at dim while
     it was still the subject — the recede should read as a card leaving,
     not as the front card dimming. */
  const opacity = useTransform(past, [0, FRONT_HOLD, 1.35], [1, 1, 0]);
  // Held back against the scroll, so outgoing cards gather at the top
  // rather than sliding away at full speed.
  const y = useTransform(past, (v) => v * LP_PITCH * GATHER);
  // Softens as it goes, so it dissolves into the page rather than
  // shrinking away still sharp.
  const filter = useTransform(past, (v) => {
    // Blur holds off for the same reason: the front card stays sharp for
    // as long as it is the front card.
    const t = Math.max(0, v - FRONT_HOLD) / (1.4 - FRONT_HOLD);
    return `blur(${(Math.min(t, 1) * 5).toFixed(2)}px)`;
  });

  return (
    /* Two layers on purpose. The outer one owns the ENTRANCE, which is a
       one-shot `animate`; the inner owns the SCROLL, which is a set of
       live motion values. Putting both on one element makes the entrance's
       animate={{ opacity: 1 }} overwrite the scroll-driven opacity the
       moment it lands, and the card stops fading as it recedes. */
    <motion.div
      className="absolute left-1/2"
      style={{
        top: baseTop,
        width: LP_W,
        height: LP_H,
        marginLeft: -LP_W / 2,
        // Later cards paint ABOVE earlier ones. I had this inverted, which
        // put the receding card on top of the one rising to replace it —
        // so the outgoing card covered its successor while fading out.
        // The card coming up is the subject, so it has to be in front.
        zIndex: index,
      }}
      initial={{ opacity: 0, y: 26 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.08, duration: 0.65, ease: IN_EASE }}
    >
    <motion.div
      className="relative h-full w-full"
      style={{
        transformStyle: "preserve-3d",
        // Pinned to the card's own top edge: a centre origin would make
        // the card sink INTO the one above as it recedes, where a top
        // origin keeps its lip in place and turns it away.
        transformOrigin: "50% 0%",
        z,
        rotateX,
        opacity,
        y,
        filter,
        willChange: "transform, opacity, filter",
      }}
    >
      {/* Horizontal carousel (853:75825). The row is wider than the card
          and overflows the phone on both sides, so the neighbour peeks in
          at the edge — that peek is the whole affordance, which is why
          the track is offset rather than centred.

          Each slide is self-contained: art AND content together. My first
          attempt kept the content outside the track, which meant it
          painted over whichever slide was showing. */}
      <div
        className="absolute flex overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // Wider than the card and hanging past it on both sides. At
          // exactly card width the neighbour sits entirely off-screen and
          // there is no peek at all — the overflow IS the affordance.
          left: -PEEK,
          right: -PEEK,
          top: 0,
          bottom: 0,
          paddingLeft: PEEK,
          paddingRight: PEEK,
          scrollSnapType: "x mandatory",
          scrollPaddingLeft: PEEK,
          gap: LP_GAP,
        }}
      >
        {[0, 1].map((slide) => (
          <div
            key={slide}
            onClick={onTap}
            className="relative shrink-0 cursor-pointer overflow-hidden"
            style={{
              width: LP_W,
              height: LP_H,
              borderRadius: 30,
              scrollSnapAlign: "start",
            }}
          >
            <Image
              src={program.art}
              alt=""
              width={LP_W}
              height={LP_H}
              style={{ width: LP_W, height: LP_H, display: "block" }}
            />
            <CardFace program={program} expanded={expanded} />
          </div>
        ))}
      </div>

      {/* Glare. A narrow band of light sweeping diagonally across the
          metal on tap — the Nothing-phone reveal.

          On `screen` so it ADDS light rather than painting over: the card
          brightens where it passes and the artwork stays visible through
          it, which is what makes it read as a reflection travelling over
          the surface rather than a white shape sliding across. Keyed on
          the expanded state so it re-runs on every tap. */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            key="glare"
            className="pointer-events-none absolute inset-0 overflow-hidden"
            style={{ borderRadius: 30, mixBlendMode: "screen" }}
          >
            <motion.div
              className="absolute"
              style={{
                top: -LP_H,
                width: 130,
                height: LP_H * 3,
                background:
                  "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0.85) 50%, rgba(255,255,255,0.55) 55%, rgba(255,255,255,0) 100%)",
                filter: "blur(6px)",
                transform: "rotate(18deg)",
              }}
              initial={{ x: -160 }}
              animate={{ x: LP_W + 120 }}
              transition={{ duration: 0.9, ease: [0.35, 0, 0.2, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </motion.div>
  );
}

/* "View flights" — the glass pill on the card's revealed face
 * (853:75020): 127×30.171, r30, 0.5px white border, backdrop-blur 25 over
 * a white 0.5 → 0.3 gradient. */
function ViewFlightsPill() {
  return (
    <div
      className="flex items-center"
      style={{
        width: 127,
        height: 30.171,
        borderRadius: 30,
        border: "0.5px solid #ffffff",
        background:
          "linear-gradient(165.7deg, rgba(255,255,255,0.5) 10.513%, rgba(255,255,255,0.3) 72.053%)",
        backdropFilter: "blur(25px)",
        WebkitBackdropFilter: "blur(25px)",
        boxShadow: "0 4px 30px -2px rgba(0,0,0,0.05)",
        paddingLeft: 6,
        paddingRight: 6,
        gap: 8,
      }}
    >
      <Image
        src="/assets/profile/lp-orb.svg"
        alt=""
        width={20}
        height={20}
        style={{ width: 20, height: 20, display: "block", flexShrink: 0 }}
      />
      <span
        className="whitespace-nowrap font-semibold text-white"
        style={{ fontSize: 12, lineHeight: "16px", letterSpacing: "-0.12px" }}
      >
        View flights
      </span>
      <Image
        src="/assets/profile/lp-chev.svg"
        alt=""
        width={18}
        height={18}
        style={{
          width: 18,
          height: 18,
          display: "block",
          flexShrink: 0,
          transform: "rotate(180deg)",
        }}
      />
    </div>
  );
}

/* The insight, typed rather than faded in — the design frames this as the
 * agent generating a finding, and text that appears all at once reads as
 * a label that was always there.
 *
 * Reveals by SLICING the full string rather than appending to state, so
 * the layout is computed once from the complete text. Growing the string
 * character by character reflows the paragraph on every tick and the
 * lines jump around as words wrap. */
function TypedInsight({ text, run }: { text: string; run: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!run) return;
    let raf = 0;
    const start = performance.now();
    // ~32 chars/second — fast enough not to be a wait, slow enough to
    // read as being written.
    const tick = (now: number) => {
      const n = Math.floor((now - start) / 31);
      setCount(Math.min(n, text.length));
      if (n < text.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, text]);

  const shown = run ? count : 0;
  return (
    <p
      className="font-medium"
      style={{
        fontSize: 11,
        lineHeight: "16px",
        color: "rgba(255,255,255,0.86)",
      }}
    >
      {/* The full string is always laid out; the untyped tail is just
          invisible. That keeps the wrap fixed from the first frame. */}
      <span>{text.slice(0, shown)}</span>
      <span style={{ opacity: 0 }}>{text.slice(shown)}</span>
      {run && shown < text.length && (
        <motion.span
          style={{
            display: "inline-block",
            width: 5,
            height: 11,
            marginLeft: 1,
            verticalAlign: "-1px",
            background: "rgba(255,255,255,0.8)",
          }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 0.7, repeat: Infinity, ease: "linear" }}
        />
      )}
    </p>
  );
}

/* Everything printed on the card. Lives inside each slide so it travels
 * with the art rather than floating over the track. */
function CardFace({
  program,
  expanded,
}: {
  program: (typeof PROGRAMS)[number];
  expanded: boolean;
}) {
  return (
    <>
    {/* Brand mark. Drawn normally with a soft shadow rather than on
        plus-lighter — that blend adds light, so a pale logo on bright
        gold came out invisible. The shadow is what seats it on the
        metal instead. */}
    <Image
      src={program.logo}
      alt=""
      width={program.logoW}
      height={program.logoH}
      unoptimized
      className="absolute"
      style={{
        left: program.logoX,
        top: program.logoY,
        width: program.logoW,
        height: program.logoH,
        filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.28))",
      }}
    />

    <p
      className="absolute font-bold uppercase"
      style={{
        left: 22,
        top: 56,
        fontSize: 11,
        lineHeight: "14px",
        letterSpacing: "0.88px",
        color: "rgba(255,255,255,0.92)",
      }}
    >
      739154xxx
    </p>
    <p
      className="absolute font-medium"
      style={{
        left: 22,
        top: 81,
        fontSize: 11,
        lineHeight: "16px",
        color: "rgba(255,255,255,0.7)",
      }}
    >
      Expiring in Dec 2027
    </p>

    <p
      className="absolute font-semibold text-white"
      style={{
        right: 22,
        top: 24,
        fontSize: 24,
        lineHeight: "28px",
        letterSpacing: "-0.96px",
      }}
    >
      23,545
    </p>
    <p
      className="absolute font-medium"
      style={{
        right: 22,
        top: 58,
        fontSize: 11,
        lineHeight: "16px",
        color: "rgba(255,255,255,0.6)",
      }}
    >
      points
    </p>

    {/* Insight, revealed on tap (853:75340). */}
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: 22, top: 125, width: 275 }}
      initial={false}
      animate={{ opacity: expanded ? 1 : 0, y: expanded ? 0 : 8 }}
      transition={{ duration: 0.45, ease: IN_EASE, delay: expanded ? 0.16 : 0 }}
    >
      <TypedInsight text={program.insight} run={expanded} />
    </motion.div>

    <motion.div
      className="absolute"
      style={{ left: 22, top: 195 }}
      initial={false}
      animate={{ opacity: expanded ? 1 : 0, y: expanded ? 0 : 10 }}
      // Lands after the text has finished writing — a CTA that appears
      // mid-sentence invites a tap before the answer is even there.
      transition={{
        duration: 0.45,
        ease: IN_EASE,
        delay: expanded ? 0.16 + (program.insight.length * 31) / 1000 : 0,
      }}
    >
      <ViewFlightsPill />
    </motion.div>

    <motion.div
      className="pointer-events-none absolute"
      style={{ right: 22, bottom: 22, width: 36, height: 36 }}
      initial={false}
      animate={{ opacity: expanded ? 1 : 0 }}
      transition={{ duration: 0.4, ease: IN_EASE, delay: expanded ? 0.2 : 0 }}
    >
      <Image
        src="/assets/profile/lp-flight.svg"
        alt=""
        width={36}
        height={36}
        style={{ width: 36, height: 36, display: "block" }}
      />
    </motion.div>

    </>
  );
}
