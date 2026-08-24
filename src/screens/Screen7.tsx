"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import {
  animate,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";

/* -----------------------------------------------------------------------------
 * Screen 7 — Supercar arrival transfer selection
 *   Sits between Screen 4 (Team perks) and Screen 5 (WorldPass card rise).
 *   Four internal phases:
 *     - "tesla"    → Tesla Cybertruck hero + swipe hint
 *     - "porsche"  → Porsche 911 GT3 hero
 *     - "ferrari"  → Ferrari 296 GTB hero
 *     - "staged"   → "Your ride is staged" locked-in state (built later)
 *   Users drag horizontally between the three cars (infinite wrap-around),
 *   then tap "Reserve my car" to advance to Screen 5.
 * ---------------------------------------------------------------------------*/

export type Screen7Phase = "tesla" | "porsche" | "ferrari" | "staged";

const IN_EASE = [0.22, 1, 0.36, 1] as const;

// Carousel geometry — center car bounding box, at canvas y (car area top).
// STRIDE keeps the peek cars tight against the hero (matches Figma).
const CAR_W = 320;
const CAR_H = 440;
const CAR_TOP = 220;
const STRIDE = 230;
const HALO_TOP = 296.5;
const HALO_SIZE = 260;

type Car = {
  key: "tesla" | "porsche" | "ferrari";
  src: string;
  name: string;
  brand: string;
  tagline: string;
  /** Per-car scale multiplier for the hero image inside the fixed slot.
   *  Tesla's PNG has a narrower aspect than the sports cars, so
   *  object-contain fits it to full slot height and it visually reads as
   *  much bigger. Shrinking Tesla brings all three to similar perceived size. */
  imgScale?: number;
};

const CARS: Car[] = [
  {
    key: "tesla",
    src: "/assets/supercar/tesla.png",
    name: "Tesla Cybertruck",
    brand: "/assets/supercar/brand-tesla.png",
    tagline: "All-electric performance • 4+ luggage slots",
    imgScale: 0.84,
  },
  {
    key: "porsche",
    src: "/assets/supercar/porsche.png",
    name: "Porsche 911 GT3",
    brand: "/assets/supercar/brand-porsche.png",
    tagline: "V6 Hybrid • 2 Carry-ons",
  },
  {
    key: "ferrari",
    src: "/assets/supercar/ferrari.png",
    name: "Ferrari 296 GTB",
    brand: "/assets/supercar/brand-ferrari.png",
    tagline: "VIP curb clearance • 2 Luggage slots",
  },
];

const STRIP_LEN = CARS.length * STRIDE; // 960 px worth of virtual carousel
const HALF_STRIP = STRIP_LEN / 2;

// Positive-modulo helper — JS `%` yields negative for negative dividends.
const mod = (n: number, m: number) => ((n % m) + m) % m;

export default function Screen7({
  onComplete,
}: {
  initialPhase?: Screen7Phase;
  onComplete?: () => void;
} = {}) {
  // `x` = drag offset (unbounded). Negative x = swiped left = next car.
  const x = useMotionValue(0);
  const [activeIdx, setActiveIdx] = useState(0);

  // Fractional car index — how far along the carousel we've scrolled,
  // wrapped to [0, CARS.length). Used to derive per-car scale/opacity/gray.
  const carProgress = useTransform(x, (xVal) =>
    mod(-xVal / STRIDE, CARS.length),
  );

  // Per-car x offset — each car wraps into the [-HALF_STRIP, +HALF_STRIP]
  // window so it reappears on the opposite side once it scrolls off.
  const carXs = CARS.map((_, idx) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(x, (xVal) => {
      const raw = idx * STRIDE + xVal;
      return mod(raw + HALF_STRIP, STRIP_LEN) - HALF_STRIP;
    }),
  );

  // Per-car signed distance from center in slot units (fractional).
  // Wrapped to [-CARS.length/2, +CARS.length/2] so the "closest" copy wins.
  const carDists = CARS.map((_, idx) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTransform(carProgress, (p) => {
      let d = idx - p;
      if (d > CARS.length / 2) d -= CARS.length;
      if (d < -CARS.length / 2) d += CARS.length;
      return d;
    }),
  );

  // Track the x at pan start so onPan applies a delta rather than an absolute.
  const panStartX = useRef(0);
  const handlePanStart = () => {
    panStartX.current = x.get();
  };
  const handlePan = (_: unknown, info: PanInfo) => {
    x.set(panStartX.current + info.offset.x);
  };
  const handlePanEnd = (_: unknown, info: PanInfo) => {
    const projected = x.get() + info.velocity.x * 0.12;
    const target = Math.round(projected / STRIDE) * STRIDE;
    animate(x, target, { type: "spring", stiffness: 320, damping: 32 });
    setActiveIdx(mod(-target / STRIDE, CARS.length));
  };


  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-[44px]"
      style={{
        background: "linear-gradient(to bottom, #f9fafb 0%, #ffffff 100%)",
      }}
      onClick={(e) => {
        // Stops the OnboardingFlow's global click-to-advance from firing;
        // this screen only advances when the user taps "Reserve my car".
        e.stopPropagation();
      }}
    >
      {/* Header — seat icon + title + subtitle */}
      <motion.div
        className="absolute left-1/2 top-[70px] -translate-x-1/2 flex flex-col items-center"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: IN_EASE }}
      >
        <SeatIcon />
        <p className="mt-[20px] whitespace-nowrap text-[20px] font-medium leading-[25px] tracking-[-0.04em] text-[#0b0b0b] text-center">
          Select your arrival supercar
        </p>
        <p
          className="mt-[10px] text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[#999]"
          style={{ width: 360 }}
        >
          Bypass standard taxi queues with an on-demand
          <br />
          exotic transfer waiting at arrival
        </p>
      </motion.div>

      {/* Ripple halo behind hero car — 5 concentric rings expand and fade.
          Rings are darker + staggered tighter so at any moment 3–4 are on
          screen at different radii, giving a continuous water-drop feel. */}
      <div
        className="pointer-events-none absolute left-1/2 -translate-x-1/2"
        style={{ top: HALO_TOP, width: HALO_SIZE, height: HALO_SIZE }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: HALO_SIZE,
              height: HALO_SIZE,
              marginLeft: -HALO_SIZE / 2,
              marginTop: -HALO_SIZE / 2,
              border: "1.5px solid rgba(0,0,0,0.28)",
            }}
            initial={{ scale: 0.2, opacity: 0.85 }}
            animate={{
              scale: [0.2, 1],
              opacity: [0.85, 0],
            }}
            transition={{
              duration: 3.5,
              delay: i * 0.7,
              repeat: Infinity,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </div>

      {/* Full-width drag surface — car layer sits behind title, above halo.
          Each car floats at its own wrap-around x, driven by the shared drag. */}
      <motion.div
        className="absolute left-0 cursor-grab active:cursor-grabbing"
        style={{
          top: CAR_TOP,
          width: "100%",
          height: CAR_H,
          touchAction: "pan-y",
        }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.7, ease: IN_EASE }}
      >
        {CARS.map((car, i) => (
          <CarSlot
            key={car.key}
            car={car}
            wrappedX={carXs[i]}
            dist={carDists[i]}
          />
        ))}
      </motion.div>

      {/* Info panel — brand logo + car name + tagline. Three copies, one per
          car, panning left/right with the carousel so the text tracks the
          swipe direction (fades in the direction the user drags). */}
      {CARS.map((car, i) => (
        <InfoSlot
          key={car.key}
          car={car}
          wrappedX={carXs[i]}
          dist={carDists[i]}
        />
      ))}

      {/* Reserve my car — 380×50 pill at y 833 (left 30). */}
      <motion.button
        onClick={(e) => {
          e.stopPropagation();
          onComplete?.();
        }}
        className="absolute overflow-hidden rounded-full text-[14px] font-semibold tracking-[-0.01em] text-black"
        style={{
          top: 833,
          left: 30,
          width: 380,
          height: 50,
          background:
            "linear-gradient(90deg, rgba(80,87,234,0.35) 0%, rgba(217,70,239,0.28) 35%, rgba(239,68,68,0.32) 65%, rgba(237,215,88,0.35) 100%)",
          boxShadow: "0 12px 30px -14px rgba(0,0,0,0.18)",
          border: "1px solid rgba(255,255,255,0.6)",
        }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.7, ease: IN_EASE }}
      >
        Reserve my car
      </motion.button>

      {/* Footer note — Inter Semibold 12/16 #999, centered, at y 903. */}
      <motion.p
        className="absolute left-1/2 -translate-x-1/2 text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[#999]"
        style={{ top: 903, width: 242 }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.7, ease: IN_EASE }}
      >
        Included with membership. Switch models anytime in Settings
      </motion.p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Car slot in the infinite carousel. Its x wraps around; scale, opacity, and
 * grayscale come from the signed distance to the center of the strip.
 * -------------------------------------------------------------------------*/
function CarSlot({
  car,
  wrappedX,
  dist,
}: {
  car: Car;
  wrappedX: import("framer-motion").MotionValue<number>;
  dist: import("framer-motion").MotionValue<number>;
}) {
  const absDist = useTransform(dist, (d) => Math.abs(d));
  const scale = useTransform(absDist, [0, 1], [1, 0.72], { clamp: true });
  const opacity = useTransform(absDist, [0, 1, 1.6], [1, 0.55, 0], {
    clamp: true,
  });
  const filter = useTransform(absDist, (d) => {
    const gray = Math.min(1, Math.max(0, d));
    return `grayscale(${gray.toFixed(2)})`;
  });

  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-1/2"
      style={{
        width: CAR_W,
        height: CAR_H,
        x: wrappedX,
        translateX: `-50%`,
        scale,
        opacity,
        filter,
      }}
    >
      <Image
        src={car.src}
        alt={car.name}
        width={CAR_W}
        height={CAR_H}
        priority={car.key === "tesla"}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          objectPosition: "center",
          transform: car.imgScale ? `scale(${car.imgScale})` : undefined,
          transformOrigin: "center",
        }}
      />
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
 * Info slot in the infinite carousel — mirrors CarSlot's wrap/fade so the
 * brand logo, car name, and tagline all pan sideways with the swipe, and
 * fade out on whichever side they drift toward.
 * -------------------------------------------------------------------------*/
function InfoSlot({
  car,
  wrappedX,
  dist,
}: {
  car: Car;
  wrappedX: import("framer-motion").MotionValue<number>;
  dist: import("framer-motion").MotionValue<number>;
}) {
  const absDist = useTransform(dist, (d) => Math.abs(d));
  // Aggressive fade — text is fully gone by 40% of the way to the next slot,
  // so the side info never lingers as a visible ghost.
  const opacity = useTransform(absDist, [0, 0.2, 0.4], [1, 0.3, 0], {
    clamp: true,
  });

  return (
    <>
      {/* Brand logo — Figma y 659.8 */}
      <motion.div
        className="pointer-events-none absolute top-0 left-1/2"
        style={{
          top: 659.8,
          width: 50,
          height: 50,
          x: wrappedX,
          translateX: "-50%",
          opacity,
        }}
      >
        <BrandMark src={car.brand} alt={car.name} />
      </motion.div>
      {/* Car name — Figma y 729.8 */}
      <motion.p
        className="pointer-events-none absolute left-1/2 text-center font-serif text-[20px] leading-[25px] font-bold text-black whitespace-nowrap"
        style={{
          top: 729.8,
          x: wrappedX,
          translateX: "-50%",
          opacity,
        }}
      >
        {car.name}
      </motion.p>
      {/* Tagline — Figma y 764.8 */}
      <motion.p
        className="pointer-events-none absolute left-1/2 text-center text-[12px] font-semibold leading-[16px] tracking-[-0.01em] text-[#999] whitespace-nowrap"
        style={{
          top: 764.8,
          x: wrappedX,
          translateX: "-50%",
          opacity,
        }}
      >
        {car.tagline}
      </motion.p>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * Brand logo — 50×50 PNG (Tesla T, Porsche shield, Ferrari shield).
 * -------------------------------------------------------------------------*/
function BrandMark({ src, alt }: { src: string; alt: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={50}
      height={50}
      style={{ width: 50, height: 50, objectFit: "contain" }}
    />
  );
}

/* ---------------------------------------------------------------------------
 * Seat icon — small "airline_seat_recline_extra" glyph above the title.
 * -------------------------------------------------------------------------*/
function SeatIcon() {
  return (
    <div style={{ width: 24, height: 24 }}>
      <Image
        src="/assets/supercar/seat-icon.svg"
        alt=""
        width={24}
        height={24}
        style={{ width: 24, height: 24 }}
      />
    </div>
  );
}
