"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  motion,
  AnimatePresence,
  useTime,
  useTransform,
  useMotionValue,
  animate,
} from "framer-motion";
import FolderTicket, { FOLDER_PATH } from "./payment-v2/FolderTicket";
import AgentOrb from "@/components/AgentOrb";
import { PostPaymentStage } from "./PostPaymentScreen";
import PaymentCard from "./payment-v2/PaymentCard";

/* VARIANT SANDBOX — a full copy of PaymentTransitionFlow, forked so
 * alternative timing and treatment can be tried at /payment-transition-v2
 * without touching the version at /payment-transition. It owns its own
 * copy of FolderTicket (./payment-v2/) for the same reason.
 *
 * Deliberately duplicated rather than parameterised: the point is
 * unrestricted structural divergence. Expect the two to drift — when a
 * change here wins, port it back and delete this fork rather than
 * maintaining both.
 *
 * Payment transition flow — 17-frame Figma storyboard rendered as a
 * single seamless animation. Each Figma frame maps to a `phase` step;
 * transitions between phases are motion beats, not screen swaps.
 *
 * Canvas is the same 440×965 mobile shell we use for the onboarding
 * prototype. Every frame layers atop the previous state so the sequence
 * reads as one continuous stream. */

type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/* V2 timing. The orb beats and the pre-pull breathing room are GONE — they
 * put a ~2.2s dead stop between the last image landing and the collection
 * starting, which broke the one thing this version is about: a continuous
 * stream of images stacking into the folder.
 *
 * The four image beats are now evenly paced and the feed follows the last
 * one immediately, so the chain never stops moving from the first image to
 * the last one disappearing into the pocket. */
const PHASE_DURATION_MS: Record<Phase, number> = {
  1: 900, // setup
  2: 1000, // folder + caption settle
  3: 420, // image 1 enters from the top
  4: 420, // image 2
  5: 420, // image 3
  6: 420, // image 4 — feed continues straight out of this beat
  7: 2100, // chain slides into the folder WHILE the orbs float up
  8: 999_999, // dim lifts, payment card asks for payment — WAITS for a tap
  9: 999_999, // post-payment screen
};

const MAX_PHASE: Phase = 9;

// Named phase landmarks — the flow is retimed often enough that bare
// numbers scattered through the file get stale.
//
// The orbs share phase 7 with the feed rather than getting a beat of their
// own: the moment the last image lands, the chain starts emptying into the
// folder and the orbs rise at the same time. Giving them a separate phase
// would park the reel while they arrived, which is the dead stop that got
// cut out of this version in the first place.
const PHASE_FEED: Phase = 7;
const PHASE_ORBS: Phase = 7;
const PHASE_CARD: Phase = 8;
const PHASE_PAID: Phase = 9;

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Phase 8 runs as three separate beats rather than one simultaneous
 * change, so each one is legible:
 *   0.00s  collection scene fades out (0.7s)
 *   0.55s  dim overlay lifts (0.85s) — starts as the scene finishes
 *   2.35s  payment screen arrives, after a beat of clear air
 * The last gap matters most: brightening the page and asking for money are
 * two different statements, and running them together makes the payment
 * screen read as part of the transition instead of a new question.
 *
 * That last delay now lives with the card itself, in
 * ./payment-v2/PaymentCard — it moved there when the card was pulled out
 * so the post-payment route could render it too. */

/* The scene's exit, before the veil lifts. Rather than dissolving the
 * whole thing on one opacity, the folder performs a close: the filed cards
 * drop the last few px out of sight behind the barcode capsule, and only
 * then does the folder fall away off the bottom. Orbs and caption leave
 * alongside it. The order matters — a folder that slides off while its
 * contents are still visible above the pocket looks like it's leaking. */
const EXIT_CLOSE_S = 0.34; // cards tuck fully behind the capsule
const EXIT_DROP_DELAY = 0.3; // folder starts falling as the tuck lands
const EXIT_DROP_S = 0.62;

export default function PaymentTransitionFlowV2() {
  const [phase, setPhase] = useState<Phase>(1);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setPhase((p) => (p < MAX_PHASE ? ((p + 1) as Phase) : p));
    }, PHASE_DURATION_MS[phase]);
    return () => window.clearTimeout(t);
  }, [phase]);

  return (
    <div
      className="relative h-[965px] w-[440px] cursor-pointer select-none overflow-hidden rounded-[44px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
      style={{ background: "#eceaef" }}
      onClick={() => setPhase((p) => (p < MAX_PHASE ? ((p + 1) as Phase) : p))}
    >
      <PersistentLayer phase={phase} />

      {/* The collection scene leaves under its own steam — the folder
          closes and drops, the orbs fade out, the caption exits. It used
          to be one blanket opacity fade over the lot, which dissolved the
          whole thing in place and gave the folder no ending. */}
      <PhotoStack phase={phase} />
      <Frame3Elements
        visible={phase >= 3 && phase < PHASE_CARD}
        settled={phase >= PHASE_ORBS}
      />

      <DimOverlay hidden={phase >= PHASE_CARD} />

      {/* Stays mounted through the post-payment beat. It was gated on
          `phase === PHASE_CARD`, so tapping to pay unmounted the card and
          left the veil with nothing to sit over — which is exactly why the
          success state looked like a plain white page instead of an
          overlay. The whole point is that the screen you just acted on is
          still there, going quiet behind the frost. */}
      <PaymentCard
        visible={phase >= PHASE_CARD}
        onPay={() => setPhase(PHASE_PAID)}
      />

      {/* Post-payment beat. Mounted only once paid, so its pulse and
          launch start on arrival rather than having already run while the
          payment card was still up. */}
      {phase >= PHASE_PAID && <PostPaymentStage active />}
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Persistent layer — everything from Frame 1 that stays on screen throughout
 * the sequence: ripple orb, chat message, booking details, plane+flag icon,
 * back button, input bar. Ripple pulses subtly on every phase advance so the
 * background "breathes" with the story.
 * -------------------------------------------------------------------------*/
function PersistentLayer({ phase }: { phase: Phase }) {
  return (
    <>
      {/* Ripple orb background (620×620) — slight scale pulse on each new
          phase so the sequence has a subtle "breath" between beats. */}
      <motion.div
        className="pointer-events-none absolute"
        style={{
          width: 620,
          height: 620,
          left: 73.72 - 310,
          top: 576 - 310,
        }}
        animate={{ scale: 1 + (phase - 1) * 0.02 }}
        transition={{ duration: 1.4, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/ripple-orb.png"
          alt=""
          fill
          priority
          style={{ objectFit: "cover", opacity: 0.95 }}
        />
      </motion.div>

      {/* Chat message — clears out once the photo cards start arriving
          (phase 3) so the stack lands on a clean background instead of
          sitting over live copy. */}
      <motion.div
        className="absolute"
        style={{ left: 30, top: 130, width: 364, zIndex: 1 }}
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{
          opacity: phase >= 3 ? 0 : 1,
          y: 0,
          filter: "blur(0px)",
        }}
        transition={{ duration: 0.7, ease: IN_EASE }}
      >
        <p
          className="text-[20px] font-medium leading-[25px] text-[#808080]"
          style={{ letterSpacing: "-0.8px" }}
        >
          Ok Noted,{" "}
          <span className="text-black">I will book this date</span>
        </p>
        <p
          className="mt-[25px] text-[20px] font-medium leading-[25px] text-black"
          style={{ letterSpacing: "-0.8px" }}
        >
          Everything is set. Just review the details below and i&apos;ll take
          care of the rest.
        </p>
      </motion.div>

      {/* Booking details — fades with the chat message on phase 3. */}
      <motion.div
        className="absolute flex flex-col gap-[19px]"
        style={{ left: 30.64, top: 255, width: 349, zIndex: 1 }}
        initial={{ opacity: 0, y: 10, filter: "blur(6px)" }}
        animate={{
          opacity: phase >= 3 ? 0 : 1,
          y: 0,
          filter: "blur(0px)",
        }}
        transition={
          phase >= 3
            ? { duration: 0.7, ease: IN_EASE }
            : { delay: 0.24, duration: 0.7, ease: IN_EASE }
        }
      >
        <DetailRow label="Destination:" value="Switzerland" />
        <DetailRow label="Visa Type:" value="Tourist Visa" valueColor="#0e0e0e" />
        <DetailRow label="Travelers:" value="You, Malik and Siddhi" />
        <DetailRow label="Travel Date:" value="26 July 2026" />
        <DetailRow
          label="Visa Appointment:"
          value="Monday, 25 June at Mumbai BKC"
        />
      </motion.div>

      {/* Airplane + Switzerland flag icons */}
      <motion.div
        className="absolute"
        style={{ left: 30, top: 561, width: 67, height: 40, zIndex: 1 }}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.48, duration: 0.6, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/plane-flag.svg"
          alt=""
          width={67}
          height={40}
          style={{ width: 67, height: 40 }}
        />
      </motion.div>

      {/* Back button */}
      <motion.div
        className="absolute"
        style={{
          left: 30,
          top: 50,
          width: 50,
          height: 50,
          borderRadius: 40,
          border: "1px solid rgba(255,255,255,0.85)",
          background:
            "linear-gradient(133deg, rgba(255,255,255,0.4) 10%, rgba(255,255,255,0.1) 72%)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          boxShadow: "0 4px 30px -2px rgba(78,78,78,0.05)",
          zIndex: 3,
        }}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.12, duration: 0.5, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/back-arrow.svg"
          alt=""
          width={20}
          height={20}
          style={{
            position: "absolute",
            left: 15,
            top: 15,
            width: 20,
            height: 20,
          }}
        />
      </motion.div>

      {/* Input bar */}
      <motion.div
        className="absolute"
        style={{ left: 30, top: 810, width: 380, height: 125, zIndex: 3 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.36, duration: 0.7, ease: IN_EASE }}
      >
        <Image
          src="/assets/payment/input-bar-bg.svg"
          alt=""
          width={380}
          height={125}
          style={{ position: "absolute", inset: 0, width: 380, height: 125 }}
        />
        <p
          className="absolute text-[16px] font-medium text-[#e5e5e5] whitespace-nowrap"
          style={{
            top: 25,
            left: 30,
            lineHeight: "20px",
            letterSpacing: "-0.64px",
          }}
        >
          Ask anything
        </p>
        <div
          className="absolute rounded-[3px]"
          style={{
            left: 25,
            top: 23,
            width: 1.2,
            height: 25,
            background: "#0b0b0b",
          }}
        />
        <div
          className="absolute rounded-[15px] border border-[#f2f2f2] bg-white"
          style={{ left: 265, top: 60, width: 40, height: 40 }}
        >
          <Image
            src="/assets/payment/mic.svg"
            alt=""
            width={22}
            height={22}
            style={{ position: "absolute", left: 9, top: 9, width: 22, height: 22 }}
          />
        </div>
        <div
          className="absolute rounded-[15px] bg-white/60"
          style={{ left: 315, top: 60, width: 40, height: 40 }}
        >
          <Image
            src="/assets/payment/arrow-up.svg"
            alt=""
            width={22}
            height={22}
            style={{
              position: "absolute",
              left: 9,
              top: 9,
              width: 22,
              height: 22,
              transform: "rotate(90deg)",
            }}
          />
        </div>
      </motion.div>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Photo stack — manages ALL photos + folder + stars across phases 2-7. Each
 * new photo pops on top (spring scale-in from below), while previous photos
 * recede (progressive blur + slight opacity drop) so they read as a
 * background stack of "images the AI has already surfaced".
 *
 * Photo timeline:
 *   phase 2: photo1 arrives (Erebus, top-left)
 *   phase 3: photo1 holds; folder shifts up, caption arrives
 *   phase 4: photo2 pops (Erebus, offset right/down)
 *   phase 5: photo3 pops (small square, below-left)
 *   phase 6: photo4 not yet — but photo1 starts blurring back
 *   phase 7: photo4 pops (small square, offset right); photo2 also blurs
 * -------------------------------------------------------------------------*/

/* Stacked drop shadow — a tight contact shadow plus two progressively
 * wider, softer casts. One flat shadow reads as a sticker; the stack is
 * what sells a card sitting ABOVE the surface rather than printed on it.
 * The inset pair gives the card an edge: lit along the top, dark along
 * the bottom, as a physical object under a light from above would be. */
const CARD_SHADOW = [
  "0 1px 2px rgba(0,0,0,0.22)",
  "0 6px 12px -3px rgba(0,0,0,0.26)",
  "0 18px 34px -10px rgba(0,0,0,0.34)",
  "inset 0 1px 0 rgba(255,255,255,0.50)",
  "inset 0 -1px 0 rgba(0,0,0,0.28)",
].join(", ");

/* Card surface — the physical object itself, shared by the resting card
 * and the one streaking into the folder so both read identically.
 *
 * Three stacked pieces give it volume: a dark slab offset down-right for
 * paper thickness, the photo surface with layered shadow + rim, and a
 * diagonal specular sheen so light appears to graze across it. */
function CardSurface({
  src,
  radius,
  border,
}: {
  src: string;
  radius: number;
  border: boolean;
}) {
  return (
    <>
      {/* Thickness — the card's own edge, peeking out down-right. */}
      <div
        className="absolute inset-0"
        style={{
          borderRadius: radius,
          background: "linear-gradient(160deg, #6c6c72 0%, #47474c 100%)",
          transform: "translate(2px, 3px)",
        }}
      />

      {/* Photo face */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{
          borderRadius: radius,
          border: border ? "1.095px solid #8d8d8d" : "none",
          boxShadow: CARD_SHADOW,
        }}
      >
        <Image src={src} alt="" fill style={{ objectFit: "cover" }} />

        {/* Specular sheen — bright at the top-left corner falling to a
            faint shade bottom-right, on overlay so it rides the photo's
            own tones instead of washing them out. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(128deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.06) 26%, rgba(255,255,255,0) 46%, rgba(0,0,0,0.12) 100%)",
            mixBlendMode: "overlay",
          }}
        />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Vertical reel — the V2 idea. Instead of four photos scattered across the
 * canvas, every image lands in ONE centred vertical strip, like a film reel
 * being fed frame by frame.
 *
 * The strip stacks upward, so each new frame waits one pitch above the last,
 * off the top of the screen; translating the whole chain DOWN one pitch per
 * arrival brings it in from the top and carries the older frames toward the
 * folder. The feed phase is that same descent continued until every frame
 * has been swallowed — one unbroken movement, no pause between the last
 * image landing and the collection starting.
 *
 * Uniform slot size is what makes it read as a reel rather than a column of
 * unrelated pictures — every frame is the same width and height with the
 * photo cropped to fill, exactly like sprocketed film.
 * -------------------------------------------------------------------------*/
// Geometry read from Figma node 71:24871 ("Frame 1"), the reel container:
// x=101 y=137, 234×626, holding four 234×143 slots at y 0/161/322/483.
const REEL_LEFT = 101;
const REEL_TOP = 137;
const REEL_W = 234;
const REEL_SLOT_H = 143;
const REEL_PITCH = 161; // 143 slot + 18 gap
const REEL_FRAME_COUNT = 4;
// The strip is clipped at the folder's lower body, so a frame that travels
// past this line is gone — swallowed by the pocket rather than fading out
// in open space. Everything between the folder's top edge (613) and here
// still shows THROUGH the frosted shell on its way in.
const REEL_CLIP_BOTTOM = 770;
// Folder body placement + size (Figma node 70:19890), needed to hand the
// strip from canvas space into the folder's local space.
const FOLDER_X = 87;
const FOLDER_TOP_Y = 613;
const FOLDER_BODY_W = 271;
const FOLDER_BODY_H = 162;
// FOLDER_PATH's top edge is NOT flat at 0: after the top-left tab it steps
// down to y=9.072 and runs across at that height. So the inner layer only
// starts painting 9px into the folder, and butting the outer layer's clip
// against y=613 left a 9px band where neither layer drew — a hairline
// straight across the image. The layers overlap by that much instead.
const FOLDER_BODY_TOP_INSET = 9.072;
// Barcode capsule sits 91px down the folder body (Figma 70:19891 at y=704).
// A frame is "filed" once it drops past this line — the pocket has it.
const FOLDER_CAPSULE_TOP_Y = 704;
// Feed duration, shared by the chain's travel and the filed stack's timing
// so the two can never drift apart.
const REEL_FEED_S = 1.15;
// How far the strip must travel for its TOPMOST frame to clear the clip —
// i.e. for the whole reel to be swallowed. The topmost frame starts one
// full strip-length above the anchor, so that distance is added in.
const REEL_FEED_DISTANCE =
  REEL_CLIP_BOTTOM -
  REEL_TOP +
  (REEL_FRAME_COUNT - 1) * REEL_PITCH +
  20;
// One advance takes exactly one phase beat, so the chain reaches its next
// resting point precisely as the following beat fires. Shorter and the
// strip sits still waiting for it; longer and it gets cut off mid-travel.
const REEL_BEAT_S = PHASE_DURATION_MS[3] / 1000;

const REEL_FRAMES = [
  { src: "/assets/payment/photo-card.png", arrival: 3, border: false },
  { src: "/assets/payment/photo-card.png", arrival: 4, border: false },
  { src: "/assets/payment/photo-card.png", arrival: 5, border: false },
  { src: "/assets/payment/photo-card.png", arrival: 6, border: false },
] as const;

/* The strip itself — frames, spine and links riding one shared `y`.
 *
 * Rendered TWICE, once per layer (see PhotoReel), with the anchor shifted
 * into that layer's coordinate space. Both copies take the same chainY and
 * the same transition, so they move as a single strip that happens to be
 * drawn in two places: above the folder by the outer layer, and inside the
 * pocket by the inner one. A frame crossing the folder's top edge leaves
 * one and enters the other on the same pixel. */
function ReelChain({
  arrivedCount,
  suckIn,
  anchorX,
  anchorY,
}: {
  arrivedCount: number;
  suckIn: boolean;
  anchorX: number;
  anchorY: number;
}) {
  // The strip's base layout is FIXED and stacks UPWARD — frame i lives at
  // -i * REEL_PITCH — so each new frame is placed above the last, off the
  // top of the screen. The chain is then moved purely by translating the
  // whole thing DOWN one pitch per arrival: 0 → 161 → 322 → 483.
  const chainY = (arrivedCount - 1) * REEL_PITCH;

  return (
    <motion.div
      className="absolute"
      style={{
        left: anchorX,
        top: anchorY,
        width: REEL_W,
        height: REEL_FRAME_COUNT * REEL_PITCH,
      }}
      initial={{ y: chainY - REEL_PITCH }}
      // ONE animated property for the whole chain, and a transform at
      // that — so an arrival is a single composited slide rather than a
      // re-layout of every frame, spine and link at once.
      animate={{ y: suckIn ? REEL_FEED_DISTANCE : chainY }}
      transition={
        suckIn
          ? {
              // Non-zero starting slope (0.12/0.1 = 1.2×) so the feed
              // picks up from the speed the chain was ALREADY moving at.
              // An ease starting at zero velocity would stall the strip
              // for a beat right at the handover.
              duration: REEL_FEED_S,
              ease: [0.1, 0.12, 0.65, 1],
            }
          : {
              // LINEAR, and exactly one beat long. A spring — even a
              // gentle one — is overdamped by nature: it lunges, then
              // crawls asymptotically into its target, so every advance
              // decelerated to a near-stop before the next image landed.
              // That deceleration WAS the pause. A conveyor moves at
              // constant speed, so the strip does too.
              duration: REEL_BEAT_S,
              ease: "linear",
            }
      }
    >
      {/* No spine or link bars. They were drawn in white and sat in the
          18px gaps, which is what read as bright breaks chopping the strip
          apart — the opposite of tying it together. The frames are already
          bound by moving as one chain on a single shared transform, so the
          tie is carried by motion rather than by marks between them. */}

      {REEL_FRAMES.slice(0, arrivedCount).map((frame, i) => (
        <ReelFrame key={i} src={frame.src} border={frame.border} index={i} />
      ))}
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
 * Balloon orbs — they arrive the moment the last image lands, rising into
 * frame from below like released balloons, then settle into the same
 * continuous sine drift the Screen 5 queue uses (`QueueOrb`): one shared
 * clock, a per-orb phase offset so no two are ever at the same point in
 * their cycle, and a small x sway a quarter-period behind the y bob so each
 * orb traces a lazy figure rather than bouncing straight up and down.
 * -------------------------------------------------------------------------*/
/* Team perks is Screen 4's "welcome" state, and its float is NOT the same
 * as Screen 5's queue drift — amplitude 11 vs 12, phase step 0.9 vs 1.2,
 * and crucially team perks has NO horizontal sway at all: it's a pure
 * vertical bob. These are Screen 4's numbers verbatim (see its OrbNode `y`
 * transform). */
const ORB_WAVE_SPEED = 0.0022; // rad/ms
const ORB_WAVE_AMP = 11;
const ORB_PHASE_STEP = 0.9;
// Screen 4's welcome transition: 0.8s on cubic-bezier(0.45, 0, 0.25, 1).
const ORB_SETTLE_EASE = [0.45, 0, 0.25, 1] as const;
const ORB_SETTLE_DURATION = 0.8;

/* Resting formation, read from Figma node 72:25061: four 30px orbs in a
 * row just above the folder (top 613), spaced exactly 41.25px apart in x
 * with a scattered y so the line reads as hand-placed rather than ruled.
 *
 * `scatter` is where each orb ENTERS — flung wide and high above its slot.
 * They hold there for a beat, then converge into the formation, which is
 * the "arrive scattered, then align" the storyboard shows. */
// Onboarding's floating orbs (Screen 5's QueueOrb, HANDOFF_SIZE) render at
// 48, so these do too — same object, same size, same drift.
const ORB_SIZE = 48;

// Figma drew the formation with 30px orbs on a 41.25px pitch. At 48 they'd
// overlap by 7px, so the whole arrangement scales with the orb: every
// position is pushed out from the formation's centre by 48/30, which keeps
// the design's spacing and its scattered y RELATIVE to orb size rather than
// in absolute pixels. Same formation, drawn at a bigger scale.
const FIGMA_ORB_SIZE = 30;
const FORMATION_SCALE = ORB_SIZE / FIGMA_ORB_SIZE;

// Centres of the four orbs as drawn in node 72:25061 (left/top + 15).
const FIGMA_ORB_CENTRES = [
  { cx: 159, cy: 558, blob: "/assets/orb/blob-forex.png" },
  { cx: 200.25, cy: 538, blob: "/assets/orb/blob-flight.png" },
  { cx: 241.5, cy: 548, blob: "/assets/orb/blob-safety.png" },
  { cx: 282.75, cy: 553, blob: "/assets/orb/ellipse.png" },
] as const;

const FORMATION_CX =
  FIGMA_ORB_CENTRES.reduce((a, o) => a + o.cx, 0) / FIGMA_ORB_CENTRES.length;
const FORMATION_CY =
  FIGMA_ORB_CENTRES.reduce((a, o) => a + o.cy, 0) / FIGMA_ORB_CENTRES.length;

// Where each orb ENTERS — flung wide and high above its slot. They hold
// there for a beat, then converge into the formation.
const ORB_SCATTER = [
  { x: -58, y: -96 },
  { x: 34, y: -132 },
  { x: -26, y: -74 },
  { x: 62, y: -110 },
] as const;

const BALLOON_ORBS = FIGMA_ORB_CENTRES.map((o, i) => ({
  x: FORMATION_CX + (o.cx - FORMATION_CX) * FORMATION_SCALE - ORB_SIZE / 2,
  y: FORMATION_CY + (o.cy - FORMATION_CY) * FORMATION_SCALE - ORB_SIZE / 2,
  blob: o.blob,
  scatter: ORB_SCATTER[i],
}));

function BalloonOrb({
  x,
  y,
  blob,
  scatter,
  orbIndex,
  visible,
}: {
  x: number;
  y: number;
  blob: string;
  scatter: { x: number; y: number };
  orbIndex: number;
  visible: boolean;
}) {
  const time = useTime();
  const phaseOffset = orbIndex * ORB_PHASE_STEP;

  // Settle progress, mirroring Screen 4's `welcomeProgress`. Screen 4
  // multiplies the bob by it (`bob = sin(...) * amplitude * w`) so the float
  // RAMPS IN as the orbs arrive instead of snapping to full swing the
  // instant they mount.
  const settle = useMotionValue(0);
  useEffect(() => {
    if (!visible) return;
    const controls = animate(settle, 1, {
      duration: ORB_SETTLE_DURATION,
      ease: ORB_SETTLE_EASE as unknown as [number, number, number, number],
      delay: 0.15,
    });
    return () => controls.stop();
  }, [visible, settle]);

  // Pure vertical bob with a per-orb phase offset, so the four together
  // read as a travelling wave.
  const waveY = useTransform([time, settle], (vals: number[]) => {
    const [t, w] = vals;
    return Math.sin(t * ORB_WAVE_SPEED + phaseOffset) * ORB_WAVE_AMP * w;
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute"
          style={{
            left: x,
            top: y,
            width: ORB_SIZE,
            height: ORB_SIZE,
            // Above the dim (5) and the folder (10) — orbs float in FRONT
            // of the whole scene, the way a balloon in the room would.
            zIndex: 14,
            y: waveY,
          }}
        >
          <motion.div
            className="h-full w-full"
            // Surfaces out of the background rather than flying in: it
            // starts small, soft-focus and transparent at its scattered
            // position, then resolves — coming into focus as it drifts to
            // its slot. The blur is what sells "emerging from behind the
            // scene"; without it a small transparent circle just reads as
            // a thing that faded in.
            initial={{
              opacity: 0,
              scale: 0.55,
              filter: "blur(10px)",
              x: scatter.x,
              y: scatter.y,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              filter: "blur(0px)",
              x: 0,
              y: 0,
            }}
            exit={{ opacity: 0, scale: 0.85, filter: "blur(4px)" }}
            // Screen 4's welcome transition: every property on ONE 0.8s
            // cubic-bezier(0.45, 0, 0.25, 1). Team perks lerps cx/cy/size
            // together off a single progress value, so nothing lags
            // anything else — unlike Screen 5's queue, where x runs a
            // separate spring. Matching that here means the formation
            // assembles as one move.
            transition={{
              duration: ORB_SETTLE_DURATION,
              ease: ORB_SETTLE_EASE,
              // Staggered so they surface one after another rather than
              // the whole formation materialising at once.
              delay: 0.15 + orbIndex * 0.12,
              // Opacity and focus resolve over the FULL travel, not early —
              // an orb that reaches full opacity in the first third has
              // already "arrived" and the rest of its drift looks like
              // repositioning rather than emergence.
              opacity: {
                duration: ORB_SETTLE_DURATION,
                ease: "linear",
                delay: 0.15 + orbIndex * 0.12,
              },
              filter: {
                duration: ORB_SETTLE_DURATION * 0.9,
                ease: ORB_SETTLE_EASE,
                delay: 0.15 + orbIndex * 0.12,
              },
            }}
          >
            <AgentOrb size={ORB_SIZE} blob={blob} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* Outer layer — the strip ABOVE the folder, on its approach. Clipped at
 * the folder's top edge, where the inner layer takes over. */
function PhotoReel({ phase, suckIn }: { phase: Phase; suckIn: boolean }) {
  const arrivedCount = REEL_FRAMES.filter((f) => phase >= f.arrival).length;
  if (arrivedCount === 0) return null;

  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={{
        left: 0,
        top: 0,
        width: 440,
        // Stops dead on the folder's top edge. Past this line the strip is
        // the inner layer's business, so nothing can spill down the
        // outside of the folder.
        // Overlaps the folder's top edge by the body inset (+1 for
        // rounding), so the two layers cross over rather than butt
        // together. Safe to spill: the folder paints at z 10, above this,
        // so anything drawn under it is covered by the folder itself.
        height: FOLDER_TOP_Y + FOLDER_BODY_TOP_INSET + 1,
        // ABOVE the dim overlay (z 5), below the folder (z 10). This layer
        // is clipped to the region above the folder so it never overlaps
        // it, which means it no longer needs to sit underneath — and
        // sitting underneath meant the strip was dimmed on approach and
        // then jumped to full brightness the moment it entered the
        // pocket, since the in-folder half rides inside the folder's own
        // stacking context.
        zIndex: 6,
      }}
    >
      <ReelChain
        arrivedCount={arrivedCount}
        suckIn={suckIn}
        anchorX={REEL_LEFT}
        anchorY={REEL_TOP}
      />
    </div>
  );
}

/* Filed stack — what the folder KEEPS. Each frame that the pocket swallows
 * leaves a card behind here, so the folder fills as the reel empties
 * instead of consuming four images and sitting there empty.
 *
 * Timing is derived from the feed rather than guessed: frame i is swallowed
 * when the chain has travelled far enough to push it past the capsule's top
 * edge, which happens at chain offset 567 + i * 161. Expressed as a
 * fraction of the feed's total travel, that lands each card at the moment
 * its frame actually disappears — so a card never appears in the stack
 * before the reel has given it up.
 *
 * Cards are stepped 6px DOWN as they pile on, so each earlier card keeps a
 * sliver of its top edge visible above the one that landed after it. That
 * sliver is what makes it read as a stack rather than one card. */
const FILED_CARD_H = 128;
// Sits well below the folder's own top edge (9.07) so the ghost fan above
// it still lands INSIDE the pocket. At 30 the deepest ghosts were poking
// out the top of the folder against the dark page.
const FILED_TOP = 44;
const FILED_STEP = 6;
// Ghost edges behind the real cards. Four filed photos read as four
// photos; a pile reads as a pile because of all the edges you CAN'T
// individually make out behind the top one. Each ghost sits a little
// higher and a little narrower than the one in front, which is what a
// stack looks like receding away from you.
// How far the pile drops to clear the capsule's top edge (91) — the cards
// sit at 44-62, so this puts every one of them fully behind the pocket.
const FILED_TUCK = 56;
const GHOST_COUNT = 5;
const GHOST_STEP = 4; // vertical rise per ghost
const GHOST_INSET = 5; // horizontal narrowing per ghost, per side

function filedDelay(index: number) {
  const chainStart = (REEL_FRAME_COUNT - 1) * REEL_PITCH; // 483
  const swallowAt = FOLDER_CAPSULE_TOP_Y - REEL_TOP + index * REEL_PITCH;
  const p = (swallowAt - chainStart) / (REEL_FEED_DISTANCE - chainStart);
  return Math.max(0, p) * REEL_FEED_S;
}

function FiledStack({
  visible,
  closing,
}: {
  visible: boolean;
  closing: boolean;
}) {
  return (
    /* Clipped to the folder silhouette, exactly like the in-pocket reel
       layer. Without this the stack is just a sibling inside middleContent
       with no clip of its own, and the ghost fan spills straight out the
       top of the folder. */
    <div
      className="pointer-events-none absolute"
      style={{
        left: 0,
        top: 0,
        width: FOLDER_BODY_W,
        height: FOLDER_BODY_H,
        clipPath: `path("${FOLDER_PATH}")`,
      }}
    >
      {/* Ghost edges FIRST so they sit behind the real cards. They fade in
          with the first arrival — the folder shouldn't look deep before
          anything has gone into it. */}
      {Array.from({ length: GHOST_COUNT }).map((_, k) => {
        const inset = (k + 1) * GHOST_INSET;
        return (
          <motion.div
            key={`ghost-${k}`}
            className="pointer-events-none absolute"
            style={{
              left: REEL_LEFT - FOLDER_X + inset,
              top: FILED_TOP - (k + 1) * GHOST_STEP,
              width: REEL_W - inset * 2,
              height: FILED_CARD_H,
              borderRadius: 8,
              // Fading toward the folder's own tone as they recede, so the
              // pile dissolves into the pocket instead of ending on a
              // hard-edged last card.
              background: `rgba(226,226,231,${Math.max(0, 0.38 - k * 0.06)})`,
              boxShadow:
                "0 -1px 0 rgba(255,255,255,0.22), 0 2px 6px rgba(0,0,0,0.12)",
            }}
            initial={{ opacity: 0, y: -12 }}
            animate={
              closing
                ? { opacity: 1, y: FILED_TUCK }
                : visible
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: -12 }
            }
            transition={
              closing
                ? { duration: EXIT_CLOSE_S, ease: [0.5, 0, 0.75, 0.4] }
                : {
                    // Deepest ghosts settle first, so the pile builds from
                    // the back forward as the cards land on top of it.
                    delay: visible
                      ? filedDelay(0) + (GHOST_COUNT - k) * 0.045
                      : 0,
                    duration: 0.5,
                    ease: IN_EASE,
                  }
            }
          />
        );
      })}

      {REEL_FRAMES.map((frame, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute overflow-hidden"
          style={{
            left: REEL_LEFT - FOLDER_X,
            top: FILED_TOP + i * FILED_STEP,
            width: REEL_W,
            height: FILED_CARD_H,
            borderRadius: 8,
            boxShadow: "0 6px 16px rgba(0,0,0,0.28)",
          }}
          // No rotation. Cards drop straight down into the pocket the way
          // they travelled — a tilt would fight the strictly vertical axis
          // everything else in this version moves on.
          initial={{ opacity: 0, y: -26 }}
          animate={
            closing
              ? { opacity: 1, y: FILED_TUCK }
              : visible
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: -26 }
          }
          transition={
            closing
              ? {
                  // Straight down and out of sight — no spring. A bounce
                  // here would read as the cards settling INTO view at the
                  // exact moment they're supposed to be disappearing.
                  duration: EXIT_CLOSE_S,
                  delay: i * 0.03,
                  ease: [0.5, 0, 0.75, 0.4],
                }
              : {
                  delay: visible ? filedDelay(i) : 0,
                  type: "spring",
                  stiffness: 340,
                  damping: 26,
                  mass: 0.8,
                }
          }
        >
          <Image
            src={frame.src}
            alt=""
            fill
            style={{ objectFit: "cover", borderRadius: 8 }}
          />
        </motion.div>
      ))}
    </div>
  );
}

/* Inner layer — the strip INSIDE the folder, handed to FolderTicket's
 * middleContent slot so it renders above the backside and below the
 * barcode capsule. That's what puts the images in the pocket rather than
 * behind the whole folder.
 *
 * Clipped to the folder's own silhouette (the exact path the backside SVG
 * is drawn from), so an image can never bleed past the folder's rounded
 * edges or its top-left tab notch. */
function PhotoReelInFolder({
  phase,
  suckIn,
}: {
  phase: Phase;
  suckIn: boolean;
}) {
  const arrivedCount = REEL_FRAMES.filter((f) => phase >= f.arrival).length;
  if (arrivedCount === 0) return null;

  return (
    <div
      className="pointer-events-none absolute"
      style={{
        left: 0,
        top: 0,
        width: FOLDER_BODY_W,
        height: FOLDER_BODY_H,
        clipPath: `path("${FOLDER_PATH}")`,
      }}
    >
      <ReelChain
        arrivedCount={arrivedCount}
        suckIn={suckIn}
        // Same strip, re-anchored from canvas space into the folder's
        // local space — so the two layers line up to the pixel.
        anchorX={REEL_LEFT - FOLDER_X}
        anchorY={REEL_TOP - FOLDER_TOP_Y}
      />
    </div>
  );
}

/* One frame of the reel. Its slot in the strip is FIXED — the chain's own
 * translation is what moves it — so a frame never animates a layout
 * property. On arrival it drops in from ABOVE the clip window, travelling
 * the same direction the chain is already going, so it enters the screen
 * from the top in motion rather than popping into place. */
function ReelFrame({
  src,
  border,
  index,
}: {
  src: string;
  border: boolean;
  index: number;
}) {
  return (
    <motion.div
      className="absolute"
      style={{
        left: 0,
        // Strip stacks upward: each new frame sits one pitch higher, off
        // the top of the screen, waiting to be carried down.
        top: -index * REEL_PITCH,
        width: REEL_W,
        height: REEL_SLOT_H,
      }}
      // NO entrance movement of its own. When a frame mounts, the chain is
      // simultaneously advancing a pitch, which carries it from just above
      // the clip edge down into view at exactly the strip's speed. Giving
      // it a second, independent easing on top was what made an arriving
      // image drift out of step with the chain carrying it.
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ opacity: { duration: 0.22, ease: "linear" } }}
    >
      <CardSurface src={src} radius={10} border={border} />
    </motion.div>
  );
}

function PhotoStack({ phase }: { phase: Phase }) {
  const folderY = phase >= 3 ? 613 : 655;
  const suckIn = phase >= PHASE_FEED;
  const exiting = phase >= PHASE_CARD;
  return (
    <>
      {/* Photos arrive as ONE vertical reel rather than a scattered
          stack — see PhotoReel. On phase 12 the whole reel feeds into
          the folder as a single strip. */}
      <PhotoReel phase={phase} suckIn={suckIn} />

      {/* Balloon orbs — released as the last image lands. They arrive
          scattered above the folder, converge into the Figma formation,
          then hold on the Screen 5 sine drift. */}
      {BALLOON_ORBS.map((orb, i) => (
        <BalloonOrb
          key={i}
          x={orb.x}
          y={orb.y}
          blob={orb.blob}
          scatter={orb.scatter}
          orbIndex={i}
          visible={phase >= PHASE_ORBS && !exiting}
        />
      ))}

      {/* Sparkle stars — rise with the folder on phase 2, stay after */}
      {phase >= 2 && (
        <motion.div
          className="pointer-events-none absolute"
          style={{ left: 64, top: 870.4, width: 321, height: 87, zIndex: 11 }}
          initial={{ opacity: 0, y: 140 }}
          animate={{
            opacity: phase >= PHASE_CARD ? 0 : 1,
            y: phase >= PHASE_CARD ? 60 : 0,
          }}
          transition={{ delay: 0.15, duration: 0.85, ease: IN_EASE }}
        >
          <Image
            src="/assets/payment/stars.svg"
            alt=""
            width={321}
            height={87}
            style={{ width: 321, height: 87 }}
          />
        </motion.div>
      )}

      {/* ATLYS folder ticket — arrives with photo1, glides up on phase 3.
          On phase 13 the folder holds a fanned stack of "memories" (the
          sandwich plate image) BETWEEN its backside and its front barcode
          capsule — so the front pocket visually covers the bottom of
          each photo, reading as cards tucked into a real folder pocket. */}
      {phase >= 2 && (
        <motion.div
          className="absolute inset-0"
          style={{ zIndex: 10 }}
          animate={{
            // Falls past the bottom edge and shrinks slightly as it goes,
            // so it reads as dropping AWAY rather than sliding down a
            // track. Opacity trails the movement instead of leading it —
            // fading first would make it vanish before it has travelled.
            y: exiting ? folderY - 655 + 430 : folderY - 655,
            scale: exiting ? 0.88 : 1,
            opacity: exiting ? 0 : 1,
          }}
          transition={
            exiting
              ? {
                  y: {
                    delay: EXIT_DROP_DELAY,
                    duration: EXIT_DROP_S,
                    ease: [0.5, 0, 0.75, 0.4],
                  },
                  scale: {
                    delay: EXIT_DROP_DELAY,
                    duration: EXIT_DROP_S,
                    ease: IN_EASE,
                  },
                  opacity: {
                    delay: EXIT_DROP_DELAY + EXIT_DROP_S * 0.55,
                    duration: EXIT_DROP_S * 0.5,
                    ease: "linear",
                  },
                }
              : { duration: 0.9, ease: IN_EASE }
          }
        >
          <FolderTicket
            // Figma node 70:19890 puts the folder body at x=87 (the
            // scattered version's 93 was eyeballed).
            x={FOLDER_X}
            delay={0}
            middleContent={
              <>
                {/* What the folder has KEPT — cards pile up here as the
                    reel gives them up, so it never reads as empty. */}
                <FiledStack visible={suckIn} closing={exiting} />
                {/* The strip's in-pocket half. FolderTicket renders both
                    of these between its backside and the barcode capsule,
                    so the images sit INSIDE the folder, not behind it. */}
                <PhotoReelInFolder phase={phase} suckIn={suckIn} />
              </>
            }
          />
        </motion.div>
      )}
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Frame 3 additions — "advanced AI agents are already working to get you
 * travel-ready" caption slides in below the ticket, positioned at the same
 * vertical the folder used to occupy so the folder shifts up cleanly to
 * make room for it.
 * -------------------------------------------------------------------------*/
function Frame3Elements({
  visible,
  settled,
}: {
  visible: boolean;
  settled: boolean;
}) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.p
          // Keyed on the copy, so swapping the line runs a real
          // exit/enter through AnimatePresence rather than snapping the
          // text mid-sentence.
          key={settled ? "caption-settled" : "caption-working"}
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center text-white"
          style={{
            // Sits below the folder ticket, generously sized so it reads
            // as the hero line — big display type breaking into three
            // clean lines centered under the folder.
            top: 810,
            width: 360,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 500,
            fontSize: 22,
            lineHeight: "28px",
            letterSpacing: "-0.88px",
            zIndex: 11,
          }}
          initial={{ opacity: 0, y: 24, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.8, ease: IN_EASE }}
        >
          {settled ? (
            <>
              You&apos;re all set!
              <br />
              Everything we need is ready.
            </>
          ) : (
            <>
              advanced AI agents are
              <br />
              already working to get you
              <br />
              travel-ready
            </>
          )}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

/* Full-canvas dim overlay — sits on top of persistent + frame elements so
   everything reads as dimmed. Kept out of both layers so it never re-mounts
   between phases. */
function DimOverlay({ hidden }: { hidden: boolean }) {
  return (
    // Lifts when the payment card arrives — the dim exists to push the
    // background copy behind the collection animation, and once that's
    // over the page should come back up to full brightness to read as a
    // live screen you're being asked to act on.
    <motion.div
      className="pointer-events-none absolute inset-0"
      style={{ zIndex: 5 }}
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={{
        // Held back until the collection scene has cleared. Lifting the dim
        // at the same moment the folder fades makes the two changes cancel
        // out — the screen brightens while its contents leave, and neither
        // beat registers. The gap lets the scene finish, then the dim lift
        // reads as its own moment.
        // Waits out the folder's close-and-drop (0.3 + 0.62 ≈ 0.92) plus
        // a moment, so the veil lifts on an empty stage rather than
        // brightening the room while the furniture is still leaving.
        delay: hidden ? 1.05 : 0,
        duration: 0.85,
        ease: IN_EASE,
      }}
    >
      <Image
        src="/assets/payment/overlay-dim.svg"
        alt=""
        width={440}
        height={965}
        style={{ width: 440, height: 965 }}
      />
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.3)" }} />
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
 * FolderMemoryStack — a fan of landscape "photo" cards rendered inside
 * the FolderTicket's middleContent slot. Coordinates are LOCAL to the
 * folder (271×162), so cards sit right on the folder's frost surface
 * with their bottoms tucked under the barcode capsule pocket.
 * -------------------------------------------------------------------------*/
function FolderMemoryStack() {
  // Folder-local coordinates. Backside is 271×162 (top-left at 0,0).
  // Cards fan around the middle so the pocket (capsule at top:91) hides
  // their bottom halves.
  const cards = [
    { w: 200, h: 122, cx: 135, cy: 70, rot: -9, delay: 0 },
    { w: 210, h: 128, cx: 135, cy: 74, rot: -4, delay: 0.05 },
    { w: 218, h: 132, cx: 135, cy: 78, rot: 2, delay: 0.1 },
    { w: 224, h: 136, cx: 135, cy: 82, rot: 7, delay: 0.15 },
    { w: 230, h: 140, cx: 135, cy: 86, rot: 12, delay: 0.2 },
  ];
  return (
    <>
      {cards.map((c, i) => (
        <motion.div
          key={i}
          className="pointer-events-none absolute overflow-hidden"
          style={{
            left: c.cx - c.w / 2,
            top: c.cy - c.h / 2,
            width: c.w,
            height: c.h,
            borderRadius: 8,
            boxShadow: "0 6px 16px rgba(0,0,0,0.28)",
          }}
          initial={{ opacity: 0, scale: 0.7, rotate: c.rot - 18 }}
          animate={{ opacity: 1, scale: 1, rotate: c.rot }}
          transition={{
            delay: c.delay,
            type: "spring",
            stiffness: 380,
            damping: 24,
            mass: 0.8,
          }}
        >
          <Image
            src="/assets/payment/folder-material.png"
            alt=""
            fill
            style={{ objectFit: "cover", borderRadius: 8 }}
          />
        </motion.div>
      ))}
    </>
  );
}

/* Deprecated — kept only for reference; FolderMemoryStack replaces this. */
function FolderPhotoStack({ visible }: { visible: boolean }) {
  // Folder body sits at (93, 613) 271×162 after phase-3 shift; the
  // frosted-glass front lets photos placed BEHIND it show through
  // softly. Cards are landscape-oriented, fanned tightly around the
  // folder's centre, and sized close to the folder body so they read
  // like a bundle of memories tucked inside the pocket.
  const FOLDER_CX = 228;
  // Move the fan slightly DOWN so the bottom halves of the photos sit
  // BEHIND the folder's barcode-capsule "front" — the front then
  // visually covers the photo bottoms and reads as a real folder pocket
  // with cards tucked inside.
  const FOLDER_CENTER_Y = 720;

  const cards = [
    { w: 234, h: 143, dx: -14, dy: -6, rot: -8, delay: 0 },
    { w: 240, h: 146, dx: -6, dy: -3, rot: -3, delay: 0.05 },
    { w: 246, h: 149, dx: 0, dy: 0, rot: 2, delay: 0.1 },
    { w: 252, h: 152, dx: 8, dy: 3, rot: 6, delay: 0.15 },
    { w: 258, h: 155, dx: 14, dy: 6, rot: 11, delay: 0.2 },
  ];

  return (
    <AnimatePresence>
      {visible && (
        <>
          {cards.map((c, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute overflow-hidden"
              style={{
                left: FOLDER_CX + c.dx - c.w / 2,
                top: FOLDER_CENTER_Y + c.dy - c.h / 2,
                width: c.w,
                height: c.h,
                borderRadius: 8,
                // Sits BEHIND the folder ticket (folder wrapper is
                // zIndex 10 inside PhotoStack) so the frosted front
                // panel softly veils the cards.
                zIndex: 6 + i * 0.1,
                boxShadow: "0 8px 22px rgba(0,0,0,0.35)",
              }}
              initial={{ opacity: 0, scale: 0.7, rotate: c.rot - 20 }}
              animate={{ opacity: 0.9, scale: 1, rotate: c.rot }}
              transition={{
                delay: c.delay,
                type: "spring",
                stiffness: 380,
                damping: 24,
                mass: 0.8,
              }}
            >
              <Image
                src="/assets/payment/folder-material.png"
                alt=""
                fill
                style={{ objectFit: "cover", borderRadius: 8 }}
              />
            </motion.div>
          ))}
        </>
      )}
    </AnimatePresence>
  );
}

/* ---------------------------------------------------------------------------
 * Frame 12/13 — Payment card. After the folder swallows everything, the
 * dim overlay clears and this bright white card rises up with the totals,
 * Pay Now / Pay on Appt booking split, and payment method row.
 * -------------------------------------------------------------------------*/

function DetailRow({
  label,
  value,
  valueColor = "#000",
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex flex-col">
      <p
        className="text-[14px] font-medium leading-[19px] text-[#999]"
        style={{ letterSpacing: "-0.28px" }}
      >
        {label}
      </p>
      <p
        className="text-[14px] font-medium leading-[19px]"
        style={{ letterSpacing: "-0.28px", color: valueColor }}
      >
        {value}
      </p>
    </div>
  );
}
