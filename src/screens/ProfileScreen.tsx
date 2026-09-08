"use client";

import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ProfileBody from "./profile/ProfileBody";
import BenefitsSheet from "./profile/BenefitsSheet";
import CardBack from "./profile/CardBack";
import VerifyGate from "./profile/VerifyGate";
import ConnectScan from "./profile/ConnectScan";
import ProgramsConnected from "./profile/ProgramsConnected";
import ProgramDetail from "./profile/ProgramDetail";
import SettingsSheet from "./profile/SettingsSheet";
import DisconnectTerms from "./profile/DisconnectTerms";
import BenefitDetail, { type BenefitDetailContent } from "./profile/BenefitDetail";
import { FLIGHT_BENEFIT } from "./profile/BenefitDeck";
import AgentSheet from "./profile/AgentSheet";
import AirportSheet from "./profile/AirportSheet";
import { AGENT_SPECS } from "./profile/agentSpecs";
import DisconnectProgress from "./profile/DisconnectProgress";

/* Profile — Figma node 853:15690 (Dump_work).
 *
 * Block 1: the WorldPass card standing on a metallic pedestal, with the
 * next card peeking in from the right, and the first two content cards
 * below. Built on the same 440×965 shell as the rest of the prototype.
 *
 * Geometry read from the node:
 *   back / settings  50×50 at (30, 86) and (360, 86)
 *   card             252.325×350 at (94, 152), r30, black
 *   "atlys worldpass" 18.598px, -0.7439 tracking, 40% opacity
 *   "mohak n."       Inter Medium 18/22, -0.72, centred, y 415
 *   rule             211.628 wide at (114.35, 452)
 *   serial           20px, 1px tracking, y 467, dot-matrix face
 *   pedestal         354×88 at (43, 526), shadow 321×21 at (18, 567)
 *   next card        same, at (387, 152)
 *   content cards    380×154 at y 706, 380×144 at y 880, r35.065
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

const CARD_W = 252.325;
const CARD_H = 350;
const CARD_X = 94;
const CARD_Y = 152;
/* Spacing between cards in the carousel — Figma puts the next card at
 * x 387 against this one at 94. */
const CARD_GAP = 387 - CARD_X;

/* Perimeter of the card's rounded rect, for the scan trace's dash maths:
 * two straight runs per axis plus one full circle of corner arc. */
const TRACE_PERIMETER =
  2 * (CARD_W - 2 - 2 * 29) + 2 * (CARD_H - 2 - 2 * 29) + 2 * Math.PI * 29;
/* How much of the perimeter is lit at once — a little over half, so the
 * trace reads as a run of light rather than a moving dot. */
const TRACE_RUN = TRACE_PERIMETER * 0.55;

/* Entrance timing. The disk lands, the card arrives on it, everything
 * settles — then the green wakes 2s later. */
const DISK_DELAY = 0.05;
const CARD_DELAY = 0.55;
const GREEN_DELAY_MS = 2000 + CARD_DELAY * 1000;

/* One full lap of the outline: the trace leaves a point and returns to the
 * same point. A dash exactly one perimeter long, with the offset walked a
 * whole perimeter, is precisely one circuit — no more, no less. */
const TRACE_LAP_S = 2.6;
/* A short beat after the lap closes before the glow goes — letting the
 * head land and the card settle for a moment reads as completion, where
 * cutting on the exact frame reads as the animation being interrupted. */
const TRACE_HOLD_MS = 260;

/* Same terms copy the all-benefits sheet uses for an unspecified card. */
const PROFILE_BENEFIT_TERMS =
  "Enjoy 5% off on eligible flight bookings. The offer may apply only to selected airlines, routes, travel dates or fare types and is subject to availability. Additional terms, exclusions and booking conditions may apply.";

export default function ProfileScreen() {
  /* Staged entrance. The disk lands first and the card arrives onto it,
     so the pedestal reads as something the card is placed ON rather than
     a shape that appeared underneath it. The green then wakes up a beat
     after everything has settled — a status light that arrives WITH the
     card looks like part of the card, not like something switching on. */
  const [lit, setLit] = useState(false);
  const [bodyIn, setBodyIn] = useState(false);
  /* Benefits opens OVER this screen rather than replacing it — the design
     keeps the WorldPass cards visible behind its scrim. So it's a sibling
     of the stage, and closing it simply unmounts: the profile underneath
     was never torn down, so it returns exactly as it was. */
  const [benefitsOpen, setBenefitsOpen] = useState(false);
  /* The verification gate is parked — see below.
     The "+" on the card's back face opens the connect scan instead. */
  const [scanOpen, setScanOpen] = useState(false);
  /* The scan resolves into the programs screen. Both are open during the
     handover — the scan recedes in z while the programs screen comes
     forward, so one has to still be on screen as the other arrives. */
  const [programsOpen, setProgramsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  /* Which Travel preferences agent is open. Held as the key so the sheet
     can look its content up, and so closing keeps the content through the
     exit animation. */
  const [agentKey, setAgentKey] = useState<string | null>(null);
  /* Which loyalty card's detail is open (853:75340). Index rather than a
     flag, so the card stays rendered through the exit. */
  const [programDetail, setProgramDetail] = useState<number | null>(null);
  const [airportOpen, setAirportOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  /* The detail the profile's own benefit deck opens. Held as CONTENT
     rather than a flag so the panel keeps its copy through the exit. */
  const [cardDetail, setCardDetail] = useState<BenefitDetailContent | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [settingsReset, setSettingsReset] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setLit(true), GREEN_DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  /* The green is a one-shot, not a loop: it wakes, the trace runs a single
     lap of the outline, and when the head arrives back where it started
     the whole thing switches off. Holding the glow afterwards would make
     the lap look like decoration on a permanently-lit card, rather than
     the card being scanned once and going quiet. */
  useEffect(() => {
    if (!lit) return;
    const t = window.setTimeout(() => {
      setLit(false);
      // The body arrives on the same tick the green leaves, so the two
      // read as one handover rather than two unrelated events.
      setBodyIn(true);
    }, TRACE_LAP_S * 1000 + TRACE_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [lit]);

  return (
    // The phone is a plain frame. Scrolling lives on an inner layer so the
    // benefits sheet can sit OVER it as a sibling — a sheet inside the
    // scroller gets carried by the scroll, which is why the sticky version
    // of this didn't hold position.
    <div
      className="relative h-[965px] w-[440px] select-none overflow-hidden rounded-[44px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
      style={{ background: "#ffffff" }}
    >
      <div
        // Scrolls: the design runs 1781px against a 965px viewport. The
        // card stage stays put and the content below it moves, which is
        // the behaviour the design implies rather than a shrunken fit.
        className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
      {/* Card carousel. The second card is deliberately cut off by the
          screen edge — that's the affordance telling you there are more,
          so it isn't centred or scaled down. */}

      {/* Pedestal. Shadow first so the plinth sits on it.
          zIndex keeps both above the card's own drop shadow but below
          nothing else — the plinth must read as solid, not as a smudge. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          // Figma draws the 349×49 shadow overflowing a 321×21 box
          // (inset -66.67% -4.36%), so it's placed at its NATURAL size
          // centred on that box. Squashing it into 321×21 was what turned
          // it into a hard dark bar.
          left: 18 + (321 - 349) / 2,
          top: 567 + (21 - 49) / 2,
          width: 349,
          height: 49,
          zIndex: 1,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: DISK_DELAY + 0.06, duration: 0.6, ease: IN_EASE }}
      >
        {/* Progressive layer blur 0 → 14 (Figma effect on the ellipse),
            as two layers rather than four.

            The stacked-band trick works for backdrop-filter, where
            re-blurring the same backdrop is roughly idempotent. On a
            FOREGROUND element every band is another opaque copy, so four
            of them compounded into a dark bar — which is what was
            swallowing the plinth. Two layers at partial opacity, masked to
            opposite halves, give the ramp without the pile-up. */}
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.55,
            maskImage:
              "linear-gradient(to bottom, black 0%, black 34%, transparent 62%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, black 0%, black 34%, transparent 62%)",
          }}
        >
          <Image
            src="/assets/profile/pedestal-shadow.svg"
            alt=""
            width={349}
            height={49}
            style={{ width: 349, height: 49, display: "block" }}
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.5,
            filter: "blur(9px)",
            maskImage:
              "linear-gradient(to bottom, transparent 22%, black 58%, black 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 22%, black 58%, black 100%)",
          }}
        >
          <Image
            src="/assets/profile/pedestal-shadow.svg"
            alt=""
            width={349}
            height={49}
            style={{ width: 349, height: 49, display: "block" }}
          />
        </div>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute"
        style={{ left: 43, top: 526, width: 354, height: 88, zIndex: 2 }}
        initial={{ opacity: 0, y: 22, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: DISK_DELAY, duration: 0.7, ease: IN_EASE }}
      >
        <Image
          src="/assets/profile/pedestal-disk.png"
          alt=""
          width={354}
          height={88}
          priority
          // Unoptimized: the file was swapped in place once already and
          // Next's optimizer caches by URL, so a stale entry kept serving
          // the old broken export. It's a 96KB asset — nothing to gain
          // from the pipeline, and this can't go stale.
          unoptimized
          style={{ width: 354, height: 88, display: "block" }}
        />
      </motion.div>

      {/* Card carousel — arrives AFTER the disk, and drops onto it. The
          second card is deliberately cut off by the screen edge: that's
          the affordance telling you there are more. */}
      <WorldPassCard
        x={CARD_X}
        delay={CARD_DELAY}
        lit={lit}
        onConnect={() => setScanOpen(true)}
      />
      <WorldPassCard
        x={CARD_X + CARD_GAP}
        delay={CARD_DELAY + 0.1}
        lit={lit}
        interactive={false}
      />

      {/* Everything below the pedestal (853:16315) — see ProfileBody. */}
      <ProfileBody
        show={bodyIn}
        onViewBenefits={() => setBenefitsOpen(true)}
        onOpenBenefit={() => setVerifyOpen(true)}
        onOpenAgent={(k) => {
          // Airport logistics isn't a preference sheet — it opens the
          // supercar sequence, so it routes elsewhere.
          if (k === "airport") setAirportOpen(true);
          else if (AGENT_SPECS[k]) setAgentKey(k);
        }}
        onActivateBenefit={() =>
          setCardDetail({
            title: FLIGHT_BENEFIT.title,
            terms: PROFILE_BENEFIT_TERMS,
            art: FLIGHT_BENEFIT.art,
          })
        }
      />

      {/* Gives the scroll container the design's full height, so the
          absolutely-positioned body has room to scroll into. */}
        <div style={{ height: 1781 }} />
      </div>

      {/* Header row — a SIBLING of the scroller, not a child. Inside it,
          the back and settings controls scrolled away with the content,
          and a status bar that scrolls off is plainly wrong on a phone.
          Sitting outside, they hold still for the whole page. */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 20 }}>
      {/* Status bar — the design uses the iOS component; this is the
          9:41 / signal / wifi / battery row it renders as. */}
      <div
        className="absolute flex items-center justify-between"
        style={{ left: 30, right: 30, top: 18, height: 24 }}
      >
        <span className="text-[16px] font-semibold tracking-[-0.3px] text-black">
          9:41
        </span>
        <div className="flex items-center gap-1.5 text-black">
          <SignalBars />
          <WifiGlyph />
          <BatteryGlyph />
        </div>
      </div>

      {/* Back + settings */}
      <IconButton x={30} icon="/assets/profile/arrow-back.svg" label="Back" />
      <IconButton
        x={360}
        icon="/assets/profile/settings.svg"
        label="Settings"
        onClick={() => setSettingsOpen(true)}
      />

      </div>

      {/* All benefits (853:22811). A sibling of the scroller, not a child,
          so it covers the whole phone and holds still while its own list
          scrolls inside it. */}
      <BenefitsSheet
        open={benefitsOpen}
        onClose={() => setBenefitsOpen(false)}
      />

      {/* Verification gate (853:22081) — what tapping the benefit deck
          opens, with that card lifted onto the scrim. */}
      {/* Airport logistics — onboarding's supercar sequence, in a sheet. */}
      <AirportSheet open={airportOpen} onClose={() => setAirportOpen(false)} />

      {/* Agent preference sheet (853:63443 and siblings). */}
      <AgentSheet
        spec={agentKey ? (AGENT_SPECS[agentKey] ?? null) : null}
        open={agentKey !== null}
        onClose={() => setAgentKey(null)}
      />

      <VerifyGate open={verifyOpen} onClose={() => setVerifyOpen(false)} />

      {/* ACTIVATE on the profile's own deck opens the same detail panel
          every other benefit card uses (853:63181). */}
      <BenefitDetail benefit={cardDetail} onClose={() => setCardDetail(null)} />

      {/* Settings (853:18801) — a sheet over the profile, from the gear. */}
      <SettingsSheet
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onDisconnect={() => setDisconnectOpen(true)}
        resetSignal={settingsReset}
      />

      {/* Disconnect terms (853:74070). Full-bleed 440×965, so it is a
          sibling of the settings sheet rather than a page inside it. */}
      <DisconnectTerms
        open={disconnectOpen}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={() => setProgressOpen(true)}
      />

      {/* Disconnecting (853:74636). Runs itself, then hands back to the
          account centre — so completing it clears the terms page and sends
          the settings stack home. */}
      <DisconnectProgress
        open={progressOpen}
        onStop={() => setProgressOpen(false)}
        onComplete={() => {
          setProgressOpen(false);
          setDisconnectOpen(false);
          setSettingsReset((n) => n + 1);
        }}
      />

      {/* Connect scan (853:17974) — what the card's "+" opens. */}
      <ConnectScan
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onComplete={() => setProgramsOpen(true)}
        lifted={programsOpen}
      />

      {/* Programs connected (853:74983). Closing it returns all the way
          out, since the scan behind it has already been dismissed. */}
      <ProgramsConnected
        open={programsOpen}
        onClose={() => {
          setProgramsOpen(false);
          setScanOpen(false);
        }}
        onOpenProgram={(i) => setProgramDetail(i)}
      />

      {/* Tapping either face of a loyalty card (853:75340). */}
      <ProgramDetail
        index={programDetail}
        onClose={() => setProgramDetail(null)}
      />
    </div>
  );
}

/* Round glass button — back and settings share everything but the icon. */
function IconButton({
  x,
  icon,
  label,
  onClick,
}: {
  x: number;
  icon: string;
  label: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="pointer-events-auto absolute flex items-center justify-center"
      style={{
        left: x,
        top: 86,
        width: 50,
        height: 50,
        borderRadius: 54,
        // Figma has rgba(255,255,255,0.1) — invisible on a white page, so
        // it must be resolving against something. Using a light grey fill
        // of the same weight so the control actually reads.
        background: "rgba(0,0,0,0.04)",
      }}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: IN_EASE }}
    >
      <Image
        src={icon}
        alt=""
        width={24}
        height={24}
        style={{ width: 24, height: 24, display: "block" }}
      />
    </motion.button>
  );
}

/* The WorldPass card, standing on the pedestal.
 *
 * Three things give it depth, and they have to work together — any one on
 * its own reads as a flat rectangle with an effect on it:
 *
 *   1. A perspective tilt that tracks the cursor, so the card turns to
 *      face you and the parallax tells you it has thickness.
 *   2. A specular highlight that moves OPPOSITE the tilt. Light doesn't
 *      travel with the surface it's reflecting off — that counter-motion
 *      is most of what sells a glossy face.
 *   3. Content lifted on translateZ, so the text and hairline sit ABOVE
 *      the card face and shift against it as it turns.
 *
 * On top of that it breathes: a slow idle float and a lazy rotation that
 * never repeats, so the card is alive before you touch it.
 */
function WorldPassCard({
  x,
  delay,
  lit,
  interactive = true,
  onConnect,
}: {
  x: number;
  delay: number;
  /** Opens the verification gate from the back face's "+". */
  onConnect?: () => void;
  /** Whether the green has woken. Held off until 2s after the card has
   *  landed, so it reads as a status light switching on rather than as
   *  part of the card's own arrival. */
  lit: boolean;
  /** The peeking card is scenery — it floats, but doesn't take the
   *  cursor, so tilt never fights between the two. */
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  /* Which face is showing. Counted rather than toggled, so repeated
     swipes keep turning the card the same way instead of rocking it
     back and forth — a card you swipe twice should be back where it
     started, having gone all the way round. */
  const [turns, setTurns] = useState(0);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  // Soft spring: the card settles rather than snapping, which reads as
  // something with mass.
  const rxs = useSpring(rx, { stiffness: 150, damping: 20, mass: 0.9 });
  const rys = useSpring(ry, { stiffness: 150, damping: 20, mass: 0.9 });

  // Specular sweep. Runs against the tilt — a highlight that slid WITH the
  // card would read as a decal printed on it.
  const glossX = useTransform(rys, [-14, 14], ["82%", "18%"]);
  const glossY = useTransform(rxs, [-14, 14], ["18%", "82%"]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 26);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 26);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: CARD_Y, width: CARD_W, height: CARD_H }}
      initial={{ opacity: 0, y: 26, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.8, ease: IN_EASE }}
    >
      {/* Idle float. Periods are deliberately different so the drift and
          the sway never line up into an obvious loop — the card wanders
          instead of ticking. */}
      <motion.div
        className="h-full w-full"
        style={{ perspective: 1200 }}
        animate={{ y: [0, -7, 0, -3, 0], x: [0, 2.5, 0, -2.5, 0] }}
        transition={{
          y: { duration: 6.4, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 8.9, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {/* Flip plane. Swipe horizontally to turn the card.
            transformStyle must be preserve-3d the whole way down this
            chain, or the back face renders flat on top of the front
            instead of behind it. */}
        <motion.div
          className="h-full w-full"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: turns * 180 }}
          transition={{ type: "spring", stiffness: 60, damping: 14, mass: 1.1 }}
          drag={interactive ? "x" : false}
          dragSnapToOrigin
          dragElastic={0.16}
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            // Distance OR speed — a short flick should turn the card just
            // as a slow long drag does, which is how a physical card
            // behaves under a thumb.
            const far = Math.abs(info.offset.x) > 55;
            const fast = Math.abs(info.velocity.x) > 380;
            if (far || fast) {
              setTurns((t) => t + (info.offset.x < 0 ? 1 : -1));
            }
          }}
        >
        <motion.div
          ref={ref}
          onMouseMove={onMove}
          onMouseLeave={onLeave}
          className="relative h-full w-full"
          style={{
            borderRadius: 30,
            rotateX: rxs,
            rotateY: rys,
            transformStyle: "preserve-3d",
            willChange: "transform",
            // Stacked elevation — a tight contact shadow under a wide
            // soft one, so the card sits ON the pedestal instead of
            // hovering over a single blur.
            // Halved from 0.5/0.7/0.55 — the stack read as a much
            // heavier object than the card is.
            boxShadow: [
              "0 2px 6px -2px rgba(0,0,0,0.25)",
              "0 26px 50px -22px rgba(0,0,0,0.35)",
              "0 50px 90px -40px rgba(0,0,0,0.28)",
            ].join(", "),
          }}
        >
          {/* Idle rotation. Very small and on its own long period, so the
              card is never quite still even before the cursor arrives. */}
          {/* Front face. backfaceVisibility hidden is what stops it
              showing through mirrored once the card is past 90° — without
              it both faces paint at once and the card looks doubled. */}
          <motion.div
            className="absolute inset-0 overflow-hidden"
            style={{
              transformStyle: "preserve-3d",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              borderRadius: 30,
              background: "#000000",
            }}
            animate={{ rotateY: [-2.2, 2.2, -2.2], rotateX: [1.1, -1.1, 1.1] }}
            transition={{
              rotateY: { duration: 11, repeat: Infinity, ease: "easeInOut" },
              rotateX: { duration: 7.5, repeat: Infinity, ease: "easeInOut" },
            }}
          >
            {/* Globe — the same live video the onboarding card uses
                (Screen 5), not a flat export. */}
            <video
              src="/assets/globe/globe.mp4"
              autoPlay
              loop
              muted
              playsInline
              preload="auto"
              className="absolute inset-0"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />

            {/* rgba(255,255,255,0.05) sheen (853:15709) */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: "rgba(255,255,255,0.05)",
                borderRadius: 30,
                zIndex: 1,
              }}
            />

            {/* Status glow (853:15777). A jade bloom off the card's
                bottom edge, brightest at the base behind the serial.
                Sampled from the Figma render: the composite peaks at
                rgb(15,116,83) over the near-black face, which resolves to
                rgba(20,190,135) at ~0.58 alpha.

                Wakes 2s after the card has settled, then SPREADS — the
                radial's radii grow and draw back on their own period, so
                the pool of light widens across the card rather than
                sitting fixed. */}
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{ borderRadius: 30, zIndex: 2 }}
              initial={false}
              animate={
                lit
                  ? {
                      opacity: 1,
                      // RISES to the centre rather than pooling at the
                      // bottom edge. Figma (853:76904) centres it at 40%
                      // of the card with radii 94%×66% and stops
                      // #10B981 → rgba(8,130,89,0.5) → rgba(0,74,50,0);
                      // the first keyframe is that same light still down
                      // at the sill, so the run reads as one movement up.
                      background: [
                        "radial-gradient(94% 44% at 50% 104%, rgba(16,185,129,0.95) 0%, rgba(8,130,89,0.5) 50%, rgba(0,74,50,0) 100%)",
                        "radial-gradient(94% 66% at 50% 40%, rgba(16,185,129,1) 0%, rgba(8,130,89,0.5) 50%, rgba(0,74,50,0) 100%)",
                        "radial-gradient(88% 62% at 50% 43%, rgba(16,185,129,0.92) 0%, rgba(8,130,89,0.46) 50%, rgba(0,74,50,0) 100%)",
                        "radial-gradient(94% 66% at 50% 40%, rgba(16,185,129,1) 0%, rgba(8,130,89,0.5) 50%, rgba(0,74,50,0) 100%)",
                      ],
                    }
                  : { opacity: 0 }
              }
              transition={{
                // Slower out than in: a light that snaps off reads as a
                // bulb cutting, where fading reads as it powering down.
                opacity: { duration: lit ? 0.9 : 1.15, ease: IN_EASE },
                background: {
                  // The rise happens once, over the first leg; after that
                  // it only breathes. times weights that first step long
                  // enough to read as travel rather than a pop.
                  duration: 7.2,
                  times: [0, 0.32, 0.66, 1],
                  repeat: Infinity,
                  repeatDelay: 0,
                  ease: "easeInOut",
                },
              }}
            />

            {/* Status label (853:76905). Arrives with the light, not
                before it — the green IS the confirmation, and a label
                that lands first states the result before the card has
                shown it. */}
            <motion.div
              className="pointer-events-none absolute left-1/2 flex flex-col items-center gap-[4px] text-center"
              style={{ top: "50%", width: 88, x: "-50%", y: "-50%", zIndex: 3 }}
              initial={false}
              animate={{ opacity: lit ? 1 : 0, y: lit ? "-50%" : "-38%" }}
              transition={{
                duration: 0.7,
                ease: IN_EASE,
                delay: lit ? 0.85 : 0,
              }}
            >
              <span
                className="whitespace-nowrap font-bold uppercase"
                style={{
                  fontSize: 11,
                  lineHeight: "14px",
                  letterSpacing: "0.88px",
                  color: "#ffffff",
                }}
              >
                KYC COMPLETE
              </span>
              <span
                className="font-medium"
                style={{ fontSize: 11, lineHeight: "16px", color: "rgba(255,255,255,0.7)" }}
              >
                Active till Dec 27
              </span>
            </motion.div>

            {/* Scan trace. The same green runs the card's OUTLINE — one
                complete lap, leaving a point and returning to that same
                point, then dissolving.

                Drawn as an SVG stroke rather than a border, because a
                border can't be partially drawn. The dash is exactly one
                perimeter long and the offset is walked exactly one
                perimeter, which is precisely one circuit — no more, no
                less. Starting the offset at 0 and ending at -PERIMETER
                means the lit head departs the start point and arrives back
                at it as the run ends. */}
            <svg
              className="pointer-events-none absolute inset-0"
              width={CARD_W}
              height={CARD_H}
              viewBox={`0 0 ${CARD_W} ${CARD_H}`}
              fill="none"
              style={{ zIndex: 3, overflow: "visible" }}
            >
              <defs>
                <linearGradient
                  id={`trace-${x}`}
                  x1="0"
                  y1="1"
                  x2="0"
                  y2="0"
                >
                  <stop offset="0%" stopColor="rgba(20,190,135,0)" />
                  <stop offset="45%" stopColor="rgba(20,190,135,0.9)" />
                  <stop offset="100%" stopColor="rgba(150,255,214,1)" />
                </linearGradient>
              </defs>
              <motion.rect
                x={1}
                y={1}
                width={CARD_W - 2}
                height={CARD_H - 2}
                rx={29}
                stroke={`url(#trace-${x})`}
                strokeWidth={2}
                strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 6px rgba(20,190,135,0.75))" }}
                // A lit run chased by a gap the length of the rest of the
                // path, so only one segment is ever visible.
                strokeDasharray={`${TRACE_RUN} ${TRACE_PERIMETER}`}
                initial={false}
                animate={
                  lit
                    ? {
                        // Exactly one perimeter of travel = one full lap
                        // back to the starting point.
                        strokeDashoffset: [TRACE_RUN, TRACE_RUN - TRACE_PERIMETER],
                        opacity: [0, 1, 1, 0],
                      }
                    : { opacity: 0 }
                }
                transition={{
                  // One lap, once — no repeat.
                  strokeDashoffset: { duration: TRACE_LAP_S, ease: "linear" },
                  opacity: {
                    duration: TRACE_LAP_S,
                    // Fades in as the head leaves and out as it returns,
                    // so the lap never visibly snaps on or off.
                    times: [0, 0.1, 0.82, 1],
                    ease: "linear",
                  },
                }}
              />
            </svg>

            {/* Cursor-tracked specular. Kept wide and soft — a tight
                highlight on a near-black card reads as a bright dot
                rather than as a sheen across glass. */}
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: 30,
                zIndex: 3,
                backgroundImage: useTransform(
                  [glossX, glossY],
                  ([gx, gy]) =>
                    `radial-gradient(60% 52% at ${gx} ${gy}, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0) 74%)`,
                ),
                mixBlendMode: "screen",
              }}
            />

            {/* Edge light. A card catching light has a bright top rim and
                a dark underside; without it the silhouette dies against
                the page. */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: 30,
                zIndex: 4,
                boxShadow: [
                  "inset 0 1px 0 rgba(255,255,255,0.22)",
                  "inset 0 -1px 0 rgba(0,0,0,0.6)",
                  "inset 1px 0 0 rgba(255,255,255,0.06)",
                  "inset -1px 0 0 rgba(255,255,255,0.06)",
                ].join(", "),
              }}
            />

            {/* Content plane, lifted off the face so it parallaxes as the
                card turns — the give-away that this is a surface with
                depth rather than a picture of one. */}
            <div
              className="absolute inset-0"
              style={{ transform: "translateZ(22px)", zIndex: 5 }}
            >
              <div
                className="absolute left-1/2 flex -translate-x-1/2 items-center gap-[6px] whitespace-nowrap"
                style={{ top: 20, opacity: 0.4 }}
              >
                <Image
                  src="/assets/worldpass/plus-logo.svg"
                  alt=""
                  width={14}
                  height={14}
                  style={{ width: 14, height: 14, display: "block" }}
                />
                {/* Shared .worldpass-header class — same face, size and
                    white→#5b5b5b gradient the onboarding card uses. */}
                <span className="worldpass-header">atlys worldpass</span>
              </div>

              <p
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-medium text-white"
                style={{
                  top: 263,
                  fontSize: 18,
                  lineHeight: "22px",
                  letterSpacing: "-0.72px",
                }}
              >
                mohak n.
              </p>

              {/* Hairline under the name (853:15732) */}
              <div
                className="absolute"
                style={{
                  left: 20.35,
                  top: 300,
                  width: 211.628,
                  height: 1,
                  background:
                    "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.28), rgba(255,255,255,0))",
                }}
              />

              {/* Serial. Figma sets Enhanced Dot Digital-7 — a dot-matrix
                  face we don't have, so this falls back to the Doto
                  variable font already loaded in the layout. */}
              <p
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
                style={{
                  top: 315,
                  fontFamily: "var(--font-doto), ui-monospace, monospace",
                  fontSize: 20,
                  lineHeight: "19.535px",
                  letterSpacing: "1px",
                  backgroundImage: "linear-gradient(90deg, #1a1a1a, #808080)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                6190001
              </p>
            </div>
          </motion.div>

          {/* Back face, pre-turned 180° so it faces away at rest and comes
              round as the plane turns. */}
          <div
            className="absolute inset-0"
            style={{
              transform: "rotateY(180deg)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              borderRadius: 30,
              overflow: "hidden",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.06)",
            }}
          >
            <CardBack onConnect={onConnect} />
          </div>
        </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/* --- Status bar glyphs ------------------------------------------------- */

function SignalBars() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none">
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 4.5}
          y={9 - i * 3}
          width="3"
          height={3 + i * 3}
          rx="1"
          fill="currentColor"
        />
      ))}
    </svg>
  );
}

function WifiGlyph() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
      <path
        d="M8 10.5 5.8 8.1a3.2 3.2 0 0 1 4.4 0L8 10.5Zm-4-4.4L2.2 4.2a8.4 8.4 0 0 1 11.6 0L12 6.1a5.8 5.8 0 0 0-8 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BatteryGlyph() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="21"
        height="11"
        rx="3.5"
        stroke="currentColor"
        strokeOpacity="0.35"
      />
      <rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" />
      <path
        d="M23 4.5v3a1.8 1.8 0 0 0 0-3Z"
        fill="currentColor"
        fillOpacity="0.4"
      />
    </svg>
  );
}
