"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Card3DProps = {
  width?: number;
  height?: number;
  radius?: number;
  children?: ReactNode;
  tiltMax?: number;
  static?: boolean;
  className?: string;
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
}: Card3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rxSpring = useSpring(rx, { stiffness: 220, damping: 22 });
  const rySpring = useSpring(ry, { stiffness: 220, damping: 22 });

  const shineX = useTransform(rySpring, [-tiltMax, tiltMax], ["25%", "75%"]);
  const shineY = useTransform(rxSpring, [-tiltMax, tiltMax], ["75%", "25%"]);

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
        {/* Embossed dot texture — each dot is highlight top-left + shadow
            bottom-right so it reads as a raised bump. Two background layers
            offset by 1px produce the emboss illusion. */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 30% 30%, rgba(255,255,255,0.10) 0.9px, transparent 1.6px),
              radial-gradient(circle at 70% 70%, rgba(0,0,0,0.55) 0.9px, transparent 1.6px)
            `,
            backgroundSize: "12px 12px, 12px 12px",
            backgroundPosition: "0 0, 1px 1px",
            mixBlendMode: "screen",
            opacity: 0.9,
          }}
        />
        {/* Second, sharper dot layer for finer relief */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle, rgba(255,255,255,0.05) 0.6px, transparent 0.9px)
            `,
            backgroundSize: "12px 12px",
            opacity: 0.7,
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

        {/* Cursor-tracked specular gloss — moves with tilt */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            background: shineBg,
            mixBlendMode: "screen",
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
