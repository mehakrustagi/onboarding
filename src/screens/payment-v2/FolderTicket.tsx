"use client";

import Image from "next/image";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/* Atlys pass "folder ticket" — Figma nodes 52:16893 (folder body) +
 * 52:16898 (barcode capsule) + 52:16900 ("ATLYS" barcode text).
 *
 * Layer stack (top → bottom on screen, drawn in reverse):
 *   1. Ambient glow behind the folder (subtle radial bloom)
 *   2. Folder body — 271×162 rounded manila-folder shape with a tab in
 *      the top-left corner, semi-transparent frost fill + backdrop-blur
 *   3. Barcode capsule — 317.554×87 rounded pill with a light→dark
 *      vertical gradient, overlapping the folder's bottom edge
 *   4. Sweeping shine bar that travels L→R over the capsule
 *   5. "ATLYS" text in the Libre Barcode 39 Extended Text font, centered
 *      on the capsule with a soft white glow so it reads as illuminated
 *
 * The whole component listens to a 3-axis parallax tilt driven by
 * mouse position on desktop; on touch it's static, defaulting to a
 * gentle idle float on the y-axis. */

type Props = {
  /** Where the folder's top-left corner sits on the 440×965 canvas. */
  x?: number;
  y?: number;
  /** Enter animation timings. */
  delay?: number;
  duration?: number;
  /** Optional content rendered BETWEEN the folder body (backside) and
   *  the barcode capsule (frontside). Use this to slot images/cards
   *  "into" the folder — they sit on top of the folder shell but under
   *  the barcode capsule, so the front pocket covers their bottoms. */
  middleContent?: React.ReactNode;
};

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Progressive-blur bands for the capsule frost. Each band applies a
 * gentle blur over a masked slice of the pocket; because every band also
 * blurs whatever the bands beneath it already blurred, the radii
 * accumulate top → bottom into a smooth ramp with no visible step. The
 * masks overlap heavily on purpose — the crossfades are what remove the
 * hard edge that made a single flat layer look synthetic. */
const FROST_BANDS = [
  {
    blur: 3,
    mask: "linear-gradient(to bottom, transparent 0%, black 22%, black 100%)",
  },
  {
    blur: 6,
    mask: "linear-gradient(to bottom, transparent 10%, black 45%, black 100%)",
  },
  {
    blur: 10,
    mask: "linear-gradient(to bottom, transparent 32%, black 72%, black 100%)",
  },
  {
    blur: 14,
    mask: "linear-gradient(to bottom, transparent 55%, black 95%, black 100%)",
  },
] as const;

/* Silhouette of the folder body, lifted verbatim from
 * folder-backside.svg (renders 1:1 at 271×162). */
export const FOLDER_PATH =
  "M0 17.5238C0 7.84567 7.84568 0 17.5238 0L41.7283 0C44.3546 0 46.9473 0.590326 49.3148 1.72733L61.0111 7.34467C63.3785 8.48167 65.9713 9.072 68.5976 9.072H253.476C263.154 9.072 271 16.9177 271 26.5958V144.476C271 154.154 263.154 162 253.476 162H17.5238C7.84567 162 0 154.154 0 144.476V17.5238Z";

/* Silhouette of the barcode capsule, lifted verbatim from
 * folder-frontside.svg. The SVG renders 1:1 at 317.554×87, so the path
 * doubles as a CSS clip-path in px with no scaling needed. */
const CAPSULE_PATH =
  "M21.5242 0.547852H296.03C300.062 0.547852 303.052 0.548035 305.401 0.748047C307.745 0.94761 309.397 1.34299 310.767 2.09961C313.235 3.46233 315.167 5.62224 316.248 8.22559C316.848 9.67097 317.058 11.3559 316.997 13.707C316.935 16.0642 316.604 19.0363 316.157 23.0439L312.207 58.4844C311.645 63.5241 311.227 67.2728 310.661 70.2373C310.096 73.1951 309.392 75.3308 308.279 77.1504C306.289 80.4031 303.388 82.9991 299.934 84.6162C298.003 85.5207 295.802 85.9844 292.8 86.2178C289.791 86.4516 286.019 86.4521 280.948 86.4521H36.6063C31.5355 86.4521 27.7636 86.4516 24.7547 86.2178C21.7525 85.9844 19.5516 85.5207 17.6199 84.6162C14.1668 82.9991 11.2648 80.4031 9.2752 77.1504C8.16224 75.3308 7.45789 73.1951 6.89337 70.2373C6.32758 67.2728 5.90924 63.5241 5.34747 58.4844L1.39727 23.0439C0.950547 19.0363 0.618903 16.0642 0.55743 13.707C0.496141 11.3559 0.706422 9.67097 1.30645 8.22559C2.38733 5.62224 4.3194 3.46233 6.78692 2.09961C8.15707 1.34299 9.8093 0.94761 12.1531 0.748047C14.5025 0.548036 17.4921 0.547852 21.5242 0.547852Z";

export default function FolderTicket({
  x = 93,
  y = 655,
  delay = 0,
  duration = 0.85,
  middleContent,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Idle float — the ticket bobs a hair on the y-axis so it feels alive
  // even at rest.
  const [t, setT] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const loop = (now: number) => {
      setT((now - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  const idleFloat = Math.sin(t * 1.6) * 1.5; // ±1.5px

  // Cursor tilt — mouse position drives subtle rotateX/Y for parallax.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useTransform(mx, [-1, 1], [-6, 6]);
  const rotateX = useTransform(my, [-1, 1], [4, -4]);
  const glowShift = useTransform(mx, [-1, 1], [-8, 8]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set(((e.clientX - r.left) / r.width - 0.5) * 2);
    my.set(((e.clientY - r.top) / r.height - 0.5) * 2);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      className="absolute"
      style={{
        left: x,
        top: y + idleFloat,
        width: 271,
        height: 250, // folder 162 + capsule 87 - overlap 0 (visual container)
        perspective: 1200,
        zIndex: 2,
      }}
    >
      <motion.div
        ref={containerRef}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-full w-full"
        // No `transform-style: preserve-3d` here on purpose: it puts the
        // subtree into a 3D rendering context, and Chromium refuses to
        // sample a backdrop inside one — which silently kills the frost
        // layers' backdrop-filter. Every child is a flat 2D layer, so
        // the rotateX/rotateY tilt reads identically without it.
        style={{ rotateX, rotateY }}
        initial={{ opacity: 0, y: 46, scale: 0.92, rotateX: 22 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
        transition={{ delay, duration, ease: IN_EASE }}
      >
        {/* Ambient glow — soft white bloom BEHIND the folder to lift it
            off the dim page. Shifts with the cursor tilt for a slight
            spec-highlight feel. */}
        <motion.div
          className="pointer-events-none absolute rounded-[24px]"
          style={{
            left: -18,
            top: -12,
            width: 271 + 36,
            height: 174,
            background:
              "radial-gradient(60% 65% at 50% 40%, rgba(255,255,255,0.32) 0%, rgba(255,255,255,0.06) 60%, transparent 100%)",
            filter: "blur(6px)",
            x: glowShift,
          }}
        />

        {/* Folder body — the manila shape from Figma, semi-transparent
            frost with backdrop blur so the page shows through faintly. */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: 0,
            top: 0,
            width: 271,
            height: 162,
          }}
        >
          {/* Backdrop blur, clipped to the folder silhouette — same fix
              as the capsule: the SVG's own blur is a foreignObject
              backdrop-filter and goes inert as an <img>. Sits under the
              artwork so the folder's white fill still reads on top. */}
          <div
            className="absolute"
            style={{
              left: 0,
              top: 0,
              width: 271,
              height: 162,
              clipPath: `path("${FOLDER_PATH}")`,
              // No saturate boost — punching up colour behind frosted
              // glass is what makes it read as a filter rather than a
              // material.
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.10), rgba(255,255,255,0.20))",
            }}
          />

          <Image
            src="/assets/payment/folder-backside.svg"
            alt=""
            width={271}
            height={162}
            style={{
              width: 271,
              height: 162,
              display: "block",
              position: "relative",
              // Shadow on the artwork, not the wrapper — a filtered
              // ancestor would neutralise the backdrop-filter above.
              filter: "drop-shadow(0 20px 30px rgba(0,0,0,0.25))",
            }}
          />
        </div>

        {/* Middle content — sits ON the folder body but UNDER the
            barcode capsule. Anything passed via `middleContent` renders
            here (e.g. photos tucked "into" the folder pocket). */}
        {middleContent && (
          <div className="pointer-events-none absolute inset-0">
            {middleContent}
          </div>
        )}

        {/* Barcode capsule — sits BELOW the folder body but overlaps its
            bottom edge slightly so the two feel joined, like a receipt
            tucked into the folder pocket. No separate entrance motion:
            the whole folder (body + capsule + barcode) rises in as ONE
            unit through the parent motion wrapper. */}
        <div
          className="absolute overflow-hidden"
          style={{
            left: -30, // Figma 70:19891: capsule x=57 against folder x=87
            top: 91,
            width: 317.554,
            height: 87,
          }}
        >
          {/* Frost — the Figma SVG carries its blur as a foreignObject
              backdrop-filter, which is inert once the file is loaded as
              an <img>, so the frost has to live in the DOM.

              A single flat blur layer reads as a plastic slab: the eye
              catches the hard line where sharp photo meets fully-blurred
              photo. Real frosted glass ramps instead, so this is a
              progressive stack — each band feathered in with a mask and
              blurring what the bands above it already blurred, which
              compounds into a smooth gradient rather than a step. */}
          {FROST_BANDS.map((band, i) => (
            <div
              key={i}
              className="pointer-events-none absolute"
              style={{
                left: 0,
                top: 0,
                width: 317.554,
                height: 87,
                clipPath: `path("${CAPSULE_PATH}")`,
                backdropFilter: `blur(${band.blur}px)`,
                WebkitBackdropFilter: `blur(${band.blur}px)`,
                maskImage: band.mask,
                WebkitMaskImage: band.mask,
              }}
            />
          ))}

          {/* Milky wash — sits above the blur bands.

              This is what makes the pocket read as frosted FROM THE FIRST
              FRAME. backdrop-filter only blurs what's behind it, and until
              the reel arrives there's nothing back there but flat page
              colour — blurring a flat surface changes nothing, so on the
              blur alone the capsule looked like plain glass for the first
              two phases and only turned frosted once images passed behind
              it. The wash carries the material regardless of backdrop, and
              the bright 4% band at the top is a specular edge: the lit lip
              of a glass panel, which is what says "this is a surface" when
              there's nothing behind it to distort. */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: 0,
              top: 0,
              width: 317.554,
              height: 87,
              clipPath: `path("${CAPSULE_PATH}")`,
              background:
                "linear-gradient(to bottom, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.16) 4%, rgba(255,255,255,0.28) 45%, rgba(255,255,255,0.46) 100%)",
            }}
          />

          <Image
            src="/assets/payment/folder-frontside.svg"
            alt=""
            width={317.554}
            height={87}
            style={{
              width: 317.554,
              height: 87,
              display: "block",
              position: "absolute",
              inset: 0,
              // Drop-shadow lives on the artwork, not the wrapper — a
              // filtered ancestor would neutralise the frost's
              // backdrop-filter above.
              filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.22))",
            }}
          />

          {/* Sweeping shine bar — travels L→R across the capsule on a
              slow loop. Kept very subtle (roughly 20% of the original
              opacity + wider gap between sweeps) so it reads as a whisper
              rather than a prominent glare. */}
          <motion.div
            className="pointer-events-none absolute top-0 h-full"
            style={{
              width: 60,
              background:
                "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.11) 50%, transparent 80%)",
              mixBlendMode: "screen",
            }}
            animate={{ x: [-80, 420] }}
            transition={{
              duration: 3.2,
              repeat: Infinity,
              ease: [0.4, 0, 0.2, 1],
              delay: delay + duration * 0.9,
              repeatDelay: 4.5,
            }}
          />

          {/* "ATLYS" barcode text — Libre Barcode font renders any string
              as scannable-looking bars. Muted grey tone with no glow so
              it reads like an inked barcode, not a shimmering label. */}
          <p
            className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
            style={{
              top: 14,
              fontFamily:
                "var(--font-barcode), 'Libre Barcode 39 Extended Text', ui-monospace, monospace",
              fontSize: 26.429,
              lineHeight: "34.357px",
              letterSpacing: "-1.0571px",
              color: "rgba(230,232,236,0.85)",
            }}
          >
            ATLYS
          </p>
        </div>
      </motion.div>
    </div>
  );
}
