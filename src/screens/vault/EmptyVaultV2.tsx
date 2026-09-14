"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Bar, Panel, Ruler } from "./skeleton";
import { useDragScroll } from "../trips/useDragScroll";

/* Trip Vault, empty — version 2. Figma 13554:37134 (sheet 13554:37582).
 *
 * Same screen, opposite strategy. V1 shows the placeholder stack as
 * itself, on the sheet's own ground. V2 puts the same stack INSIDE a dark
 * card and pairs it with a line of copy — so the placeholder stops being
 * a stand-in for missing content and becomes a picture of the product,
 * which is what lets it sit in a swipeable row of them.
 *
 * That is also why this version can carry two CTAs and V1 cannot: the
 * card row has already done the explaining, so the buttons are a choice
 * rather than a single instruction.
 *
 * Geometry, read off the node against the 440×965 shell:
 *
 *   sheet     440 wide from y133.8, r44 at the top only
 *   title     Your Trip Vault 20/25 -0.8 at (154.68, 188.8)
 *   kicker    Every booking, orchestrated 12/16 #090909 centred, y221.8
 *   body      12/16 #999 centred, w300.3, y247.8
 *   cards     252.325×372 at y319.81, x29.72 then 297.05 — 15 apart, so
 *             the second is cut by the frame on purpose
 *   card      r30, black → #242424 top to bottom, with the aurora bitmap
 *             at 30% over the top half, rotated 180
 *   in a card ruler at +31.72, ticks 2.308 tall, pitch 8.83, #363636;
 *             rows 163.234×46.169 r12.312 #ecf3fe at +30 / +91.91 /
 *             +153.83, opacity .10 / .10 / .05; bars 107.723×6.156 and
 *             61.556×6.156 #e5e5e5 at row +22.31 / +32.31
 *   card copy 14/19 white centred at +246, 12/16 #999 w210 at +294
 *   rule      dashed 380 at y722.9
 *   upload    380×51 at (29.73, 763), white, #e5e5e5, r65
 *   OR        10px bold 0.8 #999 at (211.16, 834)
 *   sync      378.87×51 at (29.73, 864), r84, pastel gradient
 */

const A = "/assets/vault";

const SHEET_TOP = 133.8;
const CARD_W = 252.325;
const CARD_H = 372;
const CARD_TOP = 319.81;
const CARD_GAP = 15;
const CARD_X0 = 29.72;

/* Figma draws two identical cards. They are the same card twice because
 * it is a carousel with one slide designed — so the copy is per-card
 * here, ready for the second and third to say something of their own. */
const CARDS = [
  {
    title: "Organize itinerary in seconds",
    body: "Sync with email or upload documents to keep all travel passes in one vault",
  },
  {
    title: "Organize itinerary in seconds",
    body: "Sync with email or upload documents to keep all travel passes in one vault",
  },
] as const;

/* Rest opacities down the stack. The dark card needs far lower values
 * than v1's light one to read as the same depth — .10 on #ecf3fe over
 * near-black is about as bright as .6 #f2f2f2 over white.
 *
 * THE BARS NOW OUTRANK THEIR OWN BOX, which the node does not do: Figma
 * has rows 2 and 3 at bar .07 / .02 against panel .10 / .05, so on two of
 * the three rows the container is brighter than the content it holds. The
 * stack reads as three empty boxes with something faint inside rather than
 * as a list of entries. Each bar now sits clearly above its panel and the
 * ramp down the stack is preserved, so the depth the node designed is
 * intact — it is the order within each row that changed. */
const CARD_ROWS = [
  { top: 30, label: "Sep 23", panel: 0.1, bar: 0.24, text: 0.4 },
  { top: 91.91, label: "Sep 25", panel: 0.07, bar: 0.14, text: 0.16 },
  { top: 153.83, label: "Sep 26", panel: 0.04, bar: 0.08, text: 0.09 },
] as const;

function DarkCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      className="relative flex-none overflow-hidden"
      style={{
        width: CARD_W,
        height: CARD_H,
        borderRadius: 30,
        background: "linear-gradient(180deg, #000000 0%, #242424 100%)",
      }}
    >
      {/* The aurora, rotated 180 so its bloom sits at the card's top edge
          — the light comes from above the stack, which is what stops the
          placeholder rows reading as a flat grid.

          IT DRIFTS. Held still it is wallpaper, and wallpaper behind six
          animated bars reads as a bug — the one part of the card that is
          obviously a picture. Moving, it becomes the light source the
          shimmer below is reflecting.

          The three axes run on deliberately coprime periods (13 / 17 / 11
          seconds) so the loop never lands on itself; at these amplitudes
          you cannot point at what moved, only notice the card is not
          dead. Scale stays above 1 throughout so no drift can pull the
          bitmap's edge inside the card and expose a corner. */}
      <motion.div
        className="absolute"
        style={{ left: 0, top: 0, width: CARD_W, height: 164.259 }}
        animate={{
          x: [0, 10, -8, 0],
          y: [0, -5, 3, 0],
          scale: [1.04, 1.12, 1.06, 1.04],
        }}
        transition={{
          x: { duration: 13, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 17, repeat: Infinity, ease: "easeInOut" },
          scale: { duration: 11, repeat: Infinity, ease: "easeInOut" },
        }}
      >
      <Image
        src={`${A}/card-aurora.png`}
        alt=""
        width={292.531}
        height={164.259}
        style={{
          position: "absolute",
          left: -19.99,
          top: 0,
          width: 292.531,
          /* Wider than the card on purpose — the bloom is meant to run off
             both edges. The reset's img{max-width:100%} was clamping it to
             252 and squashing the gradient with it. */
          maxWidth: "none",
          height: 164.259,
          opacity: 0.3,
          transform: "rotate(180deg)",
          /* Figma runs this through a mask (image 182); without one the
             bitmap's own edge lands as a hard 1px seam straight across the
             card at y484, right where the third placeholder row sits. The
             mask is only ever a falloff, so a gradient does the same job
             without a second asset to keep in step. Applied before the
             rotation in the same transform, so it fades the edge that ends
             up at the bottom. */
          maskImage: "linear-gradient(to top, #000 62%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to top, #000 62%, transparent 100%)",
        }}
      />
      </motion.div>

      <Ruler
        x={31.72}
        y={78.54}
        pitch={8.83}
        height={2.308}
        radius={7.695}
        color="#363636"
        scale={0.77}
      />

      {CARD_ROWS.map((row, i) => (
        <div key={row.label}>
          <Panel
            x={57.38}
            y={row.top}
            w={163.234}
            h={46.169}
            r={12.312}
            color="#ecf3fe"
            base={row.panel}
            index={i}
          />
          <p
            className="absolute whitespace-nowrap font-bold uppercase"
            style={{
              left: 68.92,
              top: row.top + 7.69,
              fontSize: 7.695,
              lineHeight: "7.695px",
              letterSpacing: "0.6156px",
              color: "#cccccc",
              opacity: row.text,
            }}
          >
            {row.label}
          </p>
          <Bar
            x={68.92}
            y={row.top + 22.31}
            w={107.723}
            h={6.156}
            r={38.474}
            color="#e5e5e5"
            base={row.bar}
            index={i}
            light="rgba(255,255,255,0.5)"
          />
          <Bar
            x={68.92}
            y={row.top + 32.31}
            w={61.556}
            h={6.156}
            r={38.474}
            color="#e5e5e5"
            base={row.bar}
            index={i}
            light="rgba(255,255,255,0.5)"
          />
        </div>
      ))}

      <p
        className="absolute text-center font-semibold"
        style={{
          /* 156.39 is the frame-absolute centre; the card starts at 29.72,
             so the card-relative centre is 126.67. */
          left: 126.67 - 139.916 / 2,
          top: 246,
          width: 139.916,
          fontSize: 14,
          lineHeight: "19px",
          letterSpacing: "-0.14px",
          color: "#ffffff",
        }}
      >
        {title}
      </p>
      <p
        className="absolute text-center font-semibold"
        style={{
          left: 126.17 - 210 / 2,
          top: 294,
          width: 210,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#999999",
        }}
      >
        {body}
      </p>
    </div>
  );
}

export default function EmptyVaultV2({
  onUpload,
  onSync,
}: {
  onUpload: () => void;
  onSync: () => void;
}) {
  const rail = useDragScroll<HTMLDivElement>();

  return (
    <div className="absolute inset-0" style={{ zIndex: 4 }}>
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: SHEET_TOP,
          bottom: 0,
          background: "#f9fafb",
          borderRadius: "44px 44px 0 0",
          boxShadow: "0px -10px 40px -8px rgba(0,0,0,0.12)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{ left: 208, top: SHEET_TOP + 14, width: 24, height: 3, background: "#d6d9dc" }}
      />

      <p
        className="absolute whitespace-nowrap font-semibold"
        style={{
          left: 154.68,
          top: 188.8,
          fontSize: 20,
          lineHeight: "25px",
          letterSpacing: "-0.8px",
          color: "#090909",
        }}
      >
        Your Trip Vault
      </p>
      <p
        className="absolute w-full text-center font-semibold"
        style={{
          left: 0,
          top: 221.8,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#090909",
        }}
      >
        Every booking, orchestrated
      </p>
      <p
        className="absolute text-center font-semibold"
        style={{
          left: 220.18 - 300.296 / 2,
          top: 247.8,
          width: 300.296,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#999999",
        }}
      >
        Drop any ticket, hotel voucher, or visa. Your agents organizes them into a live timeline
      </p>

      {/* The second card is clipped by the frame in Figma rather than
          fitted, which is the design saying there are more. Kept as a
          real scroller so that promise is one you can act on — a clipped
          row that does not move is a worse lie than no clip at all. */}
      <div
        ref={rail}
        className="absolute overflow-x-auto overscroll-x-contain"
        style={{
          left: 0,
          right: 0,
          top: CARD_TOP,
          height: CARD_H,
          scrollbarWidth: "none",
          touchAction: "pan-x",
          cursor: "grab",
        }}
      >
        <div className="flex" style={{ gap: CARD_GAP, paddingLeft: CARD_X0, paddingRight: CARD_X0 }}>
          {CARDS.map((c, i) => (
            <DarkCard key={i} title={c.title} body={c.body} />
          ))}
        </div>
      </div>

      <Image
        src={`${A}/dash-380.svg`}
        alt=""
        width={380}
        height={1.09912}
        style={{ position: "absolute", left: 30, top: 722.9, width: 380, height: 1.09912 }}
      />

      <button
        type="button"
        onClick={onUpload}
        className="absolute"
        style={{
          left: 29.73,
          top: 763,
          width: 380,
          height: 51,
          borderRadius: 65,
          background: "#ffffff",
          border: "1px solid #e5e5e5",
        }}
      >
        <Image
          src={`${A}/upload.svg`}
          alt=""
          width={20}
          height={20}
          style={{ position: "absolute", left: 118, top: 15.5, width: 20, height: 20 }}
        />
        <span
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: 143,
            top: 16,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#090909",
          }}
        >
          Upload document
        </span>
      </button>

      <p
        className="absolute w-full text-center font-bold uppercase"
        style={{
          left: 0,
          top: 834,
          fontSize: 10,
          lineHeight: "10px",
          letterSpacing: "0.8px",
          color: "#999999",
        }}
      >
        Or
      </p>

      {/* The pastel is a bitmap-sized blob wider than the pill, clipped by
          it. Cheaper than the node's mask + two stacked copies, and the
          mask was only ever the pill's own shape. */}
      <button
        type="button"
        onClick={onSync}
        className="absolute overflow-hidden"
        style={{
          left: 29.73,
          top: 864,
          width: 378.87,
          height: 51,
          borderRadius: 84,
          background: "rgba(255,255,255,0.1)",
        }}
      >
        <Image
          src={`${A}/sync-grad.svg`}
          alt=""
          width={403.617}
          height={180.882}
          style={{
            position: "absolute",
            left: (378.87 - 403.617) / 2,
            top: (51 - 180.882) / 2,
            width: 403.617,
            maxWidth: "none",
            height: 180.882,
          }}
        />
        <span
          className="absolute w-full text-center font-semibold"
          style={{
            left: 0,
            top: 16,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#090909",
          }}
        >
          Sync from Email
        </span>
      </button>
    </div>
  );
}
