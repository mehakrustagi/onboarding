import type { CSSProperties } from "react";

type AuraGlowProps = {
  /** Width of the aura in pixels. Default 640. Height scales to match Figma ratio (~44% of width). */
  width?: number;
  /** Override height. Defaults to width * 280/640. */
  height?: number;
  /** 0–1. Default 0.5 (matches Figma). */
  opacity?: number;
  /** Blur radius in px. Default 50 (matches Figma). Scale up for larger auras. */
  blur?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Soft elliptical multi-color ambient glow — green → blue → red → gold, heavily blurred.
 * Meant to sit behind content as decoration. Sized/opacity/blur are tunable per placement.
 */
export default function AuraGlow({
  width = 640,
  height,
  opacity = 0.5,
  blur = 50,
  className,
  style,
}: AuraGlowProps) {
  const h = height ?? width * (280 / 640);
  // Ellipse geometry from Figma: cx=50%, cy=50%, rx=220/640≈34.4% of width, ry=40/280≈14.3% of height.
  const ellipseWidth = width * (440 / 640);
  const ellipseHeight = h * (80 / 280);
  return (
    <div
      className={className}
      style={{
        width,
        height: h,
        pointerEvents: "none",
        ...style,
      }}
      aria-hidden="true"
    >
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          filter: `blur(${blur}px)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: ellipseWidth,
            height: ellipseHeight,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            backgroundImage: "var(--gradient-aura)",
            opacity,
          }}
        />
      </div>
    </div>
  );
}
