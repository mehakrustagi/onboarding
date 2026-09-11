"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { haptic } from "@/lib/haptics";
import PaymentDoneLayer from "./trips/PaymentDoneLayer";
import MyTripLayer from "./trips/MyTripLayer";
import TripWash from "./trips/TripWash";
import AgentsOverlay from "./trips/AgentsOverlay";
import WaveSweep from "./trips/WaveSweep";
import {
  AGENTS_AT,
  BEAT_AT,
  DISPERSE_AT,
  ORBS_LAND_AT,
  SEQUENCE_END,
  SWEEP_S,
  type HandoffBeat,
} from "./trips/beats";
import { ARRIVAL, BODY, RATTLE, useOscillator } from "./trips/wobble";

/* Payment success → MyTrip, as one continuous move.
 *
 * Figma draws this as three frames in the "Transition to MyTrip" section
 * (947:48238), but they're three samples of a single gesture, not three
 * pages — so both screens live in this one shell and trade places inside
 * it. Routing between two pages would have been the obvious build and
 * would have thrown away the entire effect: a route change unmounts the
 * outgoing screen, and the whole point here is that the outgoing screen is
 * still on-frame, still wobbling, while the incoming one climbs past it.
 *
 * THE KNOCK
 *
 * The brief was the iPhone device-to-device moment — bring two phones
 * together and the screen takes a hit. Pulling that apart, it's four
 * things on the same frame and one thing before them:
 *
 *   before    light gathers at the edge the other device is approaching
 *   impact    a short, high-frequency rattle — hardware, not UI
 *   mass      a slow squash-and-stretch as the slab absorbs the rattle
 *   light     a bloom off the struck edge
 *   touch     a haptic burst on the same frame as the rattle
 *
 * EVERYTHING HAPPENS AT THE BOTTOM EDGE, and the thing that matters is not
 * which edge it is but that it is only ONE of them. An earlier pass had the
 * light gathering at the bottom while the wave crossed downward from the
 * top; energy arriving at one edge and the wave leaving from the other
 * reads as two unrelated animations colliding rather than one causing the
 * other. Everything — the charge, the flash, the squash origin, the shell's
 * pull, the wave — is anchored to the bottom now and travels upward, which
 * is also how the Figma section reads: Ellipse 6988 climbs 1108 → 808
 * between frames 3 and 4.
 *
 * The colour is Figma's Ellipse 6988 doing what Figma has it do, rendered
 * with the payment overlay's own bloom fields — see TripWash. There is one
 * light source and it comes up from the bottom edge, which is also where
 * the contact happens.
 *
 * The rattle and the wobble are separate oscillators (see wobble.ts)
 * because they're separate physics: 19Hz dying in half a second reads as
 * two hard surfaces meeting, 5.8Hz ringing for a second and a half reads
 * as the weight behind them. Run one without the other and it's either a
 * buzz with no body or a sway with no impact.
 *
 * The shake goes on the OUTER shell and the squash goes on the INNER
 * content, which is the part that took a few tries. Scaling the shell
 * itself pulls its rounded corners off the phone silhouette and shows the
 * page behind it — the device would be visibly changing shape. Scaling
 * only what's inside the clip means the glass stays rigid while the
 * picture on it deforms, which is what a screen actually does.
 *
 * Volume is preserved on the squash — scaleX up while scaleY goes down by
 * the same amount. Free-scaling both looks like a zoom; trading one
 * against the other is what makes it read as something being compressed.
 *
 * THE WAVE AND THE WASH
 *
 * Two separate things, and they were briefly conflated into one by mistake.
 * The WAVE is the ripple — the crest, its displacement bands and its glint,
 * ported from the WebGL reference in ripple.ts. The WASH is the background
 * colour it travels through, and that is the payment overlay's own bloom,
 * imported rather than re-tuned so the two beats share one source
 * (components/BloomFields). Swapping the background does not mean removing
 * the mechanic.
 *
 * THE WASH
 *
 * The knock is the cause; the wash is what it releases. Figma's section
 * 947:48238 draws it as Ellipse 6988 swelling and climbing — and the colour
 * itself is the payment overlay's, imported rather than re-tuned, so the
 * two beats are the same background (components/BloomFields).
 *
 * What the wash does to the screens is in washline.ts, and it is softer
 * than several earlier passes: no crest, no ring, no displacement bands.
 * Frame 3 shows the payment card sharp, the copy below it blurred and
 * dissolving, and the incoming screen faint underneath — a bottom-weighted
 * cross-dissolve with the colour rising through it. An earlier version drew
 * four displaced copies of the outgoing screen to bend its type per band,
 * which was cost spent on an effect the design does not ask for.
 *
 * `sweep` is a MotionValue rather than React state on purpose. It changes
 * every frame for nearly two seconds; as state that is ~110 renders of two
 * full screen layouts during the busiest moment in the sequence, and the
 * frames it drops land exactly where the effect has to be smooth.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function TripsScreen() {
  const [beat, setBeat] = useState<HandoffBeat>("idle");
  /* Separate from `beat` on purpose: the agents scrim is a state of the
     MyTrip screen, not a stage of the handoff, and folding it into the
     beat enum would mean every consumer of `beat` had to care about a
     phase that has nothing to do with the wave. */
  const [agents, setAgents] = useState<"hidden" | "working" | "dispersing">(
    "hidden",
  );
  /* Whether the progress track has been populated yet. The trip screen
     arrives with an empty bar and no orbs on it; the three agents fly down
     and settle onto it at the end of the overlay, and that landing is what
     turns this on. Separate from `agents` because it outlives the overlay
     — once the track is filled it stays filled. */
  const [orbsOnTrack, setOrbsOnTrack] = useState(false);
  const reduceMotion = useReducedMotion();

  const rattle = useOscillator();
  const body = useOscillator();
  const arrival = useOscillator();

  /* 0 → 1 as the wave crosses. Drives the band, both masks, both layers’
     blur and scale. */
  const sweep = useMotionValue(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /* The live sweep animation, so it can be stopped.
     This is not defensive tidiness — leaving it unstopped is a real bug.
     A spring keeps running past its visualDuration until it is inside
     restDelta, and at a low bounce that tail lasts well beyond the point
     the crossing looks finished. Re-running the sequence while the old
     spring is still technically alive means `sweep.set(0)` is overwritten
     on the very next frame by an animation still driving toward 1, so the
     replay begins with the wave already at the bottom of the screen: the
     charge plays over a screen that has silently finished transitioning. */
  const sweepAnim = useRef<ReturnType<typeof animate> | null>(null);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    sweepAnim.current?.stop();
    sweepAnim.current = null;
  }, []);

  const run = useCallback(() => {
    clearTimers();
    rattle.stop();
    body.stop();
    arrival.stop();
    sweep.set(0);

    const at = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms));
    };

    /* Scheduled rather than set inline. run() is called from an effect on
       mount as well as from the replay button, and a synchronous setState
       in an effect body costs a second render pass before the first frame
       of the sequence — on a screen carrying two full layouts that shows
       up as a hitch right where the timing has to be exact. */
    at(0, () => {
      setBeat("idle");
      setAgents("hidden");
      setOrbsOnTrack(false);
    });

    at(BEAT_AT.charging, () => setBeat("charging"));

    at(BEAT_AT.contact, () => {
      setBeat("contact");
      if (reduceMotion) return;
      /* One frame, three systems. Firing the haptic from the same callback
         as the oscillators rather than from an animation callback keeps the
         buzz on the impact instead of a frame or two behind it, which is
         where it stops feeling like the same event. */
      haptic("dragBreak");
      rattle.fire(RATTLE);
      body.fire(BODY);
    });

    at(BEAT_AT.sweeping, () => {
      setBeat("sweeping");
      sweepAnim.current = animate(
        sweep,
        1,
        reduceMotion
          ? { duration: 0.01 }
          : {
              /* A spring, not a bezier. An ease-out decelerates on a fixed
                 schedule and always lands dead — correct for a panel, wrong
                 for something described as liquid. A lightly-bouncy spring
                 carries momentum into the bottom edge and settles out of
                 it, which is the difference between a band being moved and
                 a body of fluid being thrown.

                 visualDuration rather than stiffness/damping: it means the
                 number here is the time you actually perceive the crossing
                 to take, so it can be held inside the 0.6–0.8s the brief
                 asked for while the bounce is tuned independently. */
              type: "spring",
              visualDuration: SWEEP_S,
              /* Down from 0.16. Any bounce at all on something this large
                 lands as a jolt at the bottom edge rather than as give —
                 0.05 keeps the spring's uneven, non-mechanical distribution
                 of speed without a visible rebound. */
              bounce: 0.05,
            },
      );
    });

    at(BEAT_AT.sweeping + 420, () => {
      if (reduceMotion) return;
      /* A single soft overshoot as MyTrip is uncovered, timed to land while
         the body wobble is still decaying. The two rings overlap for a
         moment and the new screen inherits the tail of the old one’s
         motion — that overlap is what makes it one object, not a swap. */
      arrival.fire(ARRIVAL);
      haptic("cardRise");
    });

    at(BEAT_AT.settled, () => setBeat("settled"));

    at(AGENTS_AT, () => setAgents("working"));
    at(DISPERSE_AT, () => setAgents("dispersing"));
    /* Hands the three orbs back. They finish the flight sitting exactly on
       the progress track's own discs, so this swap is invisible — but it
       has to happen, because the flying copies are pinned to the shell and
       the real ones live inside the scroll column. Leave the overlay
       holding them and they would stay put while the page moved under
       them. */
    /* The track fills under the orbs while the overlay still holds them,
       so the two are drawn on top of each other for the last 380ms. */
    at(ORBS_LAND_AT, () => setOrbsOnTrack(true));
    at(SEQUENCE_END, () => setAgents("hidden"));
  }, [arrival, body, clearTimers, rattle, reduceMotion, sweep]);

  /* Jump straight to the finished trip screen.
     The whole sequence is ~9s and the scroll column is the thing most
     worth reviewing, so it needs to be reachable without sitting through
     the handoff every reload. Everything downstream reads `sweep` and
     `beat`, so setting both to their end states is all this takes — no
     separate "skipped" mode to keep in sync. */
  const skip = useCallback(() => {
    clearTimers();
    rattle.stop();
    body.stop();
    arrival.stop();
    sweep.set(1);
    setBeat("settled");
    setAgents("hidden");
    /* Skip lands on the finished screen, and the finished screen has a
       populated track. */
    setOrbsOnTrack(true);
  }, [arrival, body, clearTimers, rattle, sweep]);

  /* The overlay on its own, for reviewing the landing without sitting
     through the handoff. It has to play the whole beat rather than just
     opening: the orbs end the sequence sitting on the progress track, and
     stopping at "working" would leave them hovering over a scrim with the
     track's own discs hidden behind it. */
  const playAgents = useCallback(() => {
    skip();
    const at = (ms: number, fn: () => void) => {
      timers.current.push(setTimeout(fn, ms));
    };
    at(0, () => {
      setAgents("working");
      /* skip() filled the track; empty it again so the preview shows what
         the agents actually do to it. */
      setOrbsOnTrack(false);
    });
    at(DISPERSE_AT - AGENTS_AT, () => setAgents("dispersing"));
    at(ORBS_LAND_AT - AGENTS_AT, () => setOrbsOnTrack(true));
    at(SEQUENCE_END - AGENTS_AT, () => setAgents("hidden"));
  }, [skip]);

  useEffect(() => {
    run();
    return clearTimers;
  }, [run, clearTimers]);

  /* ── Derived transforms ───────────────────────────────────────────── */

  /* Shell: translation and rotation only. The two rings are summed rather
     than crossfaded — they're independent forces on the same body, and the
     sum is what gives the movement its irregular, non-looping feel. The
     x and y coefficients differ so the shake has a direction (mostly
     lateral, a little vertical) instead of tracing a diagonal. */
  const shellX = useTransform(
    [rattle.value, body.value] as const,
    ([r, b]: number[]) => r * 2.2 + b * 0.9,
  );
  /* Negative: struck from below, the slab is driven UP and away from the
     contact. Softened again with the rest of the knock — the contact is
     the cause of the wave, and at these amplitudes it is something you
     register rather than something you watch. */
  const shellY = useTransform(
    [rattle.value, body.value, arrival.value] as const,
    ([r, b, a]: number[]) => r * -2.1 + b * -1.2 + a * -1.6,
  );
  const shellRotate = useTransform(
    [rattle.value, body.value] as const,
    ([r, b]: number[]) => r * 0.14 + b * 0.09,
  );

  /* Content: volume-preserving squash. The rattle contributes a small,
     fast component on top of the body's slow one so the deformation has
     texture rather than reading as a single smooth pulse. */
  const squash = useTransform(
    [rattle.value, body.value, arrival.value] as const,
    ([r, b, a]: number[]) => b * 0.019 + r * 0.005 + a * 0.008,
  );
  const contentScaleX = useTransform(squash, (s) => 1 + s);
  const contentScaleY = useTransform(squash, (s) => 1 - s);

  return (
    <div className="flex flex-col items-center gap-5">
      <motion.div
        /* The current beat, on the DOM. The sequence is timed in
           milliseconds and most of it is over in under two seconds, which
           makes it near-impossible to review by eye or to screenshot at a
           known point — a capture harness can wait on this instead of
           guessing when hydration finished. */
        data-beat={beat}
        className="relative select-none overflow-hidden rounded-[44px] bg-[#eceaef] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
        style={{
          width: 440,
          height: 965,
          x: shellX,
          y: shellY,
          rotate: shellRotate,
        }}
        /* Leans DOWN toward the approaching device before contact. Tiny on
           purpose — 4px and half a percent, enough to feel a pull without
           being able to name what moved. */
        animate={{
          scale: beat === "charging" ? 0.995 : 1,
          y: beat === "charging" ? 4 : 0,
        }}
        transition={{ duration: 0.85, ease: IN_EASE }}
      >
        <motion.div
          className="absolute inset-0"
          style={{
            scaleX: contentScaleX,
            scaleY: contentScaleY,
            /* Squashing about the BOTTOM edge. The impact is there, so that
               is the edge that cannot move — the deformation propagates
               away from it, the way a struck object compresses at the point
               of contact. */
            transformOrigin: "50% 100%",
          }}
        >
          <MyTripLayer
            beat={beat}
            sweep={sweep}
            orbsOnTrack={orbsOnTrack}
          />
          <PaymentDoneLayer beat={beat} sweep={sweep} />
          <TripWash beat={beat} sweep={sweep} />
          <WaveSweep
            sweep={sweep}
            /* Mounted a beat early so the cost of building four copies of
               the outgoing screen lands during the flash rather than on the
               first frame of the wave. */
            mounted={beat === "contact" || beat === "sweeping"}
            visible={beat === "sweeping"}
            /* Each displacement band draws its own copy of the outgoing
               screen — real content, actually displaced. */
            lens={<PaymentDoneLayer beat={beat} sweep={sweep} bare />}
          />

          {/* Contact flash — a brief bloom off the BOTTOM edge, where the
              two devices meet. Kept low and tight on purpose: an earlier
              pass ran this at full white on plus-lighter and it whited out
              two thirds of the frame, which reads as a rendering fault
              rather than an impact. The hit should be felt at the edge the
              colour is arriving from, not seen as a flashbulb. */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(74% 28% at 50% 104%, rgba(255,255,255,0.6) 0%, rgba(255,244,232,0.2) 50%, rgba(255,255,255,0) 100%)",
              mixBlendMode: "screen",
              zIndex: 8,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: beat === "contact" ? 0.26 : 0 }}
            transition={{
              /* Slower in and much slower out than the first pass. A 100ms
                 pop and a hard cut is a camera flash; this has to look like
                 the light that becomes the wave, so it lingers long enough
                 to still be dying while the bloom is on its way down. */
              duration: beat === "contact" ? 0.22 : 1.25,
              ease: "easeOut",
            }}
          />
        </motion.div>

        {/* Outside the squash wrapper: the scrim arrives long after the
            knock has decayed, and nesting it there would subject it to a
            deformation that is over. */}
        <AgentsOverlay phase={agents} />
      </motion.div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={skip}
          className="rounded-full bg-[#0b0b0b] px-3.5 py-1.5 text-[13px] text-white transition-colors hover:bg-[#26262c]"
        >
          Skip to trip
        </button>
        <button
          type="button"
          onClick={run}
          className="rounded-full bg-black/5 px-3.5 py-1.5 text-[13px] text-[#4b4b53] transition-colors hover:bg-black/10"
        >
          Replay handoff
        </button>
        <button
          type="button"
          onClick={playAgents}
          className="rounded-full bg-black/5 px-3.5 py-1.5 text-[13px] text-[#4b4b53] transition-colors hover:bg-black/10"
        >
          Agents overlay
        </button>
      </div>
    </div>
  );
}
