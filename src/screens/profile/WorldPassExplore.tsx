"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

/* World pass — explore (853:18655).
 *
 * What the pass opens into when you hold it. The card stops being a card
 * and becomes the globe it was always showing a thumbnail of: 380×716 at
 * (30, 170), r40, over a white veil that keeps the page it came from
 * faintly present underneath.
 *
 * Geometry from the node:
 *   veil       441×966, rgba(255,255,255,0.92), backdrop-blur 4
 *   card       380×716 at (30, 170), r40, black
 *   eyebrow    "+ atlys worldpass" 18.598px at card y 30, opacity 40
 *   name       "mohak n." 16.762px Medium at card y 381.2, centred
 *   flags      44.698 tall pill, r22.349, at card y 418.94, centred
 *   stats      300 wide at card (40, 526), rows 34 apart
 *   close      50×50 at (360, 92)
 *
 * The card grows OUT of the pass rather than arriving: it starts at the
 * pass's own 252.325×350 at (94, 152) and opens to the full frame, so the
 * thing you were holding is the thing that opened.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/* Where the pass sits on the profile — the expansion's starting shape. */
const FROM = { x: 94, y: 152, w: 252.325, h: 350, r: 30 };
const TO = { x: 30, y: 170, w: 380, h: 716, r: 40 };

/* The globe's box. Full card width, so it is centred by construction
 * rather than by an offset that has to be kept in step with the size.
 *
 * The source is 720×1280 — portrait, 0.5625. Cropping it to a square (the
 * first attempt) made object-fit scale to fill the WIDTH and throw away
 * most of the height, which put the visible sphere off to one side. At the
 * card's own 380 wide the treatment matches the pass face exactly, and the
 * sphere lands in the middle. */
const GLOBE = { x: 0, y: 58, w: 380, h: 470 };
const GLOBE_CX = GLOBE.x + GLOBE.w / 2;
const GLOBE_CY = GLOBE.y + GLOBE.h / 2;

/* City glows, given as offsets from the globe's CENTRE rather than as
 * frame coordinates. The node's numbers belong to its own still of the
 * globe; ours is a video at a different size, so absolute positions left
 * them floating off the sphere. Anchored to the centre they travel with it
 * whatever the box does. */
const GLOWS = [
  { src: "/assets/profile/wx-glow-a.svg", dx: -68, dy: -53, s: 42.836 },
  { src: "/assets/profile/wx-glow-b.svg", dx: -109, dy: -12, s: 33.524 },
  { src: "/assets/profile/wx-glow-c.svg", dx: -8, dy: 70, s: 26.074 },
  { src: "/assets/profile/wx-glow-d.svg", dx: 6, dy: 58, s: 19.792 },
  { src: "/assets/profile/wx-glow-c.svg", dx: 42, dy: 9, s: 26.074 },
  { src: "/assets/profile/wx-glow-e.svg", dx: 76, dy: -30, s: 34.103 },
];

/* The five flags on the pill, overlapping at a 16px step. */
const FLAGS = [
  "/assets/profile/wx-flag1.svg",
  "/assets/profile/wx-flag2.svg",
  "/assets/profile/wx-flag3.svg",
  "/assets/profile/wx-flag4.png",
  "/assets/profile/wx-flag5.png",
];

const STATS: { label: string; value: string; align: "left" | "right" }[][] = [
  [
    { label: "FLIGHTS", value: "45", align: "left" },
    { label: "DISTANCE", value: "294565 m", align: "right" },
  ],
  [
    { label: "COUNTRIES", value: "20", align: "left" },
    { label: "AIRPORTS", value: "28", align: "left" },
    { label: "AIRLINES", value: "28", align: "left" },
  ],
];

export default function WorldPassExplore({
  open,
  name,
  onClose,
}: {
  open: boolean;
  name: string;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 76, borderRadius: 44 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* The veil. Not opaque: the page you came from stays faintly
              there, which is what makes this read as the card opening ON
              the profile rather than as a new screen. */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: "rgba(255,255,255,0.92)",
              backdropFilter: "blur(4px)",
              WebkitBackdropFilter: "blur(4px)",
            }}
            onClick={onClose}
          />

          {/* The card, growing out of the pass's own footprint. */}
          <motion.div
            className="absolute overflow-hidden"
            style={{ background: "#000000" }}
            initial={{
              left: FROM.x,
              top: FROM.y,
              width: FROM.w,
              height: FROM.h,
              borderRadius: FROM.r,
              opacity: 0.6,
            }}
            animate={{
              left: TO.x,
              top: TO.y,
              width: TO.w,
              height: TO.h,
              borderRadius: TO.r,
              opacity: 1,
            }}
            exit={{
              left: FROM.x,
              top: FROM.y,
              width: FROM.w,
              height: FROM.h,
              borderRadius: FROM.r,
              opacity: 0,
            }}
            transition={{ duration: 0.62, ease: EASE }}
          >
            {/* Everything inside is laid out for the OPEN size and fades in
                once the box has grown. Scaling the contents up with the box
                would stretch the type; letting the box travel first and the
                contents arrive after keeps every size as drawn. */}
            <motion.div
              className="absolute left-0 top-0"
              style={{ width: TO.w, height: TO.h }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, delay: 0.22, ease: EASE }}
            >
              {/* Globe — the same live video the pass carries, at the size
                  this frame draws it. */}
              <video
                className="pointer-events-none absolute"
                style={{
                  left: GLOBE.x,
                  top: GLOBE.y,
                  width: GLOBE.w,
                  height: GLOBE.h,
                  objectFit: "cover",
                  opacity: 0.95,
                }}
                src="/assets/globe/globe.mp4"
                autoPlay
                muted
                loop
                playsInline
              />

              {/* The light raking across it (853:18763), 33.43° off the
                  horizontal. */}
              <div
                className="pointer-events-none absolute"
                style={{
                  left: GLOBE_CX - 288,
                  top: GLOBE_CY - 49,
                  width: 576,
                  height: 97.456,
                  transform: "rotate(33.43deg)",
                  opacity: 0.5,
                }}
              >
                <Image
                  src="/assets/profile/wx-streak.svg"
                  alt=""
                  width={576}
                  height={97}
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              </div>

              {/* Cities. Each pulses on its own period so the globe reads
                  as live rather than as a still with dots on it. */}
              {GLOWS.map((g, i) => (
                <motion.div
                  key={i}
                  className="pointer-events-none absolute"
                  style={{
                    left: GLOBE_CX + g.dx - g.s / 2,
                    top: GLOBE_CY + g.dy - g.s / 2,
                    width: g.s,
                    height: g.s,
                  }}
                  animate={{ opacity: [0.55, 1, 0.55] }}
                  transition={{
                    duration: 2.6 + i * 0.45,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.3,
                  }}
                >
                  <Image
                    src={g.src}
                    alt=""
                    width={Math.round(g.s)}
                    height={Math.round(g.s)}
                    style={{ width: "100%", height: "100%", display: "block" }}
                  />
                </motion.div>
              ))}

              {/* Eyebrow: the "+" and the wordmark, as on the pass. */}
              <div
                className="pointer-events-none absolute flex items-center"
                style={{ left: 117, top: 30, gap: 6, opacity: 0.4 }}
              >
                <Image
                  src="/assets/worldpass/plus-logo.svg"
                  alt=""
                  width={14}
                  height={14}
                  style={{ width: 13.948, height: 13.948, display: "block" }}
                />
                <span
                  style={{
                    fontSize: 18.598,
                    lineHeight: "23.247px",
                    letterSpacing: "-0.7439px",
                    color: "#ffffff",
                  }}
                >
                  atlys worldpass
                </span>
              </div>

              <p
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-medium text-white"
                style={{
                  top: 381.2,
                  fontSize: 16.762,
                  lineHeight: "20.487px",
                  letterSpacing: "-0.6705px",
                }}
              >
                {name}
              </p>

              {/* Flags (853:18742). The row overlaps at a 16px step inside a
                  glass pill, then "+2" and the add control. */}
              <div
                className="absolute left-1/2 flex -translate-x-1/2 items-center"
                style={{
                  top: 418.94,
                  height: 44.698,
                  borderRadius: 22.349,
                  paddingLeft: 12,
                  paddingRight: 13.41,
                  gap: 14.899,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(153,153,153,0.16) 100%)",
                  boxShadow: "0 3.725px 27.937px rgba(0,0,0,0.05)",
                }}
              >
                <div
                  className="relative"
                  style={{ width: 64 + 20 + 28, height: 20 }}
                >
                  {FLAGS.map((f, i) => (
                    <Image
                      key={i}
                      src={f}
                      alt=""
                      width={20}
                      height={20}
                      unoptimized
                      className="absolute top-0"
                      style={{
                        left: i * 16,
                        width: 20,
                        height: 20,
                        borderRadius: 14.323,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ))}
                  <span
                    className="absolute whitespace-nowrap font-semibold uppercase text-white"
                    style={{
                      left: 91.92,
                      top: 0.1,
                      fontSize: 18.004,
                      lineHeight: "19.804px",
                      opacity: 0.6,
                    }}
                  >
                    +2
                  </span>
                </div>
                <Image
                  src="/assets/profile/wx-add.svg"
                  alt=""
                  width={22}
                  height={22}
                  style={{ width: 22.349, height: 22.349, display: "block" }}
                />
              </div>

              {/* Stats (853:18774). Two rows 34 apart; the first row splits
                  to the edges, the second runs left to right. */}
              <div
                className="absolute flex flex-col"
                style={{ left: 40, top: 526, width: 300, gap: 34 }}
              >
                {STATS.map((row, ri) => (
                  <div
                    key={ri}
                    className="flex w-full items-center"
                    style={{
                      justifyContent: ri === 0 ? "space-between" : "flex-start",
                      gap: ri === 0 ? 0 : 39,
                    }}
                  >
                    {row.map((cell, ci) => (
                      <div
                        key={ci}
                        className="flex flex-col"
                        style={{
                          gap: 8,
                          alignItems:
                            cell.align === "right" ? "flex-end" : "flex-start",
                          // The second row's first column carries the wider
                          // gap to the pair beside it, as the node draws it.
                          marginRight: ri === 1 && ci === 0 ? 30 : 0,
                        }}
                      >
                        <p
                          className="whitespace-nowrap font-bold uppercase"
                          style={{
                            fontSize: 11,
                            lineHeight: "14px",
                            letterSpacing: "0.88px",
                            color: "rgba(255,255,255,0.6)",
                          }}
                        >
                          {cell.label}
                        </p>
                        <p
                          className="whitespace-nowrap font-medium text-white"
                          style={{
                            fontSize: 28,
                            lineHeight: "36px",
                            letterSpacing: "-1.12px",
                          }}
                        >
                          {cell.value}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Close (853:18797) — 50×50 at (360, 92), an "add" glyph turned
              45° rather than its own asset, which is how the node builds
              it. */}
          <motion.button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute flex items-center justify-center"
            style={{
              left: 360,
              top: 92,
              width: 50,
              height: 50,
              borderRadius: 25,
              background: "rgba(0,0,0,0.05)",
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: 0.3, ease: EASE }}
          >
            <span
              style={{
                display: "block",
                width: 22,
                height: 22,
                transform: "rotate(45deg)",
              }}
            >
              <Image
                src="/assets/profile/wx-add.svg"
                alt=""
                width={22}
                height={22}
                style={{
                  width: 22,
                  height: 22,
                  display: "block",
                  filter: "brightness(0)",
                }}
              />
            </span>
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
