"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { haptic } from "@/lib/haptics";
import { primeTicker } from "@/lib/tick";
import { requestGyro, useCardTilt } from "./loyalty/useCardTilt";
import MyTripLayer from "./trips/MyTripLayer";
import { LightShaft } from "./vault/UploadFlow";
import PointsCard from "./loyalty/PointsCard";
import RadialDial from "./loyalty/RadialDial";
import ConvertPill from "./loyalty/ConvertPill";
import GemColumn from "./loyalty/GemColumn";
import {
  ASSETS,
  CARD,
  CARD_SETTLED,
  CHEVRON,
  CLOSE,
  MAX_RUPEES,
  OPENING_BALANCE,
  PTS_PER_RUPEE,
  RATE_Y,
  SHELL_H,
  SHELL_W,
  SUCCESS_BODY_Y,
  SUCCESS_SPARKS,
  SUCCESS_TITLE_Y,
  SWIPE_Y,
  USING_Y,
} from "./loyalty/geometry";

/* Loyalty — convert rupees to Maharaja points.
 *
 * Figma KxbtgBnr5QKC708d7KlSmx frames 1503:544, 1503:1285 and 1503:2047.
 * Three frames, one screen, one continuous gesture; see
 * `loyalty/geometry.ts` for why they are not three routes.
 *
 *
 * THE BEATS
 *
 *   idle      the dial is live. Swipe to choose an amount; the readout and
 *             the ruler move together and every detent clicks.
 *   pulling   the CTA is struck. Trails rise from below the gem, through
 *             it, and on into the card; the gem takes the green light; the
 *             wash wells up through the card's bottom edge; "+N pts"
 *             arrives and the balance counts.
 *   dropping  the furniture leaves DOWNWARD and the card travels down to
 *             meet where it lands. Everything moves the same way at once.
 *   settled   the light arrives and the copy appears.
 *
 * WHY EVERYTHING GOES DOWN AND NOT UP. The brief asked for it, and the
 * reason it works is that it is the opposite of the beat before it: the
 * points travel UP through the gem into the card, and then the whole screen
 * settles DOWN onto the result. Had both moved the same way the second beat
 * would have read as more of the first rather than as its consequence. It
 * is the same "one direction per beat, and the beats disagree" rule the
 * trips handoff is built on.
 *
 * THE CARD IS NEVER REMOUNTED. It is one `PointsCard`, and the drop is a
 * transform on its wrapper. Frame 3's card is 7px wider and 3.5px further
 * right than frame 1's, which is a scaleX of 1.0221 about its own centre —
 * not a second card at a second position.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

type Beat = "idle" | "dropping" | "settled";

const DROP_MS = 950;

/* THE CHARGE IS THE DIAL, NOT A BEAT AFTER THE BUTTON.
 *
 * This replaced a `pulling` beat: Convert used to start a 2.5s sequence —
 * points rising, card charging, rim lighting — and only then drop. The
 * charge is now driven by the dial itself, so the card responds AS you
 * swipe and Convert simply takes you to the result.
 *
 * It reads better for a reason worth stating: the charging was always the
 * feedback for CHOOSING an amount, not for confirming it. Spending it on a
 * button press meant the whole middle of the screen sat inert through the
 * one part the user is actually doing something in, then performed at
 * them once they had finished.
 *
 * IT IS ON OR OFF, NOT PROPORTIONAL. An earlier pass scaled the intensity
 * with the amount, so ₹100 lit the card faintly and ₹12,800 lit it fully.
 * That was wrong, and the reason is worth keeping: the green is the card
 * RECEIVING, and receiving does not have a volume — a small conversion is
 * not a dim event, it is the same event with a smaller number on it.
 * Scaling it also made the card look underpowered for most of the dial's
 * range, since most selections are nowhere near the maximum.
 *
 * What DOES scale with the amount is the gem, which greys in proportion to
 * the credit taken. That is the right place for proportion: the gem is a
 * quantity being spent, where the card is an event happening. */
const chargeFor = (rupees: number) => (rupees > 0 ? 1 : 0);

/* The card's travel, from the two nodes. */
const DROP_Y = CARD_SETTLED.y - CARD.y; // 369.263
const DROP_X = 3.49;
const DROP_SCALE_X = CARD_SETTLED.w / CARD.w; // 1.0221

export default function LoyaltyScreen() {
  const reduced = useReducedMotion() ?? false;
  const [beat, setBeat] = useState<Beat>("idle");
  const [rupees, setRupees] = useState(0);
  /* Frozen at the moment of commit. The dial is disabled from then on, but
     reading `rupees` directly would still let a late inertia tick change
     the number the success copy is quoting. */
  const [committed, setCommitted] = useState(0);

  const value = useMotionValue(0);
  /* MyTripLayer drives its arrival ripple off this, on a 0–1 scale where 1
     is "fully arrived". Pinned at 1 and never written to: behind the scrim
     that screen is scenery, and it should be sitting still and complete,
     not replaying its own entrance. A separate value from `value`, which
     is in rupees — feeding a 0–12,800 number into a 0–1 mask is a blank
     backdrop. */
  const sweep = useMotionValue(1);
  /* 0 → no green anywhere. 1 → the points are flowing. Shared by the card's
     wash, the gem's emissive and the glow under it, so all three are the
     same event rather than three animations that happen to agree.

     React state rather than a motion value. Two of the three consumers are
     not framer at all — the 3D lights read it through props into a
     `useFrame`, and the glow is a plain gradient string — so a motion value
     would need a state mirror anyway, and mirroring it caused a hydration
     mismatch where framer's server output ("51.551px") disagreed with
     React's client output (51.551). The extra renders are contained by
     memoising `RadialDial`. */
  const [charge, setCharge] = useState(0);
  /* Which way the energy is travelling: +1 while the dial is taking more
     credit, −1 while it is giving it back. Derived in the dial's own
     callback rather than in an effect on `rupees` — an effect would have
     to `setState` from its body, and the direction is a property of the
     EVENT (this detent was lower than the last), not of the value. */
  const [flow, setFlow] = useState<1 | -1>(1);
  const lastValue = useRef(0);

  /* TRANSFER ONLY HAPPENS WHILE THE DIAL IS MOVING.
   *
   * Credit moves between the gem and the card because you are moving it.
   * Hold the dial still and the stream should stop — what is left is a
   * STATE, not an event: this much is selected, the gem is this far spent,
   * the card holds this much charge. A stream that keeps running on a
   * stationary dial says points are still arriving when nothing is
   * happening, which is the one thing it must not say.
   *
   * 300ms of quiet ends it. That has to outlast the gap between detents —
   * they arrive every ~45ms during a drag and keep coming through the
   * inertia glide, so the transfer runs for exactly as long as the ruler
   * is actually turning, including the glide, and stops when it rests. */
  const [moving, setMoving] = useState(false);
  const moveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* STOPPING MEANS STOPPING THE GUN, NOT THE BULLETS.
   *
   * When the dial rests, no new stars are launched — but the ones already
   * in the air keep going and land. Cutting them where they were would
   * leave points hanging in mid-flight between the gem and the card, which
   * is worse than not stopping at all: it reads as the animation being
   * switched off rather than the transfer finishing.
   *
   * So `moving` gates EMISSION and `settling` keeps the layer animating
   * long enough for the last launched particle to complete its travel.
   * 1800ms covers the slowest of them (1.75s) with a little margin. */
  const [settling, setSettling] = useState(false);
  const tailTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const TAIL_MS = 1800;

  const handleValue = useCallback((v: number) => {
    if (v > lastValue.current) setFlow(1);
    else if (v < lastValue.current) setFlow(-1);
    lastValue.current = v;
    setRupees(v);
    setMoving(true);
    setSettling(true);
    if (moveTimer.current) clearTimeout(moveTimer.current);
    if (tailTimer.current) clearTimeout(tailTimer.current);
    moveTimer.current = setTimeout(() => setMoving(false), 300);
    tailTimer.current = setTimeout(() => setSettling(false), 300 + TAIL_MS);
  }, []);
  /* The card's lean. Driven by the phone's own orientation where that is
     available and permitted, and by a timer everywhere else — the card
     reads two motion values and never needs to know which. */
  const { rotateX, rotateY } = useCardTilt(beat === "idle" && rupees > 0);
  /* Mirrors `charge` so a new ramp knows where to start from without
     depending on it. Written only from inside the ramp and the reset —
     never during render, which React forbids and which would in any case
     be a frame behind the value the loop just wrote. */
  const chargeRef = useRef(0);

  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const rampRaf = useRef(0);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (moveTimer.current) clearTimeout(moveTimer.current);
      if (tailTimer.current) clearTimeout(tailTimer.current);
      cancelAnimationFrame(rampRaf.current);
    },
    [],
  );

  /* Ramps `charge` on its own rAF loop rather than a framer `animate()`:
     three different renderers read it (the 3D lights through props into a
     `useFrame`, the card's wash, the glow under the gem) and one loop is
     what keeps all three on the same frame. easeOutCubic, so the colour
     floods in and then settles — the same shape as the count on the card.

     Cancels whatever was already running. The ramp down starts while the
     ramp up may still be finishing, and two loops writing the same state
     fight each other into a flicker. */
  const rampCharge = useCallback(
    (to: number, ms: number) => {
      cancelAnimationFrame(rampRaf.current);
      if (reduced) {
        /* Still scheduled, not written straight out. The dial calls this
           from an effect, and a synchronous `setState` in an effect body
           is a cascading render — one frame of delay costs nothing here
           and keeps both paths on the same clock. */
        chargeRef.current = to;
        rampRaf.current = requestAnimationFrame(() => setCharge(to));
        return;
      }
      const from = chargeRef.current;
      const t0 = performance.now();
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / ms);
        const e = 1 - Math.pow(1 - p, 3);
        const v = from + (to - from) * e;
        chargeRef.current = v;
        setCharge(v);
        if (p < 1) rampRaf.current = requestAnimationFrame(step);
      };
      rampRaf.current = requestAnimationFrame(step);
    },
    [reduced],
  );

  /* The dial drives the charge. Each detent restarts a short ramp from
     wherever the last one had reached, so a fast sweep reads as one
     continuous swell rather than a staircase — `rampCharge` always starts
     from `chargeRef`, never from zero. 260ms is short enough to keep up
     with detents arriving every ~45ms at speed and long enough that a
     single step is not a jump. */
  useEffect(() => {
    if (beat !== "idle") return;
    rampCharge(chargeFor(rupees), 260);
  }, [rupees, beat, rampCharge]);

  const commit = useCallback(() => {
    if (beat !== "idle" || rupees <= 0) return;
    primeTicker();
    /* The one user gesture this flow guarantees, and iOS only honours a
       motion-permission request from inside one. Fire-and-forget: the
       timed driver is already running, so a denial or an unsupported
       browser changes nothing that is on screen. */
    void requestGyro();
    setCommitted(rupees);
    if (moveTimer.current) clearTimeout(moveTimer.current);
    if (tailTimer.current) clearTimeout(tailTimer.current);
    setMoving(false);
    setSettling(false);
    haptic("convertCommit");
    /* Straight to the drop — Convert confirms a choice that has already
       been made and shown, so there is nothing left to perform before
       moving on. */
    setBeat("dropping");
    /* The green LEAVES with the furniture. Frame 3's card is clean gold —
       no wash, no "+N pts" — because by then the points have arrived and
       the green was the arriving, not the result. Holding it would turn a
       transient into a permanent stain on the card. */
    rampCharge(0, DROP_MS * 0.8);

    timers.current.push(
      setTimeout(() => {
        haptic("pointsLanded");
        setBeat("settled");
      }, DROP_MS),
    );
  }, [beat, rampCharge, rupees]);

  const reset = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    cancelAnimationFrame(rampRaf.current);
    chargeRef.current = 0;
    setCharge(0);
    setCommitted(0);
    setRupees(0);
    lastValue.current = 0;
    setFlow(1);
    if (moveTimer.current) clearTimeout(moveTimer.current);
    if (tailTimer.current) clearTimeout(tailTimer.current);
    setMoving(false);
    setSettling(false);
    value.set(0);
    setBeat("idle");
  }, [value]);

  /* LIVE WHILE THE DIAL IS LIVE, FROZEN AFTERWARDS.
   *
   * Both numbers on the card — the balance and the "+N pts" under it —
   * preview the dial as you swipe, so the card shows what you are about
   * to get rather than sitting at its opening figure until the button is
   * pressed. That is the other half of moving the charge onto the dial:
   * the light responds, and so should the figures it is lighting.
   *
   * It switches to `committed` the moment the beat does. The dial is
   * disabled by then, but an inertia glide can still be settling and
   * emitting detents, and the success copy quotes this number — so the
   * amount has to stop moving at exactly the frame the screen starts
   * claiming it. */
  const points = (beat === "idle" ? rupees : committed) * PTS_PER_RUPEE;
  const showFurniture = beat === "idle";
  /* The card's CHARGE is a state — it holds whatever the dial has
     selected, whether or not the dial is moving. The TRANSFER is an
     event, and only runs while the ruler actually turns. The wash level,
     the lit rim, the gem's depletion and the card's brightness all follow
     the first; the stream, the strikes and the card's charging texture
     follow the second. */
  const charging = beat === "idle" && rupees > 0;
  /* Launching new points. */
  const emitting = charging && moving;
  /* Still animating, so whatever is already in flight can land. */
  const transferring = charging && (moving || settling);
  const done = beat === "settled";

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        /* The beat, on the DOM, so a capture harness can wait for a named
           state instead of guessing at milliseconds. Same reason as
           TripsScreen's `data-beat`. */
        data-beat={beat}
        className="relative select-none overflow-hidden rounded-[44px] bg-[#1c1c1c] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
        style={{ width: SHELL_W, height: SHELL_H }}
      >
        {/* ── The app underneath ──────────────────────────────────────────
            The frames draw a whole 8630px-tall screen behind the scrim.
            That screen already exists in this project, so this renders the
            real one rather than a picture of it — which means the blur is
            blurring actual content and the composition survives any change
            to it.

            See `sweep` above for why that value is pinned at 1. */}
        <div className="absolute inset-0" style={{ zIndex: 0 }} aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              filter: "blur(16px)",
              /* Scaled up slightly so the blur's soft edge is pushed
                 outside the shell instead of showing as a pale rim
                 around it. */
              transform: "scale(1.06)",
              transformOrigin: "50% 50%",
            }}
          >
            <MyTripLayer beat="settled" sweep={sweep} orbsOnTrack orbsRolled />
          </div>
          {/* 1503:1102 — the scrim. Measured, not guessed: plain white
              content behind it comes back at 38/255, and the blue nav blob
              at (4,14,27) is exactly a saturated blue multiplied by the
              same 0.149. Both fit black at 85%. */}
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.85)" }} />
        </div>

        {/* ── THE STAGE ──────────────────────────────────────────────────
            Everything that moves in the drop, moving as ONE sheet: the
            dial, the readout, the hint, the CTA, the gem and the card.

            THIS IS THE WHOLE TRICK. The card has to end up 369px further
            down the screen, but if the card animates down while the
            furniture animates away separately, you watch a card travel.
            Translate the entire composition by that same 369px instead
            and the relationship between the card and everything around it
            never changes — so the card reads as the fixed thing and the
            screen reads as sliding down past it, which is the illusion
            asked for. It is the same relative-motion trick as a train
            pulling out of a station.

            The furniture still fades, because frame 3 has none of it. But
            it fades WHERE IT IS, carried down by the stage, rather than
            making its own exit in a different direction at a different
            speed. The card's own transform is left with just the 7px
            widen and 3.5px nudge that separate the two nodes. */}
        <motion.div
          className="absolute inset-0"
          animate={{ y: beat === "dropping" || done ? DROP_Y : 0 }}
          transition={
            reduced
              ? { duration: 0 }
              : {
                  /* A spring, not a curve. The composition ARRIVES rather
                     than merely ending, and a nearly-critically-damped
                     spring gives it the settle that says it has weight.
                     Damping 22 against stiffness 120 is just shy of
                     overshooting — enough to feel, not enough to bounce. */
                  type: "spring",
                  stiffness: 120,
                  damping: 22,
                  mass: 1.1,
                }
          }
        >
          {/* ── The dial ──────────────────────────────────────────────────── */}
          <AnimatePresence>
            {showFurniture && (
              <motion.div
                key="furniture"
                className="absolute inset-0"
                style={{ zIndex: 2 }}
                initial={false}
                /* Opacity ONLY. The downward travel is the stage's, shared
                   with the card — see the stage wrapper below. Adding a
                   second `y` here would make the furniture fall faster than
                   the card it is supposed to be falling WITH, and the whole
                   illusion depends on everything moving as one sheet. */
                exit={{ opacity: 0 }}
                transition={{ duration: DROP_MS / 1000, ease: IN_EASE }}
              >
                <RadialDial value={value} onValue={handleValue} interactive={beat === "idle"} />

                {/* 1503:1143 — "Using ₹0 / ₹12,800". The chosen amount is
                    white and the rest is grey, so the number you are
                    changing is the only thing that reads at a glance. */}
                <div
                  className="pointer-events-none absolute text-center"
                  style={{
                    left: 0,
                    right: 0,
                    top: USING_Y,
                    zIndex: 3,
                    fontFamily: "var(--font-denton), Georgia, serif",
                    fontWeight: 500,
                    fontSize: 20,
                    lineHeight: "26px",
                    /* Playfair defaults to old-style figures, which drop the
                       0 below the baseline — "₹0" renders as "₹o". Denton
                       sets lining figures, and on a screen that is almost
                       entirely numerals this is not a subtlety. */
                    fontVariantNumeric: "lining-nums",
                    color: "#808080",
                  }}
                >
                  Using <span style={{ color: "#FFFFFF" }}>₹{rupees.toLocaleString("en-IN")}</span>
                  {" / ₹"}
                  {MAX_RUPEES.toLocaleString("en-IN")}
                </div>

                {/* 1503:1144 */}
                <div
                  className="pointer-events-none absolute text-center uppercase"
                  style={{
                    left: 0,
                    right: 0,
                    top: RATE_Y,
                    zIndex: 3,
                    fontFamily: "var(--font-inter), Inter, sans-serif",
                    fontWeight: 700,
                    fontSize: 12,
                    lineHeight: "14px",
                    letterSpacing: "0.96px",
                    color: "#808080",
                  }}
                >
                  ₹1 = {PTS_PER_RUPEE} pts
                </div>

                {/* 1503:1168 — the swipe hint. The chevrons breathe outward
                    and back on a long, shallow loop: it is an instruction
                    that has to be noticeable once and then stop asking for
                    attention, so it moves 2px, not 10. */}
                <div
                  className="pointer-events-none absolute flex items-center justify-center"
                  style={{ left: 0, right: 0, top: SWIPE_Y - 3, zIndex: 3, height: 20 }}
                >
                  {[
                    /* 1503:1171 / 1172 / 1174 / 1175 — four SEPARATE
                       assets, each placed at its own CENTRE.

                       BOTH FACTS HERE WERE WRONG BEFORE. The offsets
                       (±81 and ±89.36) are centres — the export writes
                       them with `-translate-x-1/2` — and they were being
                       used as a flex container's left edge, which pushed
                       the right-hand pair about 18px too far out and
                       pulled the left-hand pair in. The row was visibly
                       lopsided against the text.

                       And the two chevrons are not one asset at two
                       opacities: the INNER one ships with `opacity="0.2"`
                       baked into the SVG, the OUTER is full white. An
                       earlier pass guessed 0.55 and 1.0, which left the
                       faint one nearly three times too bright. */
                    { x: -89.355, src: "chev-l-outer.svg", flip: true },
                    { x: -81, src: "chev-l-inner.svg", flip: true },
                    { x: 81, src: "chev-r-inner.svg", flip: false },
                    { x: 89.355, src: "chev-r-outer.svg", flip: false },
                  ].map((c) => (
                    <motion.div
                      key={c.src}
                      className="absolute"
                      style={{
                        left: `calc(50% + ${c.x}px)`,
                        width: CHEVRON.size,
                        height: CHEVRON.size,
                        /* framer transforms, never a raw `transform`
                           string — a hand-written one is silently
                           overwritten the moment `animate` touches x. */
                        translateX: "-50%",
                        rotate: c.flip ? 180 : 0,
                      }}
                      animate={reduced ? undefined : { x: Math.sign(c.x) * 2 }}
                      transition={
                        reduced
                          ? undefined
                          : {
                              duration: 1.9,
                              repeat: Infinity,
                              repeatType: "reverse",
                              ease: "easeInOut",
                              /* Outer pair leads, inner follows. */
                              delay: Math.abs(c.x) > 85 ? 0 : 0.12,
                            }
                      }
                    >
                      <Image
                        src={`${ASSETS}/${c.src}`}
                        alt=""
                        width={CHEVRON.size}
                        height={CHEVRON.size}
                      />
                    </motion.div>
                  ))}
                  <span
                    className="uppercase"
                    style={{
                      fontFamily: "var(--font-inter), Inter, sans-serif",
                      fontWeight: 700,
                      fontSize: 12,
                      lineHeight: "14px",
                      letterSpacing: "0.96px",
                      color: "#808080",
                    }}
                  >
                    Swipe to select
                  </span>
                </div>

                <ConvertPill onClick={commit} disabled={beat !== "idle" || rupees <= 0} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── The gem ───────────────────────────────────────────────────── */}
          <AnimatePresence>
            {showFurniture && (
              <motion.div
                key="gem"
                /* `pointer-events-none` is not cosmetic. This is a
                   transparent div covering the whole 965px shell at a
                   HIGHER z-index than the dial, so without it the gem's
                   wrapper silently eats every pointer event aimed at the
                   ruler underneath and the dial cannot be dragged at all —
                   with nothing on screen to suggest why. The same trap the
                   trips scroller has a note about. */
                className="pointer-events-none absolute inset-0"
                style={{ zIndex: 4 }}
                initial={false}
                /* Opacity only, for the same reason as the furniture. */
                exit={{ opacity: 0 }}
                transition={{ duration: DROP_MS / 1000, ease: IN_EASE }}
              >
                <GemColumn
                lit={charge}
                flowing={transferring}
                emitting={emitting}
                spent={Math.min(1, rupees / MAX_RUPEES)}
                flow={flow}
              />
              </motion.div>
            )}
          </AnimatePresence>


          {/* ── The card ──────────────────────────────────────────────────── */}
          <motion.div
            className="absolute"
            style={{
              left: CARD.x,
              top: CARD.y,
              width: CARD.w,
              height: CARD.h,
              transformOrigin: "50% 50%",
              zIndex: 5,
              /* For the tilt below. `perspective` has to be on an ANCESTOR
                 of the rotating element — set on the element itself it
                 does nothing and the card turns flat, like a sheet of
                 paper rather than a slab. */
              perspective: 900,
            }}
            animate={
              beat === "dropping" || done
                ? { x: DROP_X, scaleX: DROP_SCALE_X }
                : { x: 0, scaleX: 1 }
            }
            /* Only the 7px widen and the 3.5px nudge — the 369px of travel
               belongs to the stage above, not to the card. */
            transition={{ duration: reduced ? 0 : DROP_MS / 1000, ease: IN_EASE }}
          >
            {/* THE TILT — `Card3D`'s lean, off the phone instead of a
                mouse.

                The WorldPass card tracks the cursor; this one has no
                cursor to track and is playing a scripted sequence nobody
                is hovering. `useCardTilt` prefers the device's real
                orientation and falls back to its own clock, writing the
                same two motion values either way — so nothing here
                branches on which driver won.

                The ±12° range and the 220/22 spring come straight from
                `Card3D`, because they are already tuned and they are why
                that card reads as a slab. On a card this size anything
                past about 12° stops being a lean and starts being the
                card flying. */}
            <motion.div
              style={{
                width: "100%",
                height: "100%",
                transformStyle: "preserve-3d",
                rotateX,
                rotateY,
              }}
            >
              <PointsCard
                balance={OPENING_BALANCE + points}
                delta={points}
                charge={charge}
                pulsing={emitting}
                sheen={done}
                  width={CARD.w}
              />
            </motion.div>
          </motion.div>

        </motion.div>

        {/* ── The light ──────────────────────────────────────────────────
            OUTSIDE THE STAGE, deliberately. The shaft comes from the top
            edge of the SCREEN, not from anywhere in the composition, so it
            must not be carried down by the drop — riding the stage it
            arrived 369px low and lit the middle of the frame instead of
            the top of it. Everything belonging to the shell rather than to
            the moving sheet lives out here: this, the copy, the close
            button and the backdrop.

            1503:2619 ("image 26") is the SAME asset, at the same 410×614
            from the same top edge, as the vault's 1558 — so this reuses
            that screen's shaft rather than drawing a second one, and
            inherits its tuning, including the counter-rotating pair that
            keeps the rays alive and the note about periods having to suit
            how long the beat lasts.

            `LightShaft`, not `SuccessAura`: the latter also carries 1558's
            own headline and star field, which belong to that frame and
            not to this one. It was split for exactly this reuse. */}
        <AnimatePresence>{done && <LightShaft key="shaft" />}</AnimatePresence>

        {/* ── The result ────────────────────────────────────────────────── */}
        <AnimatePresence>
          {done && (
            <motion.div
              key="copy"
              className="pointer-events-none absolute inset-0"
              style={{ zIndex: 7 }}
              initial={reduced ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5, ease: IN_EASE, delay: reduced ? 0 : 0.15 }}
            >
              {/* 1503:2626 */}
              <motion.div
                className="absolute"
                style={{
                  left: SUCCESS_SPARKS.x,
                  top: SUCCESS_SPARKS.y,
                  width: SUCCESS_SPARKS.w,
                  height: SUCCESS_SPARKS.h,
                }}
                animate={reduced ? undefined : { opacity: [0.7, 1, 0.7] }}
                transition={
                  reduced ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }
                }
              >
                <Image
                  src={`${ASSETS}/success-sparkles.svg`}
                  alt=""
                  width={SUCCESS_SPARKS.w}
                  height={SUCCESS_SPARKS.h}
                />
              </motion.div>

              {/* 1503:2624 */}
              <motion.div
                className="absolute text-center text-white"
                style={{
                  left: 0,
                  right: 0,
                  top: SUCCESS_TITLE_Y,
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  fontWeight: 500,
                  fontSize: 20,
                  lineHeight: "25px",
                  letterSpacing: "-0.8px",
                }}
                initial={reduced ? false : { y: 12 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, ease: IN_EASE, delay: reduced ? 0 : 0.18 }}
              >
                <p>{points.toLocaleString("en-IN")}</p>
                <p>Maharaja Pts Added</p>
              </motion.div>

              {/* 1503:2625 */}
              <motion.p
                className="absolute text-center text-white"
                style={{
                  left: (SHELL_W - 271.711) / 2,
                  top: SUCCESS_BODY_Y,
                  width: 271.711,
                  opacity: 0.5,
                  fontFamily: "var(--font-inter), Inter, sans-serif",
                  fontWeight: 600,
                  fontSize: 14,
                  lineHeight: "19px",
                  letterSpacing: "-0.14px",
                }}
                initial={reduced ? false : { y: 12 }}
                animate={{ y: 0 }}
                transition={{ duration: 0.6, ease: IN_EASE, delay: reduced ? 0 : 0.26 }}
              >
                {/* DEVIATION, FLAGGED. Figma's copy here reads "Your
                    updated balance is 23,545 Pts" — the balance BEFORE the
                    conversion, while the card beside it shows 25,345. The
                    two cannot both be right on the same screen, so this
                    computes the figure and the card and the sentence
                    agree. If the design meant the old balance, this is the
                    line to change. */}
                Your updated balance is {(OPENING_BALANCE + points).toLocaleString("en-IN")} Pts.
                Ready to redeem on your next Air India booking
              </motion.p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Close ─────────────────────────────────────────────────────── */}
        <button
          type="button"
          aria-label={done ? "Start over" : "Close"}
          onClick={reset}
          className="absolute"
          style={{
            left: CLOSE.x,
            top: CLOSE.y,
            width: CLOSE.size,
            height: CLOSE.size,
            zIndex: 9,
            cursor: "pointer",
          }}
        >
          <Image
            src={`${ASSETS}/close-button.svg`}
            alt=""
            width={CLOSE.size}
            height={CLOSE.size}
          />
        </button>
      </motion.div>
    </div>
  );
}
