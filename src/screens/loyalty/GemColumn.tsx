"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Strike from "./Strike";
import {
  ASSETS,
  CARD,
  GEM,
  GEM_GLOW,
  STREAM,
  STREAM_END_Y,
  STREAM_START_Y,
  TRAIL_BELOW,
  TRAIL_SRC,
} from "./geometry";

/* The gem and the things travelling past it — Figma 1503:1270 at rest,
 * 1503:2012 during the pull.
 *
 * At rest this is just the gem. During the pull the frame grows from 59px
 * tall to 185px, because three green trails appear ABOVE it heading for the
 * card and one silver one appears BELOW it heading up to meet it. That is
 * the "something is being pulled from the bottom" beat, drawn.
 *
 * WHAT THE TRAILS ARE AND WHY THEY ARE NOT A PARTICLE SYSTEM. They are
 * four exported assets at four fixed offsets — each one an arrow with a
 * tapering tail already drawn into it. Scattering procedural particles
 * instead would lose the one thing the reference has: the trails are
 * different LENGTHS and different weights, so they read as a few specific
 * things moving at different speeds rather than as an effect. Three is
 * also the right number; a dozen would read as confetti.
 */

/* THE GEM IS THE FIGMA ASSET (image 525), SPUN.
 *
 * It was briefly a Sketchfab embed of "Green rupee" by Legado 3D, and that
 * could not be made to work at this size. Three separate problems, in
 * order of how fatal they are:
 *
 *   1. The player needs a viewport. Sized to the gem's own 59×75 box it
 *      stopped rendering the model at all and drew its own error text
 *      ("…to fix it here."), a resize glyph, and an opaque band — straight
 *      over the middle of the screen.
 *   2. The Sketchfab watermark is permanent on a free embed. `ui_watermark`
 *      is a paid feature; at gem scale the logo was larger than the gem.
 *   3. A cross-origin document cannot be lit by this screen, so the green
 *      wash rising past it could never actually touch it.
 *
 * So this is image 525 — the artwork the frames are actually drawn with,
 * at exactly the size Figma places it — turned about its vertical axis.
 * A rupee is a flat-faced stone and spinning one edge-on is how they are
 * drawn everywhere, so a rotating sprite is not a cheat here; it is the
 * same read as the real thing, at 26×50, with no third-party chrome.
 *
 * See the note in the screen's header for what a self-hosted mesh would
 * buy instead. */

/* IT DOES NOT TURN. An earlier pass spun it about its vertical axis, and a
 * turning sprite is the one thing that gives away that it IS a sprite —
 * every half-turn it has to pass through edge-on, where a flat image has
 * nothing to show and the illusion collapses.
 *
 * Depth comes from the three things that make a still object read as
 * solid, none of which need it to move:
 *
 *   contact   a dark cast shadow under it. This is the big one. An object
 *             with no shadow is a decal; an object with one is standing
 *             on something.
 *   specular  a highlight that drifts slowly across the facets. Light
 *             moving over a surface is a depth cue on its own — the
 *             object stays put and only the reflection travels, which is
 *             exactly what a real stone under a moving light does.
 *   volume    the artwork's own faceting, which is already drawn in 3/4
 *             and is the reason this works at all.
 *
 * The glint is masked to the gem's own alpha, so it is light ON the stone
 * rather than a streak floating over it. */
const GLINT_S = 6.2;

/* The card's bottom edge — where the stream lands and the strikes fire. */
const STRIKE_Y = CARD.y + CARD.h;

/* How often a point leaves, in ms. The six lanes take 1.38–1.75s to make
 * the crossing, so at this rate roughly six or seven are in the air at
 * once — which is what the reference shows. Faster reads as a jet; slower
 * and the column visibly empties between points. */
const SPAWN_MS = 230;

/* THE RETURN TRIP IS SHORTER THAN THE OUTWARD ONE.
 *
 * Taking credit is the committed gesture: a point travels the whole way
 * from below the gem up into the card. Giving it back is a correction, and
 * it should feel like one — at the full span and duration it outlasted the
 * swipe that caused it and read as a second, equally weighty event going
 * the other way.
 *
 * 62% of the distance and 72% of the time. The distance still carries a
 * point past the gem (the gem sits 136 of the 268 units below the card
 * edge, and 62% of 268 is 166), which it must: the whole point of the
 * journey is being changed by the stone on the way. */
const RETURN_SPAN = 0.62;
const RETURN_TIME = 0.72;

/** Where the gem sits along the run, in the same units as the travel —
 *  the stream spans 588 → 320 and the gem's centre is at 456. */
const GEM_AT = 456 - STREAM_END_Y;

type Spark = { id: number; lane: (typeof STREAM)[number]; up: boolean };
type StrikeHit = { id: number; dx: number; up: boolean };

export default function GemColumn({
  /** 0 at rest, 1 while the points are flowing through. */
  lit,
  flowing,
  /** True only while the dial is actually turning. When it goes false the
   *  layer keeps animating (`flowing` lingers) so whatever is already in
   *  flight can land, but no new cycle begins. */
  emitting,
  /** 0–1, the share of the available credit the dial has selected. */
  spent,
  /** +1 while the dial is taking credit, −1 while it is giving it back. */
  flow,
}: {
  lit: number;
  flowing: boolean;
  emitting: boolean;
  spent: number;
  flow: 1 | -1;
}) {
  /* THE ENERGY RUNS BOTH WAYS.
   *
   * Scrolling the dial back is not "less of the same animation", it is the
   * opposite event: credit returning to the gem. So the stream reverses
   * end to end — the particles start at the card and fall to below the
   * gem, the arrows turn over to point the way they are going, and the
   * silver/green crossfade swaps, so a point leaves the card green and is
   * grey by the time it is under the stone. Which is the same rule as
   * forward travel, read backwards: the gem is what changes them.
   *
   * Everything below reads `up` rather than branching twice. */
  const up = flow > 0;
  const reduced = useReducedMotion() ?? false;

  /* ── The emitter ───────────────────────────────────────────────────── */

  const [sparks, setSparks] = useState<Spark[]>([]);
  const [strikes, setStrikes] = useState<StrikeHit[]>([]);
  const nextId = useRef(0);
  const lane = useRef(0);

  /* Spawns while the dial is turning and stops when it rests. The
     interval is the ONLY thing `emitting` controls — nothing already in
     the air is touched, which is the whole point of the rewrite.
     Re-created when the direction changes, so new points leave the right
     way without disturbing the ones already travelling. */
  useEffect(() => {
    if (!emitting || reduced) return;
    const spawn = () => {
      const l = STREAM[lane.current % STREAM.length];
      lane.current += 1;
      setSparks((list) => [...list, { id: nextId.current++, lane: l, up }]);
    };
    spawn();
    const t = setInterval(spawn, SPAWN_MS);
    return () => clearInterval(t);
  }, [emitting, reduced, up]);

  /* A point finishing is two events: it leaves the stream, and it strikes
     the edge it reached. */
  const retire = useCallback((sp: Spark) => {
    setSparks((list) => list.filter((x) => x.id !== sp.id));
    setStrikes((list) => [...list, { id: sp.id, dx: sp.lane.dx, up: sp.up }]);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 4 }} aria-hidden>
      {/* 1503:1277 — the soft ellipse the gem sits in. It is the gem's
          contact with the screen; without it the gem floats in a way that
          makes the whole middle of the composition feel unanchored.

          It BRIGHTENS AND GREENS with the flow, and it is doing MORE work
          than the Figma node asks of it: the gem is a cross-origin embed
          with its own lighting, so this screen cannot light it. The glow
          is what puts the green ON the gem from the outside — it is the
          whole reason the pull reads as the gem reacting rather than as
          an unrelated widget spinning in the middle of it. */}
      <motion.div
        className="absolute"
        style={{
          left: GEM_GLOW.x,
          top: GEM_GLOW.y,
          width: GEM_GLOW.w,
          height: GEM_GLOW.h,
          borderRadius: "50%",
          /* ZERO AT REST. This used to sit at 0.1 alpha all the time, so
             there was a permanent green haze behind the gem even on the
             idle frame — and the artwork ALREADY carries its own glow
             baked into its alpha, so the two stacked into a halo that is
             in neither reference frame. 1503:1270 is a clean gem on a
             clean scrim; the green only arrives with the points.

             Multiplied by `lit`, not added to it, so at rest the layer
             contributes literally nothing. */
          background: `radial-gradient(closest-side, rgba(43,255,126,${lit * 0.55}) 0%, rgba(43,255,126,${lit * 0.24}) 55%, rgba(43,255,126,0) 100%)`,
          filter: `blur(${8 + lit * 8}px)`,
          transform: `scale(${1 + lit * 0.5})`,
          opacity: lit,
        }}
      />

      {/* The gem itself, at Figma's 26.141 × 50 on (206.926, 430.982). */}
      <div className="absolute" style={{ left: GEM.x, top: GEM.y, width: GEM.w, height: GEM.h }}>
        {/* Contact shadow. Sits just under the gem's lowest point, wider
            than it is tall so it reads as a shadow cast onto a surface
            rather than a halo around a floating object. It is the single
            cheapest thing that turns a flat sprite into something
            standing on the screen. */}
        <div
          className="absolute"
          style={{
            left: "50%",
            bottom: -5,
            width: GEM.w * 1.5,
            height: 9,
            transform: "translateX(-50%)",
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 55%, rgba(0,0,0,0) 100%)",
            filter: "blur(3px)",
          }}
        />

        <Image
          src={`${ASSETS}/gem.png`}
          alt=""
          width={GEM.w * 4}
          height={GEM.h * 4}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        />

        {/* THE GEM SPENDS ITSELF.
        
            The same artwork again, desaturated, revealed from the bottom
            up in proportion to how much of the available credit the dial
            has taken: at half the balance the lower half of the stone has
            gone to stone-grey, and at the full ₹12,800 none of the green
            is left. It is the clearest read on the screen of what the
            number actually MEANS — the dial says ₹6,400, and the gem says
            "half of what you have".

            Bottom-up because that is how a thing drains. Greying from the
            top would read as the gem being lit from below rather than
            being used up.

            A MASK, NOT A CLIP. `clip-path` would cut a hard horizontal
            line across a faceted stone, which looks like a rendering
            seam; the 7% gradient band makes the colour leave the crystal
            gradually, the way the eye expects a material change to.
            Masking also keeps the gem's own alpha intact, so the grey
            follows the silhouette instead of filling its bounding box. */}
        <Image
          src={`${ASSETS}/gem.png`}
          alt=""
          width={GEM.w * 4}
          height={GEM.h * 4}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            /* Desaturated, and lifted a little: a straight `grayscale(1)`
               on this art reads as a dark smudge rather than stone,
               because the green it is replacing is much brighter than its
               own luminance. */
            filter: "grayscale(1) brightness(1.12)",
            maskImage: `linear-gradient(180deg, transparent ${Math.max(0, (1 - spent) * 100 - 3.5)}%, #000 ${Math.min(100, (1 - spent) * 100 + 3.5)}%)`,
            WebkitMaskImage: `linear-gradient(180deg, transparent ${Math.max(0, (1 - spent) * 100 - 3.5)}%, #000 ${Math.min(100, (1 - spent) * 100 + 3.5)}%)`,
            /* Nothing to show at zero, and the mask alone would still
               paint a hairline at the very bottom edge. */
            opacity: spent > 0.001 ? 1 : 0,
          }}
        />

        {/* NO LIT-STATE CROSS-FADE. `gem-lit.png` (frame 2's "image 525")
           is the SILVER variant of the rupee, not a greener one — fading
           it in turned the gem WHITE at exactly the moment it is supposed
           to be at its greenest. The asset was misread on the way in;
           frame 2's gem looks greener than frame 1's because of the glow
           and the trails around it, not because the sprite changes.

           The green now comes entirely from the glow behind it, which is
           driven by the same `lit` value. */}

        {/* The travelling specular. Masked to the gem's own alpha channel
            so it can only appear ON the stone — unmasked it is a white
            bar crossing a dark screen, which is worse than no highlight
            at all. `screen` so it adds light to the facets underneath
            instead of painting over them. */}
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{
            maskImage: `url(${ASSETS}/gem.png)`,
            WebkitMaskImage: `url(${ASSETS}/gem.png)`,
            maskSize: "100% 100%",
            WebkitMaskSize: "100% 100%",
            mixBlendMode: "screen",
            pointerEvents: "none",
          }}
        >
          <motion.div
            className="absolute"
            style={{
              top: "-40%",
              height: "180%",
              width: "58%",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0) 100%)",
              filter: "blur(2px)",
              rotate: -22,
            }}
            /* Explicit initial so server and client render the same
               transform; framer inferring it from the first keyframe is
               what caused a hydration mismatch elsewhere on this screen. */
            initial={{ left: "-60%" }}
            animate={reduced ? { left: "20%" } : { left: ["-60%", "100%"] }}
            transition={
              reduced
                ? { duration: 0 }
                : {
                    duration: GLINT_S,
                    repeat: Infinity,
                    ease: "easeInOut",
                    /* Most of the cycle is the gap between passes. A
                       highlight that sweeps continuously reads as a
                       scanning effect; one that crosses, then leaves the
                       stone alone for four seconds, reads as light. */
                    repeatDelay: 2.4,
                  }
            }
          />
        </motion.div>
      </div>

      {/* THE STREAM — real particles, spawned and retired.
      
          THIS WAS SIX INFINITE LOOPS AND IT COULD NOT BE STOPPED WELL.
          Looping animations have to be halted by changing their
          transition, and changing a running framer transition restarts it
          from the first keyframe — so the moment the dial came to rest
          every point in the air snapped BACK to its launch position and
          flew the journey again. Reversing direction had the same fault
          from the other side: the keyframes swapped under particles that
          were halfway across, and they were dragged backwards.

          Each point is now its own element with a one-shot animation. It
          is spawned, it travels once, it reports done and is removed. Two
          things follow for free, and both were asked for:

            stopping   is simply not spawning another. Whatever is in the
                       air keeps its own animation and lands normally.
            reversing  only affects points spawned AFTER it. Direction is
                       captured at spawn, so nothing already travelling is
                       ever re-aimed.

          The arrival is what fires the strike — `onDone` hands the lane
          over — so the burst at the card edge is now caused by a point
          getting there rather than scheduled to coincide with it. */}
      {sparks.map((sp) => {
        const art = TRAIL_SRC[sp.lane.k];
        const full = STREAM_START_Y - STREAM_END_Y;
        const travel = sp.up ? full : full * RETURN_SPAN;
        const dur = sp.lane.dur * (sp.up ? 1 : RETURN_TIME);
        /* Where in the journey the gem is crossed, which is where the
           colour changes. It is NOT the same fraction both ways: going up
           the point starts below the gem and reaches it 49% of the way
           in, while coming down it starts at the card and the gem is most
           of the trip away — and on a shortened run, further still. */
        const cross = sp.up ? (full - GEM_AT) / full : GEM_AT / travel;
        const fade: [number, number, number, number] = [
          0,
          Math.max(0.02, cross - 0.07),
          Math.min(0.98, cross + 0.07),
          1,
        ];
        return (
          <motion.div
            key={sp.id}
            className="absolute"
            style={{
              left: 220 - art.w / 2 + sp.lane.dx,
              top: STREAM_END_Y - art.h,
              width: art.w,
              height: art.h,
              /* The art is an arrow with its tail behind it, so going the
                 other way it has to turn over — otherwise the tail leads
                 and the whole thing reads as moving backwards. */
              rotate: sp.up ? 0 : 180,
            }}
            initial={{ opacity: 0, y: sp.up ? travel : 0, scaleY: 0.8 }}
            animate={{
              opacity: [0, 0.95, 0.95, 0],
              y: sp.up ? 0 : travel,
              scaleY: 1.25,
            }}
            transition={{
              /* `easeIn`: fastest at the instant it arrives. Easing out
                 would have each point slowing as it reached the card,
                 which is what something does when it runs out of energy —
                 the opposite of being pulled. */
              y: { duration: dur, ease: "easeIn" },
              scaleY: { duration: dur, ease: "easeIn" },
              /* Up fast while it is still slow and legible, gone just
                 before it lands so it is absorbed rather than piling up
                 against the edge. */
              opacity: {
                duration: dur,
                times: [0, 0.18, 0.72, 1],
                ease: "linear",
              },
            }}
            onAnimationComplete={() => retire(sp)}
          >
            {/* SILVER GOING IN, GREEN COMING OUT — and the other way round
                on the way back down.

                1503:2012 draws the trails below the gem in silver and
                those above it in green, so a point is CHANGED by the gem
                rather than merely passing it. That is the whole claim the
                screen makes about what the gem does.

                Two copies of the SAME art cross-fading through a
                `grayscale` filter, never two different assets — the
                shapes have to match exactly through the transition or the
                star appears to swap for a different one mid-flight. The
                crossover sits at 0.49 of the travel, which is where the
                gem's centre falls: the run is 588 → 320 and the gem is at
                456, so (588 − 456) / (588 − 320) = 0.49. */}
            <motion.div
              className="absolute inset-0"
              style={{ filter: "grayscale(1) brightness(1.45)" }}
              initial={{ opacity: sp.up ? 1 : 0 }}
              animate={{ opacity: sp.up ? [1, 1, 0, 0] : [0, 0, 1, 1] }}
              transition={{ duration: dur, times: fade, ease: "linear" }}
            >
              <Image
                src={`${ASSETS}/${art.src}`}
                alt=""
                width={art.w}
                height={art.h}
                style={{ width: "100%", height: "100%" }}
              />
            </motion.div>
            <motion.div
              className="absolute inset-0"
              initial={{ opacity: sp.up ? 0 : 1 }}
              animate={{ opacity: sp.up ? [0, 0, 1, 1] : [1, 1, 0, 0] }}
              transition={{ duration: dur, times: fade, ease: "linear" }}
            >
              <Image
                src={`${ASSETS}/${art.src}`}
                alt=""
                width={art.w}
                height={art.h}
                style={{ width: "100%", height: "100%" }}
              />
            </motion.div>
          </motion.div>
        );
      })}

      {/* THE STRIKES — one per arrival, at the lane it arrived in.
      
          No collision detection, for the same reason Aceternity's version
          needs it and this one does not: their beams fall on their own
          schedule and have to be watched for, where each of these is
          handed over by the point that just finished its journey. */}
      <div className="absolute inset-0" style={{ top: STRIKE_Y }}>
        {strikes.map((st) => (
          <Strike
            key={st.id}
            dx={st.dx}
            flip={!st.up}
            onDone={() => setStrikes((list) => list.filter((x) => x.id !== st.id))}
          />
        ))}
      </div>

      {/* Emission gates this layer's opacity, never its transition. */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: emitting ? 1 : 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
      {/* 1503:2019 — the silver one below. It is the only trail travelling
          INTO the gem rather than out of it, which is what sells the gem as
          the thing doing the converting: something dull goes in underneath,
          something green comes out on top.

          Same accelerating ease as the stream above, so the whole column
          reads as one current rather than two effects that happen to point
          the same way. */}
      <motion.div
        className="absolute"
        style={{
          left: TRAIL_BELOW.x,
          top: TRAIL_BELOW.y,
          width: TRAIL_BELOW.w,
          height: TRAIL_BELOW.h,
          rotate: up ? 0 : 180,
        }}
        initial={{ opacity: 0, y: up ? 72 : -30 }}
        animate={
          flowing && !reduced
            ? { opacity: [0, 0.8, 0], y: up ? [72, -30] : [-30, 72] }
            : { opacity: 0, y: up ? 72 : -30 }
        }
        /* Full config per property — see the note on the stream above. */
        transition={
          flowing && !reduced
            ? {
                /* Loops unconditionally. Stopping it by changing `repeat`
                   is what restarted the stream's particles from their
                   launch point, so this one is faded out by the wrapper
                   above instead and its own cycle is never interrupted. */
                y: { duration: 1.42, repeat: Infinity, delay: 0.16, ease: "easeIn" },
                opacity: {
                  duration: 1.42,
                  repeat: Infinity,
                  delay: 0.16,
                  times: [0, 0.3, 1],
                  ease: "linear",
                },
              }
            : { duration: 0.25 }
        }
      >
        <Image
          src={`${ASSETS}/trail-below.svg`}
          alt=""
          width={TRAIL_BELOW.w}
          height={TRAIL_BELOW.h}
          style={{ width: "100%", height: "100%" }}
        />
      </motion.div>
      </motion.div>
    </div>
  );
}
