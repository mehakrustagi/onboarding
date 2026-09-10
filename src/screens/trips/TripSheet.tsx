"use client";

import Image from "next/image";
import { TRIP_SECTIONS, type TripGroup, type TripItem, type TripSection } from "./tripSections";

/* The scrolling agent column — Figma 947:26137.
 *
 * Renders TRIP_SECTIONS. All seven sections share one structure, so the
 * measurements below are taken once from the visa section (the one that
 * was already built to spec at 947:43237) and applied throughout:
 *
 *   sheet      380 wide at x 30, r30
 *   card pad   inner content at x 115 against a card at x 40 → 75px gutter,
 *              which is where the timeline rail and its nodes live
 *   node       30px disc at x 60, connector 15px wide beneath it
 *   title      Inter SemiBold 16/22
 *   status     Inter Medium 12/16, grey
 *   body       Inter Medium 12/16, 265 wide
 *   actions    40 tall pills, r20, 1px #ECEAEF
 *
 * Vertical rhythm is flow, not absolute. Figma's y values encode one
 * particular set of text lengths; the moment a body string wraps to a
 * different number of lines every coordinate below it is wrong. Padding
 * and gaps reproduce the same spacing and survive the copy changing.
 */

const RAIL_X = 45; /* node centre, relative to the card's content box */

function StatePill({ state }: { state: TripSection["state"] }) {
  /* Figma colours the pill by state: violet while an agent is active,
     amber when it is blocked on something, green once it is finished. */
  const tone =
    state === "DONE"
      ? { fg: "#10b981", dot: "#10b981" }
      : state === "WAITING"
        ? { fg: "#d9902e", dot: "#d9902e" }
        : { fg: "#8b5cf6", dot: "#8b5cf6" };

  return (
    <div className="absolute right-5 top-5 flex items-center gap-1.5">
      <span
        className="inline-block rounded-full"
        style={{ width: 5, height: 5, background: tone.dot }}
      />
      <span
        className="font-bold uppercase"
        style={{ fontSize: 10, lineHeight: "10px", letterSpacing: "0.8px", color: tone.fg }}
      >
        {state}
      </span>
    </div>
  );
}

function Sources({ label, faces }: { label: string; faces: number }) {
  return (
    <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-[#f4f4f6] px-2.5 py-1">
      <div className="flex -space-x-1.5">
        {Array.from({ length: faces }).map((_, i) => (
          <span
            key={i}
            className="inline-block rounded-full border border-white bg-[#d5d5dc]"
            style={{ width: 16, height: 16 }}
          />
        ))}
      </div>
      <span
        className="font-medium"
        style={{ fontSize: 12, lineHeight: "16px", letterSpacing: "-0.12px", color: "#6f6f78" }}
      >
        {label}
      </span>
    </div>
  );
}

function Item({ item, last }: { item: TripItem; last: boolean }) {
  return (
    <div className="relative" style={{ paddingLeft: 75, paddingBottom: last ? 0 : 26 }}>
      {/* Timeline node, and the rail running to the next one. */}
      <div
        className="absolute flex items-center justify-center rounded-full"
        style={{
          left: RAIL_X - 15,
          top: 0,
          width: 30,
          height: 30,
          background: item.done ? "#e8f7ef" : "#ffffff",
          border: `1px solid ${item.done ? "#bfe8d3" : "#e6e6ea"}`,
        }}
      >
        {item.done && (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M3 7.2l2.8 2.8L11 4.8"
              stroke="#10b981"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
      {!last && (
        <div
          className="absolute"
          style={{ left: RAIL_X - 0.5, top: 34, bottom: 4, width: 1, background: "#ebebf0" }}
        />
      )}

      <p
        className="font-semibold"
        style={{ fontSize: 16, lineHeight: "22px", letterSpacing: "-0.32px", color: "#0b0b0b" }}
      >
        {item.title}
      </p>

      {item.when && (
        <p
          className="mt-1 font-medium"
          style={{ fontSize: 12, lineHeight: "16px", letterSpacing: "-0.12px", color: "#9a9aa2" }}
        >
          {item.when.date} <span className="px-1">•</span> {item.when.time}
          {item.when.party ? <span className="block">{item.when.party}</span> : null}
        </p>
      )}

      {item.status && (
        <p
          className="mt-2 font-medium"
          style={{ fontSize: 12, lineHeight: "16px", letterSpacing: "-0.12px", color: "#6f6f78" }}
        >
          {item.status}
        </p>
      )}

      {item.body && (
        <p
          className="mt-1.5 font-medium"
          style={{
            width: 265,
            fontSize: 12,
            lineHeight: "16px",
            letterSpacing: "-0.12px",
            color: "#9a9aa2",
          }}
        >
          {item.body}
        </p>
      )}

      {item.sources && <Sources {...item.sources} />}
    </div>
  );
}

function Group({ group }: { group: TripGroup }) {
  return (
    <div className="pt-6">
      {group.heading && (
        <div style={{ paddingLeft: 75 }}>
          <p
            className="font-semibold"
            style={{ fontSize: 16, lineHeight: "22px", letterSpacing: "-0.32px", color: "#0b0b0b" }}
          >
            {group.heading}
          </p>
          {group.subtitle && (
            <p
              className="mt-1 font-medium"
              style={{
                fontSize: 12,
                lineHeight: "16px",
                letterSpacing: "-0.12px",
                color: "#9a9aa2",
              }}
            >
              {group.subtitle}
            </p>
          )}
        </div>
      )}

      <div className={group.heading ? "mt-5" : ""}>
        {group.items.map((it, i) => (
          <Item key={it.title} item={it} last={i === group.items.length - 1} />
        ))}
      </div>

      {group.link && (
        <p
          className="mt-4 text-center font-semibold"
          style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.14px", color: "#0b0b0b" }}
        >
          {group.link}
        </p>
      )}

      {group.actions && (
        /* One row that runs off the card, not a wrapping grid. Figma puts
           these at x 115 and x 304 with the second 140 wide — reaching
           x 444 against a card that ends at 410, so the pair is meant to
           be clipped and scrollable exactly like the category tabs. Left
           to wrap, they stack into a column and the section doubles in
           height. */
        <div
          className="mt-4 flex gap-3 overflow-x-auto overscroll-x-contain"
          style={{ paddingLeft: 75, paddingRight: 20, scrollbarWidth: "none" }}
        >
          {group.actions.map((a) => (
            <button
              key={a}
              type="button"
              className="flex-none whitespace-nowrap rounded-[20px] border border-[#eceaef] bg-white font-semibold"
              style={{
                height: 40,
                padding: "0 20px",
                fontSize: 14,
                letterSpacing: "-0.14px",
                color: "#0b0b0b",
              }}
            >
              {a}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ section }: { section: TripSection }) {
  return (
    <div
      className="relative bg-white"
      style={{ borderRadius: 22, boxShadow: "0 4px 24px -6px rgba(0,0,0,0.08)" }}
    >
      {/* Header — the agent, what it is doing, and its state. */}
      <div className="relative" style={{ padding: "20px 20px 4px" }}>
        <div
          className="absolute rounded-full"
          style={{ left: 20, top: 26, width: 44, height: 44, overflow: "hidden" }}
        >
          <Image src={section.orb} alt="" width={44} height={44} style={{ width: 44, height: 44 }} />
        </div>
        <div style={{ paddingLeft: 56 }}>
          <p
            className="font-semibold"
            style={{ fontSize: 16, lineHeight: "22px", letterSpacing: "-0.32px", color: "#0b0b0b" }}
          >
            {section.name}
          </p>
          <p
            className="mt-1 font-medium"
            style={{
              width: 200,
              fontSize: 12,
              lineHeight: "16px",
              letterSpacing: "-0.12px",
              color: "#9a9aa2",
            }}
          >
            {section.working}
          </p>
        </div>
        <StatePill state={section.state} />
      </div>

      <div style={{ paddingBottom: 24 }}>
        {section.groups.map((g, i) => (
          <Group key={g.heading ?? i} group={g} />
        ))}

        {section.add && (
          <p
            className="mt-6 text-center font-semibold"
            style={{ fontSize: 14, lineHeight: "19px", letterSpacing: "-0.14px", color: "#8b8b95" }}
          >
            {section.add}
          </p>
        )}
      </div>
    </div>
  );
}

export default function TripSheet() {
  return (
    <div className="flex flex-col gap-4">
      {TRIP_SECTIONS.map((s) => (
        <Section key={s.key} section={s} />
      ))}
      {/* Clears the composer, which floats over the bottom of the scroll. */}
      <div style={{ height: 150 }} />
    </div>
  );
}
