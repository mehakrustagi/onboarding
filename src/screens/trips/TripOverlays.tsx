"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import type { InfoSheetKey, TripItem } from "./tripSections";
import { AudioBar, DOTTED_RULE, SourcesChip } from "./TripSheet";

/* The three things the agent column can open — Figma 947:38726, 947:40652
 * and 947:43798.
 *
 * Two of them are the same object. The visa-delivery and flight-booking
 * frames differ only in their copy and in whether the last block is a
 * paragraph or a button: same 440-wide sheet pinned to the bottom, same
 * grabber at +10, header at +50, rule at +84, orb at +126, headline at
 * +208 and second block at +248. So they are one component with two
 * content records rather than two components that would drift apart the
 * first time a shared value changed.
 *
 * The third is a different animal — a near-full-height sheet that reads
 * as a room you walked into rather than a panel that slid up, and it
 * carries a live composer.
 *
 * The shell is 440x965, which is exactly the Figma frame, so every number
 * below is Figma's own coordinate with nothing rescaled.
 */

const S = "/assets/trips/sheet";

/* Shared with AskBar and the sheet cards. */
const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* ── The bottom sheet ──────────────────────────────────────────────── */

type InfoContent = {
  /** Height of the sheet. Figma sizes each to its own content. */
  height: number;
  /** Bold 11/14 +0.88 uppercase, centred at +50. */
  header: string;
  /** Medium 20/25 -0.8 #0B0B0B, centred at +208. */
  title: string;
  /** +248. Green gradient when it states a fact, grey when it explains. */
  lead: { text: string; tone: "green" | "grey"; width: number };
  /** Medium 14/19 -0.28 #999 at +316. */
  body?: string;
  /** 380x51 aurora button at +345. */
  cta?: string;
  /** Figma gives each frame its own orb art rather than reusing the
      section's — an agent showing its own face for this one answer. */
  orb: string;
};

const INFO: Record<InfoSheetKey, InfoContent> = {
  "visa-delivery": {
    height: 423.223,
    header: "Visa Delivery",
    orb: `${S}/orb-visa.png`,
    title: "Everything is on track!",
    lead: {
      text: "Your visa is expected to be delivered on 12th June 202",
      tone: "green",
      width: 276.721,
    },
    body: "In our latest update, our AI agent personally called the embassy to check on your status, and they confirmed that everything is moving smoothly",
  },
  "flight-booking": {
    height: 436.119,
    header: "Flight Booking",
    orb: `${S}/orb-flight.png`,
    title: "Already booked your flights?",
    lead: {
      text: "Share your flight details with us!\nOur AI will continuously monitor for seat upgrades and handle your automatic web check-in hassle free",
      tone: "grey",
      width: 360.72,
    },
    cta: "+ Add Flight Details",
  },
};

const GRAD_GREEN = "linear-gradient(90deg, #0b0b0b 0%, #10b981 100%)";

function gradientText(image: string): React.CSSProperties {
  return {
    backgroundImage: image,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

/* The 50px agent orb, ring and all.
 *
 * Three layers, and the third is the one that is easy to miss: a comet
 * tail (Group 1991427861) rotated -30deg that overhangs the circle at the
 * bottom-left. Without it the orb reads as a flat avatar; with it, it
 * reads as the same moving thing the column parks against its rows. */
function Orb({ src, size }: { src: string; size: number }) {
  /* Figma draws the 50 and the 40 as separate exports; every measurement
     in the smaller one is the larger one times 0.8, so it is one component
     at two scales rather than two drawings. */
  const k = size / 50;
  return (
    <div className="absolute" style={{ inset: 0 }}>
      <div
        className="absolute overflow-hidden"
        style={{
          left: 1.875 * k,
          top: 1.875 * k,
          width: 46.25 * k,
          height: 46.25 * k,
          borderRadius: "50%",
          boxShadow: "inset 0px 0px 3.143px 0px rgba(0,0,0,0.15)",
        }}
      >
        <Image
          src={src}
          alt=""
          width={150}
          height={150}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
      <Image
        src={`${S}/orb-ring.svg`}
        alt=""
        width={50}
        height={50}
        style={{ position: "absolute", inset: 0, width: size, height: size }}
      />
      <div
        className="absolute flex items-center justify-center"
        style={{ left: 0.78 * k, top: -1.78 * k, width: 47.65 * k, height: 54.02 * k }}
      >
        <Image
          src={`${S}/orb-tail.svg`}
          alt=""
          width={28.513}
          height={45.915}
          style={{
            width: 28.513 * k,
            height: 45.915 * k,
            transform: "rotate(-30deg)",
          }}
        />
      </div>
    </div>
  );
}

function Grabber() {
  return (
    <Image
      src={`${S}/grabber.svg`}
      alt=""
      width={24}
      height={2}
      style={{ position: "absolute", left: 208.45, top: 10, width: 24, height: 2 }}
    />
  );
}

function InfoSheet({ id, onClose }: { id: InfoSheetKey; onClose: () => void }) {
  const c = INFO[id];

  return (
    <>
      {/* rgba(0,0,0,0.8) over a 20px backdrop blur — Rectangle 240648158.
          Tapping it dismisses; Figma has no other close affordance on
          these two, which is what makes the scrim the control. */}
      <motion.button
        type="button"
        aria-label="Close"
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
        onClick={onClose}
      />

      <motion.div
        role="dialog"
        aria-label={c.header}
        className="absolute"
        style={{
          left: 0,
          bottom: 0,
          width: 440,
          height: c.height,
          background: "#ffffff",
          borderRadius: 44,
        }}
        initial={{ y: c.height }}
        animate={{ y: 0 }}
        exit={{ y: c.height }}
        /* visualDuration/bounce rather than a tween: a sheet is a physical
            object being thrown up into place, and the small overshoot is
            what sells its weight. */
        transition={{ type: "spring", visualDuration: 0.42, bounce: 0.18 }}
      >
        <Grabber />

        <p
          className="absolute w-full text-center"
          style={{
            top: 50,
            fontSize: 11,
            lineHeight: "14px",
            letterSpacing: "0.88px",
            fontWeight: 700,
            textTransform: "uppercase",
            color: "#000000",
          }}
        >
          {c.header}
        </p>

        <div
          className="absolute"
          style={{ left: 29.93, top: 84, width: 381, height: 1, backgroundImage: DOTTED_RULE }}
        />

        <div className="absolute" style={{ left: 195.43, top: 125.88, width: 50, height: 50 }}>
          <Orb src={c.orb} size={50} />
        </div>

        <p
          className="absolute w-full text-center"
          style={{
            top: 208,
            fontSize: 20,
            lineHeight: "25px",
            letterSpacing: "-0.8px",
            fontWeight: 500,
            color: "#0b0b0b",
          }}
        >
          {c.title}
        </p>

        <p
          className="absolute text-center"
          style={{
            left: (440 - c.lead.width) / 2,
            top: 248,
            width: c.lead.width,
            whiteSpace: "pre-line",
            fontSize: 14,
            lineHeight: "19px",
            ...(c.lead.tone === "green"
              ? { letterSpacing: "-0.14px", fontWeight: 600, ...gradientText(GRAD_GREEN) }
              : { letterSpacing: "-0.28px", fontWeight: 500, color: "#999999" }),
          }}
        >
          {c.lead.text}
        </p>

        {c.body && (
          <p
            className="absolute text-center"
            style={{
              left: (440 - 360.72) / 2,
              top: 316,
              width: 360.72,
              fontSize: 14,
              lineHeight: "19px",
              letterSpacing: "-0.28px",
              fontWeight: 500,
              color: "#999999",
            }}
          >
            {c.body}
          </p>
        )}

        {c.cta && (
          /* Same aurora as the column's "Track Order" link, at 380x51.
             Figma lays rgba(255,255,255,0.1) over the artwork; that alone
             renders far more saturated than the design reads, so this
             matches the column's heavier sheet rather than the raw value. */
          <button
            type="button"
            className="absolute overflow-hidden"
            style={{
              left: 30.43,
              top: 345,
              width: 380,
              height: 51,
              borderRadius: 84,
              backgroundImage: `url(${S}/aurora.svg)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span className="absolute inset-0" style={{ background: "rgba(255,255,255,0.22)" }} />
            <span
              className="relative"
              style={{
                fontSize: 14,
                lineHeight: "19px",
                letterSpacing: "-0.14px",
                fontWeight: 600,
                color: "#000000",
              }}
            >
              {c.cta}
            </span>
          </button>
        )}
      </motion.div>
    </>
  );
}

/* ── The detail view ───────────────────────────────────────────────── */

/* Figma sets parts of the transcript in black against the #808080 run.
 * Split rather than dangerouslySetInnerHTML: the copy is data, and a
 * highlight list is a safer thing to carry in data than markup. */
function Emphasised({ text, marks }: { text: string; marks?: string[] }) {
  if (!marks?.length) return <>{text}</>;

  let rest = text;
  const out: React.ReactNode[] = [];
  marks.forEach((m, i) => {
    const at = rest.indexOf(m);
    if (at < 0) return;
    if (at > 0) out.push(rest.slice(0, at));
    out.push(
      <span key={i} style={{ color: "#000000" }}>
        {m}
      </span>,
    );
    rest = rest.slice(at + m.length);
  });
  out.push(rest);
  return <>{out}</>;
}

const SHEET_TOP = 54.2;

function DetailView({
  item,
  action,
  context,
  onClose,
}: {
  item: TripItem;
  action: string;
  context: string;
  onClose: () => void;
}) {
  const text = item.detail ?? (Array.isArray(item.body) ? item.body.join(" ") : item.body) ?? "";

  return (
    <>
      {/* rgba(0,0,0,0.9) at 80% — Rectangle 240647923. No blur on this one:
          only a 54px strip of it is ever visible above the sheet. */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.72)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.24 }}
      />

      <motion.div
        role="dialog"
        aria-label={context}
        className="absolute overflow-hidden"
        style={{
          left: 0,
          top: SHEET_TOP,
          width: 440,
          bottom: 0,
          background: "#eceaef",
          borderRadius: 44,
        }}
        initial={{ y: 965 - SHEET_TOP }}
        animate={{ y: 0 }}
        exit={{ y: 965 - SHEET_TOP }}
        transition={{ type: "spring", visualDuration: 0.46, bounce: 0.14 }}
      >
        {/* 50px glass disc — the same material as the sources chip, at
            1.111px border and a 27.778px blur because Figma scales the
            component up here rather than redrawing it. */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute"
          style={{
            left: 359.68,
            top: 84.18 - SHEET_TOP,
            width: 50,
            height: 50,
            borderRadius: 44.444,
            border: "1.111px solid #ffffff",
            backgroundImage:
              "linear-gradient(133deg, rgba(255,255,255,0.4) 10.513%, rgba(255,255,255,0.1) 72.053%)",
            backdropFilter: "blur(27.778px)",
            WebkitBackdropFilter: "blur(27.778px)",
            boxShadow: "0px 4.444px 33.333px -2.222px rgba(78,78,78,0.05)",
          }}
        >
          <Image
            src={`${S}/close.svg`}
            alt=""
            width={20}
            height={20}
            style={{ position: "absolute", left: 15, top: 15, width: 20, height: 20 }}
          />
        </button>

        {item.status && (
          <>
            <Image
              src={`${S}/call-lg.svg`}
              alt=""
              width={12}
              height={20}
              style={{
                position: "absolute",
                left: 30,
                top: 131.08 - SHEET_TOP,
                width: 12,
                height: 20,
              }}
            />
            <p
              className="absolute whitespace-nowrap gradient-text-shine"
              style={{
                left: 58,
                top: 141.58 - SHEET_TOP,
                fontSize: 14,
                lineHeight: "19px",
                letterSpacing: "-0.14px",
                fontWeight: 600,
              }}
            >
              {item.status}
            </p>
          </>
        )}

        {/* The transcript, at 20/25 — four times the weight it carries in
            the column, which is the whole reason this view exists. */}
        <p
          className="absolute"
          style={{
            left: 30,
            top: 186.31 - SHEET_TOP,
            width: 363.662,
            fontSize: 20,
            lineHeight: "25px",
            letterSpacing: "-0.8px",
            fontWeight: 500,
            color: "#808080",
          }}
        >
          <Emphasised text={text} marks={item.emphasis} />
        </p>

        {/* AudioBar and SourcesChip carry their own top margins from the
            column. This block is absolutely positioned, so those margins
            resolve inside it instead of collapsing out — parking it 30
            above the player lands both at Figma's 306.31 and 361.31. */}
        {(item.audio || item.sources) && (
          <div className="absolute" style={{ left: 30, top: 306.31 - SHEET_TOP - 30 }}>
            {item.audio && <AudioBar duration={item.audio} />}
            {item.sources && <SourcesChip {...item.sources} />}
          </div>
        )}

        <div
          className="absolute"
          style={{
            left: 30,
            top: 431.5 - SHEET_TOP,
            width: 380,
            height: 1,
            backgroundImage: DOTTED_RULE,
          }}
        />

        <div
          className="absolute"
          style={{ left: 30, top: 471.5 - SHEET_TOP + 1.78, width: 40, height: 40 }}
        >
          <Orb src={`${S}/orb-detail.png`} size={40} />
        </div>

        {/* ── Composer ─────────────────────────────────────────────────
            Two copies of the same 380x125 bar artwork stacked 48 apart.
            The upper one is only visible as the strip above the field, and
            that strip is the context chip: which row of the column this
            reply is attached to. */}
        <div
          className="absolute"
          style={{ left: 29.84, top: 762 - SHEET_TOP, width: 380, height: 125 }}
        >
          <Image
            src="/assets/payment/input-bar-bg.svg"
            alt=""
            width={380}
            height={125}
            style={{ position: "absolute", inset: 0, width: 380, height: 125 }}
          />
          <Image
            src={`${S}/chip-doc.svg`}
            alt=""
            width={16}
            height={16}
            style={{ position: "absolute", left: 25, top: 16.5, width: 16, height: 16 }}
          />
          <span
            className="absolute whitespace-nowrap"
            style={{
              left: 47,
              top: 15,
              fontSize: 14,
              lineHeight: "19px",
              letterSpacing: "-0.28px",
              fontWeight: 500,
              color: "#808080",
            }}
          >
            {context}
          </span>
          <button
            type="button"
            aria-label={`Detach ${context}`}
            onClick={onClose}
            className="absolute"
            style={{ left: 348, top: 16, width: 16, height: 16 }}
          >
            <Image
              src={`${S}/close-sm.svg`}
              alt=""
              width={16}
              height={16}
              style={{ width: 16, height: 16 }}
            />
          </button>
        </div>

        <div
          className="absolute"
          style={{ left: 29.84, top: 810 - SHEET_TOP, width: 380, height: 125 }}
        >
          <Image
            src="/assets/payment/input-bar-bg.svg"
            alt=""
            width={380}
            height={125}
            style={{ position: "absolute", inset: 0, width: 380, height: 125 }}
          />

          {/* The tapped pill's label, already typed, with the caret AFTER
              it — the field is mid-composition rather than empty. Laid out
              as a row so the caret follows the text instead of sitting at
              a hard-coded x that only fits one label. */}
          <div className="absolute flex items-center" style={{ left: 25, top: 23, height: 25 }}>
            <span
              className="whitespace-nowrap"
              style={{
                fontSize: 16,
                lineHeight: "20px",
                letterSpacing: "-0.64px",
                fontWeight: 500,
                color: "#000000",
              }}
            >
              {action}
            </span>
            <motion.span
              className="rounded-[3px]"
              style={{ marginLeft: 6, width: 1.2, height: 25, background: "#0b0b0b" }}
              animate={{ opacity: [1, 1, 0, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
            />
          </div>

          <div
            className="absolute rounded-[15px] border border-[#f2f2f2] bg-white"
            style={{ left: 265, top: 60, width: 40, height: 40 }}
          >
            <Image
              src="/assets/payment/mic.svg"
              alt=""
              width={22}
              height={22}
              style={{ position: "absolute", left: 9, top: 9, width: 22, height: 22 }}
            />
          </div>

          <div
            className="absolute rounded-[15px]"
            style={{ left: 315, top: 60, width: 40, height: 40, background: "#000000" }}
          >
            <Image
              src="/assets/payment/arrow-up.svg"
              alt=""
              width={22}
              height={22}
              style={{
                position: "absolute",
                left: 9,
                top: 9,
                width: 22,
                height: 22,
                transform: "rotate(90deg)",
                filter: "invert(1)",
              }}
            />
          </div>
        </div>
      </motion.div>
    </>
  );
}

/* ── Host ──────────────────────────────────────────────────────────── */

export type TripOverlay =
  | { kind: "info"; id: InfoSheetKey }
  | { kind: "detail"; item: TripItem; action: string; context: string };

export default function TripOverlays({
  overlay,
  onClose,
}: {
  overlay: TripOverlay | null;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {overlay && (
        <motion.div
          key={overlay.kind === "info" ? overlay.id : `detail-${overlay.action}`}
          className="absolute inset-0"
          style={{ zIndex: 20 }}
          initial={false}
        >
          {overlay.kind === "info" ? (
            <InfoSheet id={overlay.id} onClose={onClose} />
          ) : (
            <DetailView
              item={overlay.item}
              action={overlay.action}
              context={overlay.context}
              onClose={onClose}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export { IN_EASE };
