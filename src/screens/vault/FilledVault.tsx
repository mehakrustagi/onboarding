"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useDragScroll } from "../trips/useDragScroll";

/* Trip Vault with documents in it — Figma 1110:15009, "Uploads document
 * (KYC Not Done)". This is where the upload flow lands, which is why it
 * lives next to the empty state rather than on a route of its own: they
 * are two states of one sheet, and the only way to judge either is to
 * arrive at it from the other.
 *
 * The node is drawn 1533 tall — the sheet at full content height rather
 * than cropped to the phone. On a 440×965 shell that becomes a scroller
 * with the CTA row pinned, which is the only structural decision in this
 * file that is not read straight off the frame.
 *
 * Geometry, sheet-relative (the sheet starts at y64.68 on the frame):
 *
 *   title     TRIP VAULT 12px bold 0.96 uppercase, centred, y104.68
 *   search    331×50 at (54.82, 143.68)
 *   day       heading 16/20 -0.64 #090909 at x54.83; subtitle 12/16 #999
 *             25 below it; first card 61 below the heading
 *   card      200×284, 15 apart, x54.83 then 269.83
 *   in a card logo 40 at +20,+20 · eyebrow +82 · title +108 · sub +132 ·
 *             link +158 · dashes +204 · action pill 160×40 at +224
 *   rhythm    card bottom → next heading is 50
 *   CTA       Upload 185×51 at (29.81, 1444.96); Sync 184.45×51 at
 *             (225.72, 1444.68)
 *
 * THE TICKET SHAPE IS AN ASSET, NOT A BORDER-RADIUS. The card has a
 * notch cut into each side at the dashed line — that is what makes it a
 * ticket rather than a rounded rectangle, and it is also the one part of
 * it that cannot be expressed in CSS without two masked pseudo-elements
 * that then have to be kept in step with the card's own shadow.
 */

const A = "/assets/vault";

const CARD_W = 200;
const CARD_H = 284;
const CARD_GAP = 15;
const ROW_X = 54.83;

/* Bottom bar height, measured from the CTA row's top edge to the frame
 * bottom in the node (1533 − 1444.68), so the scroller can clear it. */
const CTA_BAR = 121;

type Doc = {
  eyebrow: string;
  title: string;
  sub: string;
  link: string;
  action: string;
  /** Square logo bitmap, or a glyph dropped into a plain disc. */
  logo?: string;
  icon?: string;
  /** The one the upload flow just produced, so it can announce itself. */
  justAdded?: boolean;
};

type Day = { heading: string; note: string; docs: Doc[] };

const DAYS: Day[] = [
  {
    heading: "Today, Sep 23",
    note: "1 document for flight & immigration",
    docs: [
      {
        eyebrow: "10:45 AM",
        title: "Air India • AI 302",
        sub: "DEL → DXB",
        link: "Request Upgrade",
        action: "View Boarding Pass",
        logo: `${A}/logo-airindia.png`,
      },
    ],
  },
  {
    heading: "Tuesday, Sep 24",
    note: "2 documents for hotel & transport",
    docs: [
      {
        eyebrow: "1:30 PM",
        title: "Airport Transfer",
        sub: "Tesla Cybertruck",
        link: "Call Driver",
        action: "View Booking",
        icon: `${A}/icon-car.svg`,
      },
      {
        eyebrow: "Check-in: 3 PM",
        title: "Grand Hyatt hotel",
        sub: "Ref: #GH-88201",
        link: "Call Front Desk",
        action: "View Booking",
        logo: `${A}/logo-hyatt.png`,
        justAdded: true,
      },
    ],
  },
  {
    heading: "Wednesday, Sep 25",
    note: "3 activities booked",
    docs: [
      {
        eyebrow: "4:30 PM",
        title: "Desert Safari & Dinner",
        sub: "2 Guests",
        link: "Modify Pickup Time",
        action: "View Booking",
        icon: `${A}/icon-deck.svg`,
      },
      {
        eyebrow: "8:30 PM",
        title: "Atmosphere Burj Khalifa",
        sub: "Ref: #ATM-4019",
        link: "Confirm Dietary Needs",
        action: "View Booking",
        icon: `${A}/icon-food.svg`,
      },
    ],
  },
];

function TicketCard({ doc, arrived }: { doc: Doc; arrived: boolean }) {
  return (
    <motion.div
      className="relative flex-none"
      style={{ width: CARD_W, height: CARD_H }}
      initial={doc.justAdded && arrived ? { opacity: 0, y: 18, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      <Image
        src={`${A}/ticket-200.svg`}
        alt=""
        width={228}
        height={312}
        style={{
          position: "absolute",
          left: -CARD_W * 0.07,
          top: 0,
          width: 228,
          /* The silhouette carries its own shadow, so it is 14% wider than
             the card. The reset's img{max-width:100%} was clamping it to
             200 and pulling the notches out of line with the dashes. */
          maxWidth: "none",
          height: 312,
        }}
      />

      {/* Pastel wash in the bottom third, behind the action pill. */}
      <div
        className="absolute overflow-hidden"
        style={{ left: 0, top: 180, width: CARD_W, height: 104, opacity: 0.3 }}
      >
        <Image
          src={`${A}/sync-grad.svg`}
          alt=""
          width={248}
          height={111}
          style={{ position: "absolute", left: -24, top: 26, width: 248, maxWidth: "none", height: 111 }}
        />
      </div>

      <div
        className="absolute"
        style={{
          left: 20,
          top: 20,
          width: 40,
          height: 40,
          borderRadius: 65,
          background: "#ffffff",
          border: "1px solid #f2f2f2",
          overflow: "hidden",
        }}
      >
        {doc.logo ? (
          /* Logos are supplied art at their own aspect, not 40px squares.
             `cover` on the disc keeps the Air India roundel filling it and
             crops the Hyatt lockup to its mark, which is what the node
             does to each of them by hand. */
          <Image
            src={doc.logo}
            alt=""
            width={40}
            height={40}
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: doc.logo.includes("hyatt") ? 26 : 40,
              height: doc.logo.includes("hyatt") ? 26 : 40,
              objectFit: "contain",
            }}
          />
        ) : (
          <Image
            src={doc.icon as string}
            alt=""
            width={18}
            height={18}
            style={{ position: "absolute", left: 11, top: 11, width: 18, height: 18 }}
          />
        )}
      </div>

      <p
        className="absolute whitespace-nowrap font-bold uppercase"
        style={{
          left: 20,
          top: 82,
          fontSize: 12,
          lineHeight: "14px",
          letterSpacing: "0.96px",
          color: "#000000",
        }}
      >
        {doc.eyebrow}
      </p>
      <p
        className="absolute font-semibold"
        style={{
          left: 20,
          top: 108,
          width: 160,
          fontSize: 14,
          lineHeight: "19px",
          letterSpacing: "-0.14px",
          color: "#000000",
        }}
      >
        {doc.title}
      </p>
      <p
        className="absolute whitespace-nowrap font-semibold"
        style={{
          left: 20,
          top: 132,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#999999",
        }}
      >
        {doc.sub}
      </p>
      <button
        type="button"
        className="absolute whitespace-nowrap font-semibold underline"
        style={{
          left: 20,
          top: 158,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#000000",
        }}
      >
        {doc.link}
      </button>

      <div
        className="absolute"
        style={{ left: 20, top: 204, width: 160, height: 0, borderTop: "1px dashed #e5e5e5" }}
      />

      <button
        type="button"
        className="absolute"
        style={{
          left: 20,
          top: 224,
          width: 160,
          height: 40,
          borderRadius: 65,
          background: "#ffffff",
          border: "1px solid #f2f2f2",
        }}
      >
        <span
          className="absolute w-full text-center font-semibold"
          style={{
            left: 0,
            top: 12,
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.12px",
            color: "#0b0b0b",
          }}
        >
          {doc.action}
        </span>
      </button>
    </motion.div>
  );
}

function DayRow({ day, arrived }: { day: Day; arrived: boolean }) {
  const rail = useDragScroll<HTMLDivElement>();
  return (
    <>
      <p
        className="font-semibold"
        style={{
          marginLeft: ROW_X,
          fontSize: 16,
          lineHeight: "20px",
          letterSpacing: "-0.64px",
          color: "#090909",
        }}
      >
        {day.heading}
      </p>
      <p
        className="font-semibold"
        style={{
          marginLeft: ROW_X,
          marginTop: 5,
          fontSize: 12,
          lineHeight: "16px",
          letterSpacing: "-0.12px",
          color: "#999999",
        }}
      >
        {day.note}
      </p>
      {/* Horizontal, because the node runs two cards off the right edge
          on both of the multi-document days. */}
      <div
        ref={rail}
        className="overflow-x-auto overscroll-x-contain"
        style={{
          marginTop: 16,
          scrollbarWidth: "none",
          touchAction: "pan-x",
          cursor: "grab",
        }}
      >
        <div className="flex" style={{ gap: CARD_GAP, paddingLeft: ROW_X, paddingRight: 30 }}>
          {day.docs.map((d) => (
            <TicketCard key={d.title} doc={d} arrived={arrived} />
          ))}
        </div>
      </div>
    </>
  );
}

/* The rail down the left edge. Figma draws it as a long column of 3px
 * marks at x7.83 — a ruler for the timeline the cards hang off. Generated
 * rather than transcribed: it is ~90 identical marks whose only variable
 * is which day they fall next to. */
function TimelineRail({ height }: { height: number }) {
  const marks = Math.ceil(height / 11.47);
  return (
    <div className="pointer-events-none absolute" style={{ left: 7.83, top: 0, width: 20, height }}>
      {Array.from({ length: marks }, (_, i) => {
        /* Every eighth mark is longer — the ruler's major division, which
           is what keeps 90 identical ticks from reading as a dotted line. */
        const major = i % 8 === 0;
        return (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: 0,
              top: i * 11.47,
              width: major ? 11 : 5.76,
              height: 3,
              background: "#d9dbdd",
              opacity: major ? 0.7 : 0.3,
            }}
          />
        );
      })}
    </div>
  );
}

export default function FilledVault({
  arrived,
  onUpload,
  onSync,
}: {
  /** True when the flow just handed a document over, so the new card can
      announce itself rather than simply being there on mount. */
  arrived: boolean;
  onUpload: () => void;
  onSync: () => void;
}) {
  return (
    <div className="absolute inset-0" style={{ zIndex: 4 }}>
      <div
        className="absolute"
        style={{
          left: 0,
          right: 0,
          top: 64.68,
          bottom: 0,
          background: "#ffffff",
          borderRadius: "44px 44px 0 0",
          boxShadow: "0px -10px 40px -8px rgba(0,0,0,0.12)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{ left: 208.31, top: 74.18, width: 24, height: 3, background: "#d6d9dc" }}
      />

      <p
        className="absolute w-full text-center font-bold uppercase"
        style={{
          left: 0,
          top: 104.68,
          fontSize: 12,
          lineHeight: "14px",
          letterSpacing: "0.96px",
          color: "#090909",
        }}
      >
        Trip vault
      </p>

      <div
        className="absolute"
        style={{
          left: 54.82,
          top: 143.68,
          width: 331,
          height: 50,
          borderRadius: 25,
          background: "#ffffff",
          border: "1px solid #f2f2f2",
          boxShadow: "0px 4px 30px -2px rgba(0,0,0,0.05)",
        }}
      />
      <Image
        src={`${A}/search.svg`}
        alt=""
        width={20}
        height={20}
        style={{ position: "absolute", left: 79.82, top: 158.68, width: 20, height: 20 }}
      />
      <p
        className="absolute whitespace-nowrap font-medium"
        style={{
          left: 104.82,
          top: 159.18,
          fontSize: 14,
          lineHeight: "19px",
          letterSpacing: "-0.28px",
          color: "#cccccc",
        }}
      >
        Search
      </p>

      {/* Everything from the first day heading down scrolls; the title,
          the search field and the CTA row do not. */}
      <div
        className="absolute overflow-y-auto overscroll-contain"
        style={{ left: 0, right: 0, top: 214, bottom: 0, scrollbarWidth: "none" }}
      >
        <div className="relative" style={{ paddingTop: 16 }}>
          <TimelineRail height={DAYS.length * 400} />
          {DAYS.map((d, i) => (
            <div key={d.heading} style={{ marginTop: i === 0 ? 0 : 50 }}>
              <DayRow day={d} arrived={arrived} />
            </div>
          ))}
          <div style={{ height: CTA_BAR + 30 }} />
        </div>
      </div>

      {/* The bar. Its scrim is what lets the last row scroll under it
          instead of ending against a hard edge. */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: 0,
          right: 0,
          bottom: 0,
          height: 160,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0) 0%, #ffffff 42%, #ffffff 100%)",
        }}
      />

      <button
        type="button"
        onClick={onUpload}
        className="absolute"
        style={{
          left: 29.81,
          bottom: 29.74,
          width: 185,
          height: 51,
          borderRadius: 65,
          background: "#ffffff",
          border: "1px solid #e5e5e5",
        }}
      >
        <Image
          src={`${A}/upload.svg`}
          alt=""
          width={20}
          height={20}
          style={{ position: "absolute", left: 56, top: 15.5, width: 20, height: 20 }}
        />
        <span
          className="absolute whitespace-nowrap font-semibold"
          style={{
            left: 81,
            top: 16,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#090909",
          }}
        >
          Upload
        </span>
      </button>

      <button
        type="button"
        onClick={onSync}
        className="absolute overflow-hidden"
        style={{
          left: 225.72,
          bottom: 29.74,
          width: 184.45,
          height: 51,
          borderRadius: 84,
          background: "rgba(255,255,255,0.1)",
        }}
      >
        <Image
          src={`${A}/sync-grad.svg`}
          alt=""
          width={228}
          height={102}
          style={{
            position: "absolute",
            left: (184.45 - 228) / 2,
            top: (51 - 102) / 2,
            width: 228,
            maxWidth: "none",
            height: 102,
          }}
        />
        <span
          className="absolute w-full text-center font-semibold"
          style={{
            left: 0,
            top: 16,
            fontSize: 14,
            lineHeight: "19px",
            letterSpacing: "-0.14px",
            color: "#090909",
          }}
        >
          Sync from Email
        </span>
      </button>
    </div>
  );
}
