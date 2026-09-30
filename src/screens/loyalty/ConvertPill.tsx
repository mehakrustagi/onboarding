"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { ASSETS, CTA } from "./geometry";

/* "Convert to Pts" — Figma 1503:1113.
 *
 * SAME MATERIAL AS `NativeAIButton`, DIFFERENT SURFACE, so it is a
 * different component rather than a prop on that one. Both are built from
 * the identical five blurred ellipses (#5057EA, #B038C2, #C81E1E, #F59E0B,
 * #EDD758 — check `cta-gradient.svg` against that component's BLOBS array),
 * but:
 *
 *   - This one sits on a WHITE base (1503:1117) and that one deliberately
 *     has none. That single difference is the whole look: the white under
 *     the hotspots is why this reads pastel and that one reads as saturated
 *     glass over whatever is behind it.
 *   - 50px tall on an 84px radius, against 48 on 60.
 *   - No glass stack at all — no sheen, no dispersion fringe, no inner lip.
 *
 * `NativeAIButton` hardcodes `rounded-[60px]` across about fifteen places
 * and is pixel-calibrated against its own Figma node, so expressing this
 * through it would have meant threading a radius and a base-fill prop
 * through all of them and disabling most of its layers — a rewrite of a
 * signed-off component to reach a different design. The five shared
 * constants are not worth that risk. If a third pill ever appears, the
 * hotspot field is what to extract.
 *
 * The gradient is the exported SVG rather than five CSS ellipses because
 * Figma's 25px blur is baked into it as a filter — and the note in
 * NativeAIButton about Figma's blur radius not meaning what CSS's means
 * applies here too. Using the asset sidesteps the whole disagreement.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

export default function ConvertPill({
  onClick,
  disabled,
  label = "Convert to Pts",
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  const reduced = useReducedMotion() ?? false;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="absolute overflow-hidden"
      style={{
        left: CTA.x,
        top: CTA.y,
        width: CTA.w,
        height: CTA.h,
        borderRadius: CTA.radius,
        background: "#FFFFFF",
        cursor: disabled ? "default" : "pointer",
        zIndex: 8,
      }}
      whileTap={disabled || reduced ? undefined : { scale: 0.975 }}
      transition={{ duration: 0.18, ease: IN_EASE }}
    >
      {/* 1503:1120 / 1503:1126 — the hotspot field, stacked TWICE, exactly
          as Figma stacks it. The doubling is what gives the colours their
          density; one copy renders visibly washed out.

          The frame is 303.62 × 79.296 starting 58.59px in from the left
          edge, i.e. taller than the 50px pill and clipped by it — which is
          deliberate in the source, and why the colours run off the top and
          bottom instead of sitting in a band down the middle. */}
      {[0, 1].map((i) => (
        <motion.span
          key={i}
          aria-hidden
          className="pointer-events-none absolute block"
          style={{
            left: 58.59,
            top: (CTA.h - 79.296) / 2,
            width: 303.62,
            height: 79.296,
          }}
          /* The two copies drift against each other rather than sitting
             still. Same reasoning as the Native AI pill: a fixed gradient
             is a texture, and two identical layers sliding slowly through
             one another keep making new colour where they overlap. Kept
             small and slow — this is a CTA at the bottom of a screen whose
             subject is elsewhere, and it should not compete with the dial. */
          animate={
            reduced
              ? undefined
              : { x: i === 0 ? [0, 14, 0] : [0, -12, 0], scaleX: i === 0 ? [1, 1.05, 1] : [1, 0.96, 1] }
          }
          transition={
            reduced
              ? undefined
              : {
                  x: { duration: i === 0 ? 7.3 : 8.9, repeat: Infinity, ease: "easeInOut" },
                  scaleX: { duration: i === 0 ? 6.1 : 7.7, repeat: Infinity, ease: "easeInOut" },
                }
          }
        >
          <Image
            src={`${ASSETS}/cta-gradient.svg`}
            alt=""
            width={403.621}
            height={179.296}
            priority
            style={{
              position: "absolute",
              /* Figma's own inset. The blur needs room to spread past the
                 frame, and cropping it here would put a hard edge on a
                 gradient whose whole job is not to have one. */
              left: "-16.47%",
              top: "-63.05%",
              width: "132.94%",
              height: "226.1%",
              /* Tailwind preflight's `img { max-width: 100% }` would clamp
                 this to the frame's own width and throw away the bleed the
                 blur needs. See the longer note in PointsCard. */
              maxWidth: "none",
            }}
          />
        </motion.span>
      ))}

      {/* 1503:1132 — a flat 10% white over the lot, which is what lifts the
          whole pill toward the pastel in the reference. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: "rgba(255,255,255,0.1)", borderRadius: CTA.radius }}
      />

      {/* 1503:1137 and the loop glyph beside it. */}
      <span className="absolute inset-0 flex items-center justify-center gap-[7px]">
        <Image src={`${ASSETS}/loop.svg`} alt="" width={18} height={18} />
        <span
          className="text-black"
          style={{
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
          }}
        >
          {label}
        </span>
      </span>
    </motion.button>
  );
}
