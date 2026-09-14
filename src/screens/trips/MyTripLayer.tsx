"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { motion, useTransform, type MotionValue } from "framer-motion";
import TripSheet from "./TripSheet";
import TripOverlays, { type TripOverlay } from "./TripOverlays";
import type { HandoffBeat } from "./beats";
import { applyMask, incomingMask, rippleAt, submergence, useRippleStyle } from "./ripple";

/* TripView — Figma section 1110:8597 ("Section 3"), frames 1110:13508
 * (KYC done) and 1110:13996 (KYC not done).
 *
 * This replaces the earlier build against 947:43120. The two frames are
 * the same screen, so they are one component with a `kycDone` flag rather
 * than two files, and everything that differs between them is listed at
 * KYC_SHIFT below.
 *
 * WHAT CHANGED FROM THE OLD TRIPVIEW, and why each is a structural change
 * rather than a restyle:
 *
 *   pinned header   The old node put chips, destination, progress, copy,
 *                   tabs and every section inside ONE 8003px scroll group.
 *                   Here the 8238px group (1110:13544) holds only the
 *                   white panel and its sections — the menu, chip row,
 *                   avatar, title, progress and task line are siblings of
 *                   it, not children. So the top chrome is pinned and the
 *                   panel scrolls under it.
 *   left-aligned    Destination moved from a centred INTERNATIONAL /
 *                   Australia / dates stack to a left-aligned 24px title
 *                   at x30 with the dates under it, and the trip folder
 *                   moved to the opposite corner.
 *   task line       The 20px "Your visa protection is active…" paragraph
 *                   is gone. In its place is one 14px line — "8 tasks are
 *                   being handled · 2 require your action ›" — which is a
 *                   count you can act on rather than a sentence you read.
 *   no tabs         Visa / Transport / Hotel / Forex and the rule under
 *                   them are not in the new frames at all. The panel now
 *                   starts directly on the first section card.
 *   composer        There IS one here now. The old file has a comment
 *                   saying the composer belongs to the detail view; the
 *                   new frames pin it (1110:13982) over a 248px scrim
 *                   with a notifications FAB above it, so that call is
 *                   reversed.
 *
 * Geometry is frame-relative on the same 440×965 shell, read off the node:
 *
 *   menu       50.83 disc at (30, 56.56), glyph 24 at (43, 69.47)
 *   chip row   home 45 at (158.03, 60.31) · selected 61 at (193.03, 50)
 *              · australia 45 at (242.03, 60.31) · chad 40 at (275.03,
 *              62.81) — KYC-done only
 *   avatar     50.83 disc at (359.17, 56.56), "MN" 14/19 at (373.08, 72.47)
 *   title      Australia 24/28 -0.96 #0b0b0b at (30, 156)
 *   dates      12/16 -0.12 #999 at (30, 194); gear disc 23 at (173.67, 190.5)
 *   folder     57.97×50 at (352.7, 156); chevron disc 23 at (370.19, 190.5)
 *   progress   track 380×15 at (30, 257.5), fill 63.43×9 at (33, 260.5)
 *   orbs       three 30 discs at x 102.43 / 126.43 / 150.43, y 250
 *   tasks      14/19 -0.14 at (30, 292), dot 3 at (209, 301),
 *              "2 require…" at (220, 292), chevron 18 at (357, 294.16)
 *   panel      440 wide, r30, from y361 to the end of the scroll
 *   composer   380×90 r30 at (30.91, 845.26); mic 40 at (295.91, 870.26),
 *              send 40 at (345.91, 870.26); bell 45 at (365.91, 788.26)
 *
 *
 * THE WATER CHANGES THE PAGE; IT DOES NOT UNCOVER IT
 *
 * Unchanged from the previous build, and the reason the Surface wrapper
 * survived the redesign. Nothing here is on a timer. Every group of
 * content is tied to the waterline: it surfaces when the rising wave
 * reaches its own height on the screen, so the composer comes up first —
 * it is nearest the source — and the chip row last. What you should read
 * is water rising up a page and changing what it passes over, in the
 * order it passes over it.
 *
 * Two earlier versions each got this wrong in the way the other didn't.
 * The first had the finished screen sitting behind the crest, so the wave
 * was a shutter pulled off something that had obviously been there all
 * along. The second moved every element to a fixed delay AFTER the wave
 * had gone, which fixed the pre-loaded feeling but severed the connection
 * — the text arrived because a timer said so, not because the water
 * reached it.
 */

const A = "/assets/trips/view";

/* One group of content, surfacing as the water passes its height.
 *
 * Absolutely positioned and inset so the children keep the frame
 * coordinates read off Figma; the wrapper is purely a handle for the
 * animation. `at` is the group's height on the shell, which is the only
 * thing that decides when it comes up. */
function Surface({
  sweep,
  at,
  z,
  children,
}: {
  sweep: MotionValue<number>;
  at: number;
  /* Only the bottom bar needs one — it has to sit over the scroller. */
  z?: number;
  children: ReactNode;
}) {
  const p = useTransform(sweep, (v) => submergence(rippleAt(v), at));
  const opacity = useTransform(p, [0, 0.55, 1], [0, 0.6, 1]);
  /* Rises the last few pixels into place as it clears, so it reads as
     something breaking the surface rather than fading up in position. */
  const y = useTransform(p, (v) => (1 - v) * 22);
  const blur = useTransform(p, (v) => `blur(${((1 - v) * 9).toFixed(2)}px)`);

  return (
    <motion.div
      className="absolute inset-0"
      /* pointerEvents none is not cosmetic. This wrapper is a transparent
         div covering the entire 965px layer, and there is one per content
         group — so any of them left interactive would swallow every wheel
         and touch event meant for the panel scrolling underneath. The
         controls inside opt back in individually. */
      style={{ opacity, y, filter: blur, pointerEvents: "none", zIndex: z }}
    >
      {children}
    </motion.div>
  );
}

/* The three discs land clustered at the start of the track and then walk
 * it out, pulling the fill along behind them.
 *
 * The start x is not a round number and should not be: the fill's right
 * edge has to keep a constant gap behind the leading disc for the whole
 * slide, or the orbs visibly outrun what they are supposed to be drawing.
 * Figma's rest positions are 102.43 / 126.43 / 150.43 with the fill
 * ending at 96.43, a 6px gap. The fill grows from its own left edge at
 * 33, so the leading disc has to start at 33 + 6 = 39 and travel exactly
 * the fill's own 63.43 — same distance, same gap at both ends and every
 * frame between.
 *
 * AgentsOverlay lands its flying orbs on these same numbers and has its
 * own copy of them; the two have to move together. */
const ORB_PITCH = 24;
const ORB_START_X = 39;
const ORB_ROLL = 63.429;
const ORB_Y = 250;

const ORBS = [
  { src: "/assets/trips/orb-1.png", x: ORB_START_X },
  { src: "/assets/trips/orb-2.png", x: ORB_START_X + ORB_PITCH },
  { src: "/assets/trips/orb-3.png", x: ORB_START_X + ORB_PITCH * 2 },
] as const;

/* One curve for the slide and the fill. They are the same gesture — the
 * orbs are what is drawing the bar — so they cannot be on separate
 * timings without one of them looking like it is reacting to the other. */
const ROLL = { duration: 1.1, ease: [0.4, 0, 0.2, 1] as const };

/* Inactive passports. Figma desaturates each with a mix-blend-saturation
 * ellipse laid over the flag; a filter does the same job in one property
 * and doesn't depend on the blend isolating correctly against whatever
 * the wash is doing underneath at the time. */
const PASSPORT_CHIPS = [
  { src: `${A}/flag-australia.svg`, box: 45, glyph: 28, x: 242.03, y: 60.31 },
  { src: `${A}/flag-chad.svg`, box: 40, glyph: 24.889, x: 275.03, y: 62.81 },
] as const;

/* Without KYC the chip row is not drawn at all and a 50px prompt takes
 * the band at y361, pushing the panel — and only the panel — down by 70.
 * Everything above y361 keeps its position in both frames. */
const KYC_SHIFT = 70;
const PANEL_TOP = 361;

export default function MyTripLayer({
  beat,
  sweep,
  orbsOnTrack,
  orbsRolled,
  kycDone = true,
}: {
  beat: HandoffBeat;
  sweep: MotionValue<number>;
  /* False until the agents have flown down and come to rest at the start
     of the track. The screen arrives with an empty bar on purpose — the
     agents are what puts anything on it, and a bar that was already
     populated during the handoff makes their arrival decorative. */
  orbsOnTrack: boolean;
  /* And then they set off. This runs the slide and the fill together. */
  orbsRolled: boolean;
  /* 1110:13508 vs 1110:13996. */
  kycDone?: boolean;
}) {
  const revealing = beat === "sweeping" || beat === "settled";
  /* Which panel the column has opened, if any — the rail nodes and the
     action pills both raise one. Held here rather than in TripSheet
     because the sheets have to escape the scroller and cover the whole
     shell, and TripSheet lives inside it. */
  const [overlay, setOverlay] = useState<TripOverlay | null>(null);
  const maskRef = useRippleStyle<HTMLDivElement>(sweep, incomingMask, applyMask);

  const panelTop = kycDone ? PANEL_TOP : PANEL_TOP + KYC_SHIFT;

  return (
    <motion.div
      className="absolute inset-0"
      ref={maskRef}
      style={{
        zIndex: 1,
        /* Masked to the inside of the expanding crest, so this screen is
           what the ripple LEAVES BEHIND rather than something faded up
           underneath it. */
        /* Hidden outright until the ripple starts. Before that the mask is
           entirely transparent anyway, but a mounted layer with three
           backdrop-filters in it still costs compositing on every frame of
           the charge — the one second of the sequence that has to stay
           perfectly smooth. */
        display: revealing ? "block" : "none",
        /* #F9FAFB is the trip view's own ground, not the shell's. The shell
           stays #ECEAEF because that is the payment screen's background
           (Figma 947:41798) and it has to remain correct for the whole
           charge and knock. Putting the new colour on this layer means the
           ripple's mask reveals the new background along with the screen it
           belongs to, rather than the page changing colour underneath a
           transition that has not happened yet. */
        background: "#f9fafb",
      }}
      aria-hidden={!revealing}
    >
      {/* ── The panel, and only the panel, scrolls ───────────────────────
          Pinned under the header rather than starting at the top of the
          shell: the header is not part of this scroll group in Figma, and
          scrolling it away would take the progress bar the agents just
          drew off-screen with it. overscroll-contain stops a flick at
          either end from scrolling the review page behind the phone. */}
      <Surface sweep={sweep} at={700}>
        <div
          className="absolute overflow-y-auto overscroll-contain"
          style={{
            left: 0,
            right: 0,
            top: panelTop,
            bottom: 0,
            scrollbarWidth: "none",
            pointerEvents: "auto",
          }}
        >
          <div className="relative">
            {/* Rectangle 240648228 — the white panel every section sits
                on. Full-bleed 440 wide, r30, running to the end of the
                scroll, with the same shadow family as the cards.

                The page ground is #F9FAFB and the PANEL is white, with
                each section a #F9FAFB tile on top of it. Rendering the
                sections white on a grey page would put white glass on
                white and the action pills would lose their shape. */}
            <div
              className="absolute"
              style={{
                left: 0,
                width: 440,
                top: 0,
                bottom: 0,
                background: "#ffffff",
                borderRadius: 30,
                boxShadow: "0px 4px 30px -2px rgba(0,0,0,0.05)",
              }}
            />

            {/* Sections start 30 below the panel's top edge (1110:13546 at
                y391 against a panel at y361). */}
            <div style={{ height: 30 }} />
            <div className="relative" style={{ marginLeft: 30, width: 380 }}>
              <TripSheet onOpen={setOverlay} />
            </div>
            {/* Clears the pinned composer, so the last section can be
                scrolled out from under it rather than ending beneath it. */}
            <div style={{ height: 170 }} />
          </div>
        </div>
      </Surface>

      {/* ── Menu, passports, avatar ──────────────────────────────────── */}
      <Surface sweep={sweep} at={104}>
        <Image
          src={`${A}/disc-menu.svg`}
          alt=""
          width={106.834}
          height={106.834}
          style={{ position: "absolute", left: 2, top: 32.56, width: 106.834, height: 106.834 }}
        />
        <Image
          src={`${A}/menu.svg`}
          alt=""
          width={24}
          height={24}
          style={{ position: "absolute", left: 43, top: 69.47, width: 24, height: 24 }}
        />

        {kycDone && (
          <>
            {/* Home — the only chip with a stroke, which is what marks it
                as the way back out rather than another passport.

                The export calls that stroke solid black. It is not: sample
                the rendered node and the rim reads 229 against a 249
                ground, i.e. about 8% ink. Drawn at full black it becomes
                the loudest thing in the row and pulls the eye off the
                selected country, which is the one element up here that is
                supposed to be shouting. */}
            <div
              className="absolute rounded-full"
              style={{
                left: 158.03,
                top: 60.31,
                width: 45,
                height: 45,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(0,0,0,0.1)",
              }}
            />
            <Image
              src={`${A}/home.svg`}
              alt=""
              width={18}
              height={18}
              style={{ position: "absolute", left: 171.53, top: 73.81, width: 18, height: 18 }}
            />

            {PASSPORT_CHIPS.map((c) => (
              <div
                key={c.src}
                className="absolute rounded-full"
                style={{
                  left: c.x,
                  top: c.y,
                  width: c.box,
                  height: c.box,
                  background: "rgba(255,255,255,0.1)",
                }}
              >
                <Image
                  src={c.src}
                  alt=""
                  width={c.glyph}
                  height={c.glyph}
                  style={{
                    position: "absolute",
                    left: (c.box - c.glyph) / 2,
                    top: (c.box - c.glyph) / 2,
                    width: c.glyph,
                    height: c.glyph,
                    filter: "saturate(0)",
                    opacity: 0.55,
                  }}
                />
              </div>
            ))}

            {/* Selected. The plate underneath (Rectangle 240648130) is the
                chip's cast shadow and sits BEHIND the flag — it's what
                lifts the selected country off the row rather than just
                enlarging it. */}
            <Image
              src={`${A}/chip-plate.svg`}
              alt=""
              width={67.5166}
              height={48.8994}
              style={{ position: "absolute", left: 189.77, top: 72.55, width: 67.5166, height: 48.8994 }}
            />
            <Image
              src={`${A}/chip-australia.svg`}
              alt=""
              width={117}
              height={117}
              priority
              style={{ position: "absolute", left: 165.03, top: 26, width: 117, height: 117 }}
            />
          </>
        )}

        <Image
          src={`${A}/disc-avatar.svg`}
          alt=""
          width={106.834}
          height={106.834}
          style={{ position: "absolute", left: 331.17, top: 32.56, width: 106.834, height: 106.834 }}
        />
        <Image
          src={`${A}/avatar-subtract.svg`}
          alt=""
          width={39.3438}
          height={39.3438}
          style={{ position: "absolute", left: 364.91, top: 62.3, width: 39.3438, height: 39.3438 }}
        />
        <p
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: 373.08,
            top: 72.47,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#808080",
          }}
        >
          MN
        </p>
      </Surface>

      {/* ── Destination and trip folder ──────────────────────────────── */}
      <Surface sweep={sweep} at={200}>
        <p
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: 30,
            top: 156,
            fontSize: 24,
            lineHeight: "28px",
            letterSpacing: "-0.96px",
            color: "#0b0b0b",
          }}
        >
          Australia
        </p>
        <p
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: 30,
            top: 194,
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.12px",
            color: "#999999",
          }}
        >
          24th Jun - 01 Aug 2026
        </p>
        {/* Both discs ship as one 25×25 SVG each — circle, rim and glyph
            together — because the glyph is clipped by the circle in the
            node and splitting them would mean re-deriving that clip. */}
        <Image
          src={`${A}/disc-gear.svg`}
          alt=""
          width={25}
          height={25}
          style={{ position: "absolute", left: 172.67, top: 189.5, width: 25, height: 25 }}
        />

        <Image
          src={`${A}/folder.svg`}
          alt=""
          width={57.9709}
          height={50}
          style={{ position: "absolute", left: 352.7, top: 156, width: 57.9709, height: 50 }}
        />
        <Image
          src={`${A}/disc-next.svg`}
          alt=""
          width={25}
          height={25}
          style={{ position: "absolute", left: 369.19, top: 189.5, width: 25, height: 25 }}
        />
      </Surface>

      {/* ── Progress ─────────────────────────────────────────────────── */}
      <Surface sweep={sweep} at={290}>
        {/* NOT the exported vector. Figma builds the track as white glass
            — a white 0.7 → 0.3 fill under a white-to-transparent rim, over
            a 25px backdrop blur — so every pixel of it is white and the
            whole of its visibility comes from that blur and the drop
            shadow beneath. Exported flat and dropped in as an <img>, an
            SVG cannot run a backdrop-filter, and the groove vanished into
            the #F9FAFB ground completely. Rebuilt as a div, which can. */}
        <div
          className="absolute"
          style={{
            left: 30,
            top: 257.5,
            width: 380,
            height: 15,
            borderRadius: 7.5,
            background: "rgba(255,255,255,0.5)",
            border: "1px solid #d6d9dc",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
        />
        <motion.div
          className="absolute origin-left"
          style={{ left: 33, top: 260.5, width: 63.429, height: 9 }}
          initial={false}
          /* Drawn by the orbs, not by the clock. It has no length at all
             until they set off, and then it grows at exactly their pace —
             the bar is the trail they leave, which is why they land at the
             start of it rather than at the end. */
          animate={{ scaleX: orbsRolled ? 1 : 0 }}
          transition={ROLL}
        >
          <Image
            src={`${A}/progress-fill.svg`}
            alt=""
            width={63.429}
            height={9}
            style={{ width: 63.429, height: 9 }}
          />
        </motion.div>

        {/* Agent orbs riding the track — 30px white discs with the orb art
            inset, overlapping at a 24px pitch.

            Absent until the agents arrive — through the whole handoff and
            the whole overlay. No crossfade on the handover: the flying orb
            finishes at exactly this position, size and art, so appearing
            underneath it is the thing you cannot see. A fade would be the
            thing you can. */}
        {orbsOnTrack &&
          ORBS.map((o, i) => (
            <motion.div
              key={o.src}
              className="absolute rounded-full bg-white"
              style={{ left: o.x, top: ORB_Y, width: 30, height: 30, zIndex: 3 - i }}
              initial={false}
              animate={{ x: orbsRolled ? ORB_ROLL : 0 }}
              transition={ROLL}
            >
              <Image
                src={o.src}
                alt=""
                width={21.5}
                height={21.5}
                style={{
                  position: "absolute",
                  left: 4.25,
                  top: 4.25,
                  width: 21.5,
                  height: 21.5,
                  borderRadius: "50%",
                }}
              />
            </motion.div>
          ))}
      </Surface>

      {/* ── What the agents are up to ────────────────────────────────── */}
      <Surface sweep={sweep} at={320}>
        {/* Figma layers a separately-coloured copy of this phrase over the
            line (1110:13925) to get the gradient. Same result, one node:
            the project already ships --gradient-text in the same hue
            order, and .gradient-text-shine carries the sweep with it so
            there is no second copy of the gradient to keep in step. */}
        <p
          className="gradient-text-shine absolute whitespace-nowrap font-semibold"
          style={{
            left: 30,
            top: 292,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
          }}
        >
          8 tasks are being handled
        </p>
        <Image
          src={`${A}/dot-3.svg`}
          alt=""
          width={3}
          height={3}
          style={{ position: "absolute", left: 209, top: 301, width: 3, height: 3 }}
        />
        <p
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: 220,
            top: 292,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#999999",
          }}
        >
          2 require your action
        </p>
        <Image
          src={`${A}/next-18.svg`}
          alt=""
          width={18}
          height={18}
          style={{ position: "absolute", left: 357, top: 294.16, width: 18, height: 18 }}
        />
      </Surface>

      {/* ── Complete KYC ─────────────────────────────────────────────── */}
      {!kycDone && (
        <Surface sweep={sweep} at={PANEL_TOP + 50}>
          <div
            className="absolute rounded-[30px]"
            style={{
              left: 30,
              top: 361,
              width: 380,
              height: 50,
              background: "#effaf7",
              border: "1px solid #9fe3cd",
            }}
          />
          <Image
            src={`${A}/kyc-badge.svg`}
            alt=""
            width={30.6552}
            height={30.6543}
            style={{ position: "absolute", left: 40, top: 370.35, width: 30.6552, height: 30.6543 }}
          />
          <Image
            src={`${A}/verified-user.svg`}
            alt=""
            width={16}
            height={16}
            style={{ position: "absolute", left: 47, top: 378, width: 16, height: 16 }}
          />
          <p
            className="gradient-text-green absolute whitespace-nowrap font-semibold"
            style={{ left: 82, top: 376.5, fontSize: 14, lineHeight: "19px", letterSpacing: "-0.14px" }}
          >
            Complete KYC to unlock all benefits
          </p>
          <Image
            src={`${A}/next-20.svg`}
            alt=""
            width={20}
            height={20}
            style={{ position: "absolute", left: 380, top: 376, width: 20, height: 20 }}
          />
        </Surface>
      )}

      {/* ── Notifications and the composer ───────────────────────────────
          Pinned over the scroller, which is why this Surface carries a z:
          the panel's own Surface comes later in DOM order in Figma but has
          to sit under this one. The scrim is 248px tall — far taller than
          the composer — because it is what lets the column scroll behind
          the bar without the last card cutting off against a hard edge. */}
      <Surface sweep={sweep} at={950} z={6}>
        <Image
          src={`${A}/bottom-scrim.svg`}
          alt=""
          width={441}
          height={248.397}
          style={{ position: "absolute", left: -0.09, top: 716.86, width: 441, height: 248.397 }}
        />

        <Image
          src={`${A}/fab-bell.svg`}
          alt=""
          width={101}
          height={101}
          style={{ position: "absolute", left: 337.91, top: 764.26, width: 101, height: 101 }}
        />
        <Image
          src={`${A}/bell.svg`}
          alt=""
          width={24}
          height={24}
          style={{ position: "absolute", left: 376.41, top: 798.76, width: 24, height: 24 }}
        />

        {/* The field is #F9FAFB rather than white: it sits on the white
            panel, and a white field on a white panel is only its rim. */}
        <div
          className="absolute rounded-[30px]"
          style={{ left: 30.91, top: 845.26, width: 380, height: 90, background: "#f9fafb" }}
        />
        <Image
          src={`${A}/composer.svg`}
          alt=""
          width={436}
          height={146}
          style={{ position: "absolute", left: 2.9, top: 821.26, width: 436, height: 146 }}
        />

        {/* Caret then placeholder — the field reads as focused and empty
            rather than as a button waiting to be tapped. The caret is the
            gradient bitmap from the node, not a solid rule: it is the same
            four hues as the status text and that is the tell that the
            thing you are typing into is the agent. */}
        <Image
          src={`${A}/caret.png`}
          alt=""
          width={1.2}
          height={25}
          style={{ position: "absolute", left: 55.86, top: 877.26, width: 1.2, height: 25, borderRadius: 3 }}
        />
        <p
          className="absolute whitespace-nowrap font-medium"
          style={{
            left: 62.11,
            top: 879.76,
            fontSize: 16,
            lineHeight: "20px",
            letterSpacing: "-0.64px",
            color: "#cccccc",
          }}
        >
          Ask anything
        </p>

        <div
          className="absolute rounded-[15px]"
          style={{
            left: 295.91,
            top: 870.26,
            width: 40,
            height: 40,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid #d6d9dc",
          }}
        />
        <Image
          src={`${A}/mic.svg`}
          alt=""
          width={22}
          height={22}
          style={{ position: "absolute", left: 304.91, top: 879.26, width: 22, height: 22 }}
        />

        <div
          className="absolute rounded-[15px] bg-black"
          style={{ left: 345.91, top: 870.26, width: 40, height: 40 }}
        />
        {/* Figma's glyph here is the shared arrow_back instance, rotated
            in the file rather than re-drawn — so the export points left
            and the quarter turn has to be put back by hand. */}
        <Image
          src={`${A}/send.svg`}
          alt=""
          width={22}
          height={22}
          style={{
            position: "absolute",
            left: 354.91,
            top: 879.26,
            width: 22,
            height: 22,
            transform: "rotate(90deg)",
          }}
        />
      </Surface>

      <TripOverlays overlay={overlay} onClose={() => setOverlay(null)} />
    </motion.div>
  );
}
