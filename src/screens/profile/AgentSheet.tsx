"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import AgentOrb from "@/components/AgentOrb";
import { haptic } from "@/lib/haptics";
import { useState } from "react";
import SavePill from "./SavePill";
import MedicalCard from "./MedicalCard";

/* Agent preference sheet — Figma 853:63443 (flight) and its siblings for
 * stay, medical, itinerary, food and airport logistics.
 *
 * All six are the same template with different content, so the layout
 * lives here and each agent supplies data.
 *
 * Sheet geometry (Frame 1991429406, 440 wide):
 *   handle   24 wide at y10.39
 *   back     50×50 at (30, 30)
 *   eyebrow  "<X> AGENT" at y41
 *   orb      72×72 at y73
 *   headline 216 wide at (112, 161)
 *   body     310 wide at (66, 236)
 *   sources  132×30 pill at (156, 293)
 *   list     381 wide from y375
 *   bar      440×208 at y2621, button 380×48
 *
 * Section template (Frame 1991430861):
 *   header   label at (0,2) + an 18×18 check badge 8px after it
 *   chips    from y42 — 36 tall, 16px side padding, 12 gap, 16 row gap
 *   note     at y154 — 9×9 mark at x0, copy at x21
 *
 * Sections are flowed rather than absolutely placed at Figma's 2278px of
 * offsets: the design spaces them evenly with a rule between, and flowing
 * survives content changes where hard offsets would not.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* The completion ring around the orb. Its fraction is READ OFF the
 * headline ("Found 6/8 flight preferences") rather than stored separately,
 * so the ring and the number can never disagree — there is one source of
 * truth and the user is looking at it. */
function progressOf(headline?: string): number | null {
  const m = headline?.match(/(\d+)\s*\/\s*(\d+)/);
  if (!m) return null;
  const done = Number(m[1]);
  const total = Number(m[2]);
  return total > 0 ? Math.min(1, done / total) : null;
}

const RING_D = 84;
const RING_R = 38;
const RING_C = 2 * Math.PI * RING_R;

function ProgressRing({ frac }: { frac: number }) {
  return (
    <svg
      className="pointer-events-none absolute"
      width={RING_D}
      height={RING_D}
      viewBox={`0 0 ${RING_D} ${RING_D}`}
      fill="none"
      style={{ left: "50%", top: "50%", marginLeft: -RING_D / 2, marginTop: -RING_D / 2 }}
    >
      <circle cx={RING_D / 2} cy={RING_D / 2} r={RING_R} stroke="#f0f0f1" strokeWidth={3} />
      <motion.circle
        cx={RING_D / 2}
        cy={RING_D / 2}
        r={RING_R}
        stroke="#5DA97E"
        strokeWidth={3}
        strokeLinecap="round"
        strokeDasharray={RING_C}
        // Starts at the top and opens the gap toward the right, where the
        // design has it.
        transform={`rotate(-68 ${RING_D / 2} ${RING_D / 2})`}
        initial={{ strokeDashoffset: RING_C }}
        animate={{ strokeDashoffset: RING_C * (1 - frac) }}
        transition={{ delay: 0.25, duration: 1.1, ease: IN_EASE }}
      />
    </svg>
  );
}

export type Meal = { code: string; desc: string };
export type AgentSection = {
  label: string;
  /** Ticked in the header — the agent already learned this one. */
  done?: boolean;
  chips?: string[];
  /** Preselected chips. */
  on?: string[];
  meals?: Meal[];
  /** A single right-aligned value instead of chips (FLYING HOURS). */
  value?: string;
  /** Medical's ID card — label/value rows on a tinted panel. */
  fields?: { label: string; value: string }[];
  /** A switch row above the section's controls. */
  toggle?: string;
  note?: string;
};

export type AgentSpec = {
  eyebrow: string;
  /** Stay has none — it goes straight from the eyebrow to the body. */
  headline?: string;
  body: string;
  sources: string;
  blob?: string;
  sections: AgentSection[];
};

export default function AgentSheet({
  spec,
  open,
  onClose,
}: {
  spec: AgentSpec | null;
  open: boolean;
  onClose: () => void;
}) {
  /* Chip selection is local to the sheet — nothing downstream consumes it
     yet, but the controls have to actually respond to be worth showing. */
  const [picked, setPicked] = useState<Record<string, string[]>>({});

  const toggle = (section: AgentSection, chip: string) => {
    haptic("dragGrab");
    setPicked((p) => {
      const base = p[section.label] ?? section.on ?? [];
      return {
        ...p,
        [section.label]: base.includes(chip)
          ? base.filter((c) => c !== chip)
          : [...base, chip],
      };
    });
  };
  const frac = progressOf(spec?.headline);

  const isOn = (section: AgentSection, chip: string) =>
    (picked[section.label] ?? section.on ?? []).includes(chip);

  return (
    <AnimatePresence>
      {open && spec && (
        <motion.div
          className="absolute inset-0 overflow-hidden"
          style={{ zIndex: 70, borderRadius: 44 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: IN_EASE }}
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.35)" }}
            onClick={onClose}
          />

          {/* The sheet itself. Rises from the bottom — it is a pull-up. */}
          <motion.div
            className="absolute bottom-0 left-0 w-full overflow-hidden bg-white"
            style={{ height: 903, borderRadius: 44 }}
            initial={{ y: 903 }}
            animate={{ y: 0 }}
            exit={{ y: 903 }}
            transition={{ type: "spring", stiffness: 240, damping: 30, mass: 0.9 }}
          >
            <div className="absolute inset-0 overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* Grab handle (Line 8) */}
              <div
                className="absolute left-1/2 -translate-x-1/2"
                style={{ top: 10.39, width: 24, height: 3, borderRadius: 2, background: "#d9d9de" }}
              />

              <p
                className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center font-bold uppercase"
                style={{
                  top: 41,
                  fontSize: 11,
                  lineHeight: "14px",
                  letterSpacing: "0.88px",
                  color: "#0b0b0b",
                }}
              >
                {spec.eyebrow}
              </p>

              <motion.div
                className="absolute left-1/2 flex items-center justify-center"
                style={{ top: 73, width: 72, height: 72, marginLeft: -36 }}
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 5.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <AgentOrb size={72} blob={spec.blob} />
                {frac !== null && <ProgressRing frac={frac} />}
              </motion.div>

              {spec.headline && (
              <p
                className="absolute text-center font-medium"
                style={{
                  left: 112,
                  top: 161,
                  width: 216,
                  fontSize: 18,
                  lineHeight: "25px",
                  letterSpacing: "-0.72px",
                  color: "#0b0b0b",
                }}
              >
                {spec.headline}
              </p>
              )}

              <p
                className="absolute text-center font-medium"
                style={{
                  left: 66,
                  top: 236,
                  width: 310,
                  fontSize: 12,
                  lineHeight: "16px",
                  letterSpacing: "-0.24px",
                  color: "#8a8a90",
                }}
              >
                {spec.body}
              </p>

              <div
                className="absolute flex items-center justify-center"
                style={{
                  left: 156,
                  top: 293,
                  width: 132,
                  height: 30,
                  borderRadius: 15,
                  background: "#ffffff",
                  border: "1px solid #f4f5f6",
                  boxShadow: "0 4.675px 14px rgba(0,0,0,0.05)",
                }}
              >
                <span
                  className="whitespace-nowrap font-semibold"
                  style={{ fontSize: 12, lineHeight: "16px", letterSpacing: "-0.12px", color: "#0b0b0b" }}
                >
                  {spec.sources}
                </span>
              </div>

              {/* Sections */}
              <div
                className="absolute flex flex-col"
                style={{ left: 29.5, top: 375, width: 381 }}
              >
                {spec.sections.map((sec, si) => (
                  <motion.div
                    key={sec.label}
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + si * 0.04, duration: 0.5, ease: IN_EASE }}
                  >
                    {si > 0 && (
                      <div
                        style={{ height: 1, background: "#ececed", margin: "32px 0" }}
                      />
                    )}

                    {/* Header — label with the "already learned" tick 8px
                        after it, so the badge tracks the word rather than
                        sitting at a fixed column. The medical card brings
                        its own name and toggle, so it takes neither. */}
                    {!sec.fields && (
                    <div className="flex items-center gap-[8px]">
                      <span
                        className="whitespace-nowrap font-bold uppercase"
                        style={{
                          fontSize: 11,
                          lineHeight: "14px",
                          letterSpacing: "0.88px",
                          color: "#0b0b0b",
                        }}
                      >
                        {sec.label}
                      </span>
                      {sec.done && (
                        <span
                          className="flex items-center justify-center"
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 9,
                            border: "1px solid #10b981",
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path
                              d="M2.5 6.2 4.9 8.6 9.5 4"
                              stroke="#10b981"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                      {sec.value && (
                        <span
                          className="ml-auto whitespace-nowrap font-medium"
                          style={{ fontSize: 16, lineHeight: "20px", letterSpacing: "-0.64px", color: "#0b0b0b" }}
                        >
                          {sec.value}
                        </span>
                      )}
                    </div>
                    )}

                    {sec.fields && (
                      <MedicalCard
                        fields={sec.fields}
                        toggleLabel={sec.toggle}
                        on={isOn(sec, sec.toggle ?? "")}
                        onToggle={() => toggle(sec, sec.toggle ?? "")}
                      />
                    )}

                    {!sec.fields && sec.toggle && (
                      <button
                        type="button"
                        onClick={() => toggle(sec, sec.toggle as string)}
                        className="mt-[20px] flex w-full items-center justify-between"
                      >
                        <span
                          className="font-medium"
                          style={{ fontSize: 14, lineHeight: "19px", color: "#0b0b0b" }}
                        >
                          {sec.toggle}
                        </span>
                        <span
                          style={{
                            width: 44,
                            height: 26,
                            borderRadius: 13,
                            background: isOn(sec, sec.toggle) ? "#10b981" : "#e5e5e5",
                            position: "relative",
                            transition: "background 180ms",
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: 3,
                              left: isOn(sec, sec.toggle) ? 21 : 3,
                              width: 20,
                              height: 20,
                              borderRadius: 10,
                              background: "#ffffff",
                              transition: "left 180ms",
                            }}
                          />
                        </span>
                      </button>
                    )}

                    {sec.chips && (
                      <div className="mt-[24px] flex flex-wrap gap-x-[12px] gap-y-[16px]">
                        {sec.chips.map((c) => {
                          const on = isOn(sec, c);
                          return (
                            <button
                              key={c}
                              type="button"
                              onClick={() => toggle(sec, c)}
                              className="flex items-center justify-center whitespace-nowrap"
                              style={{
                                height: 36,
                                padding: "0 16px",
                                borderRadius: 18,
                                fontSize: 14,
                                lineHeight: "19px",
                                letterSpacing: "-0.14px",
                                // Selected reads as filled; the rest are
                                // outlines, so the row shows state at a
                                // glance rather than needing to be read.
                                background: on ? "#0b0b0b" : "#ffffff",
                                color: on ? "#ffffff" : "#0b0b0b",
                                border: `1px solid ${on ? "#0b0b0b" : "#e5e5e5"}`,
                                fontWeight: 500,
                                transition: "background 160ms, color 160ms, border-color 160ms",
                              }}
                            >
                              {c}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {sec.meals && (
                      <div className="mt-[24px] flex flex-wrap gap-[12px]">
                        {sec.meals.map((m) => (
                          <button
                            key={m.code}
                            type="button"
                            onClick={() => toggle(sec, m.code)}
                            className="flex flex-col items-center justify-center"
                            style={{
                              width: 178.5,
                              height: 60,
                              borderRadius: 18,
                              background: isOn(sec, m.code) ? "#f4f5f6" : "#ffffff",
                              border: `1px solid ${isOn(sec, m.code) ? "#0b0b0b" : "#e5e5e5"}`,
                              transition: "background 160ms, border-color 160ms",
                            }}
                          >
                            <span
                              className="font-medium"
                              style={{ fontSize: 14, lineHeight: "19px", color: "#0b0b0b" }}
                            >
                              {m.code}
                            </span>
                            <span
                              className="font-medium"
                              style={{ fontSize: 12, lineHeight: "16px", color: "#8a8a90" }}
                            >
                              {m.desc}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* The agent's own aside. The mark is a small filled
                        dot, matching Group 1991428614 at 9×9. Not every
                        section carries one. */}
                    {sec.note && (
                    <div className="mt-[24px] flex items-start gap-[10px]">
                      {/* The agent's own mark, not a bullet. */}
                      <span style={{ flexShrink: 0, marginTop: 1 }}>
                        <AgentOrb size={16} blob={spec.blob} />
                      </span>
                      <span
                        // Onboarding's loading treatment: a static grey
                        // base with one bright band sweeping across it.
                        // Staggered per section — a shared CSS animation
                        // fires every line in unison, which reads as a
                        // flash rather than as work being done.
                        className="grey-shine-text font-medium"
                        style={{
                          fontSize: 12,
                          lineHeight: "16px",
                          letterSpacing: "-0.12px",
                          animationDelay: `${si * 0.45}s`,
                        }}
                      >
                        {sec.note}
                      </span>
                    </div>
                    )}
                  </motion.div>
                ))}
              </div>

              {/* Room for the list plus the sticky bar. */}
              <div style={{ height: 375 + 2400 }} />
            </div>

            {/* Back */}
            <button
              type="button"
              aria-label="Back"
              onClick={onClose}
              className="absolute flex items-center justify-center"
              style={{
                zIndex: 4,
                left: 30,
                top: 30,
                width: 50,
                height: 50,
                borderRadius: 25,
                background: "#f4f4f6",
              }}
            >
              <Image
                src="/assets/profile/arrow-back.svg"
                alt=""
                width={22}
                height={22}
                style={{ width: 22, height: 22, display: "block" }}
              />
            </button>

            {/* Save (Frame 1991428789) */}
            <div
              className="absolute bottom-0 left-0 flex w-full flex-col items-center"
              style={{
                zIndex: 4,
                paddingTop: 110,
                paddingBottom: 34,
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0) 15.263%, #ffffff 127.89%)",
                backdropFilter: "blur(2px)",
                WebkitBackdropFilter: "blur(2px)",
              }}
            >
              <SavePill onSaved={onClose} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
