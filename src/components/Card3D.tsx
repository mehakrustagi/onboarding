"use client";

import { useRef, type ReactNode } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

type Card3DProps = {
  /** Card width in px. Default 252 (Figma spec). */
  width?: number;
  /** Card height in px. Default 350. */
  height?: number;
  /** Corner radius. Default 30. */
  radius?: number;
  /** Content rendered inside the card (positioned relative). */
  children?: ReactNode;
  /** Max rotation on each axis in degrees. Default 12. */
  tiltMax?: number;
  /** Disable interactive tilt (renders flat). */
  static?: boolean;
  className?: string;
};

/**
 * Dark rounded card with a subtle dot-grid texture. Interactive: tilts in 3D
 * following the cursor for a premium hover feel. Content is projected forward
 * so it sits above the surface (`translateZ`) — highlights + inner shadow give
 * the physical card an edge.
 */
export default function Card3D({
  width = 252,
  height = 350,
  radius = 30,
  children,
  tiltMax = 12,
  static: isStatic = false,
  className,
}: Card3DProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const rxSpring = useSpring(rx, { stiffness: 220, damping: 22 });
  const rySpring = useSpring(ry, { stiffness: 220, damping: 22 });

  const shineX = useTransform(rySpring, [-tiltMax, tiltMax], ["30%", "70%"]);
  const shineY = useTransform(rxSpring, [-tiltMax, tiltMax], ["70%", "30%"]);

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
    <div
      style={{ perspective: 1200 }}
      className={className}
    >
      <motion.div
        ref={ref}
        onMouseMove={handleMove}
        onMouseLeave={reset}
        className="relative"
        style={{
          width,
          height,
          borderRadius: radius,
          background: "#000",
          // Subtle dot grid + a highlight tracked to the cursor.
          backgroundImage: `
            radial-gradient(circle at 50% 50%, rgba(255,255,255,0.05) 1px, transparent 1.4px)
          `,
          backgroundSize: "12px 12px",
          boxShadow:
            "0 30px 60px -24px rgba(0,0,0,0.65), 0 6px 18px -8px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.6)",
          rotateX: rxSpring,
          rotateY: rySpring,
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* Cursor-tracked specular highlight */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{
            borderRadius: radius,
            background: useTransform(
              [shineX, shineY],
              ([sx, sy]: (string | number)[]) =>
                `radial-gradient(circle at ${sx} ${sy}, rgba(255,255,255,0.10), transparent 55%)`,
            ),
            mixBlendMode: "screen",
          }}
        />

        {/* Card content — pushed forward on Z so it floats above the surface */}
        <div
          className="relative h-full w-full"
          style={{ transform: "translateZ(20px)" }}
        >
          {children}
        </div>
      </motion.div>
    </div>
  );
}
