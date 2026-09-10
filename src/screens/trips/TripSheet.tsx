"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { TRIP_SECTIONS, type TripGroup, type TripItem, type TripSection } from "./tripSections";
import type { TripOverlay } from "./TripOverlays";

/* The scrolling agent column — Figma 947:26137, measured off the node.
 *
 * Every box below is Figma's, not an approximation. The first pass of this
 * file inferred its metrics from a screenshot and got most of them wrong:
 * circular timeline nodes instead of rounded squares, 16px titles instead
 * of 18, flat labels instead of gradient text, and no audio player, "05
 * more" pill or right-hand agent orb at all. These are the real values,
 * from 947:27386 and 947:27535.
 *
 * SHEET      380 wide at x30. Content starts at x40, so a 10px inset.
 * HEADER     360x124 white card at x40, r23, shadow 0 4px 30px -2px
 *            rgba(0,0,0,.05). That shadow is Figma's filter decoded:
 *            feMorphology erode 2 -> -2px spread, stdDeviation 15 -> 30px
 *            blur, dy 4, alpha .05.
 * RAIL       nodes are 30x30 ROUNDED SQUARES at x60 — r10.714, 1.5px
 *            #D6D9DC, no fill — not circles. Connector is a curved SVG at
 *            x75, not a straight line.
 * TEXT       x115 throughout. Section title 18/22 -0.72 #090909; item
 *            title 16/20 -0.64 #090909; everything secondary is 12/16
 *            -0.12 #999 SemiBold. There is no Medium anywhere in here.
 *
 * Three things are GRADIENT TEXT, which is why they cannot be plain fills:
 *   status line   --gradient-text (black -> #5057EA -> #EF4646 -> #EDD758)
 *   "Activated…"  --gradient-text-green (#0b0b0b -> #10b981)
 *   pill labels   black -> #666
 *   WATCHING      #8b5cf6 -> #513690
 *
 * Vertical rhythm is Figma's deltas expressed as margins: title +5 from
 * the node, then +20 / +15 / +30 / +15 / +30 / +40 between the parts. Read
 * off the visa section and identical in the others. Kept as margins rather
 * than absolute tops so a body that wraps to a different number of lines
 * pushes what follows instead of overlapping it.
 */

const S = "/assets/trips/sheet";

const CARD_SHADOW = "0px 4px 30px -2px rgba(0,0,0,0.05)";

/* The glass both pill types are made of.
 *
 * Figma specifies this exactly for the sources chip — r30, 1px white,
 * backdrop-blur 25, a 166° white ramp and the card shadow. It fills the
 * ACTION pills rgba(255,255,255,0.1) instead, which is invisible, so their
 * entire appearance lives in effects the export does not carry. Side by
 * side in the design they are plainly the same material, so they share one
 * recipe here rather than my guessing at a second. */
const GLASS: React.CSSProperties = {
  border: "1px solid #ffffff",
  backgroundImage:
    "linear-gradient(166deg, rgba(255,255,255,0.9) 10.513%, rgba(255,255,255,0.62) 72.053%)",
  boxShadow: CARD_SHADOW,
};

/* Only the sources chip gets the real backdrop blur. Figma puts one on
 * every pill, but behind an action pill there is nothing but flat ground,
 * so it costs a compositor layer per button to blur a solid colour — and
 * two of them side by side produced a visible seam where their backdrop
 * regions met. */
const GLASS_BLUR: React.CSSProperties = {
  ...GLASS,
  backdropFilter: "blur(25px)",
  WebkitBackdropFilter: "blur(25px)",
};

/* Figma's Gradient/text is --gradient-text in globals.css, and live status
 * lines now take it via the .gradient-text-shine class rather than an
 * inline fill — the class carries the sweep animation with it, so there is
 * no second copy of the gradient to keep in step. */
const GRAD_GREEN = "linear-gradient(90deg, #0b0b0b 0%, #10b981 100%)";
const GRAD_PILL = "linear-gradient(90deg, #000 0%, #666 100%)";
const GRAD_STATE: Record<TripSection["state"], string> = {
  WATCHING: "linear-gradient(90deg, #8b5cf6 0%, #513690 100%)",
  WAITING: "linear-gradient(90deg, #d9902e 0%, #8a5a12 100%)",
  DONE: "linear-gradient(90deg, #10b981 0%, #0a7350 100%)",
};
const DOT_STATE: Record<TripSection["state"], string> = {
  WATCHING: "#8b5cf6",
  WAITING: "#d9902e",
  DONE: "#10b981",
};

function gradient(image: string): React.CSSProperties {
  return {
    backgroundImage: image,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
    WebkitTextFillColor: "transparent",
  };
}

/* Secondary text: Inter SemiBold 12/16, -0.12, #999. Used for every
 * subtitle, body, source label and duration in the column. */
const META: React.CSSProperties = {
  fontSize: 12,
  lineHeight: "16px",
  letterSpacing: "-0.12px",
  color: "#999999",
  fontWeight: 600,
};

/* ── Parts ─────────────────────────────────────────────────────────── */

/* The rail, drawn rather than loaded.
 *
 * Figma exports it as one SVG with the two elbows hard-coded at y 29.34
 * and 70.93 — the positions the visa item happens to put its "05 more"
 * pill and its status line at. That is fine for that one row and wrong for
 * every other, so the offsets are computed here from the same margin stack
 * the item lays out with, and the geometry is Figma's: a 1px line down x0.5,
 * a radius-8 quarter turn, a short run out to x12.83 and a 2.67r dot at
 * x15.5. The stroke fades in from transparent, which is why it is a
 * gradient and not a flat #D6D9DC.
 *
 * It is inline because the exported asset would not decode — the browser
 * reported naturalWidth 0 on a file that was valid XML and served 200. Not
 * worth chasing when the path is nine numbers.
 *
 * The fade ramps ALPHA on #D6D9DC rather than crossfading from white.
 * Figma's gradient runs white-at-zero-opacity to #D6D9DC, and a browser
 * interpolates that in non-premultiplied sRGB — so the middle of the ramp
 * is a half-transparent colour partway to white, and the whole rail came
 * out washed out. Same hue at both stops, alpha doing all the work, gives
 * the solid lower run the design shows.
 *
 * Every node gets a rail. Where an item has sub-rows the rail branches to
 * them; where it has none it still drops a short stub, which is what
 * Figma's second connector (Group 1991427812, 15x22.9) is. */
/* Where an item's sub-rows sit, measured from the top of the item box —
   the same margin stack Item lays out with. */
function itemBranches(item: TripItem) {
  const branches: number[] = [];
  let y = 5 + 20; /* title top + title height */
  if (item.more) {
    const top = y + 20;
    branches.push(top + 13); /* pill centre */
    y = top + 26;
  }
  if (item.when) {
    const top = y + 8;
    y = top + (item.when.party ? 32 : 16);
  }
  if (item.status) {
    const top = y + 20;
    branches.push(top + 8); /* status line centre */
    y = top + 16;
  }
  return branches;
}

function Rail({ branches, gid }: { branches: number[]; gid: string }) {
  /* Relative to the node's bottom edge, where the rail starts. */
  const local = branches.map((b) => b - 30);
  /* No sub-rows to point at: a plain stub, Figma's 22.9. */
  const stub = local.length === 0;
  const height = stub ? 23 : Math.max(...local) + 4;

  return (
    <svg
      className="absolute"
      style={{
        left: 34.5,
        top: 30,
        width: 18.167,
        height,
        overflow: "visible",
        pointerEvents: "none",
      }}
      viewBox={`0 0 18.167 ${height}`}
      fill="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="8" y1={-height * 0.22} x2="8" y2={height * 0.55}>
          <stop stopColor="#d6d9dc" stopOpacity="0" />
          <stop offset="1" stopColor="#d6d9dc" stopOpacity="1" />
        </linearGradient>
      </defs>
      {stub ? (
        <path d={`M0.5 0 V${height}`} stroke={`url(#${gid})`} strokeWidth="1" />
      ) : (
        local.map((by) => (
          <g key={by}>
            <path
              d={`M0.5 0 V${by - 8} A8 8 0 0 0 8.5 ${by} H12.83`}
              stroke={`url(#${gid})`}
              strokeWidth="1"
            />
            <circle cx="15.5" cy={by} r="2.667" fill={`url(#${gid})`} />
          </g>
        ))
      )}
    </svg>
  );
}

function RailNode({
  done,
  label,
  onToggle,
}: {
  done?: boolean;
  label: string;
  onToggle: () => void;
}) {
  /* 30x30, r10.714, 1.5px #D6D9DC. When complete it carries a 22x22
     #0B0B0B square at r8 with a white tick — not a green circle.
     It is a real checkbox: every step in the column can be ticked off by
     hand, which is the whole reason the design draws an empty box on the
     rows that are not done yet. */
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={Boolean(done)}
      aria-label={label}
      onClick={onToggle}
      className="absolute"
      style={{
        left: 20,
        top: 0,
        width: 30,
        height: 30,
        borderRadius: 10.714,
        border: "1.5px solid #d6d9dc",
        cursor: "pointer",
      }}
    >
      <AnimatePresence initial={false}>
        {done && (
          <motion.div
            className="absolute"
            style={{
              left: 2.5,
              top: 2.5,
              width: 22,
              height: 22,
              borderRadius: 8,
              background: "#0b0b0b",
            }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", visualDuration: 0.24, bounce: 0.42 }}
          >
            <Image
              src={`${S}/done.svg`}
              alt=""
              width={18}
              height={18}
              style={{ position: "absolute", left: 2, top: 2, width: 18, height: 18 }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}

function MorePill({ label }: { label: string }) {
  /* 82x26 at x115, #F9FAFB on a #D6D9DC hairline. */
  return (
    <div
      className="relative"
      style={{
        marginTop: 20,
        width: 82,
        height: 26,
        borderRadius: 13,
        background: "#f9fafb",
        border: "1px solid #d6d9dc",
      }}
    >
      <span className="absolute" style={{ left: 10, top: 5, ...META }}>
        {label}
      </span>
      <Image
        src={`${S}/chevron-sm.svg`}
        alt=""
        width={15}
        height={15}
        style={{
          position: "absolute",
          left: 62,
          top: 5.5,
          width: 15,
          height: 15,
          transform: "rotate(-90deg)",
        }}
      />
    </div>
  );
}

export function AudioBar({ duration }: { duration: string }) {
  /* 265x40 at x115: #F9FAFB, 1px #ECEAEF, r30. Play 24 at +8, waveform
     142.3x20 at +61.35, duration hard against x340. */
  return (
    <div
      className="relative"
      style={{
        marginTop: 30,
        width: 265,
        height: 40,
        borderRadius: 30,
        background: "#f9fafb",
        border: "1px solid #eceaef",
      }}
    >
      <Image
        src={`${S}/play.svg`}
        alt=""
        width={24}
        height={24}
        style={{ position: "absolute", left: 8, top: 8, width: 24, height: 24 }}
      />
      <Image
        src={`${S}/waveform.svg`}
        alt=""
        width={142.301}
        height={20}
        style={{ position: "absolute", left: 61.35, top: 10, width: 142.301, height: 20 }}
      />
      <span className="absolute" style={{ left: 225, top: 12, ...META }}>
        {duration}
      </span>
    </div>
  );
}

export function SourcesChip({ label, faces }: { label: string; faces: number }) {
  /* Glass, not grey: r30, 1px white, backdrop-blur 25, a 166° white
     gradient and the same shadow as the header card. Height 30.171 is
     Figma's, and it is not a rounding error — it is what the group
     measures. */
  const width = faces > 1 ? 132 : 112;
  const labelX = faces > 1 ? 46 : 31;
  const chevronX = faces > 1 ? 109 : 85;
  const art = [`${S}/src-86.png`, `${S}/src-118.png`];

  return (
    <div
      className="relative"
      style={{ marginTop: 15, width, height: 30.171, borderRadius: 30, ...GLASS_BLUR }}
    >
      {Array.from({ length: faces }).map((_, i) => (
        <div
          key={i}
          className="absolute overflow-hidden rounded-full bg-white"
          style={{ left: 6 + i * 12, top: 5.09, width: 20, height: 20 }}
        >
          <Image
            src={faces > 1 ? art[i] : `${S}/src-atlys.svg`}
            alt=""
            width={20}
            height={20}
            style={{ width: 20, height: 20, objectFit: "contain", padding: 4 }}
          />
        </div>
      ))}
      <span className="absolute" style={{ left: labelX, top: 7.09, ...META }}>
        {label}
      </span>
      <Image
        src={`${S}/chevron.svg`}
        alt=""
        width={18}
        height={18}
        style={{
          position: "absolute",
          left: chevronX,
          top: 6.09,
          width: 18,
          height: 18,
          transform: "rotate(180deg)",
        }}
      />
    </div>
  );
}

function Actions({ actions, onAct }: { actions: string[]; onAct: (a: string) => void }) {
  /* 40 tall, r49.5, rgba(255,255,255,0.1) — no border. The label is
     gradient text inset 20px. Figma reaches x444 against a card ending at
     410, so the row is meant to clip and scroll like the category tabs. */
  return (
    <div
      className="flex overflow-x-auto overscroll-x-contain"
      style={{ marginTop: 30, gap: 12, scrollbarWidth: "none" }}
    >
      {actions.map((a) => (
        <button
          key={a}
          type="button"
          onClick={() => onAct(a)}
          className="flex-none whitespace-nowrap"
          style={{
            height: 40,
            padding: "0 20px",
            borderRadius: 49.5,
            ...GLASS,
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.12px",
            fontWeight: 600,
            ...gradient(GRAD_PILL),
          }}
        >
          {a}
        </button>
      ))}
    </div>
  );
}

/* ── Rows ──────────────────────────────────────────────────────────── */

/* The spine that runs node-to-node. Figma draws it as two different
 * elements: Line 235, dotted, from a group's heading marker down to its
 * first item, and Rectangle 240648231, solid, between consecutive items.
 * The change in treatment is doing work — dotted says "this heading covers
 * what follows", solid says "these two steps are one sequence". */
const SPINE_X = 35;
/* Figma's Line 228 / Line 232 — the same stroke wherever a rule appears:
   black at 11%, dasharray "2 2". */
export const DOTTED_RULE =
  "repeating-linear-gradient(to right, rgba(0,0,0,0.11) 0 2px, transparent 2px 4px)";

const DOTTED_SPINE =
  "repeating-linear-gradient(to bottom, #d6d9dc 0 2px, transparent 2px 5px)";

function GroupNode() {
  /* 14x14: a 4r black dot inside a 6.417r ring at 1.167 stroke. */
  return (
    <svg
      className="absolute"
      style={{ left: 28.4, top: 3, width: 14, height: 14 }}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden
    >
      <circle cx="7" cy="7" r="4" fill="#0b0b0b" />
      <circle cx="7" cy="7" r="6.41667" stroke="#000000" strokeWidth="1.16667" />
    </svg>
  );
}

function Item({
  item,
  last,
  index,
  rowKey,
  ticked,
  onToggle,
  onOpen,
}: {
  item: TripItem;
  last: boolean;
  index: number;
  /** Stable id for this row's tick state, held above the section so it
      survives a collapse. */
  rowKey: string;
  ticked: Record<string, boolean>;
  onToggle: (key: string, next: boolean) => void;
  onOpen: (o: TripOverlay) => void;
}) {
  /* The data seeds it; the user owns it from the first tap onward. */
  const done = ticked[rowKey] ?? Boolean(item.done);
  /* A row is WORKING when it has something live to say and has not
     finished. Those get onboarding's two shine treatments — the coloured
     sweep on the status line, the grey sweep on the body underneath —
     which is what makes an agent look busy rather than merely described.
     Finished rows are still: the green status and plain grey body.

     Staggered per item. A shared CSS animation fires every line in unison,
     which reads as one flash across the page instead of several agents
     each doing their own work. Same reason AgentSheet staggers by section. */
  const working = (Boolean(item.status) || Boolean(item.live)) && !done;
  const shine = { animationDelay: `${(index % 5) * 0.55}s` };

  /* Gradient ids have to be unique per rail — SVG defs are document-global,
     so every rail referencing "railFade" resolves to whichever one rendered
     first, and they have different heights. */
  const railId = `rail-${(item.title ?? item.status ?? "x")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 20)}`;
  return (
    <div className="relative" style={{ paddingLeft: 75, paddingBottom: last ? 0 : 40 }}>
      {/* The node belongs to the heading row in sections where the group
          carries the marker, so an item without a title draws neither a
          node nor a spine — it is a continuation of that heading, not a
          step of its own. */}
      {item.title && (
        <RailNode
          done={done}
          label={item.title}
          onToggle={() => {
            onToggle(rowKey, !done);
            /* Two rows answer back when you tick them. The sheet is the
               row's own status panel, so it opens on either direction:
               tick the visa and it confirms delivery is on track, untick
               the flight and it asks you for the booking it just lost. */
            if (item.sheet) onOpen({ kind: "info", id: item.sheet });
          }}
        />
      )}
      {item.title && <Rail branches={itemBranches(item)} gid={railId} />}
      {/* Solid spine down to the next item's node. It runs to this item's
          own bottom edge, which is exactly where the next node starts —
          the 40px gap between items is this element's padding, so it needs
          no knowledge of the next item's height. */}
      {!last && item.title && (
        <div
          className="absolute"
          style={{
            left: SPINE_X,
            top: 30,
            bottom: 0,
            width: 1,
            background: "#e6e6ea",
            /* Runs straight through the node's centre, and it is drawn
               after it — without this it intercepts every tap aimed at
               the node it connects to. */
            pointerEvents: "none",
          }}
        />
      )}

      {item.title && (
        <p
          className={item.live ? "gradient-text-shine" : undefined}
          style={{
            marginTop: 5,
            fontSize: 16,
            lineHeight: "20px",
            letterSpacing: "-0.64px",
            fontWeight: 600,
            ...(item.live ? shine : { color: "#090909" }),
          }}
        >
          {item.title}
        </p>
      )}

      {item.more && <MorePill label={item.more} />}
      {/* Agents working this row, parked hard right at x358. Anchored to
          the item rather than the status line: three of the five rows that
          carry orbs (both forex rows and the eSim row) have no status
          line at all, so nesting them there rendered two of six. */}
      {Array.from({ length: item.agents ?? 0 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          /* x358 in shell coords: the item box starts at x40, so 318.
             Absolutely-positioned children resolve against the padding
             box, not the content box, so the item's 75px left padding
             must NOT be added here — doing so pushed the orb off the
             section's right edge. Figma puts it 88 below the node on rows
             with a "more" pill and 68 on rows without. */
          style={{ left: 318 - i * 12, top: item.more ? 88 : 68, width: 22, height: 22 }}
        >
          <Image
            src={`${S}/miniorb.png`}
            alt=""
            width={20.35}
            height={20.35}
            style={{
              position: "absolute",
              left: 0.82,
              top: 0.82,
              width: 20.35,
              height: 20.35,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
          <Image
            src={`${S}/miniorb-ring.svg`}
            alt=""
            width={22}
            height={22}
            style={{ position: "absolute", inset: 0, width: 22, height: 22 }}
          />
        </div>
      ))}


      {item.when && (
        <p style={{ marginTop: 8, ...META }}>
          {item.when.date}
          <span style={{ padding: "0 6px" }}>•</span>
          {item.when.time}
          {item.when.party ? <span className="block">{item.when.party}</span> : null}
        </p>
      )}

      {item.status && (
        <div className="relative" style={{ marginTop: 20, height: 16 }}>
          {item.call && (
            <Image
              src={`${S}/call.svg`}
              alt=""
              width={15}
              height={15}
              style={{ position: "absolute", left: 0, top: 0.5, width: 15, height: 15 }}
            />
          )}
          <span
            className={
              done ? "absolute whitespace-nowrap" : "absolute whitespace-nowrap gradient-text-shine"
            }
            style={{
              left: item.call ? 20 : 0,
              top: 0,
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              fontWeight: 600,
              ...(done ? gradient(GRAD_GREEN) : shine),
            }}
          >
            {item.status}
          </span>
        </div>
      )}

      {item.body &&
        (Array.isArray(item.body) ? item.body : [item.body]).map((para, i) => (
          <p
            key={i}
            className={working ? "grey-shine-text" : undefined}
            style={{
              marginTop: i === 0 ? 15 : 12,
              width: 265,
              whiteSpace: "pre-line",
              ...META,
              ...(working ? { color: undefined, ...shine } : null),
            }}
          >
            {para}
          </p>
        ))}

      {item.audio && <AudioBar duration={item.audio} />}
      {item.sources && <SourcesChip {...item.sources} />}
    </div>
  );
}

function Group({
  group,
  first,
  last,
  offset,
  keyPrefix,
  ticked,
  onToggle,
  onOpen,
}: {
  group: TripGroup;
  first: boolean;
  last: boolean;
  keyPrefix: string;
  ticked: Record<string, boolean>;
  onToggle: (key: string, next: boolean) => void;
  onOpen: (o: TripOverlay) => void;
  /* Running item count before this group, so the shine stagger spreads
     across the whole section rather than restarting at every heading —
     most groups hold one item, so a per-group index left almost every row
     firing on the same beat. */
  offset: number;
}) {
  const headingKey = `${keyPrefix}:heading`;
  const headingDone = ticked[headingKey] ?? true;

  return (
    <div style={{ marginTop: first ? 30 : 40 }}>
      {group.heading && (
        <div className="relative" style={{ paddingLeft: 75, marginBottom: 30 }}>
          {/* Two marker treatments, and they mean different things.
              "dot" heads a leg that has its own steps beneath it, so it is
              a small ring-and-dot with a dotted run to the first node.
              "done" IS the step — forex, eSim and Safety put the full node
              on the heading row and have nothing but a status line under
              it, so drawing a second node there would invent a step the
              design does not have. */}
          {group.marker === "done" ? (
            <>
              {/* In these groups the heading IS the step, so its node is
                  the checkbox — there is no titled row beneath to carry
                  one. */}
              <RailNode
                done={headingDone}
                label={group.heading ?? "Step"}
                onToggle={() => onToggle(headingKey, !headingDone)}
              />
              {/* The heading IS the step here, so the run down to the status
                  line has to come off the heading's node — Item only draws a
                  rail for rows that carry a title, and these rows carry none,
                  which left forex, eSim and Safety with a node pointing at
                  nothing. Offsets are the heading block's own stack: heading
                  20, subtitle 10+16, then the 30 that separates it from the
                  first item, whose status line sits 8 below its own top.
                  Margins collapse there — the item box has no top padding, so
                  the status line's 20 is absorbed by the heading's 30. */}
              {group.items[0]?.status && (
                <Rail
                  branches={[(group.subtitle ? 46 : 20) + 30 + 8]}
                  gid={`rail-h-${group.heading?.replace(/[^a-z0-9]/gi, "").slice(0, 20)}`}
                />
              )}
            </>
          ) : (
            <>
              <GroupNode />
              {/* Figma's Line 235: 49 tall, starting 5px below the dot. */}
              <div
                className="absolute"
                style={{
                  left: SPINE_X,
                  top: 22,
                  height: 49,
                  width: 1,
                  backgroundImage: DOTTED_SPINE,
                  pointerEvents: "none",
                }}
              />
            </>
          )}
          <p
            className="flex items-center"
            style={{
              fontSize: 16,
              lineHeight: "20px",
              letterSpacing: "-0.64px",
              fontWeight: 600,
              color: "#090909",
            }}
          >
            {group.heading}
            {group.chevron && (
              <Image
                src={`${S}/chevron.svg`}
                alt=""
                width={16}
                height={16}
                style={{ width: 16, height: 16, marginLeft: 6, transform: "rotate(180deg)" }}
              />
            )}
          </p>
          {group.subtitle && <p style={{ marginTop: 10, ...META }}>{group.subtitle}</p>}
        </div>
      )}

      {group.items.map((it, i) => (
        <Item
          key={it.title ?? it.status ?? i}
          item={it}
          index={offset + i}
          last={i === group.items.length - 1}
          rowKey={`${keyPrefix}:${it.title ?? it.status ?? i}`}
          ticked={ticked}
          onToggle={onToggle}
          onOpen={onOpen}
        />
      ))}

      {group.link && (
        /* Not a text link — a 265x51 button at r84 filled with the aurora
           (Group 1991427916). The artwork is five heavily-blurred ellipses
           in the brand hues, indigo through gold, the same wash the
           composer uses. Figma lays a rgba(255,255,255,0.1) sheet over it;
           that alone leaves it far more saturated than the design reads, so
           the overlay here is heavier and the label sits on pastel. */
        <div style={{ marginLeft: 75 }}>
          <button
            type="button"
            className="relative block overflow-hidden"
            style={{
              width: 265,
              height: 51,
              borderRadius: 84,
              marginTop: 20,
              backgroundImage: `url(${S}/aurora.svg)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <span
              className="absolute inset-0"
              style={{ background: "rgba(255,255,255,0.22)" }}
            />
            <span
              className="relative"
              style={{
                fontSize: 12,
                lineHeight: "16px",
                letterSpacing: "-0.12px",
                fontWeight: 600,
                color: "#000000",
              }}
            >
              {group.link}
            </span>
          </button>
        </div>
      )}

      {group.actions && (
        <div style={{ paddingLeft: 75 }}>
          <Actions
            actions={group.actions}
            onAct={(a) =>
              onOpen({
                kind: "detail",
                item: group.items[0],
                action: a,
                context: group.heading ?? group.items[0]?.title ?? "",
              })
            }
          />
        </div>
      )}

      {/* Line 232: dotted (stroke-dasharray "2 2", black at 11%), and only
          BETWEEN groups. Figma has 6 of these across the sheet, one fewer
          than the group count in each section — drawing one after every
          group put a rule under the last item of every section, closing
          each one with a line that is not in the design. */}
      {!last && (
        <div
          style={{
            marginTop: 40,
            marginLeft: 75,
            width: 265,
            height: 1,
            backgroundImage:
              DOTTED_RULE,
          }}
        />
      )}
    </div>
  );
}

function Section({
  section,
  ticked,
  onToggle,
  onOpen,
}: {
  section: TripSection;
  ticked: Record<string, boolean>;
  onToggle: (key: string, next: boolean) => void;
  onOpen: (o: TripOverlay) => void;
}) {
  /* The chevron collapses the section to just its header card. Figma draws
     it pointing up, which is the expanded state — a chevron that only ever
     points one way is a control that says it does something and doesn't.

     Open by default: the column exists to show what the agents are doing,
     so it should not open closed. */
  const [open, setOpen] = useState(true);

  return (
    /* Rectangle 240648187: a #F9FAFB tile with a 1px #ECEAEF border, sat
       on the white panel behind it. Three levels, and getting them in the
       wrong order is what flattened this: white panel -> #F9FAFB section
       -> white card. The section being the grey one is what gives the
       white pills and the header card something to read against. */
    <div
      style={{
        width: 380,
        /* Figma's 380 is the OUTER width and its 1px border sits inside it,
           so the box has to measure the same way — content-box would make
           the tile 382 and shift every column 1px right of the frame. */
        boxSizing: "border-box",
        borderRadius: 30,
        background: "#f9fafb",
        border: "1px solid #eceaef",
        /* Figma insets the header card 10px from the tile on all four
           sides (section y635.55, card y645.55) and closes the tile 40px
           after the last action row (last pill ends 1506, tile ends 1546).
           Without the top inset the card sat flush against the tile edge,
           so the grey frame only showed on three sides and every bit of
           breathing room fell to the bottom.

           The bottom inset is 10 here and the remaining 30 lives INSIDE
           the collapsible block, so closing a section leaves the tile
           hugging its card with the same 10 all round instead of a band
           of empty grey underneath — and the collapse animation carries
           that padding away with the content rather than snapping it. */
        paddingTop: 10,
        paddingBottom: 10,
      }}
    >
      {/* Header card — 360x124 at a 10px inset. */}
      <div
        className="relative"
        style={{
          /* Centred rather than margin-left 10: the tile's 1px border eats
             into the content box, so a fixed 10 left gave 11 on the left
             and 9 on the right. Centring lands the card on Figma's x40 with
             an even frame either side. */
          marginLeft: "auto",
          marginRight: "auto",
          width: 360,
          height: 124,
          flexShrink: 0,
          borderRadius: 23,
          background: "#ffffff",
          boxShadow: CARD_SHADOW,
        }}
      >
        {/* Agent orb: 40 ring, 37 art, both at a 20px inset. */}
        <div className="absolute" style={{ left: 20, top: 39.82, width: 40, height: 40 }}>
          <Image
            src={section.orb}
            alt=""
            width={37}
            height={37}
            style={{
              position: "absolute",
              left: 1.5,
              top: 1.5,
              width: 37,
              height: 37,
              borderRadius: "50%",
              objectFit: "cover",
            }}
          />
        </div>

        <p
          className="absolute whitespace-nowrap"
          style={{
            left: 75,
            top: 30,
            fontSize: 18,
            lineHeight: "22px",
            letterSpacing: "-0.72px",
            fontWeight: 600,
            color: "#090909",
          }}
        >
          {section.name}
        </p>
        <p className="absolute" style={{ left: 75, top: 62, width: 193, ...META }}>
          {section.working}
        </p>

        <span
          className="absolute rounded-full"
          style={{ left: 268, top: 22, width: 6, height: 6, background: DOT_STATE[section.state] }}
        />
        <span
          className="absolute whitespace-nowrap"
          style={{
            left: 279,
            top: 20,
            fontSize: 10,
            lineHeight: "10px",
            letterSpacing: "0.8px",
            fontWeight: 700,
            textTransform: "uppercase",
            ...gradient(GRAD_STATE[section.state]),
          }}
        >
          {section.state}
        </span>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? "Collapse" : "Expand"} ${section.name}`}
          className="absolute"
          /* The tap target is 44 square around Figma's 20px glyph — the
             glyph is the icon, not the button. */
          style={{ left: 308, top: 40, width: 44, height: 44 }}
        >
          <motion.span
            className="absolute block"
            style={{ left: 12, top: 12, width: 20, height: 20 }}
            initial={false}
            animate={{ rotate: open ? -90 : 90 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image
              src={`${S}/next.svg`}
              alt=""
              width={20}
              height={20}
              style={{ width: 20, height: 20 }}
            />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            style={{ paddingLeft: 9, overflow: "hidden" }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            /* Opacity leads on the way in and trails on the way out, so the
               content is never legible at a height that would clip it. */
            transition={{
              height: { duration: 0.34, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.2, delay: open ? 0.08 : 0 },
            }}
          >
        {section.groups.map((g, i) => (
          <Group
            key={g.heading ?? i}
            group={g}
            first={i === 0}
            last={i === section.groups.length - 1}
            offset={section.groups
              .slice(0, i)
              .reduce((n, g2) => n + g2.items.length, 0)}
            keyPrefix={`${section.key}:${i}`}
            ticked={ticked}
            onToggle={onToggle}
            onOpen={onOpen}
          />
        ))}

        {section.add && (
          /* Same 265x40 #F9FAFB pill as the voice-note player — Figma
             reuses Rectangle 240648079 for it, which is why a count of
             that component turns up four "audio bars" when only one is a
             player. Rendering it as bare text lost the affordance. */
          <div
            className="flex items-center justify-center"
            style={{
              marginTop: 30,
              marginLeft: 75,
              width: 265,
              height: 40,
              borderRadius: 30,
              background: "#f9fafb",
              border: "1px solid #eceaef",
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              fontWeight: 600,
              ...gradient(GRAD_PILL),
            }}
          >
            {section.add}
          </div>
        )}

            {/* The other 30 of Figma's 40 bottom inset. */}
            <div style={{ height: 30 }} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function TripSheet({ onOpen }: { onOpen: (o: TripOverlay) => void }) {
  /* Overrides only — a row absent from this map falls back to whatever the
     data seeded it with. Held at the root rather than per section so a
     section can collapse and unmount its rows without losing their ticks. */
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const onToggle = (key: string, next: boolean) =>
    setTicked((t) => ({ ...t, [key]: next }));

  return (
    <div className="flex flex-col" style={{ gap: 20 }}>
      {TRIP_SECTIONS.map((s) => (
        <Section key={s.key} section={s} ticked={ticked} onToggle={onToggle} onOpen={onOpen} />
      ))}
      {/* Tail padding so the last section can clear the bottom of the
          scroll rather than ending flush against it. */}
      <div style={{ height: 40 }} />
    </div>
  );
}
