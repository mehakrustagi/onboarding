"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import Card3D from "@/components/Card3D";

/* -----------------------------------------------------------------------------
 * Screen 6 — "Your WorldPass is issued"
 *   Header: ID scan icon + laurel-decorated title
 *   Middle: WorldPass card (globe video + pill + name + ID) with peek of next
 *   Below:  "Scroll down" + "View all 24 benefits" pill
 *   Bottom: soft-gradient "Confirm Details & Activate Benefits" CTA + Skip
 * ---------------------------------------------------------------------------*/

const IN_EASE = [0.22, 1, 0.36, 1] as const;
const STAGGER = 0.15;

export default function Screen6() {
  // NOTE: Screen 6 is layered on top of Screen 5 (still mounted below) so the
  // globe video keeps playing across the transition. We render a TRANSPARENT
  // background and DO NOT re-render the main WorldPass card — Screen 5's card
  // shows through this layer and is the shared element between the two screens.
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[44px]">
      {/* Scan icon pill — 65×65 white circle with subtle drop shadow, scan
          frame + person centered per Figma node 561:25931. */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full text-[color:var(--ink)]"
        style={{
          top: 60,
          width: 65,
          height: 65,
          background: "#fff",
          boxShadow:
            "0 4.643px 13.929px 0 rgba(0,0,0,0.06), inset 0 0 0 1px rgba(0,0,0,0.03)",
        }}
        initial={{ opacity: 0, y: -10, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: IN_EASE }}
      >
        <ScanIcon />
      </motion.div>

      {/* Title with laurel decorations — laurels span most of the canvas
          width and the title sits in the gap between the two halves. Native
          SVG aspect is 306.9 : 60 (~5.1:1); we scale by width only. */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
        style={{ top: 205, width: 400, height: 78 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: STAGGER, duration: 0.6, ease: IN_EASE }}
      >
        <Image
          src="/assets/worldpass/laurels.svg"
          alt=""
          width={400}
          height={78}
          style={{ width: 400, height: "auto", opacity: 0.55 }}
        />
        <p
          className="absolute text-center text-[24px] font-medium leading-[30px] tracking-[-0.03em] text-[color:var(--ink)]"
          style={{ maxWidth: 220 }}
        >
          Your WorldPass is
          <br />
          issued
        </p>
      </motion.div>

      {/* Main WorldPass card is NOT rendered here — Screen 5's card underneath
          is the shared element, so its globe video keeps looping unaffected.
          We only overlay the name + divider + ID inside the card's footer,
          fading in where Screen 5's "All your benefits. One WorldPass." was. */}
      <motion.div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center"
        style={{ top: 587, width: 180 }}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: STAGGER * 2, duration: 0.6, ease: IN_EASE }}
      >
        <p className="subtext-gradient text-[15px] font-medium leading-[22px] tracking-[-0.02em]">
          mohak n.
        </p>
        <div
          className="mt-[10px]"
          style={{
            height: 1,
            background:
              "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)",
          }}
        />
        <p className="mt-[10px] font-mono text-[11px] tracking-[0.16em] text-white/25">
          6190001
        </p>
      </motion.div>

      {/* Peek of next card — slides in from off-screen right after the rest
          of the "issued" UI has settled, hinting at horizontal scroll. */}
      <motion.div
        className="absolute"
        style={{ top: 317, left: 250 }}
        initial={{ opacity: 0, x: 220 }}
        animate={{ opacity: 0.85, x: 100 }}
        transition={{ delay: STAGGER * 5, duration: 0.9, ease: IN_EASE }}
      >
        <IssuedCard name="mohak n." id="6190001" width={230} height={330} />
      </motion.div>

      {/* Scroll down + View all 24 benefits pill */}
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        style={{ top: 675 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: STAGGER * 3, duration: 0.6, ease: IN_EASE }}
      >
        <p className="text-[13px] font-medium leading-[16px] tracking-[-0.01em] text-neutral-500">
          Scroll down
        </p>
        <button
          className="relative flex h-[32px] w-[152px] items-center justify-center rounded-full text-[13px] font-medium tracking-[-0.01em] text-[color:var(--ink)]"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: "1px solid rgba(0,0,0,0.05)",
            boxShadow: "0 4px 14px -6px rgba(0,0,0,0.08)",
            backdropFilter: "blur(8px)",
          }}
        >
          View all 24 benefits
        </button>
        <ChevronDown />
      </motion.div>

      {/* Bottom sheet — Confirm CTA + Skip */}
      <motion.div
        className="absolute bottom-0 left-0 w-full pt-6 pb-8"
        style={{
          background:
            "linear-gradient(to top, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.9) 60%, rgba(255,255,255,0) 100%)",
        }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: STAGGER * 4, duration: 0.75, ease: IN_EASE }}
      >
        <div className="flex flex-col items-center gap-4 px-[30px]">
          <button
            className="relative h-[50px] w-full overflow-hidden rounded-full text-[15px] font-semibold text-[color:var(--ink)]"
            style={{
              background:
                "linear-gradient(90deg, rgba(80,87,234,0.35) 0%, rgba(217,70,239,0.28) 35%, rgba(239,68,68,0.32) 65%, rgba(237,215,88,0.35) 100%)",
              boxShadow: "0 12px 30px -14px rgba(0,0,0,0.18)",
              border: "1px solid rgba(255,255,255,0.7)",
            }}
          >
            Confirm Details & Activate Benefits
          </button>
          <button className="text-[15px] font-medium underline underline-offset-4 text-[color:var(--ink)]">
            Skip
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function IssuedCard({
  name,
  id,
  width = 230,
  height = 330,
}: {
  name: string;
  id: string;
  width?: number;
  height?: number;
}) {
  // Globe scales with card; anchor everything to card width for a stable ratio.
  const globeSize = Math.round(width * 0.87);
  return (
    <div className="shrink-0" style={{ width }}>
      <Card3D width={width} height={height} radius={26} static>
        {/* "+ atlys worldpass" pill */}
        <p
          className="subtext-gradient absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[12px] font-medium tracking-[-0.01em]"
          style={{ top: 20 }}
        >
          + atlys worldpass
        </p>
        {/* Globe */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2"
          style={{
            top: 45,
            width: globeSize,
            height: globeSize,
            maskImage:
              "radial-gradient(circle, black 38%, transparent 55%)",
            WebkitMaskImage:
              "radial-gradient(circle, black 38%, transparent 55%)",
          }}
        >
          <video
            src="/assets/globe/globe.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        {/* Name + divider + ID */}
        <div className="absolute inset-x-6" style={{ bottom: 22 }}>
          <p className="subtext-gradient text-center text-[15px] font-medium leading-[22px] tracking-[-0.02em]">
            {name}
          </p>
          <div
            className="mt-[10px]"
            style={{
              height: 1,
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.18) 50%, rgba(255,255,255,0) 100%)",
            }}
          />
          <p className="mt-[10px] text-center font-mono text-[11px] tracking-[0.16em] text-white/25">
            {id}
          </p>
        </div>
      </Card3D>
    </div>
  );
}

/** Person-inside-scan-frame icon, mirroring Figma node 561:25931.
 *  24×24 frame: four L-corner brackets at each corner + person glyph centered. */
function ScanIcon() {
  const BRACKET = 6.73;
  return (
    <div className="relative" style={{ width: 24, height: 24 }}>
      {/* Person figure — 18.068×18.068 centered */}
      <svg
        className="absolute"
        style={{
          left: (24 - 18.068) / 2,
          top: (24 - 18.068) / 2,
          width: 18.068,
          height: 18.068,
        }}
        viewBox="0 0 12.0452 12.0452"
        fill="currentColor"
      >
        <path d="M6.02262 6.02262C7.68637 6.02262 9.03393 4.67506 9.03393 3.01131C9.03393 1.34756 7.68637 0 6.02262 0C4.35887 0 3.01131 1.34756 3.01131 3.01131C3.01131 4.67506 4.35887 6.02262 6.02262 6.02262ZM6.02262 7.52827C4.01257 7.52827 0 8.53706 0 10.5396V12.0452H12.0452V10.5396C12.0452 8.53706 8.03267 7.52827 6.02262 7.52827Z" />
      </svg>
      {/* Four L-brackets at corners */}
      <Bracket style={{ top: 0, left: 0 }} />
      <Bracket style={{ top: 0, right: 0, transform: "rotate(90deg)" }} />
      <Bracket style={{ bottom: 0, right: 0, transform: "rotate(180deg)" }} />
      <Bracket style={{ bottom: 0, left: 0, transform: "rotate(-90deg)" }} />
      {/* keep constant to appease TS-unused */}
      <span className="hidden">{BRACKET}</span>
    </div>
  );
}

function Bracket({ style }: { style: React.CSSProperties }) {
  return (
    <svg
      className="absolute"
      style={{ width: 6.73, height: 6.73, ...style }}
      viewBox="0 0 7 7"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    >
      <path d="M6.5 1 L1 1 L1 6.5" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg
      width="18"
      height="24"
      viewBox="0 0 18 24"
      fill="none"
      className="text-[color:var(--ink)]/60"
    >
      <path
        d="M4 7l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 14l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
