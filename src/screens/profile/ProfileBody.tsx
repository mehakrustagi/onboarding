"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import PlanetCluster from "./PlanetCluster";
import ActivatePill from "./ActivatePill";

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

/* Agent orb — Figma node 853:16548.
 *
 * A composite, not a single image: a planet sitting inside an open
 * gradient arc. I'd been drawing only the planet, which is why these
 * looked plain next to the design.
 *
 *   frame   40×40, r43.2 (fully round), fill #FFFFFF at 10%
 *   stroke  1px OUTSIDE, gradient #14163A → #4E55E5 → #AB4D8C → #EE874E
 *   planet  24×24, centred
 *
 * The arc is drawn with a dash gap rather than as a closed ring, which is
 * what the design shows — an orbit caught mid-sweep rather than a border
 * around an avatar.
 */
const RING_STOPS = [
  { offset: "0%", color: "#14163A" },
  { offset: "50%", color: "#4E55E5" },
  { offset: "75%", color: "#AB4D8C" },
  { offset: "100%", color: "#EE874E" },
] as const;

const RING_SIZE = 40;
/* Stroke sits OUTSIDE the frame, so the box carries a pixel of headroom
 * each side or the ring clips against its own bounds. */
const RING_BOX = RING_SIZE + 2;
const RING_R = RING_SIZE / 2;
const RING_C = 2 * Math.PI * RING_R;
/* Roughly five-sixths drawn, one-sixth open — enough gap to read as an
 * orbit with ends rather than a circle with a nick in it. */
const RING_ARC = RING_C * 0.84;

function AgentOrbMark({ id, index }: { id: string; index: number }) {
  return (
    // flexShrink guard: this sits inside a flex row, and without it the
    // ring gets squeezed horizontally into an oval — which is exactly
    // what was happening once the float wrapper became the flex child.
    <div
      className="relative"
      style={{ width: RING_BOX, height: RING_BOX, flexShrink: 0 }}
    >
      {/* Planet, centred. */}
      <Image
        src="/assets/profile/a-planet.png"
        alt=""
        width={24}
        height={24}
        unoptimized
        className="absolute"
        style={{
          width: 24,
          height: 24,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          display: "block",
        }}
      />

      {/* Orbit. Rotates slowly — each at its own speed and starting angle,
          so the grid never reads as six copies of one animation. */}
      <motion.svg
        className="absolute inset-0"
        width={RING_BOX}
        height={RING_BOX}
        viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
        fill="none"
        animate={{ rotate: 360 }}
        transition={{
          duration: 26 + index * 4,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{ rotate: index * 47 }}
      >
        <defs>
          <linearGradient id={`ring-${id}`} x1="0" y1="0" x2="1" y2="1">
            {RING_STOPS.map((st) => (
              <stop key={st.offset} offset={st.offset} stopColor={st.color} />
            ))}
          </linearGradient>
        </defs>
        <circle
          cx={RING_BOX / 2}
          cy={RING_BOX / 2}
          r={RING_R}
          fill="rgba(255,255,255,0.1)"
          stroke={`url(#ring-${id})`}
          strokeWidth={1}
          strokeLinecap="round"
          strokeDasharray={`${RING_ARC} ${RING_C - RING_ARC}`}
        />
      </motion.svg>
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
    tint: "rgba(214,214,222,0.45)",
  },
  {
    key: "stay",
    title: "Stay",
    desc: "Stays that match your style and benefits.",
    tint: "rgba(206,232,214,0.5)",
  },
  {
    key: "airport",
    title: "airport\nlogistics",
    desc: "Every airport detail, already sorted.",
    tint: "rgba(244,214,206,0.5)",
  },
  {
    key: "food",
    title: "food",
    desc: "added 2 cuisines for upcoming trip",
    tint: "rgba(226,226,230,0.45)",
  },
  {
    key: "medical",
    title: "medical",
    desc: "Travel with important information ready.",
    tint: "rgba(240,214,224,0.45)",
  },
  {
    key: "itinerary",
    title: "itinerary",
    desc: "Plans built around how you travel.",
    tint: "rgba(214,222,240,0.45)",
  },
] as const;

export default function ProfileBody({
  show,
  onViewBenefits,
}: {
  show: boolean;
  /* The benefits sheet has to cover the whole phone, and this block sits
     in an offset container 614px down — so the sheet is owned by
     ProfileScreen and this only asks for it. */
  onViewBenefits: () => void;
}) {
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

      {/* Benefit card — opens the same sheet as the CTA below it. The
          card IS a benefit, so tapping it is the natural way in; making
          only the CTA work would leave the more obvious target dead. */}
      <Reveal delay={t(2)} show={show}>
        <div
          role="button"
          tabIndex={0}
          onClick={onViewBenefits}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onViewBenefits();
            }
          }}
          className="relative mx-auto mt-[24px] cursor-pointer overflow-hidden"
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
          {/* stopPropagation: activating a benefit is a different action
              from browsing them, so the pill must not open the sheet. */}
          <div onClick={(e) => e.stopPropagation()}>
            <ActivatePill left={26} top={90} bolt={false} />
          </div>

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
            onClick={onViewBenefits}
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
        {/* Float on the whole unit so ring and planet move together —
            floating the planet inside the ring had them at different
            heights, since each was at its own point in the cycle. */}
        <motion.div
          style={{ flexShrink: 0 }}
          animate={{ y: [0, -2.5, 0] }}
          transition={{
            duration: 3.2 + index * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <AgentOrbMark id={agent.key} index={index} />
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

      <ActivatePill left={18} top={128} index={index} />
    </div>
  );
}
