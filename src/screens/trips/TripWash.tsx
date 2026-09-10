"use client";

import { motion, useTransform, type MotionValue } from "framer-motion";
import BloomFields from "@/components/BloomFields";
import type { HandoffBeat } from "./beats";
import { ORIGIN_X, ORIGIN_Y0 } from "./ripple";

/* The wash that carries the handoff, using the payment overlay's own colour
 * animation.
 *
 * Figma's Ellipse 6988 is where this started and its geometry is recorded
 * below for reference, but the tuning has deliberately moved away from it:
 * the wash is now concentrated on the ripple's source rather than spread
 * flat across the bottom, and it does not survive the transition. Both were
 * asked for directly and both beat the Figma reading in motion, which the
 * static frames cannot show.
 *
 * The fields, their drift and their multiply blending are imported rather
 * than re-tuned (see components/BloomFields), so this is literally the
 * background from the payment beat. What is local to this file is the
 * travel, and that comes from Figma's three frames in section 947:48238:
 *
 *   frame 2 (947:42055)   745.0 wide at (-152.5, 708.2)   centre (220, 1080.7)
 *   frame 3 (947:43110)  1130.7 wide at (-345.3, 542.9)   centre (220, 1108.2)
 *   frame 4 (947:43783)  1130.7 wide at (-345.3, 242.9)   centre (220,  808.2)
 *
 * Two things and only two: it swells (745 → 1131) and it climbs (centre
 * 1108 → 808, about 270px). It never leaves the bottom of the frame — even
 * settled, most of its mass is below the screen — so unlike the
 * post-payment beat there is no launch here and no mask flip. What you see
 * is the top of a large body of colour pushing up into the lower half.
 *
 * The container is 1240 tall against a 965 screen on purpose: the surplus
 * hangs off the bottom and is what keeps the lower edge covered once the
 * wash has climbed. Its top edge is feathered by a mask because in the
 * reference the colour has no boundary at all — it just becomes the white
 * screen somewhere around the middle — and without the mask the fields end
 * on a visible line however much they are blurred.
 */

/* CENTRED AND DENSE ON THE RIPPLE'S SOURCE.
 *
 * The wash is the light the ripple is born out of, so its densest point is
 * the ripple's own origin — imported from ripple.ts rather than repeated,
 * because those two drifting apart is exactly the bug worth preventing.
 *
 * The imported bloom fields are laid out for a full-bleed background: they
 * span roughly x -250..890 and y 235..660 in their own coordinates, over
 * 1100px wide. Dropped straight onto a 440 shell that reads as a broad even
 * tint across the whole bottom edge — colour everywhere and dense nowhere.
 * So the arrangement is scaled DOWN about its own centre, which pulls the
 * four fields into each other: they overlap harder, the multiply blending
 * compounds, and the result is a concentrated core with a soft falloff
 * instead of a wide flat wash.
 *
 * FIELD_CX / FIELD_CY are that centre in container coordinates; the
 * container is then placed so the centre lands exactly on the source. */
const FIELD_CX = 320;
const FIELD_CY = 450;

/* Tightness. Below about 0.5 the fields stop overlapping enough to mix and
 * you get four visible discs; above about 0.8 the spread returns. */
const REST_SCALE = 0.62;

/* Vertical offset per beat, px, against BASE_TOP. Negative climbs.
 *
 * THE WASH DOES NOT MOVE BEFORE CONTACT. An earlier version had it sit at
 * 0.55 opacity on idle and then animate to full with a scale bump over
 * 900ms as the charge began — so the first thing you saw on the payment
 * screen was a gradient rising up the screen and stopping, for no reason
 * the story had given yet. It read as the transition misfiring.
 *
 * Frame 2 of the Figma section is a still: the wash is simply THERE at the
 * bottom of the payment screen, part of the furniture. It only moves when
 * the handoff moves it. So idle, charging and contact are all the same
 * resting state now, and everything from contact onward is carried by
 * `sweep`. The charge is told by the shell's lean and the contact flash,
 * which are cheap, local and don't imply the page is already changing. */
const REST = 0;

const RISE: Record<HandoffBeat, number> = {
  idle: REST,
  charging: REST,
  contact: REST,
  /* The climb is driven by `sweep`, not by the beat; these are only the
     endpoints it interpolates between. Frame 3 → 4 lifts Ellipse 6988's
     centre 1108 → 808. */
  sweeping: REST,
  settled: REST - 300,
};

/* Held flat too. The 745 → 1131 swell Figma draws between frames 2 and 3 is
 * a change to the ellipse's SIZE across the transition, not something the
 * resting screen should be seen doing — scaling the wash while it sat still
 * was the other half of what made it look like it was going off early. */
/* The swell across the transition: Figma's ellipse grows 745 -> 1131
 * between frames 2 and 3, so the concentrated resting bloom opens out as it
 * climbs rather than travelling as a fixed blob. */
const SETTLED_SCALE = REST_SCALE * 1.52;

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function TripWash({
  beat,
  sweep,
}: {
  beat: HandoffBeat;
  sweep: MotionValue<number>;
}) {
  /* The beat sets where the wash rests; the sweep carries it the rest of
     the way up. Combined into one value so no frame exists where control
     of the position changes hands. */
  const travel = useTransform(sweep, [0, 1], [0, RISE.settled - RISE.contact]);
  /* The swell rides the sweep as well, so the ellipse grows as it climbs
     rather than snapping to size at the moment of contact. */
  const swell = useTransform(sweep, [0, 1], [REST_SCALE, SETTLED_SCALE]);

  /* Gone by the time the ripple is. The wash is the light the wave is born
     out of, so it has no business outliving it — left in, it sits under the
     settled MyTrip screen as a permanent tint on a screen that in every
     other respect has finished arriving. It goes out over the back half of
     the sweep so the fade is buried under the wave's own movement rather
     than being a separate thing you watch happen afterwards. */
  const fade = useTransform(sweep, [0, 0.5, 1], [1, 1, 0]);

  return (
    <motion.div
      className="pointer-events-none absolute"
      aria-hidden
      style={{ left: 0, right: 0, top: 0, height: 965, zIndex: 4, y: travel, opacity: fade }}
    >
      <motion.div
        className="absolute"
        style={{
          /* Placed so the fields' centre sits on the ripple's source. */
          left: ORIGIN_X - FIELD_CX,
          top: ORIGIN_Y0 - FIELD_CY,
          width: 720,
          height: 1240,
          scale: swell,
          /* Scaled about that same point, so tightening the bloom pulls it
             toward the source rather than toward a container corner. */
          transformOrigin: `${FIELD_CX}px ${FIELD_CY}px`,
          /* isolation:auto — the wrapper animates opacity, and an
             animated-opacity group becomes its own stacking context, which
             would trap the fields' multiply inside it and blend them
             against nothing. */
          isolation: "auto",
          /* Radial rather than the linear top-edge feather the payment beat
             uses. That one exists to stop a full-bleed wash ending on a
             visible horizontal line; here the wash is a concentrated bloom
             with a centre, so it has to fall off in every direction from
             that centre or it reads as a disc with a soft top and hard
             sides. */
          maskImage: `radial-gradient(closest-side at ${FIELD_CX}px ${FIELD_CY}px, #000 0%, rgba(0,0,0,0.92) 42%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.18) 86%, transparent 100%)`,
          WebkitMaskImage: `radial-gradient(closest-side at ${FIELD_CX}px ${FIELD_CY}px, #000 0%, rgba(0,0,0,0.92) 42%, rgba(0,0,0,0.55) 68%, rgba(0,0,0,0.18) 86%, transparent 100%)`,
        }}
        initial={false}
        animate={{ y: RISE[beat] }}
        transition={{ duration: 0.9, ease: IN_EASE }}
      >
        <BloomFields />

        {/* Floor pool. The four fields give the wash its movement, but
            movement alone reads as weightless — this is the ballast: a
            wide, flat, near-static band pinned low that the moving colour
            sits ON, so the bottom never lifts off. */}
        <motion.div
          className="absolute"
          style={{
            left: -150,
            top: 640,
            width: 1020,
            height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(200,182,240,0.86) 0%, rgba(238,186,246,0.58) 38%, rgba(250,188,182,0.4) 70%, rgba(250,236,186,0.24) 100%)",
            filter: "blur(72px)",
            mixBlendMode: "multiply",
          }}
          animate={{ x: [0, 46, -34, 0], scaleX: [1, 1.06, 0.97, 1] }}
          transition={{
            x: { duration: 9.5, repeat: Infinity, ease: "easeInOut" },
            scaleX: { duration: 7.2, repeat: Infinity, ease: "easeInOut" },
          }}
        />

        {/* Light travelling through the colour, on plus-lighter so it ADDS
            light where it passes rather than painting over — colour it
            crosses brightens and blooms instead of being covered. Wide and
            heavily blurred, so it reads as illumination moving through the
            wash rather than an object sliding across it. */}
        <motion.div
          className="absolute"
          style={{
            left: -340,
            top: 590,
            width: 700,
            height: 340,
            borderRadius: "50%",
            background:
              "radial-gradient(closest-side, rgba(255,246,232,0.62) 0%, rgba(255,242,224,0.4) 30%, rgba(255,238,214,0.2) 62%, rgba(255,255,255,0) 100%)",
            filter: "blur(96px)",
            mixBlendMode: "plus-lighter",
          }}
          animate={{
            x: [0, 900],
            opacity: [0, 0.35, 0.62, 0.4, 0],
            scaleY: [0.92, 1.2, 1, 1.12, 0.92],
            scaleX: [1, 1.18, 1],
          }}
          transition={{
            x: { duration: 9.4, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: 9.4, repeat: Infinity, ease: "easeInOut" },
            scaleY: { duration: 7.8, repeat: Infinity, ease: "easeInOut" },
            scaleX: { duration: 6.1, repeat: Infinity, ease: "easeInOut" },
          }}
        />
      </motion.div>
    </motion.div>
  );
}
