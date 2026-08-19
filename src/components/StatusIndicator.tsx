import type { CSSProperties } from "react";

type StatusIndicatorProps = {
  /** Diameter in px. Default 18 (Figma spec). */
  size?: number;
  /** Ring thickness in px. Default 1 (Figma spec). */
  strokeWidth?: number;
  /** Inner dot diameter in px. Default 5 (Figma: radius 2.5). */
  dotSize?: number;
  className?: string;
  style?: CSSProperties;
};

/**
 * Ring + inner dot status marker.
 *   • outer stroke: linear gradient — black → black → #5057EA → #D946EF → #EF4444 → #EDD758
 *   • inner dot: solid black
 *
 * Exact stops from Figma: 0% #000, 16.35% #000, 30.29% #5057EA, 46.35% #D946EF, 75% #EF4444, 100% #EDD758
 */
export default function StatusIndicator({
  size = 18,
  strokeWidth = 1,
  dotSize = 5,
  className,
  style,
}: StatusIndicatorProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background:
          "linear-gradient(90deg, #000000 0%, #000000 16.35%, #5057EA 30.29%, #D946EF 46.35%, #EF4444 75%, #EDD758 100%)",
        padding: strokeWidth,
        boxSizing: "border-box",
        ...style,
      }}
      aria-hidden="true"
    >
      <span
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background: "white",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: "50%",
            background: "#000000",
          }}
        />
      </span>
    </span>
  );
}
