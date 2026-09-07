"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import PlanetCluster from "./PlanetCluster";

/* Everything below the pedestal — Figma node 853:16315.
 *
 * Kept in its own file because the card section above it is a fixed stage
 * (disk, carousel, scan trace) while this is ordinary scrolling content.
 * They have almost nothing in common beyond sitting on the same screen.
 *
 * Blocks, in order:
 *   KYC status line        Inter Bold 11, uppercase
 *   KYC card               x30 w383, "Complete KYC" in #1b9e72
 *   Benefit card           x30 w380, plane artwork + ACTIVATE pill
 *   View all 24 benefits   Inter SemiBold 12, pill
 *   Divider
 *   Agents heading         grey with the last clause in black
 *   Agent grid             2 columns, six preference cards
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Green sampled from the Figma render — rgb(27,158,114). */
const GREEN = "#1b9e72";

/* Ring around each agent orb — Figma: 40×40, fill #FFFFFF at 10%, stroke
 * 1px OUTSIDE on a linear gradient, plus a glass effect.
 *
 * Drawn as an SVG circle rather than a CSS border, because CSS can't put a
 * gradient on a border — the usual workarounds (padding + background-clip,
 * or a masked pseudo-element) all fight the transparent 10% fill, which has
 * to let the card through. An SVG stroke does both cleanly.
 *
 * Stroke sits OUTSIDE the 40px box as Figma specifies, so the circle is
 * drawn at r 20 in a 42 viewBox — half the stroke width of headroom on
 * each side, otherwise it clips. */
const RING_STOPS = [
  { offset: "0%", color: "#14163A" },
  { offset: "50%", color: "#4E55E5" },
  { offset: "75%", color: "#AB4D8C" },
  { offset: "100%", color: "#EE874E" },
] as const;

function OrbRing({
  id,
  size = 40,
  children,
}: {
  /** Gradient ids must be unique per instance — a repeated id makes every
   *  later ring silently reuse the first one's gradient. */
  id: string;
  size?: number;
  children: React.ReactNode;
}) {
  const box = size + 2;
  return (
    <div
      className="relative"
      style={{ width: box, height: box, flexShrink: 0 }}
    >
      <svg
        className="absolute inset-0"
        width={box}
        height={box}
        viewBox={`0 0 ${box} ${box}`}
        fill="none"
      >
        <defs>
          <linearGradient
            id={`ring-${id}`}
            x1="0"
            y1="0"
            x2="1"
            y2="1"
          >
            {RING_STOPS.map((st) => (
              <stop
                key={st.offset}
                offset={st.offset}
                stopColor={st.color}
              />
            ))}
          </linearGradient>
        </defs>
        <circle
          cx={box / 2}
          cy={box / 2}
          r={size / 2}
          fill="rgba(255,255,255,0.1)"
          stroke={`url(#ring-${id})`}
          strokeWidth={1}
        />
      </svg>
      {/* Orb, pinned to the ring's exact centre. Positioned from 50/50 and
          pulled back by half its own size rather than laid out with
          inset+flex — the box is 42px against a 30px orb, so any
          inset-based centring leaves a fractional offset that shows up as
          the orb sitting slightly off in the ring. */}
      <div
        className="absolute"
        style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
      >
        {children}
      </div>
    </div>
  );
}

const CARD_SHELL = {
  background: "#ffffff",
  border: "1px solid #f4f5f6",
  borderRadius: 35.065,
  boxShadow: "0 4.675px 28px 0 rgba(0,0,0,0.05)",
} as const;

/* The six preference cards. Each carries its own orb and a wash tint —
 * in the design the tint is what distinguishes them at a glance, since
 * the copy is deliberately uniform in length and weight. */
const AGENTS = [
  {
    key: "flight",
    title: "flight",
    desc: "Updated 2 preferences basis 2 recent trips…",
    orb: "/assets/profile/p-orb1.png",
    tint: "rgba(214,214,222,0.45)",
  },
  {
    key: "stay",
    title: "Stay",
    desc: "Stays that match your style and benefits.",
    orb: "/assets/profile/p-orb8.png",
    tint: "rgba(206,232,214,0.5)",
  },
  {
    key: "airport",
    title: "airport\nlogistics",
    desc: "Every airport detail, already sorted.",
    orb: "/assets/profile/p-avatar.png",
    tint: "rgba(244,214,206,0.5)",
  },
  {
    key: "food",
    title: "food",
    desc: "added 2 cuisines for upcoming trip",
    orb: "/assets/profile/p-orb4.png",
    tint: "rgba(226,226,230,0.45)",
  },
  {
    key: "medical",
    title: "medical",
    desc: "Travel with important information ready.",
    orb: "/assets/profile/p-orb5.png",
    tint: "rgba(240,214,224,0.45)",
  },
  {
    key: "itinerary",
    title: "itinerary",
    desc: "Plans built around how you travel.",
    orb: "/assets/profile/p-orb6.png",
    tint: "rgba(214,222,240,0.45)",
  },
] as const;

export default function ProfileBody({ show }: { show: boolean }) {
  /* Triggered rather than time-delayed: the body waits for the card's
     scan lap to close, so the sequence reads as cause and effect — the
     card finishes checking itself, and its contents are what appears.
     A fixed delay would drift out of step the moment the lap timing
     changes.

     One shared cursor staggers the blocks in reading order, top to
     bottom, rather than dropping them all at once. */
  const t = (i: number) => i * 0.09;

  return (
    <div className="absolute left-0 right-0" style={{ top: 614 }}>
      {/* KYC status line */}
      <Reveal delay={t(0)} show={show}>
        <div className="flex items-center justify-center gap-[6px]">
          <Image
            src="/assets/profile/error.svg"
            alt=""
            width={14}
            height={14}
            style={{ width: 14, height: 14, display: "block" }}
          />
          <p
            className="whitespace-nowrap font-bold uppercase"
            style={{
              fontSize: 11,
              lineHeight: "14px",
              letterSpacing: "0.88px",
              color: "#8a8a90",
            }}
          >
            KYC expired on{" "}
            <span style={{ color: "#0b0b0b" }}>23 dec, 2027</span>
          </p>
        </div>
      </Reveal>

      {/* KYC card */}
      <Reveal delay={t(1)} show={show}>
        <div
          className="relative mx-auto mt-[20px] overflow-hidden"
          style={{ width: 383, height: 101, ...CARD_SHELL }}
        >
          <p
            className="absolute"
            style={{
              left: 27,
              top: 26,
              width: 191,
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              color: "#8a8a90",
            }}
          >
            Regain access to agents and benefits.
          </p>
          <p
            className="absolute font-medium"
            style={{
              left: 26,
              top: 62,
              fontSize: 14,
              lineHeight: "19px",
              letterSpacing: "-0.14px",
              color: GREEN,
            }}
          >
            Complete KYC
          </p>

          {/* Planet cluster (856:7647) — flush to the card's right edge,
              where its own r35 clip meets the card's corner. */}
          <div className="absolute" style={{ left: 235, top: 3.5 }}>
            <PlanetCluster />
          </div>
        </div>
      </Reveal>

      {/* Benefit card */}
      <Reveal delay={t(2)} show={show}>
        <div
          className="relative mx-auto mt-[24px] overflow-hidden"
          style={{ width: 380, height: 130, ...CARD_SHELL }}
        >
          <p
            className="absolute font-medium"
            style={{
              left: 26,
              top: 22,
              fontSize: 16,
              lineHeight: "20px",
              letterSpacing: "-0.32px",
              color: "#0b0b0b",
            }}
          >
            Flat 5% back on flights
          </p>
          <p
            className="absolute"
            style={{
              left: 26,
              top: 48,
              width: 186,
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              color: "#8a8a90",
            }}
          >
            Book flights in the app and get a flat 5% back in Atlys credits.
          </p>
          <ActivatePill left={26} top={90} />

          {/* Plane, cropped by the card's right edge. */}
          <div
            className="pointer-events-none absolute"
            style={{ left: 222, top: 18, width: 190, height: 96 }}
          >
            <Image
              src="/assets/profile/plane.png"
              alt=""
              width={190}
              height={96}
              unoptimized
              style={{
                width: 190,
                height: 96,
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </Reveal>

      {/* View all benefits */}
      <Reveal delay={t(3)} show={show}>
        <div className="mt-[22px] flex justify-center">
          <button
            type="button"
            className="font-semibold"
            style={{
              padding: "11px 20px",
              borderRadius: 999,
              background: "#ffffff",
              border: "1px solid #f0f1f2",
              boxShadow: "0 4px 18px 0 rgba(0,0,0,0.05)",
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              color: "#0b0b0b",
            }}
          >
            View all 24 benefits
          </button>
        </div>
      </Reveal>

      {/* Divider */}
      <Reveal delay={t(4)} show={show}>
        <div
          className="mx-auto mt-[26px]"
          style={{
            width: 380,
            height: 1,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.08), rgba(0,0,0,0))",
          }}
        />
      </Reveal>

      {/* Agents heading. The design greys the setup and blacks the payoff,
          so the eye lands on what the agents are actually learning. */}
      <Reveal delay={t(5)} show={show}>
        <p
          className="mx-auto mt-[30px] text-center font-medium"
          style={{
            width: 300,
            fontSize: 19,
            lineHeight: "26px",
            letterSpacing: "-0.6px",
            color: "#9a9aa2",
          }}
        >
          Our agents build an understanding of{" "}
          <span style={{ color: "#0b0b0b" }}>your travel preferences</span>
        </p>
      </Reveal>

      <Reveal delay={t(6)} show={show}>
        <p
          className="mt-[12px] text-center font-semibold"
          style={{
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.12px",
            color: "#a6a6ad",
          }}
        >
          updated on 2:00pm, 24 Jun
        </p>
      </Reveal>

      {/* Agent grid */}
      <div
        className="mx-auto mt-[24px] grid"
        style={{ width: 380, gridTemplateColumns: "1fr 1fr", gap: 14 }}
      >
        {AGENTS.map((a, i) => (
          <Reveal key={a.key} delay={t(7) + i * 0.06} show={show}>
            <AgentCard agent={a} index={i} />
          </Reveal>
        ))}
      </div>

      <div style={{ height: 60 }} />
    </div>
  );
}

/* Shared entrance. Every block rises the same short distance on the same
 * curve — varying it per block would make the section read as a pile of
 * separate animations rather than one page settling. */
function Reveal({
  delay,
  show,
  children,
}: {
  delay: number;
  show: boolean;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={show ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ delay: show ? delay : 0, duration: 0.65, ease: IN_EASE }}
    >
      {children}
    </motion.div>
  );
}

function ActivatePill({ left, top }: { left: number; top: number }) {
  return (
    <button
      type="button"
      className="absolute flex items-center gap-[4px] font-bold uppercase text-white"
      style={{
        left,
        top,
        padding: "7px 12px",
        borderRadius: 999,
        background: "#2b2b2e",
        fontSize: 11,
        lineHeight: "14px",
        letterSpacing: "0.88px",
      }}
    >
      Activate
    </button>
  );
}

function AgentCard({
  agent,
  index,
}: {
  agent: (typeof AGENTS)[number];
  index: number;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{
        height: 168,
        borderRadius: 28,
        background: "#ffffff",
        border: "1px solid #f4f5f6",
        boxShadow: "0 4px 22px 0 rgba(0,0,0,0.04)",
      }}
    >
      {/* Tint wash, bottom-left. Each card gets its own hue so the grid
          reads as six different agents rather than six identical shells. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(80% 60% at 18% 96%, ${agent.tint} 0%, rgba(255,255,255,0) 100%)`,
        }}
      />

      <p
        className="absolute whitespace-pre-line font-medium"
        style={{
          left: 18,
          top: 18,
          fontSize: 16,
          lineHeight: "20px",
          letterSpacing: "-0.32px",
          color: "#0b0b0b",
        }}
      >
        {agent.title}
      </p>

      {/* Orb, top-right, with the same "+" the KYC cluster uses. */}
      <div
        className="pointer-events-none absolute flex items-center gap-[3px]"
        style={{ right: 14, top: 14 }}
      >
        <span className="text-[13px] font-light text-[#b4b4ba]">+</span>
        {/* The float is on the whole unit, so the ring and its orb move
            together. Floating the orb INSIDE the ring is what had them
            sitting at different heights — each was at its own point in
            the cycle, so none of them lined up. */}
        <motion.div
          animate={{ y: [0, -2.5, 0] }}
          transition={{
            duration: 3.2 + index * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <OrbRing id={agent.key}>
            <Image
              src={agent.orb}
              alt=""
              width={30}
              height={30}
              unoptimized
              // No border-radius or object-fit crop — the orb art is its
              // own shape and clipping it to a circle changes the artwork.
              style={{ width: 30, height: 30, display: "block" }}
            />
          </OrbRing>
        </motion.div>
      </div>

      <p
        className="absolute"
        style={{
          left: 18,
          top: 84,
          width: 130,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#9a9aa2",
        }}
      >
        {agent.desc}
      </p>

      <ActivatePill left={18} top={128} />
    </div>
  );
}
