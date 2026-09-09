import Image from "next/image";
import type { ReactNode } from "react";

/* The 18 benefit cards — Figma 914:4690.
 *
 * The SHELL is identical across all of them and lives in BenefitDeck:
 * 380×154 at r35.065, #f4f5f6 border, 0 4.675px 28px shadow, copy at
 * (29.5, 22.25) and ACTIVATE at (29.5, 104.25). Only the artwork and the
 * copy change, so this file carries just those.
 *
 * Artwork is composed from each node's own exported pieces at Figma's
 * coordinates, with two exceptions noted inline where the composition is
 * deep enough that a flat export is both more faithful and less fragile
 * than rebuilding it in DOM.
 *
 * `bodyW` is per card — Figma varies it from 165 to 262 against a 211
 * column, and two cards deliberately overflow it.
 */

const A = "/assets/benefits";

/** Figma expresses rotated art as a bounding box with the un-rotated
 *  child centred inside it. This reproduces that: the box is positioned,
 *  the child is centred and turned. */
function Rot({
  x,
  y,
  bw,
  bh,
  w,
  h,
  deg,
  src,
  flipY = false,
  alt = "",
}: {
  x: number;
  y: number;
  bw: number;
  bh: number;
  w: number;
  h: number;
  deg: number;
  src: string;
  flipY?: boolean;
  alt?: string;
}) {
  return (
    <div
      className="pointer-events-none absolute flex items-center justify-center"
      style={{ left: x, top: y, width: bw, height: bh }}
    >
      <div
        style={{
          width: w,
          height: h,
          transform: `rotate(${deg}deg)${flipY ? " scaleY(-1)" : ""}`,
        }}
      >
        <Image
          src={src}
          alt={alt}
          width={Math.round(w)}
          height={Math.round(h)}
          unoptimized
          style={{ width: w, height: h, display: "block", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

/** Plain placed art. */
function Art({
  x,
  y,
  w,
  h,
  src,
  radius,
  opacity,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  src: string;
  radius?: number;
  opacity?: number;
}) {
  return (
    <Image
      src={src}
      alt=""
      width={Math.round(w)}
      height={Math.round(h)}
      unoptimized
      className="pointer-events-none absolute"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        opacity,
        objectFit: "cover",
        display: "block",
      }}
    />
  );
}

/* The four tinted badges on card 3 (914:4714 / 4722 / 4730 / 4739). Each
 * is a white disc carrying a blurred image under a coloured wash, with a
 * ring overhanging it. */
function Badge({
  x,
  y,
  d,
  blur,
  shadow,
  wash,
  ring,
  ringW,
  ringH,
  ringX,
  ringY,
  children,
}: {
  x: number;
  y: number;
  d: number;
  blur: number;
  shadow: string;
  wash: string;
  ring: string;
  ringW: number;
  ringH: number;
  ringX: number;
  ringY: number;
  children?: ReactNode;
}) {
  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={{ left: x, top: y, width: d, height: d, borderRadius: d, background: "#ffffff", boxShadow: shadow }}
    >
      <div
        className="absolute inset-0"
        style={{ filter: `blur(${blur}px)`, transform: "rotate(180deg) scaleY(-1)" }}
      >
        <Image
          src={`${A}/b03-i1.png`}
          alt=""
          width={Math.round(d)}
          height={Math.round(d)}
          unoptimized
          style={{ width: d, height: d, display: "block", objectFit: "cover", borderRadius: d }}
        />
        <div className="absolute inset-0" style={{ borderRadius: d, background: wash }} />
      </div>
      <Image
        src={ring}
        alt=""
        width={Math.round(ringW)}
        height={Math.round(ringH)}
        className="absolute"
        style={{ left: ringX, top: ringY, width: ringW, height: ringH }}
      />
      {children}
    </div>
  );
}

/* The dark voucher tile shared by cards 8 and 17 (914:4850 / 12966). */
function VoucherTile({ children }: { children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute overflow-hidden"
      style={{
        left: 270,
        top: 14,
        width: 96,
        height: 126.638,
        borderRadius: 20.426,
        background: "linear-gradient(180deg, #2a2a2a 0%, #000000 100%)",
      }}
    >
      <div
        className="absolute"
        style={{ left: "-6.73%", right: "24.13%", top: "-5.45%", bottom: "44.72%" }}
      >
        <Image
          src={`${A}/b08-lines.svg`}
          alt=""
          width={80}
          height={77}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </div>
      {children}
    </div>
  );
}

/* The pale tile shared by cards 9 and 11 (914:12872 / 12892). Two washes
 * behind a translucent tile with a coloured inner glow. */
function GlowTile({
  hue,
  glow,
  children,
}: {
  hue: string;
  glow: string;
  children: ReactNode;
}) {
  return (
    <>
      <div
        className="pointer-events-none absolute"
        style={{
          left: 270,
          top: 30,
          width: 95,
          height: 109,
          borderRadius: 25,
          transform: "rotate(180deg)",
          backgroundImage: `linear-gradient(166.54deg, ${hue} 8.63%, rgba(255,255,255,0) 47.47%)`,
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          left: 273,
          top: 15,
          width: 90,
          height: 109,
          borderRadius: 25,
          backgroundImage: `linear-gradient(165.83deg, ${hue} 8.63%, rgba(255,255,255,0) 47.47%)`,
        }}
      />
      <div
        className="pointer-events-none absolute overflow-hidden"
        style={{
          left: 270,
          top: 13,
          width: 96,
          height: 126.638,
          borderRadius: 28,
          background: "rgba(255,255,255,0.1)",
          boxShadow: glow,
        }}
      >
        {children}
      </div>
    </>
  );
}

/* The disc + arc backdrop behind cards 12–15 (914:12905 / 12914 / …). */
function DiscArc({
  disc,
  dx,
  dy,
  dw,
  dh,
  ax,
  ay,
}: {
  disc: string;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  ax: number;
  ay: number;
}) {
  return (
    <>
      <Image
        src={disc}
        alt=""
        width={Math.round(dw)}
        height={Math.round(dh)}
        className="pointer-events-none absolute"
        style={{ left: dx, top: dy, width: dw, height: dh }}
      />
      <Rot x={ax} y={ay} bw={121.034} bh={118.627} w={99.38} h={70.379} deg={-41.64} src={`${A}/b12-arc.svg`} />
    </>
  );
}

/* Gradient numerals on the voucher tiles — white → #999 down the glyph. */
function Numeral({
  x,
  y,
  size,
  lh,
  tracking,
  children,
}: {
  x: number;
  y: number;
  size: number;
  lh: number;
  tracking: number;
  children: ReactNode;
}) {
  return (
    <p
      className="pointer-events-none absolute whitespace-nowrap font-semibold"
      style={{
        left: x,
        top: y,
        fontSize: size,
        lineHeight: `${lh}px`,
        letterSpacing: `${tracking}px`,
        backgroundImage: "linear-gradient(180deg, #ffffff 0%, #999999 100%)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        color: "transparent",
      }}
    >
      {children}
    </p>
  );
}

export type BenefitCard = {
  key: string;
  title: string;
  /** An array renders as explicit line breaks, as the design has them. */
  body: string | string[];
  /** Figma varies this from 165 to 262 against a 211 column. */
  bodyW?: number;
  art: ReactNode;
};

export const BENEFIT_CARDS: BenefitCard[] = [
  {
    key: "visas-minutes",
    title: "Visas approved in minutes",
    body: "Your documents are in your vault. File in minutes, with no re-uploads.",
    art: <Art x={252.97} y={44.94} w={204.586} h={115.079} src={`${A}/b01-stamp.png`} />,
  },
  {
    key: "slot-priority",
    title: "Slot priority at every embassy",
    body: "Get priority access to visa appointment slots across embassies",
    art: (
      <>
        <Rot x={202.18} y={11.18} bw={239.646} bh={239.646} w={200} h={200} deg={77.08} src={`${A}/b02-cal.png`} />
        {/* Globe, masked to a 92×92 window and faded into the card —
            853's own mask position and white ramp. */}
        <div
          className="pointer-events-none absolute"
          style={{
            left: 190.11,
            top: 41.13,
            width: 266.63,
            height: 169.093,
            maskImage: `url(${A}/b02-mask.svg)`,
            WebkitMaskImage: `url(${A}/b02-mask.svg)`,
            maskSize: "92px 92px",
            WebkitMaskSize: "92px 92px",
            maskPosition: "86.888px 43.87px",
            WebkitMaskPosition: "86.888px 43.87px",
            maskRepeat: "no-repeat",
            WebkitMaskRepeat: "no-repeat",
          }}
        >
          <Image
            src={`${A}/b02-globe.png`}
            alt=""
            width={267}
            height={169}
            unoptimized
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(255,255,255,0) 30.971%, #ffffff 60.837%)",
            }}
          />
        </div>
      </>
    ),
  },
  {
    key: "slot-analysis",
    title: "24/7 slot calendar analysis",
    body: "24/7 slot monitoring, with new openings grabbed instantly.",
    art: (
      <>
        <Badge
          x={277}
          y={21}
          d={33.52}
          blur={0.657}
          shadow="0 2.629px 3.943px 0 rgba(0,0,0,0.12)"
          wash="linear-gradient(160.05deg, rgba(255,255,255,0) 37.023%, rgba(30,35,142,0.6) 87.496%)"
          ring={`${A}/b03-r4.svg`}
          ringW={37.436}
          ringH={38.565}
          ringX={-2.17}
          ringY={-2.61}
        />
        <Badge
          x={319}
          y={37}
          d={32}
          blur={1.098}
          shadow="0 2.51px 3.765px 0 rgba(0,0,0,0.12)"
          wash="linear-gradient(180deg, rgba(218,255,254,0) 0%, rgba(0,13,153,0.6) 100%)"
          ring={`${A}/b03-r1.svg`}
          ringW={35.739}
          ringH={36.817}
          ringX={-2.07}
          ringY={-2.49}
        />
        <Badge
          x={268}
          y={75}
          d={51.52}
          blur={1.01}
          shadow="0 4.041px 6.061px 0 rgba(0,0,0,0.12)"
          wash="linear-gradient(208.98deg, rgba(255,255,255,0) 32.334%, rgba(30,142,52,0.6) 85.925%)"
          ring={`${A}/b03-r2.svg`}
          ringW={57.539}
          ringH={59.273}
          ringX={-3.34}
          ringY={-4.01}
        />
        <Badge
          x={335}
          y={84}
          d={21.88}
          blur={0.858}
          shadow="0 1.716px 2.574px 0 rgba(0,0,0,0.12)"
          wash="linear-gradient(180deg, rgba(255,218,218,0) 0%, rgba(153,84,0,0.6) 100%)"
          ring={`${A}/b03-r3.svg`}
          ringW={24.437}
          ringH={25.173}
          ringX={-1.42}
          ringY={-1.7}
        >
          <Rot x={-0.86} y={-0.64} bw={15.282} bh={14.978} w={12.548} h={8.886} deg={-41.64} src={`${A}/b03-a3.svg`} />
        </Badge>
      </>
    ),
  },
  {
    key: "zero-forms",
    title: "0 forms filled by you",
    body: ["Forms filled by you, everything", "filed from your vault"],
    /* Flat export (914:4753). This one is a phone mock-up: a conic-gradient
       bezel, a documents sheet, flag rows, a strength meter and a Face ID
       badge under mix-blend-soft-light — 30-odd layers whose fidelity
       depends on blend modes stacking exactly. An export is both truer and
       far less brittle than rebuilding it. */
    art: <Art x={221} y={15} w={145} h={126.667} src={`${A}/b04-art.png`} />,
  },
  {
    key: "fees-refunded",
    title: "Visa fees, refunded",
    body: ["Your Atlys fee and full government fee", "come back on rejection. It’s automatic"],
    bodyW: 262,
    art: (
      <>
        <Rot x={263.83} y={3.29} bw={166.233} bh={215.927} w={155.201} h={207.823} deg={3.11} src={`${A}/b05-passport.png`} />
        <Art x={257.5} y={23.75} w={152} h={153} src={`${A}/b05-disc.svg`} />
        <Rot x={252.5} y={19.75} bw={104.454} bh={102.377} w={85.766} h={60.738} deg={-41.64} src={`${A}/b05-arc.svg`} />
      </>
    ),
  },
  {
    key: "flights-hotels-covered",
    title: "Flights & hotels, covered",
    body: "If a rejection kills the trip, eligible flight and hotel costs are covered.",
    bodyW: 223,
    art: (
      <>
        <Art x={258} y={140.31} w={14.646} h={26.895} src={`${A}/b06-tail.svg`} />
        {/* The source art is wider than its frame and pulled left — Figma
            crops it rather than scaling. */}
        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{ left: 259.86, top: 104.09, width: 67.636, height: 73.494 }}
        >
          <Image
            src={`${A}/b06-hotel.png`}
            alt=""
            width={84}
            height={74}
            unoptimized
            style={{ position: "absolute", left: "-22.83%", top: "-0.02%", width: "122.83%", height: "100.04%", maxWidth: "none" }}
          />
        </div>
        <Art x={306} y={6} w={147.657} h={83.057} src={`${A}/b06-plane.png`} />
        <Art x={292} y={-12} w={106.999} h={107} src={`${A}/b06-ring.svg`} />
        <Art x={227} y={87} w={106.999} h={107} src={`${A}/b06-ring.svg`} />
      </>
    ),
  },
  {
    key: "flights-5-back",
    title: "Flat 5% back on flights",
    body: "Book flights in the app and get a flat 5% back in Atlys credits. No hidden fees.",
    bodyW: 218,
    art: (
      <>
        <Rot x={273} y={37} bw={94.912} bh={112.249} w={72.314} h={96.833} deg={-165} flipY src={`${A}/b07-ticket.png`} />
        <Rot x={264.6} y={4.91} bw={47.706} bh={56.421} w={36.347} h={48.672} deg={-15} src={`${A}/b07-ticket.png`} />
      </>
    ),
  },
  {
    key: "flight-credits-50",
    title: "$50 flight credits",
    body: ["Your Atlys fee and full government fee", "come back on rejection. It’s automatic"],
    bodyW: 262,
    art: (
      <>
        <VoucherTile>
          <Art x={7} y={6} w={51.319} h={51.319} src={`${A}/b08-glow.svg`} />
          <Art x={13} y={12} w={39.319} h={39.319} src={`${A}/b08-plane.svg`} />
          <Art x={-4} y={67} w={9} h={9} src={`${A}/b08-notch.svg`} />
          <Art x={91} y={67} w={9} h={9} src={`${A}/b08-notch.svg`} />
        </VoucherTile>
        <Numeral x={283} y={95.62} size={12} lh={18.383} tracking={-0.48}>
          $
        </Numeral>
        <Numeral x={294.26} y={91} size={28} lh={39.392} tracking={-1.12}>
          50
        </Numeral>
      </>
    ),
  },
  {
    key: "fast-track",
    title: "Fast track immigration",
    body: "Global Entry–style expedited lanes at major airports",
    bodyW: 192,
    art: (
      <GlowTile hue="rgb(208,212,243)" glow="inset 0 0 15px 0 #10b981">
        <Art x={6} y={21} w={85} h={85} src={`${A}/b09-bolt.svg`} />
      </GlowTile>
    ),
  },
  {
    key: "transfers-15",
    title: "Flat 15% off on transfers",
    body: "Airport transfers included + $20 credit on eligible spends",
    art: <Art x={195} y={-90} w={253} h={316} src={`${A}/b10-car.png`} />,
  },
  {
    key: "hotline",
    title: "Emergency hotline",
    body: "Global Entry–style expedited lanes at major airports",
    bodyW: 165,
    art: (
      <>
        <GlowTile
          hue="rgb(245,219,255)"
          glow="inset 0 0 4px 0 rgba(248,184,255,0.55), inset 0 0 15px 0 #ffb0b0"
        >
          <p
            className="pointer-events-none absolute whitespace-nowrap font-medium"
            style={{ left: 51, top: 34, fontSize: 11.294, lineHeight: "14.118px", letterSpacing: "-0.4518px", color: "#b095e3" }}
          >
            24/7
          </p>
        </GlowTile>
        <Art x={276} y={34} w={82} h={82} src={`${A}/b11-call.svg`} />
      </>
    ),
  },
  {
    key: "passport-lost",
    title: "Passport lost? handled.",
    body: "Global Entry–style expedited lanes at major airports",
    bodyW: 165,
    art: (
      <>
        <DiscArc disc={`${A}/b12-disc.svg`} dx={222} dy={23} dw={175} dh={176} ax={216} ay={19} />
        <Art x={264} y={66} w={84} h={120} src={`${A}/b12-passport.png`} radius={12} />
      </>
    ),
  },
  {
    key: "delay-200",
    title: "$200 flight delay protection",
    body: "Global Entry–style expedited lanes at major airports",
    bodyW: 165,
    art: (
      <>
        <DiscArc disc={`${A}/b13-disc.svg`} dx={225} dy={22} dw={163} dh={164} ax={218} ay={16} />
        <Art x={271} y={67} w={73.319} h={73.319} src={`${A}/b13-icon.svg`} />
      </>
    ),
  },
  {
    key: "baggage-500",
    title: "$500 baggage protection",
    body: "Global Entry–style expedited lanes at major airports",
    bodyW: 165,
    art: (
      <>
        <DiscArc disc={`${A}/b13-disc.svg`} dx={225} dy={22} dw={163} dh={164} ax={216} ay={15} />
        <Art x={271} y={67} w={73.319} h={73.319} src={`${A}/b14-icon.svg`} />
      </>
    ),
  },
  {
    key: "medical-50k",
    title: "$50,000 medical cover",
    body: "Global Entry–style expedited lanes at major airports",
    bodyW: 165,
    art: (
      <>
        <DiscArc disc={`${A}/b13-disc.svg`} dx={225} dy={22} dw={163} dh={164} ax={216} ay={15} />
        <Art x={271} y={67} w={73.319} h={73.319} src={`${A}/b15-icon.svg`} />
      </>
    ),
  },
  {
    key: "hotels-10",
    title: "Flat 10% off on hotels",
    body: "Book stays in the app and get a flat 10% back in Atlys credits",
    bodyW: 192,
    art: (
      <>
        <Art x={262.5} y={74.93} w={22.653} h={41.6} src={`${A}/b16-tail.svg`} />
        <div
          className="pointer-events-none absolute overflow-hidden"
          style={{ left: 265.38, top: 18.91, width: 104.617, height: 113.678 }}
        >
          <Image
            src={`${A}/b06-hotel.png`}
            alt=""
            width={129}
            height={114}
            unoptimized
            style={{ position: "absolute", left: "-22.83%", top: "-0.02%", width: "122.83%", height: "100.04%", maxWidth: "none" }}
          />
        </div>
      </>
    ),
  },
  {
    key: "hotel-credit-x2",
    title: "Flat 10% off on hotels",
    body: "Twice-yearly hotel credit at select hotels, on top of your flat 10%",
    bodyW: 198,
    art: (
      <>
        <VoucherTile>
          <Art x={7} y={6} w={51.319} h={51.319} src={`${A}/b17-glow.svg`} />
          <Art x={13} y={12} w={39.319} h={39.319} src={`${A}/b17-plane.svg`} />
          <Art x={91} y={67} w={9} h={9} src={`${A}/b17-notch.svg`} />
        </VoucherTile>
        <Art x={266} y={81} w={9} h={9} src={`${A}/b17-notch.svg`} />
        <Numeral x={283} y={95.62} size={12} lh={18.383} tracking={-0.48}>
          $
        </Numeral>
        <Numeral x={294.26} y={91} size={28} lh={39.392} tracking={-1.12}>
          100
        </Numeral>
        {/* "x2" is drawn twice, the lower copy blurred — that is the glow
            behind it, not a duplicate. */}
        <p
          className="pointer-events-none absolute whitespace-nowrap font-semibold text-white"
          style={{ left: 295, top: 26, fontSize: 13, lineHeight: "39.392px", letterSpacing: "-0.52px", filter: "blur(4.5px)" }}
        >
          x2
        </p>
        <p
          className="pointer-events-none absolute whitespace-nowrap font-semibold text-white"
          style={{ left: 295, top: 26, fontSize: 13, lineHeight: "39.392px", letterSpacing: "-0.52px" }}
        >
          x2
        </p>
      </>
    ),
  },
  {
    key: "zero-forex",
    title: "0 forex",
    body: "Spend abroad at the real rate. No markup, no hidden fees.",
    bodyW: 165,
    art: (
      <>
        <Art x={225.29} y={-64.9} w={194.417} h={289.802} src={`${A}/b18-map.png`} opacity={0.4} />
        <Art x={256.89} y={10.63} w={134.111} h={134.111} src={`${A}/b18-ring.svg`} />
        <p
          className="pointer-events-none absolute whitespace-nowrap font-bold"
          style={{
            left: 296.24,
            top: 34.79,
            fontSize: 74.468,
            lineHeight: "normal",
            backgroundImage: "linear-gradient(180deg, #000000 0%, #666666 100%)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
          }}
        >
          0
        </p>
        <p
          className="pointer-events-none absolute whitespace-nowrap font-semibold"
          style={{ left: 284.27, top: 45.43, fontSize: 21.277, lineHeight: "normal", color: "#77838f" }}
        >
          ₹
        </p>
      </>
    ),
  },
];
