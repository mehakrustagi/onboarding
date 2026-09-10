"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

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

export const LP_W = 380;
export const LP_H = 253;
const LP_FIRST_Y = 445;
const LP_PITCH = 273;

/* The list scrolls plainly: no wheel, no recede, no gather. The stack
 * bunched outgoing cards against the top at 0.62 of scroll speed, which
 * is what capped how far the list could actually travel — you ran out of
 * page long before you ran out of programs. Straight one-to-one scrolling
 * is what makes the run unlimited.
 */

/* Gap between slides in the horizontal track. */
const LP_GAP = 14;
/* How far the track hangs past the card on each side — the width of the
 * neighbouring card you can see. */
const PEEK = 30;

export const PROGRAMS = [
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
  onOpenProgram,
}: {
  open: boolean;
  onClose: () => void;
  /** Tapping either face of a card opens its detail (853:75340). */
  onOpenProgram?: (index: number) => void;
}) {
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
          {/* Fixed chrome, now only the back control and the title. The
              summary used to live up here too and held position while the
              cards moved past it — but it is page content, not chrome, so
              it scrolls away with everything else and this shrinks to the
              band it actually needs to seat. */}
          <div
            className="pointer-events-none absolute left-0 top-0 w-full"
            style={{ height: 168, zIndex: 5 }}
          >
            <div
              className="absolute inset-0"
              style={{
                // Solid past the title, then out. This is the only thing
                // stopping content showing through the type now that the
                // scroller's mask is gone.
                background:
                  "linear-gradient(180deg, #ffffff 0%, #ffffff 72%, rgba(255,255,255,0) 100%)",
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

            </div>
          </div>

          <div
            className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
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


            {PROGRAMS.map((p, i) => (
              <ProgramCard
                key={i}
                program={p}
                index={i}
                onTap={() => onOpenProgram?.(i)}
              />
            ))}

            {/* The run itself. With the gather gone this is the real
                height of the list — every card at its own pitch — so the
                last one reaches the top of the screen instead of the
                scroll ending under it. */}
            <div
              style={{ height: LP_FIRST_Y + PROGRAMS.length * LP_PITCH + 140 }}
            />
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
  onTap,
}: {
  program: (typeof PROGRAMS)[number];
  index: number;
  onTap: () => void;
}) {
  const baseTop = LP_FIRST_Y + index * LP_PITCH;

  return (
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
    <div className="relative h-full w-full">
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
            <CardFace program={program} back={slide === 1} />
          </div>
        ))}
      </div>

    </div>
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


/* Everything printed on the card. Lives inside each slide so it travels
 * with the art rather than floating over the track. */
/** Exported so the detail page renders the identical card. */
export function CardFace({
  program,
  back,
}: {
  program: (typeof PROGRAMS)[number];
  /* Figma ships the two faces as one card (853:75045 / 853:75832): the
     insight and the CTA sit at opacity 0 on the front and become visible
     on the back. Nothing moves — it is a horizontal scroll between two
     states, not a reveal, so these render plainly rather than animating
     in. */
  back: boolean;
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

    {/* Insight (853:75844): 275 wide at (22, 125). */}
    <p
      className="pointer-events-none absolute font-medium"
      style={{
        left: 22,
        top: 125,
        width: 275,
        fontSize: 11,
        lineHeight: "16px",
        color: "rgba(255,255,255,0.85)",
        opacity: back ? 1 : 0,
      }}
    >
      {program.insight}
    </p>

    {/* "View flights" (853:75914) at (21, 193). */}
    <div className="absolute" style={{ left: 21, top: 193, opacity: back ? 1 : 0 }}>
      <ViewFlightsPill />
    </div>

    {/* Present on both faces — 36×36 at card (323, 195). */}
    <div
      className="pointer-events-none absolute"
      style={{ right: 21, bottom: 22, width: 36, height: 36 }}
    >
      <Image
        src="/assets/profile/lp-flight.svg"
        alt=""
        width={36}
        height={36}
        style={{ width: 36, height: 36, display: "block" }}
      />
    </div>

    </>
  );
}
