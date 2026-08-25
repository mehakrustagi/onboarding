"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
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
          background: "#000000",
          // Only the outer elevation shadow remains — no inner bevels/
          // highlights so the surface reads as a flat matte black slab.
          boxShadow:
            "0 40px 80px -30px rgba(0,0,0,0.75), 0 12px 28px -12px rgba(0,0,0,0.55)",
          rotateX: rxSpring,
          rotateY: rySpring,
          transformStyle: "preserve-3d",
          willChange: "transform",
          overflow: "hidden",
        }}
      >
        {/* Card content */}
        <div className="relative h-full w-full">{children}</div>
      </motion.div>
    </div>
  );
}
