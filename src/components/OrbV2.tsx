import Image from "next/image";
import type { CSSProperties } from "react";

/* The orb from Animation-Native-Ai, node 405:8740.
 *
 * Three layers, and the order matters:
 *
 *   base     a top-to-bottom #181818 → #525edf gradient. Almost none of it
 *            survives to the surface, but it is what the dark edge at the
 *            top-left and the blue cast at the bottom are made of.
 *   image    a 896×1200 photograph, rotated -123.56°, blurred, and scaled
 *            far past the orb so only a crop of its middle shows. A green
 *            linear gradient sits on top of it, opaque at 17.8% along its
 *            own axis and gone by 37.2%.
 *   overlay  the line work — the filaments and the two small circles — as
 *            one flattened SVG group, deliberately BIGGER than the orb and
 *            hung off its top-left corner.
 *
 * Two traps from this project's history are already paid for here:
 * `maxWidth: "none"` on both assets, because the CSS reset's
 * `max-width:100%` silently squashes art that is oversized on purpose and
 * all three of these layers are; and the geometry is kept as the node's own
 * fractional numbers scaled by `k` rather than rounded, because rounding
 * the rotation wrapper moves the visible crop of the image.
 *
 * Every number below is at the node's natural 137.685px and scales with
 * `size`. */

const BASE = 137.685;

type OrbV2Props = {
  /** Diameter in pixels. Defaults to the node's own size. */
  size?: number;
  /* The front layer — the SVG line work — can be left off so a caller can
     draw its own thing between the orb's background and its glass and then
     put the glass back on top itself. `CoreOrb`'s glass skin is the only
     caller that needs this; everything else wants the whole orb. */
  showOverlay?: boolean;
  className?: string;
  style?: CSSProperties;
};

export default function OrbV2({
  size = BASE,
  showOverlay = true,
  className,
  style,
}: OrbV2Props) {
  const k = size / BASE;

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: size,
        height: size,
        /* The node's radius is 78.053 on a 137.685 box — past half, so it
           resolves to a circle. Stated as 50% so it stays one at any size. */
        borderRadius: "50%",
        overflow: "hidden",
        background: "linear-gradient(to bottom, #181818, #525edf)",
        ...style,
      }}
    >
      {/* Figma's rotation wrapper: a box that is centred and then has its
          single child rotated inside it. Collapsing the two into one
          transformed div changes where the crop lands. */}
      <div
        style={{
          position: "absolute",
          left: -232.91 * k,
          top: -211.69 * k,
          width: 509.339 * k,
          height: 480.493 * k,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ flex: "none", transform: "rotate(-123.56deg)" }}>
          <div
            style={{
              position: "relative",
              width: 305.636 * k,
              height: 408.47 * k,
              filter: `blur(${k}px)`,
            }}
          >
            <Image
              src="/assets/orb-v2/image-535.png"
              alt=""
              fill
              sizes={`${Math.ceil(size)}px`}
              style={{ objectFit: "cover", maxWidth: "none" }}
            />
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "linear-gradient(65.42547179872061deg, rgb(201, 249, 169) 17.765%, rgba(118, 147, 100, 0) 37.222%)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Hangs off the top-left and overruns the orb on every side; the
          clip on the parent is what trims it back to the sphere. */}
      {showOverlay && (
      <Image
        src="/assets/orb-v2/overlay.svg"
        alt=""
        width={152.351 * k}
        height={156.941 * k}
        style={{
          position: "absolute",
          left: -7.614068508148193 * k,
          top: -9.941974639892578 * k,
          width: 152.351 * k,
          height: 156.941 * k,
          maxWidth: "none",
          pointerEvents: "none",
        }}
      />
      )}
    </div>
  );
}
