"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* Connectors — Figma node 871:7870 (sheet 871:8014).
 *
 * Every size and position below is the node's own. The sheet is 440×903,
 * so these are sheet-relative and the component is laid out in that frame
 * rather than being centred by eye.
 *
 *   back        50×50 at (30, 30)
 *   header      globe + database icons 24×24 at y 40, "CONNECTORS" at 80
 *   bloom       249×249 ring, centred, y-40 from the sheet's middle
 *   trunk       29 tall at centre, y 309
 *   atlys       80×80 at centre, y 361, r25, logo 56.707×25
 *   copy        11px Medium at 50% opacity, y 460, 271 wide
 *   branches    172×86.566 at (135, 514.43)
 *   services    80×80 at (95, 627) and (266, 627); status dot 16×16
 *   labels      14px SemiBold #666 at y 723
 *   button      380×48, r24
 *
 * The wires are Figma's own paths rather than curves I fitted, so they
 * meet the nodes exactly instead of approximately.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* The sheet's own frame. Laying out against this rather than the viewport
 * keeps every offset the same number Figma reports. */
const SHEET_W = 440;
const SHEET_H = 903;

const SERVICES = [
  {
    key: "gmail",
    label: "gmail",
    x: 95,
    labelLeft: 117,
    connected: true,
  },
  {
    key: "itr",
    label: "ITR connector",
    x: 266,
    labelLeft: 260,
    connected: false,
  },
];

export default function ConnectorsGraph({ onPanel }: { onPanel?: () => void }) {
  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 overflow-hidden"
      style={{ top: 0, width: SHEET_W, height: SHEET_H }}
    >
      {/* Globe, cut off by the top edge. Held still — the artwork carries
          its own lighting and shadow, so turning it would drag the
          highlight around and read as a printed ball being spun. It
          breathes instead. */}
      {/* Globe (853:71571). Figma masks it to 319.854² and places that
          mask at frame (62.24, -36) — element left -239.84 plus mask
          position 302.082, and -188.52 plus 152.524. It is NOT clipped to
          a short box: the white veil below does the fading, which is why
          the sphere can sit this low without ending on a line. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{ left: 62.24, top: -36, width: 319.854, height: 319.854 }}
        animate={{ scale: [1, 1.03, 1], y: [0, -4, 0] }}
        transition={{
          scale: { duration: 11, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 8, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        <Image
          src="/assets/profile/conn-globe.png"
          alt=""
          width={320}
          height={320}
          unoptimized
          priority
          style={{ width: 319.854, height: 319.854, display: "block", objectFit: "contain" }}
        />
      </motion.div>

      {/* Orbit arcs (853:71572 / 853:71573). Faint, and turning on their
          own long periods so the sphere reads as a system rather than a
          picture. */}
      <motion.div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{ left: 51.86, top: 21.59, width: 311.917, height: 289.27 }}
        animate={{ rotate: [-157.6, -151.6, -157.6] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/profile/cn-orbit1.svg"
          alt=""
          width={251}
          height={209}
          style={{ width: 251.067, height: 209.397, display: "block" }}
        />
      </motion.div>
      <motion.div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{ left: 183.47, top: -34, width: 181.007, height: 172.437 }}
        animate={{ rotate: [30, 24, 30] }}
        transition={{ duration: 27, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/profile/cn-orbit2.svg"
          alt=""
          width={141}
          height={118}
          style={{ width: 141.077, height: 117.662, display: "block" }}
        />
      </motion.div>

      {/* White veil over the globe's lower half (871:8021) — this is what
          fades the globe into the page rather than ending it on a line. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: 0,
          top: 0,
          width: SHEET_W,
          height: 301,
          background:
            "linear-gradient(180deg, #ffffff 35.88%, rgba(255,255,255,0) 100%)",
        }}
      />

      {/* Bloom ring (871:8041): 249×249, centred, 40 above the middle. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{
          top: SHEET_H / 2 - 40 - 249 / 2,
          width: 249,
          height: 249,
        }}
        animate={{ scale: [1, 1.05, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/profile/cn-bloom.svg"
          alt=""
          width={249}
          height={249}
          style={{ width: 249, height: 249, display: "block" }}
        />
      </motion.div>

      {/* Header */}
      <p
        className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase"
        style={{
          top: 80,
          fontSize: 11,
          lineHeight: "14px",
          letterSpacing: "0.88px",
          color: "#000000",
        }}
      >
        Connectors
      </p>
      <Image
        src="/assets/profile/cn-db.svg"
        alt=""
        width={24}
        height={24}
        className="absolute left-1/2 -translate-x-1/2"
        style={{ top: 40, width: 24, height: 24 }}
      />

      {/* Trunk: 29 tall at centre, y 309. Draws itself in. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 overflow-hidden"
        // Natural 5.333×34.333, NOT squashed into 8×29 — that turned the
        // round cap at each end into an oval. Figma's box is 29 with the
        // art overflowing 9.2% each side (inset -9.2%), which is exactly
        // this asset at full size centred on that box: 309 - 2.67.
        style={{ top: 306.33, width: 5.333, height: 34.333 }}
        initial={{ height: 0 }}
        animate={{ height: 34.333 }}
        transition={{ delay: 0.15, duration: 0.45, ease: IN_EASE }}
      >
        <Image
          src="/assets/profile/cn-trunk.svg"
          alt=""
          width={6}
          height={35}
          style={{ width: 5.333, height: 34.333, display: "block" }}
        />
      </motion.div>

      {/* Atlys */}
      <motion.div
        className="absolute left-1/2 flex -translate-x-1/2 items-center justify-center"
        style={{
          top: 361,
          width: 80,
          height: 80,
          borderRadius: 25,
          background: "rgba(255,255,255,0.1)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          boxShadow: "0 5px 15px 0 rgba(0,0,0,0.06)",
        }}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.55, ease: IN_EASE }}
      >
        <Image
          src="/assets/profile/cn-atlys.svg"
          alt="Atlys"
          width={56.707}
          height={25}
          style={{ width: 56.707, height: 25, display: "block" }}
        />
      </motion.div>

      <motion.p
        className="absolute left-1/2 -translate-x-1/2 text-center font-medium"
        style={{
          top: 460,
          width: 271,
          fontSize: 11,
          lineHeight: "16px",
          color: "#000000",
          opacity: 0.5,
        }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 0.5, y: 0 }}
        transition={{ delay: 0.28, duration: 0.5, ease: IN_EASE }}
      >
        Access is securely managed and your data is used only to help the
        agent work for you.
      </motion.p>

      {/* Branches (871:8063): 172×86.566 at (135, 514.43). Wiped in from
          the top so the split appears to grow out of Atlys rather than
          fading in whole. */}
      <motion.div
        className="pointer-events-none absolute overflow-hidden"
        style={{ left: 135, top: 514.43, width: 172 }}
        initial={{ height: 0 }}
        animate={{ height: 86.566 }}
        transition={{ delay: 0.42, duration: 0.6, ease: IN_EASE }}
      >
        <Image
          src="/assets/profile/cn-branches.svg"
          alt=""
          width={172}
          height={86.566}
          style={{ width: 172, height: 86.566, display: "block" }}
        />
      </motion.div>

      {SERVICES.map((sv, i) => (
        <motion.div
          key={sv.key}
          className="absolute"
          style={{ left: sv.x, top: 627, width: 80, height: 80 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.72 + i * 0.1, duration: 0.5, ease: IN_EASE }}
        >
          {sv.key === "gmail" ? (
            <div
              className="flex h-full w-full items-center justify-center"
              style={{
                borderRadius: 100,
                border: "1px solid #efefef",
                background: "#ffffff",
              }}
            >
              <Image
                src="/assets/profile/cn-gmail.png"
                alt=""
                width={56}
                height={56}
                unoptimized
                style={{ width: 56, height: 56, display: "block" }}
              />
            </div>
          ) : (
            <Image
              src="/assets/profile/cn-itr.svg"
              alt=""
              width={80}
              height={80}
              style={{ width: 80, height: 80, display: "block" }}
            />
          )}

          {/* Status dot, 16×16 at (60, 61) within the node. Green breathes
              because a live connection is doing something; red holds
              steady because a broken one isn't. */}
          <motion.div
            className="absolute"
            style={{ left: 60, top: 61, width: 16, height: 16 }}
            animate={
              sv.connected
                ? { scale: [1, 1.16, 1], opacity: [1, 0.75, 1] }
                : { scale: 1, opacity: 1 }
            }
            transition={
              sv.connected
                ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0 }
            }
          >
            {sv.connected ? (
              <Image
                src="/assets/profile/cn-dot.svg"
                alt=""
                width={16}
                height={16}
                style={{ width: 16, height: 16, display: "block" }}
              />
            ) : (
              <span
                className="block"
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  background: "#ef4444",
                  border: "2px solid #ffffff",
                }}
              />
            )}
          </motion.div>
        </motion.div>
      ))}

      {SERVICES.map((sv, i) => (
        <motion.p
          key={`${sv.key}-label`}
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: sv.labelLeft,
            top: 723,
            width: sv.key === "gmail" ? undefined : 94,
            textAlign: sv.key === "gmail" ? "left" : "center",
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#666666",
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.82 + i * 0.08, duration: 0.5, ease: IN_EASE }}
        >
          {sv.label}
        </motion.p>
      ))}

      {/* Bottom scrim + action (871:8033) */}
      {/* Bottom scrim, capped at the node's own 124px (871:8028).
          It was sized by its padding instead, which made it ~182 tall —
          tall enough to cover the service labels at y 723, and its
          backdrop-blur was what softened them. A backdrop filter blurs
          everything behind the element, so any overlap is a blur. */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 w-full"
        style={{
          height: 124,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0) 15.263%, #ffffff 127.89%)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      <div
        className="pointer-events-none absolute bottom-0 left-0 flex w-full flex-col items-center justify-end"
        style={{ height: 124, paddingLeft: 30, paddingRight: 30 }}
      >
        <motion.button
          type="button"
          onClick={onPanel}
          className="pointer-events-auto flex items-center justify-center bg-white font-semibold"
          style={{
            width: 380,
            height: 48,
            marginBottom: 24,
            borderRadius: 24,
            border: "0.828px solid #e5e5e5",
            filter: "drop-shadow(0 4px 15px rgba(0,0,0,0.05))",
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#000000",
          }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.5, ease: IN_EASE }}
        >
          View control panel
        </motion.button>
      </div>
    </div>
  );
}
