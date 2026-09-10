"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { haptic } from "@/lib/haptics";
import ProfileBody from "./profile/ProfileBody";
import BenefitsSheet from "./profile/BenefitsSheet";
import CardBack from "./profile/CardBack";
import CardBackPrograms from "./profile/CardBackPrograms";
import LoyaltyPicker from "./profile/LoyaltyPicker";
import VerifyGate from "./profile/VerifyGate";
import ConnectScan from "./profile/ConnectScan";
import ProgramsConnected from "./profile/ProgramsConnected";
import ProgramDetail from "./profile/ProgramDetail";
import SettingsSheet from "./profile/SettingsSheet";
import DisconnectTerms from "./profile/DisconnectTerms";
import BenefitDetail, { type BenefitDetailContent } from "./profile/BenefitDetail";
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
/* Gap between passes. Figma's own peek puts the next card at x 387, a
 * 40.675 gap — but the turn arrow lives in that gap, spanning card x
 * −44.9 to −6.9, so at 40.675 it lands ON the previous card. Widened to
 * clear it with real whitespace either side. */
const CARD_PEEK_GAP = 76;
/* Pitch: one card plus the gap. The carousel snaps and indexes by this. */
const CARD_GAP = CARD_W + CARD_PEEK_GAP;
/* Headroom in the carousel for the card's own shadow, which reaches about
 * 110px below it and only a little above. */
const CARD_PAD_T = 24;
const CARD_PAD_B = 120;

/* The swing's shape, specified by what it should LOOK like rather than by
 * an arbitrary camera distance.
 *
 * The pass tips TOWARD you, hinged on its top edge: the bottom edge lifts
 * out of the screen while the top stays on the picture plane. Near things
 * are drawn bigger, so the bottom is the wide edge and the top narrows.
 *
 * That magnification is also what used to flare the card past both screen
 * edges. Rather than bolting a correction on afterwards, the whole thing
 * is parametrised by APPARENT size: `apparent` is the width the card
 * should actually occupy, and the CSS scale is solved backwards from it.
 * framer emits perspective() outside scale(), so a uniform k shrinks z
 * too, and
 *
 *   k·P / (P − k·H·sinθ) = apparent  ⟹  k = apparent·P / (P + apparent·H·sinθ)
 *
 * which makes the flare impossible by construction — the bottom edge lands
 * at exactly `apparent` of full width however far the card has tipped.
 * Projected height falls out as apparent·H·cosθ, with no perspective term
 * left in it at all.
 *
 * The two numbers below are the design and the camera is solved from them.
 * At full swing the top edge reads NARROW smaller than the bottom and the
 * card has lost SHRINK of its size; the taper works out as
 * apparent·H/(P + apparent·H), which inverts to the P below. */
const COLLAPSE_TOP_NARROW = 0.1;
const COLLAPSE_SHRINK = 0.18;
const COLLAPSE_PERSPECTIVE =
  CARD_H * (1 - COLLAPSE_SHRINK) * (1 / COLLAPSE_TOP_NARROW - 1);

/* Apparent width factor at an angle, before the page has closed in. */
const collapseApparent = (deg: number) =>
  1 - COLLAPSE_SHRINK * Math.sin((deg * Math.PI) / 180);

/* Where the swing stops. The pass does NOT go edge-on and vanish — it
 * parks as a sliver under the header and stays there for the rest of the
 * page, so the thing you were looking at is still on screen and still says
 * which pass it is.
 *
 * Given as the height it should come to rest at; the angle is solved from
 * it, because apparent·H·cosθ has no clean inverse and a hand-tuned degree
 * figure would drift the moment SHRINK changed. */
const COLLAPSE_REST_H = 13;
const COLLAPSE_MAX_DEG = (() => {
  let lo = 0;
  let hi = 90;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    const r = (mid * Math.PI) / 180;
    if (collapseApparent(mid) * CARD_H * Math.cos(r) > COLLAPSE_REST_H)
      lo = mid;
    else hi = mid;
  }
  return lo;
})();

/* The clamp measures against the projection at full apparent size, so it
 * floors on the same quantity — floored on the rest height itself it kept
 * biting past the rest point and walked the sliver from 13px down to 9 as
 * you scrolled further. */
const COLLAPSE_REST_PROJ =
  CARD_H * Math.cos((COLLAPSE_MAX_DEG * Math.PI) / 180);

/* The opening beat. For this many pixels the page scrolls but the body
 * below the stage does NOT move: the plinth fades and the pass starts to
 * lift, and only once that has read does the content begin to rise.
 *
 * The hold is then GIVEN BACK over the next stretch, at which point the
 * body is exactly where the scroll says it should be. Keeping the offset
 * left the body parked 80px low for the entire rest of the page — dead
 * white space above the first line that no amount of scrolling closed. */
const BODY_HOLD = 80;
const BODY_CATCHUP = 260;

/* Where the body starts. Figma's 614 puts the first line flush against the
 * plinth, which ends at exactly 614 (top 526 + height 88) — no gap at all.
 * Pushed down to let the stage breathe, and the scroller's spacer carries
 * the same amount so the reachable bottom does not move. */
const BODY_TOP = 660;

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

/* The passes you can swipe between. Figma already draws the second card
 * peeking off the right edge as the affordance saying there are more — so
 * swiping simply brings it in. */
const PROFILES: {
  name: string;
  serial: string;
  /** Which back this pass turns to. "connect" invites you to add a
   *  program; "programs" reports the ones already there (935:22105). */
  back: "connect" | "programs";
}[] = [
  { name: "mohak n.", serial: "6190001", back: "connect" },
  { name: "mehak r.", serial: "6190002", back: "programs" },
];

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
  /* The "+" on a programs back opens the loyalty picker, not the scan. */
  const [loyaltyOpen, setLoyaltyOpen] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  /* The detail the profile's own benefit deck opens. Held as CONTENT
     rather than a flag so the panel keeps its copy through the exit. */
  const [cardDetail, setCardDetail] = useState<BenefitDetailContent | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [settingsReset, setSettingsReset] = useState(0);
  /* Which pass is in focus. The carousel is a REAL scroll container, not
     a drag: native scrolling and pointer drag are different input
     channels, so a trackpad swipe changes profile while a drag on the
     card still turns it. Same axis, two gestures, no conflict. */
  const [profileIdx, setProfileIdx] = useState(0);
  const snapTimer = useRef<number | null>(null);

  /* Drives the sticky header. Fed by onScroll rather than useScroll —
     the container ref is null on the first render, and useScroll captures
     that null instead of re-reading it. */
  const scrollY = useMotionValue(0);
  /* The horizontal scroller, so a tap on a collapsed tab can scroll it
     into place — when the passes are 26px bars there is nothing left to
     drag, so selecting has to be a tap. */
  const trackRef = useRef<HTMLDivElement | null>(null);
  /* Collapse. The passes stay put as the page scrolls under them and
     flatten into a tab strip — so the screen never loses the control that
     says which profile you are looking at. */
  /* The card doesn't shrink — it SWINGS. The bottom edge lifts out of the
     viewport toward the camera while the top edge stays pinned, so the
     face foreshortens into a bar the way a real card tipping away from you
     does. 84° leaves a sliver rather than a true edge-on line, which would
     vanish. */
  /* Smoothed. onScroll fires at whatever rate the platform feels like and
     the raw value arrives in uneven jumps — driving a 3D transform
     straight off it is what read as staccato. Stiff enough that it still
     tracks the finger rather than lagging behind it. */
  const scrollS = useSpring(scrollY, {
    stiffness: 700,
    damping: 70,
    mass: 0.3,
    restDelta: 0.05,
  });
  const collapseX = useTransform(scrollS, [32, 320], [0, COLLAPSE_MAX_DEG], {
    clamp: true,
  });
  /* Uniform scale that cancels the perspective's magnification.
     
     Hinged at the top, the bottom edge travels toward the camera as it
     swings, and near things are drawn bigger — so the card was flaring out
     past both screen edges on its way down. framer emits
     perspective() OUTSIDE scale(), so a uniform s shrinks z along with
     everything else: the widest point ends up at s·W·P/(P − s·H·sinθ).
     Setting that equal to W solves to P/(P + H·sinθ), which holds the card
     at exactly its own width the whole way through the swing. Uniform, so
     the card keeps its proportions rather than being squeezed. */
  /* Reads the angle off the SMOOTHED scroll but the available room off the
     RAW one. The body rises with the real scroll position while the swing
     trails it through the spring, so a lagging card kept catching the KYC
     line that had already come up to meet it. Taking the room unlagged
     means the card is never larger than the gap actually left for it. */
  const collapseScale = useTransform([collapseX, scrollY], ([d, y]) => {
    const r = ((d as number) * Math.PI) / 180;
    /* Shrink further if the page has closed in. The body starts at
       BODY_TOP and the card's top is pinned at CARD_Y, so the clear height
       is where the body has actually got to, less a breathing gap — and
       through the opening beat it has not got anywhere. Uniform, so the
       card keeps its proportions rather than being squashed. */
    const yy = y as number;
    const held =
      yy <= BODY_HOLD
        ? yy
        : BODY_HOLD * (1 - Math.min(1, (yy - BODY_HOLD) / BODY_CATCHUP));
    const room = Math.max(
      COLLAPSE_REST_PROJ,
      BODY_TOP - yy + held - CARD_Y - 26,
    );
    const proj = CARD_H * Math.cos(r);
    const squeeze = proj > 1 ? Math.max(0, Math.min(1, room / proj)) : 1;
    const apparent = collapseApparent(d as number) * squeeze;
    return (
      (apparent * COLLAPSE_PERSPECTIVE) /
      (COLLAPSE_PERSPECTIVE + apparent * CARD_H * Math.sin(r))
    );
  });
  /* The box the card occupies is deliberately NOT animated. Writing a
     height onto it and onto the track every scroll tick forced a layout of
     the whole preserve-3d subtree each frame, which is what made the swing
     staccato. Nothing is laid out below the card — the track is absolutely
     positioned — so the box can stay 350 and let the transform do all of
     the visible work. */
  /* The strip shrinks with them — held at full height it would sit over
     the page and swallow taps meant for the content underneath. */
  /* The plinth leaves BEFORE the swing starts, not alongside it. It is a
     flat layer at z 0, and the swing brings the card's bottom edge toward
     the camera — so the moment the card tips, its near edge passes in
     front of the plinth and the two collide. Clearing it by 42, with the
     swing held back to 32, means they never share the frame while the card
     is off-plane. */
  const stageOpacity = useTransform(scrollS, [0, 30], [1, 0], { clamp: true });
  /* Cancels the scroll one-for-one through the opening beat, then pays the
     offset back so the body ends up exactly where the scroll says. Off the
     RAW scroll, not the spring: it has to cancel the native scroll
     exactly, and a smoothed version would drift against it. */
  const bodyHold = useTransform(scrollY, (y) => {
    if (y <= BODY_HOLD) return y;
    const back = Math.min(1, (y - BODY_HOLD) / BODY_CATCHUP);
    return BODY_HOLD * (1 - back);
  });
  const [collapsed, setCollapsed] = useState(false);
  const [parked, setParked] = useState(false);

  /* The card leaves around y 500; the title arrives as it goes. */
  const headerIn = useTransform(scrollY, [300, 420], [0, 1], { clamp: true });
  const titleY = useTransform(scrollY, [300, 420], [10, 0], { clamp: true });
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
      <motion.div
        // Scrolls: the design runs 1781px against a 965px viewport. The
        // card stage stays put and the content below it moves, which is
        // the behaviour the design implies rather than a shrunken fit.
        className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        /* The scroller is where the containment belongs, because this is
           the boundary everything above it depends on. position:absolute
           with z-index auto is NOT a stacking context, so any positively
           z-indexed descendant — anywhere in the body, at any depth, added
           at any time — escapes into the root one and competes with the
           pass strip and the header directly. Isolating here means nothing
           inside can ever outrank the chrome, whatever it does. */
        style={{ isolation: "isolate", zIndex: 0 }}
        /* Anywhere-on-screen swipe to change profile, once the passes have
           collapsed. onPan rather than drag: drag captures the pointer and
           rewrites touch-action, which would take vertical scrolling away
           from the page — onPan only watches. Gated on `collapsed` because
           while the passes are open a horizontal drag belongs to the card,
           where it turns it over. */
        onPanEnd={(_, info) => {
          if (!collapsed) return;
          const dx = info.offset.x;
          if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(info.offset.y))
            return;
          // Swiping left brings the NEXT pass in, the same direction the
          // strip itself moves under the same gesture.
          const next = Math.min(
            PROFILES.length - 1,
            Math.max(0, profileIdx + (dx < 0 ? 1 : -1)),
          );
          if (next === profileIdx) return;
          haptic("carouselSnap");
          trackRef.current?.scrollTo({
            left: next * CARD_GAP,
            behavior: "smooth",
          });
        }}
        onScroll={(e) => {
          const y = e.currentTarget.scrollTop;
          scrollY.set(y);
          // Past this the passes are tabs: tapping one selects it, and
          // the flip is off, since a 26px bar has no face to turn.
          // Lower than the swing's end on purpose: the track keeps its full
          // 494px box now, so past this it would sit over content that has
          // risen underneath. By here the card is well into the swing and
          // there is nothing left to flip.
          setCollapsed(y > 120);
          // Past this the plank is opaque. Everything under it — two
          // faces, the globe, the trace, the gloss and dispersion layers —
          // is still being re-rasterised every frame inside a preserve-3d
          // subtree at a changing angle, for no visible result. That is
          // the cost that was showing up as lag.
          setParked(y > 300);
        }}
      >
      {/* Card carousel. The second card is deliberately cut off by the
          screen edge — that's the affordance telling you there are more,
          so it isn't centred or scaled down. */}

      {/* Wrapper carries the scroll fade. It cannot go on the plinth and
          its shadow directly — both animate their own opacity on entrance,
          and framer would drive the same value, cutting the scroll link. */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ opacity: stageOpacity, zIndex: 1, y: bodyHold }}
      >
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
          //
          // Sized to the DISC, not to the container. pedestal-disk.png
          // has an alpha bbox of (155,58,1261,244) at 4x, so the plinth is
          // only 276.5 wide inside its 354 box and its base sits at y587.
          // A 349-wide shadow therefore overhung it by ~36px on each side
          // whatever it was centred on — which is what kept reading as an
          // uncropped smear. 300 gives the slight spread a cast shadow
          // has without leaving the plinth.
          left: 220 - 300 / 2,
          top: 569,
          width: 300,
          height: 42,
          zIndex: 1,
          // Cropped at the ends. A cast shadow has no hard vertical edge —
          // it has to run out before the plinth does.
          maskImage:
            "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(90deg, transparent 0%, #000 14%, #000 86%, transparent 100%)",
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
            // Tapers before the box ends. Running to `black 100%` left
            // the layer fully opaque at the container's bottom edge, so
            // the shadow was sliced off on a straight line instead of
            // fading out.
            maskImage:
              "linear-gradient(to bottom, transparent 22%, black 56%, black 74%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 22%, black 56%, black 74%, transparent 100%)",
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
      </motion.div>

      {/* Everything below the pedestal (853:16315) — see ProfileBody. */}
      {/* isolation: isolate is doing real work here, not tidying.
          The scroller is position:absolute with z-index auto, so it is NOT
          a stacking context — any positively z-indexed descendant escapes
          into the root one and competes with the chrome directly. The
          benefit deck stacks its cards with zIndex: cards.length - pos,
          which reaches 18 and beat the sticky header's 15, so the deck was
          painting over the header on a long scroll. Isolating keeps the
          body's internal ordering internal and lands the whole block at
          z 0, under the pass strip and the header both. */}
      <motion.div
        className="relative"
        style={{ y: bodyHold, isolation: "isolate", zIndex: 0 }}
      >
      {/* Switching pass reloads the page under it. Keyed on the profile, so
          the old body is torn down and a new one mounts — which replays
          ProfileBody's own staggered reveal, and that stagger is what
          reads as "loading" rather than as a crossfade. mode="wait" holds
          the new one back until the old has gone, so the two never sit on
          top of each other mid-fade.

          initial={false} keeps the very first mount silent: the card's
          scan lap already gates the body's arrival, and a fade on top of
          that would double it. */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={profileIdx}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.19, ease: "easeOut" }}
        >
          <ProfileBody
            top={BODY_TOP}
            show={bodyIn}
            onViewBenefits={() => setBenefitsOpen(true)}
            onOpenBenefit={() => setVerifyOpen(true)}
            onOpenAgent={(k) => {
              // Airport logistics isn't a preference sheet — it opens the
              // supercar sequence, so it routes elsewhere.
              if (k === "airport") setAirportOpen(true);
              else if (AGENT_SPECS[k]) setAgentKey(k);
            }}
            // Whichever card is at the front of the stack, not a fixed one.
            onActivateBenefit={(card) =>
              setCardDetail({
                title: card.title,
                terms: PROFILE_BENEFIT_TERMS,
                art: card.art,
              })
            }
          />
        </motion.div>
      </AnimatePresence>
      </motion.div>

      {/* Gives the scroll container the design's full height, so the
          absolutely-positioned body has room to scroll into. */}
        <div style={{ height: 1781 + (BODY_TOP - 614) }} />
      </motion.div>

      {/* Card carousel — arrives AFTER the disk, and drops onto it. The
          second card is deliberately cut off by the screen edge: that's
          the affordance telling you there are more, so swiping simply
          brings it in.

          The track is only as tall as the cards. Spanning the whole frame
          would swallow drags meant for the page beneath it. */}
      <motion.div
        ref={trackRef}
        className="absolute left-0 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // Padded well past the card, because overflow-y:hidden (which a
          // horizontal scroller needs) clips at the container's edge — and
          // the card's shadow falls ~110px below it. Sized to the card
          // exactly, the shadow was being sliced off on a straight line.
          top: CARD_Y - CARD_PAD_T,
          width: 440,
          height: CARD_H + CARD_PAD_T + CARD_PAD_B,
          zIndex: 30,
          scrollSnapType: "x mandatory",
          scrollBehavior: "smooth",
          // Snaps to the design's x, so the pass in focus lands at 94
          // with its neighbour peeking at 387.
          scrollPaddingLeft: CARD_X,
          // pan-y leaves vertical touch scrolling with the PAGE; only the
          // horizontal axis belongs to this strip.
          //
          // Collapsed, x has to go BACK to the browser: the flip drag that
          // was consuming it is off, and swiping between tabs is now the
          // strip's own native scroll. Left on pan-y a touch swipe would
          // land on nothing.
          touchAction: collapsed ? "pan-x pan-y" : "pan-y",
          // Once the pass has swung out there is nothing left here to hit,
          // and the reference puts content in this band — so the track
          // stops taking the pointer rather than sitting over it as a dead
          // 76px strip. Switching goes back to scrolling up to the passes.
          pointerEvents: collapsed ? "none" : "auto",
        }}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / CARD_GAP);
          if (i !== profileIdx && i >= 0 && i < PROFILES.length) {
            haptic("carouselSnap");
            setProfileIdx(i);
          }
          /* Settle the scroll ourselves once it goes quiet. CSS snapping
             is supposed to do this, but trackpad momentum can end between
             points and leave the card parked off-centre — which is what
             was happening. Re-snapping after 120ms of stillness makes the
             resting position exact regardless. */
          if (snapTimer.current) window.clearTimeout(snapTimer.current);
          snapTimer.current = window.setTimeout(() => {
            const target = Math.min(
              Math.max(Math.round(el.scrollLeft / CARD_GAP), 0),
              PROFILES.length - 1,
            ) * CARD_GAP;
            if (Math.abs(el.scrollLeft - target) > 0.5) {
              el.scrollTo({ left: target, behavior: "smooth" });
            }
          }, 120);
        }}
      >
        <div
          className="flex"
          style={{
            paddingLeft: CARD_X,
            // Puts the cards back at their true y inside the padded box.
            paddingTop: CARD_PAD_T,
            gap: CARD_GAP - CARD_W,
          }}
        >
          {PROFILES.map((p, i) => (
            <div
              key={p.serial}
              style={{ scrollSnapAlign: "start", scrollSnapStop: "always", flex: "0 0 auto" }}
            >
              <WorldPassCard
                delay={CARD_DELAY + i * 0.1}
                lit={lit}
                profile={p}
                // Only the pass in focus takes the cursor, so tilt never
                // fights between two cards.
                interactive={i === profileIdx}
                collapseX={collapseX}
                collapseScale={collapseScale}
                slot={i - profileIdx}
                collapsed={collapsed}
                parked={parked}
                onSelect={() => {
                  trackRef.current?.scrollTo({
                    left: i * CARD_GAP,
                    behavior: "smooth",
                  });
                }}
                onConnect={() => setScanOpen(true)}
                onAddProgram={() => setLoyaltyOpen(true)}
                onOpenPrograms={() => setProgramsOpen(true)}
              />
            </div>
          ))}
          {/* Trailing space as an ELEMENT, not padding. A scroll
              container's end padding is widely not counted in scrollWidth,
              so the last pass could not scroll far enough left to reach
              its snap point and parked against the right edge instead. */}
          <div
            aria-hidden
            style={{ flex: "0 0 auto", width: 440 - CARD_X - CARD_W }}
          />
        </div>
      </motion.div>

      {/* Sticky header. Fades in as the card scrolls away, so the screen
          keeps a title once the card that WAS the title is gone. It sits
          UNDER the two controls, which are already pinned — so the bar
          arrives around them rather than replacing them. */}
      <motion.div
        className="pointer-events-none absolute inset-x-0 top-0"
        // Below the pass strip (30), above the page (0). The white now
        // runs past the parked sliver, so it has to be behind it or it
        // would paint the sliver out.
        style={{ zIndex: 29, opacity: headerIn }}
      >
        <div
          style={{
            // Runs past the parked pass, not just past the title. The
            // sliver rests at 152–165, and content rising underneath was
            // reaching the header before the white had faded out — so the
            // solid part now clears the card entirely and the fade starts
            // below it.
            height: 250,
            background:
              "linear-gradient(180deg, #ffffff 0%, #ffffff 72%, rgba(255,255,255,0) 100%)",
          }}
        />
        <motion.p
          className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-medium"
          style={{
            top: 99,
            y: titleY,
            fontSize: 18,
            lineHeight: "22px",
            letterSpacing: "-0.72px",
            color: "#0e0e0e",
          }}
        >
          {PROFILES[profileIdx].name}
        </motion.p>
      </motion.div>

      {/* Header row — a SIBLING of the scroller, not a child. Inside it,
          the back and settings controls scrolled away with the content,
          and a status bar that scrolls off is plainly wrong on a phone.
          Sitting outside, they hold still for the whole page. */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 34 }}>
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
      {/* Add a loyalty program (935:22488 → 935:22825). Continue on the
          second step dismisses back to the card it came from. */}
      <LoyaltyPicker open={loyaltyOpen} onClose={() => setLoyaltyOpen(false)} />

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
        // Solid, not a wash. Figma has rgba(255,255,255,0.1), which is
        // invisible on a white page; a translucent grey was readable but
        // now that these are pinned above the scroller, content slides
        // underneath and shows straight through them.
        background: "#f2f2f4",
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
  delay,
  lit,
  interactive = true,
  collapseX,
  collapseScale,
  slot = 0,
  collapsed = false,
  parked = false,
  onSelect,
  onConnect,
  onAddProgram,
  onOpenPrograms,
  profile,
}: {
  delay: number;
  /** Opens the verification gate from the back face's "+". */
  onConnect?: () => void;
  /** The "+" on a programs back — adds a loyalty program. */
  onAddProgram?: () => void;
  /** Swiping that back downward opens the full programs page. */
  onOpenPrograms?: () => void;
  /** Whether the green has woken. Held off until 2s after the card has
   *  landed, so it reads as a status light switching on rather than as
   *  part of the card's own arrival. */
  lit: boolean;
  /** The peeking card is scenery — it floats, but doesn't take the
   *  cursor, so tilt never fights between the two. */
  interactive?: boolean;
  /** Degrees of the collapse swing: 0 face-on, 90 edge-on. */
  collapseX?: MotionValue<number>;
  /** Cancels the perspective magnification so the swing stays on screen. */
  collapseScale?: MotionValue<number>;
  /** Passes away from the one in focus: −1, 0, +1. */
  slot?: number;
  /** True once the strip is reading as tabs rather than as cards. */
  collapsed?: boolean;
  /** True once the grey plank fully covers the faces. */
  parked?: boolean;
  /** Tap-to-select, which is what a tab is. */
  onSelect?: () => void;
  /** Whose pass this is. */
  profile: (typeof PROFILES)[number];
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
  /* Refraction. Real glass splits light as it bends it, so the dispersion
     travels FURTHER than the white highlight and in the opposite
     direction — that separation is the whole effect. It also strengthens
     with tilt: face-on there is nothing to bend. */
  const dispX = useTransform(rys, [-14, 14], ["112%", "-12%"]);
  const dispY = useTransform(rxs, [-14, 14], ["-12%", "112%"]);
  const tiltAmount = useTransform([rxs, rys], ([a, b]) =>
    Math.min(1, Math.hypot(a as number, b as number) / 13),
  );
  const dispersion = useTransform(tiltAmount, [0, 1], [0.16, 0.85]);

  const zero = useMotionValue(0);
  /* The passes' own elevation, faded out with the swing.
     
     This is what read as the two cards colliding. The gap between them
     never drops below ~62px, but each card throws a 50px blur either side,
     so two of them met in the middle and filled that gap with grey. A card
     lying nearly flat has nothing to cast anyway. */
  /* What the pass becomes once it is parked: a flat grey plank.
     
     Fading a solid over the face is what stops the card reading as "still
     moving" down there. Everything on it — the globe, the trace, the idle
     wobble — is running against a 13px sliver where none of it is legible
     but all of it is visibly in motion. A plank has nothing to animate. */
  const parkFill = useTransform(
    collapseX ?? zero,
    // Late. At a third of the swing the card is still 250px tall and
    // plainly a card, so greying it there read as a bug rather than as a
    // state change. It only turns once it is nearly down.
    [COLLAPSE_MAX_DEG * 0.72, COLLAPSE_MAX_DEG * 0.96],
    [0, 1],
    { clamp: true },
  );

  const cardShadow = useTransform(collapseX ?? zero, (d) => {
    // Floors at 0.3 rather than 0. Fully off, the parked sliver sat on
    // the page with nothing under it; the reference keeps a soft one. The
    // gap between passes is ~99px at rest and this reaches ~28 from each
    // side, so the two no longer meet and grey out the whitespace.
    const f = 1 - 0.7 * Math.sin((d * Math.PI) / 180);
    return [
      `0 2px 6px -2px rgba(0,0,0,${(0.25 * f).toFixed(3)})`,
      `0 26px 50px -22px rgba(0,0,0,${(0.35 * f).toFixed(3)})`,
      `0 30px 46px -32px rgba(0,0,0,${(0.22 * f).toFixed(3)})`,
    ].join(", ");
  });

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
      // In flow, not absolute: the carousel is a scroll container and the
      // flex item places it. It still creates the positioning context its
      // own faces rely on.
      className="relative"
      style={{ width: CARD_W, height: CARD_H }}
      onClick={collapsed ? onSelect : undefined}
      initial={{ opacity: 0, y: 26, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.8, ease: IN_EASE }}
    >
      {/* Idle float. Periods are deliberately different so the drift and
          the sway never line up into an obvious loop — the card wanders
          instead of ticking. */}
      <motion.div
        className="absolute left-0 top-0"
        // Fixed at the card's real height. If this followed the shrinking
        // box the faces would be scaled flat as well as rotated, and the
        // two together read as a squash rather than a swing.
        style={{ width: CARD_W, height: CARD_H, perspective: 1200 }}
        animate={
          collapsed
            ? { y: 0, x: 0 }
            : { y: [0, -7, 0, -3, 0], x: [0, 2.5, 0, -2.5, 0] }
        }
        transition={{
          y: { duration: 6.4, repeat: Infinity, ease: "easeInOut" },
          x: { duration: 8.9, repeat: Infinity, ease: "easeInOut" },
        }}
      >
        {/* Turn hint — the arrow from 899:13965.

            Its OWN asset, split out of that file rather than cropped from
            it. The two halves live in one SVG (arrow x 0–37.6, pink mark
            x 44.9–55.9), and cropping to a window kept leaking the mark's
            gradient into the arrow's slot — which is why two pink bars
            were showing instead of an arrow and a tab.

            Placed by the same alignment the file implies: the mark sits on
            the card's left edge, so asset x 44.9 ≡ card x 0, putting the
            arrow at card x −44.9.

            Outside the flip plane, since it points AT the card and must
            not mirror when the card turns; it keeps the tilt and drag so
            it still travels along. */}
        {interactive && !collapsed && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              rotateX: rxs,
              rotateY: rys,
              // Deliberately NOT preserve-3d: the arrow is a flat hint
              // beside the card, and in the 3D context it was being
              // depth-sorted against the faces.
              zIndex: 6,
            }}
          >
            <motion.div
              className="absolute"
              style={{ left: -44.9, top: 64, width: 38, height: 93 }}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: delay + 1.1, duration: 0.6, ease: IN_EASE }}
            >
              {/* Nudges toward the swipe direction on the tab's period, so
                  the two read as one gesture. */}
              <motion.div
                animate={{ x: [0, -5, 0, 0, 0] }}
                transition={{
                  duration: 3.4,
                  times: [0, 0.16, 0.32, 0.66, 1],
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Image
                  src="/assets/profile/pass-arrow.svg"
                  alt=""
                  width={38}
                  height={93}
                  style={{ width: 38, height: 93, display: "block" }}
                />
              </motion.div>
            </motion.div>
          </motion.div>
        )}

        {/* The swing. Its own perspective rather than the float wrapper's,
            because the vanishing point has to sit ON the hinge — with the
            default centre origin the near bottom edge projects downward
            and outward as it comes at you, so the card got TALLER on its
            way to becoming a bar. transformPerspective puts the vanishing
            point at transformOrigin, and that origin is the top edge. */}
        <motion.div
          className="h-full w-full"
          style={{
            // Negative: the bottom edge goes BACK into the screen rather
            // than out toward the camera, which is the direction that
            // keeps the top edge wide and the card inside its own width.
            rotateX: collapseX ?? 0,
            scale: collapseScale ?? 1,
            /* Every pass turns on its OWN wheel — same axis height, no
               lateral travel, so none of them slides across the screen on
               the way down. What differs is only WHERE along its width
               each one shrinks toward: the pass in focus contracts about
               its own centre and stays centred, while a neighbour
               contracts toward the focused side, so the sliver of it that
               was peeking stays exactly where it was peeking rather than
               being pulled off the edge with the rest of the card.

               An earlier version got this by translating the neighbours
               inward, which is the same end position but reads as the
               strip sliding — not as each card turning in place. */
            transformOrigin: `${50 - Math.sign(slot) * 50}% 0%`,
            transformPerspective: COLLAPSE_PERSPECTIVE,
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
        >
        {/* Flip plane. Drag horizontally to turn the card — unchanged, and
            it does not fight the carousel: that is a native SCROLL
            container, and scrolling (wheel / trackpad) is a different
            input channel from a pointer drag. framer's drag also sets
            touch-action: pan-y here, so a touch drag on the card turns it
            while vertical scrolling still belongs to the page.

            transformStyle must be preserve-3d the whole way down this
            chain, or the back face renders flat on top of the front
            instead of behind it. */}
        <motion.div
          className="h-full w-full"
          style={{
            transformStyle: "preserve-3d",
            visibility: parked ? "hidden" : "visible",
          }}
          animate={{ rotateY: turns * 180 }}
          transition={{ type: "spring", stiffness: 60, damping: 14, mass: 1.1 }}
          drag={interactive && !collapsed ? "x" : false}
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
              haptic("cardFlip");
              // Dragging LEFT turns the card's right edge toward you.
              // CSS rotateY is the other way round — positive swings the
              // right edge AWAY — so a leftward drag has to decrement,
              // which is the reverse of what this did.
              setTurns((t) => t + (info.offset.x < 0 ? -1 : 1));
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
            // hovering over a single blur. Halved from 0.5/0.7/0.55, and
            // faded out by the swing (see cardShadow).
            boxShadow: cardShadow,
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
            // Still once it has parked. A sliver lying nearly flat that
            // is still wobbling on its own timer reads as a glitch, not as
            // something alive.
            animate={
              collapsed
                ? { rotateY: 0, rotateX: 0 }
                : { rotateY: [-2.2, 2.2, -2.2], rotateX: [1.1, -1.1, 1.1] }
            }
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
                  id={`trace-${profile.serial}`}
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
                stroke={`url(#trace-${profile.serial})`}
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

            {/* Refraction. A prismatic band swung across the face by the
                tilt, on plus-lighter so it ADDS colour to the black rather
                than washing it grey. It leads the white highlight and runs
                the other way, which is what separating light looks like;
                a tint that tracked the specular would just read as a
                coloured version of it. */}
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: 30,
                zIndex: 3,
                opacity: dispersion,
                backgroundImage: useTransform(
                  [dispX, dispY],
                  ([dx, dy]) =>
                    `radial-gradient(78% 64% at ${dx} ${dy},` +
                    ` rgba(120,180,255,0.30) 0%,` +
                    ` rgba(170,130,255,0.22) 26%,` +
                    ` rgba(255,120,190,0.16) 48%,` +
                    ` rgba(255,200,110,0.12) 68%,` +
                    ` rgba(255,255,255,0) 88%)`,
                ),
                mixBlendMode: "plus-lighter",
              }}
            />

            {/* Cursor-tracked specular. Wide and soft — a tight highlight
                on a near-black card reads as a bright dot rather than as a
                sheen across glass. */}
            <motion.div
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: 30,
                zIndex: 3,
                backgroundImage: useTransform(
                  [glossX, glossY],
                  ([gx, gy]) =>
                    `radial-gradient(64% 56% at ${gx} ${gy}, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.13) 40%, rgba(255,255,255,0.04) 62%, rgba(255,255,255,0) 80%)`,
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
                {profile.name}
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
                {profile.serial}
              </p>
            </div>

            {/* Turn tab — 853:77298, an 11×93 Union on the card's left
                edge at card-relative (0, 64).

                INSIDE the face, as its last child. The face carries
                overflow:hidden, which per spec forces transform-style to
                flat — so its children paint by document order and this
                lands perfectly coplanar with the card's surface. That is
                what makes it attached: it inherits the face's idle wobble
                and the flip exactly, with no z offset to swing on a wider
                arc.

                As a sibling of the faces it needed z ≥ 24 to clear the
                content plane, and at the card's EDGE that offset read as
                detached; dropping it to 1 let the face's own ±2.2° wobble
                swing in front and swallow it. Inside, neither happens. */}
            <div
              className="pointer-events-none absolute"
              style={{ left: 0, top: 64, width: 11, height: 93, zIndex: 6 }}
            >
              <motion.div
                className="h-full w-full"
                // Brightness rather than an outward stretch: the face
                // clips at the card's edge, and Figma has the tab ON the
                // card rather than past it.
                animate={collapsed ? { opacity: 0 } : { opacity: [0.72, 1, 0.72] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/assets/profile/pass-tab.svg"
                  alt=""
                  width={11}
                  height={93}
                  style={{ width: 11, height: 93, display: "block" }}
                />
              </motion.div>
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
            {profile.back === "programs" ? (
              <CardBackPrograms
                onConnect={onAddProgram}
                onOpenPrograms={onOpenPrograms}
              />
            ) : (
              <CardBack onConnect={onConnect} />
            )}

            {/* Same tab, on the back — at the same LEFT edge, unmirrored.

                The back face is pre-turned 180°, so when the card flips
                180° the two cancel and this face renders the right way
                round. Placing the tab at the local RIGHT edge with a
                scaleX to compensate — as if the face were mirrored — put
                it on the viewer's right instead. */}
            <div
              className="pointer-events-none absolute"
              style={{ left: 0, top: 64, width: 11, height: 93, zIndex: 6 }}
            >
              <motion.div
                className="h-full w-full"
                animate={collapsed ? { opacity: 0 } : { opacity: [0.72, 1, 0.72] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Image
                  src="/assets/profile/pass-tab.svg"
                  alt=""
                  width={11}
                  height={93}
                  style={{ width: 11, height: 93, display: "block" }}
                />
              </motion.div>
            </div>
          </div>

        </motion.div>
        </motion.div>

        {/* The parked plank. Inside the swing so it takes the same tilt and
            taper, and lifted 2px on z — within a preserve-3d context
            siblings sort by DEPTH, not by z-index, so a flat sibling would
            be interleaved with the faces rather than laid over them.

            The pass in focus is dark, the one beside it grey — see the
            fill below. */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            opacity: parkFill,
            borderRadius: 30,
            /* The pass in focus takes the gradient as given: 0E0E0E to
               747474, left to right. The neighbour is the same ramp lifted
               into grey — same shape, same direction, so the two still
               read as the same object, but the one you are not on sits
               back. Differentiating by LIGHTNESS rather than by a
               different colour is what makes that work; an earlier version
               used an unrelated light grey and the two planks stopped
               looking like the same effect. */
            background: interactive
              ? "linear-gradient(90deg, #0E0E0E 0%, #747474 100%)"
              : "linear-gradient(90deg, #6E6E6E 0%, #B4B4B4 100%)",
            z: 2,
          }}
        />
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
