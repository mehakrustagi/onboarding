import Image, { type StaticImageData } from "next/image";
import type { CSSProperties } from "react";

type AgentOrbProps = {
  /** Diameter in pixels. Default 90. */
  size?: number;
  /** Optional custom blob/avatar image. Falls back to the design-system default gradient blob. */
  blob?: string | StaticImageData;
  className?: string;
  style?: CSSProperties;
};

const DEFAULT_BLOB = "/assets/orb/ellipse.png";

/**
 * Layered glass orb used to represent an agent.
 *
 *   ┌ outer bezel (thin light↔dark stroke rings, ~90px)
 *   ├ inner ring w/ inner-shadow (soft depth, ~60px)
 *   ├ colorful blob (avatar / gradient ellipse, ~58px)
 *   ├ top glare (blurred white highlight, upper half)
 *   └ bottom glow (blurred white highlight, lower half)
 */
export default function AgentOrb({
  size = 90,
  blob = DEFAULT_BLOB,
  className,
  style,
}: AgentOrbProps) {
  const s = size;
  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: s,
        height: s,
        borderRadius: "50%",
        ...style,
      }}
    >
      {/* Blob / avatar */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: (58.584 / 90) * s,
          height: (58.584 / 90) * s,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        <Image
          src={blob}
          alt=""
          fill
          sizes={`${s}px`}
          style={{ objectFit: "cover" }}
        />
      </div>

      {/* Inner ring inner-shadow + specular highlights */}
      <Image
        src="/assets/orb/ring2.svg"
        alt=""
        width={(60 / 90) * s}
        height={(60 / 90) * s}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: (60 / 90) * s,
          height: (60 / 90) * s,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />
      <Image
        src="/assets/orb/mask.svg"
        alt=""
        width={(49.5214 / 90) * s}
        height={(49.5214 / 90) * s}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: (49.5214 / 90) * s,
          height: (49.5214 / 90) * s,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          mixBlendMode: "screen",
        }}
      />
      <Image
        src="/assets/orb/accent.svg"
        alt=""
        width={(36.3121 / 90) * s}
        height={(52.834 / 90) * s}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: (36.3121 / 90) * s,
          height: (52.834 / 90) * s,
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
        }}
      />

      {/* Outer bezel rings */}
      <Image
        src="/assets/orb/outer-ring.svg"
        alt=""
        width={s}
        height={s}
        style={{
          position: "absolute",
          inset: 0,
          width: s,
          height: s,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
