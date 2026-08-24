"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTime,
  useTransform,
  type MotionValue,
} from "framer-motion";

type Card3DProps = {
  width?: number;
  height?: number;
  radius?: number;
  children?: ReactNode;
  tiltMax?: number;
  static?: boolean;
  className?: string;
  /** 0–1 motion value that drives the top-to-bottom "activation" light
   *  sweep. Animate 0 → 1 → 0 to make the dot pattern briefly glow as
   *  a bright band passes from card top to bottom. */
  activatePulse?: MotionValue<number>;
};

/**
 * Premium dark card with an embossed dot texture and 3D tilt.
 *
 * Layers (back → front):
 *   1. Base black + subtle vertical gradient sheen
 *   2. Embossed dots: each dot is a highlight-shadow pair so it reads as a
 *      raised bump rather than a flat spot
 *   3. Vignette darkening the edges → deepens the surface
 *   4. Cursor-tracked specular gloss (radial highlight that follows the mouse)
 *   5. Top-edge inner highlight + bottom-edge shadow (physical bezel)
 *   6. Ambient outer shadows for elevation
 *   7. Content plane at translateZ(24px) so it floats above the surface
 */
export default function Card3D({
  width = 252,
  height = 350,
  radius = 30,
  children,
  tiltMax = 14,
  static: isStatic = false,
  className,
  activatePulse,
}: Card3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rxSpring = useSpring(rx, { stiffness: 220, damping: 22 });
  const rySpring = useSpring(ry, { stiffness: 220, damping: 22 });

  // A single, very slow-drifting ambient light — moves across the surface
  // over ~30s. Only enough to keep the card from feeling perfectly frozen.
  const time = useTime();
  const ambientX = useTransform(time, (t) => 40 + Math.sin(t * 0.00018) * 15);
  const ambientY = useTransform(time, (t) => 45 + Math.sin(t * 0.00014 + 1.4) * 18);
  const ambientBg = useTransform(
    [ambientX, ambientY],
    ([ax, ay]: (string | number)[]) =>
      `radial-gradient(ellipse at ${ax}% ${ay}%, rgba(255,255,255,0.05), transparent 65%)`,
  );

  const shineX = useTransform(rySpring, [-tiltMax, tiltMax], ["25%", "75%"]);
  const shineY = useTransform(rxSpring, [-tiltMax, tiltMax], ["75%", "25%"]);

  // Activation pulse — when driven 0→1, a bright dot layer reveals from the
  // top of the card to the bottom (like the surface "powering on"). Fallback
  // to a constant 0 so the effect is invisible when no pulse is passed.
  const localPulse = useMotionValue(0);
  const pulse = activatePulse ?? localPulse;
  // Radial pulse: a ring expands OUT from the orb's landing spot (near the
  // top-center of the card) — like a ripple travelling across the surface.
  // Center is fixed at the orb's rest position (50% x, 23% y relative to card).
  const activationMask = useTransform(pulse, (p) => {
    // Radius grows from 0 → ~140% so the ring passes over the whole card.
    const r = p * 140;
    return `radial-gradient(circle at 50% 23%,
      transparent ${Math.max(0, r - 22)}%,
      rgba(0,0,0,0.55) ${Math.max(0, r - 6)}%,
      rgba(0,0,0,1) ${r}%,
      rgba(0,0,0,0.55) ${r + 6}%,
      transparent ${r + 22}%)`;
  });
  const activationOpacity = useTransform(pulse, [0, 0.1, 0.9, 1], [0, 1, 1, 0]);

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isStatic) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * tiltMax * 2);
    rx.set(-py * tiltMax * 2);
  };
  const reset = () => {
    rx.set(0);
    ry.set(0);
  };

  const shineBg = useTransform(
    [shineX, shineY],
    ([sx, sy]: (string | number)[]) =>
      `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.16), rgba(255,255,255,0.04) 30%, transparent 60%)`,
  );

  return (
    <div style={{ perspective: 1400 }} className={className}>
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className="relative"
        style={{
          width,
          height,
          borderRadius: radius,
          // Deep base + faint vertical sheen to give the card a physical top-to-bottom "light".
          background:
            "linear-gradient(180deg, #131313 0%, #0a0a0a 45%, #050505 100%)",
          boxShadow: [
            // Elevation
            "0 40px 80px -30px rgba(0,0,0,0.75)",
            "0 12px 28px -12px rgba(0,0,0,0.55)",
            // Top-edge inner light
            "inset 0 1.5px 0 rgba(255,255,255,0.14)",
            // Bottom-edge inner shadow
            "inset 0 -1.5px 0 rgba(0,0,0,0.7)",
            // Left & right bevel
            "inset 1px 0 0 rgba(255,255,255,0.04)",
            "inset -1px 0 0 rgba(0,0,0,0.5)",
          ].join(", "),
          rotateX: rxSpring,
          rotateY: rySpring,
          transformStyle: "preserve-3d",
          willChange: "transform",
          overflow: "hidden",
        }}
      >
        {/* Base embossed dot texture — tiny raised bumps (highlight top-left
            + shadow bottom-right offset by 0.6px). Dots kept small and quiet. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08) 0.5px, transparent 1px),
              radial-gradient(circle at 70% 70%, rgba(0,0,0,0.55) 0.5px, transparent 1px)
            `,
            backgroundSize: "8px 8px, 8px 8px",
            backgroundPosition: "0 0, 1px 1px",
            mixBlendMode: "screen",
            opacity: 0.8,
          }}
        />

        {/* Edge vignette — darkens the outside so the middle feels convex */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 50%, transparent 40%, rgba(0,0,0,0.65) 100%)",
          }}
        />

        {/* Ambient drifting light — slowly moves across the card even when
            the cursor isn't hovering. Gives the surface a "living" feel. */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: ambientBg,
            mixBlendMode: "screen",
          }}
        />

        {/* Activation dot layer — same tiny dots, slightly brighter, revealed
            through a soft band that traverses vertically row-by-row. */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.35) 0.55px, transparent 1.1px)",
            backgroundSize: "8px 8px",
            mixBlendMode: "screen",
            maskImage: activationMask,
            WebkitMaskImage: activationMask,
            opacity: activationOpacity,
          }}
        />

        {/* Cursor-tracked specular gloss — moves with tilt */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: shineBg,
            mixBlendMode: "screen",
          }}
        />

        {/* Subtle grain overlay — SVG turbulence noise for a tactile,
            printed-material texture. Very low opacity so it doesn't
            overpower the dots. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`,
            opacity: 0.15,
            mixBlendMode: "overlay",
          }}
        />

        {/* Static top-edge highlight (glass ridge) */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[35%]"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.09) 0%, transparent 100%)",
            mixBlendMode: "screen",
          }}
        />

        {/* Card content — floats above the surface for the 3D tilt effect */}
        <div
          className="relative h-full w-full"
          style={{ transform: "translateZ(24px)" }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
