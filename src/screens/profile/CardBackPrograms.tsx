"use client";

import Image from "next/image";
import { motion } from "framer-motion";

/* The pass's back for a profile with programs already connected —
 * Figma 935:22105.
 *
 * Where the other back invites you to connect, this one reports: a count,
 * a timestamp, and the loyalty cards themselves stacked up the face.
 *
 * Card-relative geometry (the card is 252.325×350):
 *   aurora   234.48×240 turned −127.42° inside a 333.094×332.065 box
 *            at (19, −109)
 *   "06"     20px SemiBold centred on x 41.16, top 29
 *   caption  12px centred on x 88.16, top 70; stamp 11px at top 87
 *   add      32×32 at (197, 26), r34.56, 0.8px #14163a
 *   bonvoy   204×152 at (25.5, 125) — its own Subtract shape, since the
 *            card is notched rather than a plain rounded rect
 *   krisflyer 215×152 at (19.16, 192), r16
 *   maharaja  225×152 at (14.16, 265), r16
 *   fade     244×36 at (−2, 310), white upward, backdrop-blur 10
 *   chevron  20×20 at (112, 323.91)
 *
 * The three cards widen as they descend (204 → 215 → 225), which is what
 * makes the stack read as receding rather than as three equal cards.
 */

const CX = 252.325 / 2;

/** The value block each loyalty card carries — serial left, points right. */
function Values({
  serial,
  points,
  amountCx,
  amountTop,
  pointsCx,
  pointsTop,
  serialCx,
  serialTop,
}: {
  serial: string;
  points: string;
  amountCx: number;
  amountTop: number;
  pointsCx: number;
  pointsTop: number;
  serialCx: number;
  serialTop: number;
}) {
  return (
    <>
      <p
        className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center font-semibold text-white"
        style={{ left: amountCx, top: amountTop, fontSize: 16, lineHeight: "20px", letterSpacing: "-0.64px" }}
      >
        {points}
      </p>
      <p
        className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center font-medium"
        style={{
          left: pointsCx,
          top: pointsTop,
          fontSize: 11,
          lineHeight: "16px",
          opacity: 0.6,
          backgroundImage: "linear-gradient(90deg, #ffffff, rgba(255,255,255,0.6))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        points
      </p>
      <p
        className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase"
        style={{
          left: serialCx,
          top: serialTop,
          fontSize: 11,
          lineHeight: "14px",
          letterSpacing: "0.88px",
          backgroundImage: "linear-gradient(90deg, #ffffff, rgba(255,255,255,0.6))",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          color: "transparent",
        }}
      >
        {serial}
      </p>
    </>
  );
}

export default function CardBackPrograms({ onConnect }: { onConnect?: () => void }) {
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      style={{ borderRadius: 30, background: "#ffffff", border: "2px solid #ebebeb" }}
    >
      {/* Aurora wash. Turned slowly on its own long period — a static
          gradient behind a white card reads as a printed backdrop. */}
      <div
        className="pointer-events-none absolute flex items-center justify-center"
        style={{ left: 19, top: -109, width: 333.094, height: 332.065 }}
      >
        <motion.div
          style={{ width: 234.48, height: 240 }}
          animate={{ rotate: [-127.42, -122.42, -127.42] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        >
          <Image
            src="/assets/profile/pb-aurora.svg"
            alt=""
            width={235}
            height={240}
            style={{ width: 234.48, height: 240, display: "block" }}
          />
        </motion.div>
      </div>

      <p
        className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center font-semibold"
        style={{ left: CX - 85, top: 29, fontSize: 20, lineHeight: "25px", letterSpacing: "-0.8px", color: "#1d1d1d" }}
      >
        06
      </p>
      <p
        className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center font-medium"
        style={{ left: CX - 38, top: 70, fontSize: 12, lineHeight: "16px", letterSpacing: "-0.24px", color: "#1d1d1d" }}
      >
        programs connected
      </p>
      <p
        className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap text-center"
        style={{ left: CX - 42.5, top: 87, fontSize: 11, lineHeight: "16px", letterSpacing: "-0.11px", color: "#999999" }}
      >
        updated 14 mins ago
      </p>

      {/* Add another. Stops propagation so it doesn't turn the card. */}
      <button
        type="button"
        aria-label="Connect a program"
        onClick={(e) => {
          e.stopPropagation();
          onConnect?.();
        }}
        className="absolute flex items-center justify-center"
        style={{
          left: 197,
          top: 26,
          width: 32,
          height: 32,
          borderRadius: 34.56,
          background: "#ffffff",
          border: "0.8px solid #14163a",
        }}
      >
        <Image
          src="/assets/profile/pb-add.svg"
          alt=""
          width={16}
          height={16}
          style={{ width: 15.36, height: 15.36, display: "block" }}
        />
      </button>

      {/* Bonvoy. Its own Subtract shape rather than a rounded rect — the
          card is notched on the left where the dot sits. */}
      <div className="pointer-events-none absolute" style={{ left: 25.5, top: 125, width: 204, height: 152 }}>
        <Image
          src="/assets/profile/pb-bonvoy-shape.svg"
          alt=""
          width={204}
          height={152}
          style={{ width: 204, height: 152, display: "block" }}
        />
      </div>
      {/* Drawn twice on plus-lighter, as Figma has it — the logo is faint
          against the maroon and one pass alone barely registers. */}
      {[0, 1].map((i) => (
        <Image
          key={i}
          src="/assets/profile/pb-bonvoy-logo.png"
          alt=""
          width={48}
          height={48}
          unoptimized
          className="pointer-events-none absolute"
          style={{ left: 52.5, top: 126, width: 48, height: 48, mixBlendMode: "plus-lighter", objectFit: "cover" }}
        />
      ))}
      <Values serial="739154xxx" points="23,545" amountCx={184} amountTop={141} pointsCx={194} pointsTop={164} serialCx={89.5} serialTop={165} />
      <Image
        src="/assets/profile/pb-dot.svg"
        alt=""
        width={5}
        height={5}
        className="pointer-events-none absolute"
        style={{ left: 21.5, top: 150, width: 5, height: 5 }}
      />

      {/* KrisFlyer */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: CX + 0.5 - 215 / 2,
          top: 192,
          width: 215,
          height: 152,
          borderRadius: 16,
          backgroundImage:
            "linear-gradient(70.69deg, rgb(22,79,173) 13.996%, rgb(29,36,183) 27.998%, rgb(59,130,246) 41.97%, rgb(22,79,173) 96.157%, rgb(0,54,148) 130.56%)",
        }}
      />
      <Image
        src="/assets/profile/pb-krisflyer.png"
        alt=""
        width={62}
        height={22}
        unoptimized
        className="pointer-events-none absolute"
        style={{ left: 38, top: 206, width: 62, height: 22, objectFit: "cover" }}
      />
      <Values serial="739154xxx" points="23,545" amountCx={187.5} amountTop={208} pointsCx={197.5} pointsTop={231} serialCx={76} serialTop={232} />

      {/* Maharaja */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: CX + 0.5 - 225 / 2,
          top: 265,
          width: 225,
          height: 152,
          borderRadius: 16,
          backgroundImage:
            "linear-gradient(69.86deg, rgb(209,164,74) 13.996%, rgb(193,143,58) 27.998%, rgb(178,125,41) 56.068%, rgb(255,221,162) 130.56%)",
        }}
      />
      <Image
        src="/assets/profile/pb-maharaja.png"
        alt=""
        width={81}
        height={29}
        unoptimized
        className="pointer-events-none absolute"
        style={{ left: 29, top: 273, width: 81, height: 29, objectFit: "cover" }}
      />
      <Values serial="739154xxx" points="23,545" amountCx={189.5} amountTop={281} pointsCx={199.5} pointsTop={304} serialCx={68} serialTop={308} />

      {/* Foot: the stack runs under a white fade, with a chevron saying
          there is more below. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: -2,
          top: 310,
          width: 244,
          height: 36,
          background: "linear-gradient(0deg, #ffffff 0%, rgba(255,255,255,0) 100%)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      />
      <motion.div
        className="pointer-events-none absolute"
        style={{ left: 112, top: 323.91, width: 20, height: 20 }}
        animate={{ y: [0, 2.5, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/assets/profile/pb-chevron.svg"
          alt=""
          width={20}
          height={20}
          style={{ width: 20, height: 20, display: "block" }}
        />
      </motion.div>
    </div>
  );
}
