"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

/* Pre-thinking / "Scanning" — Figma section 852:8608 (Dump_work), built
 * from the six-frame sequence at the "SINGLE - TEXT" board. The frames are
 * one moment sampled six times, not six screens: the user's message is
 * already sent, and the agent tree assembles itself underneath it.
 *
 *   frame 1  bars + the user's bubble, nothing else
 *   frame 2  the agent orb (drawn at 1×1px — it comes from nothing)
 *   frame 3  "Preparing our agents"
 *   frame 4  + "Connecting with visa agent"
 *   frame 5  + first sub-agent, hung off an elbow connector
 *   frame 6  + second sub-agent; the subline becomes "Agents deployed"
 *
 * Geometry is read straight off frame 852:8749 (the full one), so this is
 * the design's own 393×852 shell rather than the 440×965 one the earlier
 * prototype screens use — the numbers below are Figma's, unscaled.
 *
 *   status bar        59 tall; island 125×37 at (134, 11)
 *   menu button       48×48 at (20, 67), r28.8
 *   user bubble       right-aligned in a 393-wide row at y 133, px20 py16
 *   agent orb         26×26 at (24, 224)
 *   step title        left 62, y 221 (y 229 before the subline exists)
 *   step subline      left 62, y 241, 11/16 #666
 *   connectors        18×45 at (35, 253) and 18×107 at (35, 254)
 *   sub-agent 1       orb 16 at (65, 285), text at 91
 *   sub-agent 2       orb 16 at (62, 348), text at 88
 *   composer          bottom bar 108 tall, input 56 r30
 *
 * Figma's own motion data (get_motion_context on 852:8749) covers exactly
 * one thing — the background: a 10s loop drifting the blurred gradient
 * ring, plus a flicker track on the BORDER GLOW bands. The colour here is
 * that ring held stationary with the gradient rotating through it; see
 * Background below. Everything else — how the orb, the lines and
 * the sub-agents arrive — is sequenced in this file.
 */

const IN_EASE = [0.22, 1, 0.36, 1] as const;

/* Steps of the sequence. Each entry is the delay, in ms, from the previous
 * step — so the beat spacing is readable as a column and can be retimed
 * without recomputing absolute offsets. */
const STEP_DELAYS = [
  300, // 1  orb fades in and starts breathing
  600, // 2  "Preparing our agents"
  700, // 3  subline rolls in: "Connecting with visa agent"
  600, // 4  connector 1 draws down
  380, // 5  sub-orb 1 arrives at the end of it
  260, // 6  sub-agent 1 title + description
  1000, // 7  subline rolls over to "Agents deployed"
  240, // 8  connector 2 draws down
  380, // 9  sub-orb 2
  260, // 10 sub-agent 2 title + description
] as const;

const S_ORB = 1;
const S_TITLE = 2;
const S_SUBLINE = 3;
const S_CONN_1 = 4;
const S_ORB_1 = 5;
const S_ROW_1 = 6;
const S_DEPLOYED = 7;
const S_CONN_2 = 8;
const S_ORB_2 = 9;
const S_ROW_2 = 10;

/* The parent's subline is a two-state roll, not two separate lines. */
const SUBLINES = ["Connecting with visa agent", "Agents deployed"] as const;

/* Each sub-agent's description is a rolling ticker — the design draws it as
 * a 16px-tall clipped window with these lines stacked at 32px intervals
 * (nodes 852:8786 / 852:8798), i.e. one visible at a time. */
const SUB_DESCRIPTIONS = [
  "Task description",
  "Glare detection",
  "Sharpness level",
  "Blur detection",
  "Analysing data",
  "Running 10 checks",
] as const;

/* How long each description line holds before the ticker rolls on. */
const DESC_HOLD_MS = 1900;

/* Sub-agent rows. Figma places the two orbs one pixel apart horizontally
 * (65 vs 62) and gives the second one an extra bezel ring; both are kept
 * as drawn rather than normalised, since the offsets are what make the
 * tree read as hand-hung rather than a list. */
const SUB_AGENTS = [
  {
    step: S_ROW_1,
    orbStep: S_ORB_1,
    connectorStep: S_CONN_1,
    connector: { src: "/assets/thinking/connector-1.svg", h: 45, top: 253 },
    orb: {
      left: 65,
      top: 285,
      blob: { src: "/assets/thinking/orb-sub1.png", size: 16, dx: 0, dy: 0 },
      mask: {
        src: "/assets/thinking/orb-sub1-mask.svg",
        size: 13.525,
        dx: 1.24,
        dy: 1.24,
      },
      ring: null,
    },
    text: { left: 91, top: 285, width: 282 },
    /* Both rows carry the same copy in the design; the ticker phases are
     * offset so the two sub-agents don't read as one animation twice. */
    descOffset: 0,
  },
  {
    step: S_ROW_2,
    orbStep: S_ORB_2,
    connectorStep: S_CONN_2,
    connector: { src: "/assets/thinking/connector-2.svg", h: 107, top: 254 },
    orb: {
      left: 62,
      top: 348,
      blob: {
        src: "/assets/thinking/orb-sub2.png",
        size: 15.622,
        dx: 0.19,
        dy: 0.19,
      },
      mask: {
        src: "/assets/thinking/orb-sub2-mask.svg",
        size: 13.206,
        dx: 1.4,
        dy: 1.4,
      },
      ring: { src: "/assets/thinking/orb-sub2-ring.svg", size: 16 },
    },
    text: { left: 88, top: 348, width: 285 },
    descOffset: 2,
  },
] as const;

/* The stages of the flow, in the order the Figma board lays them out. Each
 * one is a section on the "thinking mode animation" page; the sub-CTAs
 * below the phone switch between them, and anything not built yet is
 * listed but not selectable, so the row doubles as the build queue. */
const STAGES = [
  { id: "pre-thinking", label: "Pre-thinking", built: true },
  { id: "scanning-passport", label: "Scanning passport", built: true },
  { id: "fetching-docs", label: "Fetching docs", built: false },
  { id: "scanning-photos", label: "Scanning photos", built: false },
  { id: "visa-requirement", label: "Visa requirement", built: false },
] as const;

type StageId = (typeof STAGES)[number]["id"];

export default function ThinkingModeScreen() {
  const [stage, setStage] = useState<StageId>("pre-thinking");
  /* Bumping the run id remounts the stage, which replays the whole
     sequence — a one-shot build-up is otherwise only watchable once per
     page load, which makes it useless to review. Switching stage counts
     as a new run for the same reason. */
  const [run, setRun] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Sub-CTAs — which state of the flow the phone is showing. */}
      <nav className="mb-1 flex flex-wrap items-center justify-center gap-1.5">
        {STAGES.map((s) => {
          const isActive = s.id === stage;
          return (
            <button
              key={s.id}
              type="button"
              disabled={!s.built}
              aria-current={isActive ? "true" : undefined}
              onClick={() => {
                setStage(s.id);
                setRun((r) => r + 1);
              }}
              className={
                "rounded-full px-3.5 py-1.5 text-[13px] transition-colors " +
                (isActive
                  ? "bg-[#0b0b0b] text-white"
                  : s.built
                    ? "bg-black/5 text-[#4b4b53] hover:bg-black/10"
                    : "cursor-not-allowed bg-black/[0.03] text-[#b4b4bb]")
              }
            >
              {s.label}
            </button>
          );
        })}
      </nav>

      <div
        className="relative h-[852px] w-[393px] select-none overflow-hidden rounded-[40px] bg-white shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
        onClick={() => setRun((r) => r + 1)}
      >
        {/* Chrome is the same in every stage and never animates, so it
            lives out here and only the stage content remounts. */}
        <Background />
        <TopBar />
        <UserBubble />
        <Composer />

        {stage === "pre-thinking" ? (
          <PreThinkingStage key={run} />
        ) : (
          <ScanningPassportStage key={run} />
        )}
      </div>
      <p className="text-[12px] text-[#8b8b93]">tap the screen to replay</p>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Stage 1 — pre-thinking (section 852:8608). The agent tree assembling
 * itself: orb, step title, rolling subline, two sub-agents on connectors.
 * -------------------------------------------------------------------------*/
function PreThinkingStage() {
  const step = useSequence();

  return (
    <>
      <AgentOrb visible={step >= S_ORB} />
      <StepText step={step} />
      {SUB_AGENTS.map((sub) => (
        <SubAgent key={sub.step} sub={sub} step={step} />
      ))}
    </>
  );
}

/* Walks the step counter forward through STEP_DELAYS. One timeout at a
 * time rather than a batch of absolute-offset timers, so a step's delay
 * always means "after the previous beat landed". */
function useSequence() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= STEP_DELAYS.length) return;
    const t = window.setTimeout(() => setStep(step + 1), STEP_DELAYS[step]);
    return () => window.clearTimeout(t);
  }, [step]);

  return step;
}

/* ---------------------------------------------------------------------------
 * Background — Backgrounds/Default (852:7671), kept at Figma's position.
 *
 * It's a donut: a 1200px circle carrying a 150px-wide stroke on the brand
 * gradient (white → #5057EA → #EF4646 → #EDD758 → white), blurred hard and
 * held at 40%, parked at (-404, -174) so the screen sits over the ring's
 * BAND while the ring's hole covers the middle. That geometry is the whole
 * trick — it's what puts the colour on the edges and leaves the centre
 * white. Replace it with anything solid and the wash floods inward.
 *
 * Figma animates it by shrinking 1200 → 679 and drifting x/y, which moves
 * the shape around behind the screen. Here it only rotates: the ring is a
 * perfect circle, so spinning it changes nothing about where the band sits
 * — just the gradient's angular position — and the colour walks around the
 * edge while the shape stays exactly put. One lap per 24s; faster than
 * that and it starts to read as a spin rather than as drifting light.
 * -------------------------------------------------------------------------*/
function Background() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[40px]">
      <motion.div
        className="absolute"
        style={{
          left: -404,
          top: -174,
          width: 1200,
          height: 1200,
          opacity: 0.4,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 24, ease: "linear", repeat: Infinity }}
      >
        {/* The svg carries its own blur filter, which needs the extra
            16.67% of bleed on every side to render uncropped. */}
        <div className="absolute inset-[-16.67%]">
          <Image
            src="/assets/thinking/bg-ellipse.svg"
            alt=""
            fill
            sizes="1600px"
            style={{ objectFit: "fill" }}
            priority
          />
        </div>
      </motion.div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Chrome — status bar + menu button (852:8762) and the composer (852:8763).
 * Both are present from the first frame and never move, so neither takes
 * part in the sequence.
 * -------------------------------------------------------------------------*/
function TopBar() {
  return (
    <div className="absolute left-0 top-0 h-[123px] w-[393px]">
      {/* Dynamic Island (852:7750) */}
      <div
        className="absolute rounded-[20px] bg-[#1a1a1a]"
        style={{ left: 134, top: 11, width: 125, height: 37 }}
      />

      <p
        className="absolute text-[16px] font-semibold text-black"
        style={{ left: 35.5, top: 22, letterSpacing: "0.016px" }}
      >
        12:30
      </p>

      <div
        className="absolute flex items-center gap-[6px]"
        style={{ left: 287.5, top: 24, height: 12 }}
      >
        <Image
          src="/assets/thinking/cellular.svg"
          alt=""
          width={18}
          height={12}
          style={{ width: 18, height: 12 }}
        />
        <Image
          src="/assets/thinking/wifi.svg"
          alt=""
          width={16}
          height={12}
          style={{ width: 16, height: 12 }}
        />
        <Image
          src="/assets/thinking/battery.svg"
          alt=""
          width={24}
          height={12}
          style={{ width: 24, height: 12 }}
        />
      </div>

      {/* Menu (852:7763) — glass button, 20% white over the aura. */}
      <div
        className="absolute overflow-hidden rounded-[28.8px] border border-[#e8e8e8] bg-white/20"
        style={{
          left: 20,
          top: 67,
          width: 48,
          height: 48,
          boxShadow: "0 3.84px 28.8px -1.92px rgba(0,0,0,0.05)",
        }}
      >
        <Image
          src="/assets/thinking/menu.svg"
          alt=""
          width={24}
          height={24}
          style={{ position: "absolute", left: 12, top: 12, width: 24, height: 24 }}
        />
      </div>
    </div>
  );
}

function UserBubble() {
  return (
    <div
      className="absolute flex flex-col items-end"
      style={{ left: 0, top: 133, width: 393, padding: "16px 20px" }}
    >
      <div
        className="rounded-[99px] border border-white"
        style={{
          padding: "12px 18px",
          backgroundImage:
            "linear-gradient(166.03deg, rgba(255,255,255,0.7) 10.51%, rgba(255,255,255,0.3) 72.05%)",
          backdropFilter: "blur(25px)",
          WebkitBackdropFilter: "blur(25px)",
          boxShadow: "0 4px 30px -2px rgba(0,0,0,0.05)",
        }}
      >
        <p
          className="whitespace-nowrap text-[14px] font-medium text-[#0b0b0b]"
          style={{ lineHeight: "19px", letterSpacing: "-0.28px" }}
        >
          I need a visa to Thailand
        </p>
      </div>
    </div>
  );
}

function Composer() {
  return (
    <div
      className="absolute bottom-0 left-0 flex w-[391px] flex-col items-center gap-[6px]"
      style={{ paddingTop: 12, paddingLeft: 20, paddingRight: 20 }}
    >
      <div
        className="relative h-[56px] w-full overflow-hidden rounded-[30px] border border-[#e8e8e8] bg-white/40"
        style={{ boxShadow: "0 3.84px 28.8px -1.92px rgba(0,0,0,0.05)" }}
      >
        {/* Left cluster: attach + the AI dialpad, then the placeholder. */}
        <div
          className="absolute flex items-center gap-[10px]"
          style={{ left: 11, top: 11 }}
        >
          <div className="relative size-[32px] overflow-hidden rounded-full bg-black/5">
            <Image
              src="/assets/thinking/plus.svg"
              alt=""
              width={18}
              height={18}
              style={{ position: "absolute", left: 7, top: 7, width: 18, height: 18 }}
            />
          </div>

          {/* AI dialpad (437:8929) — a white pill with the gradient "ai"
              texture showing through at 30%, under the dialpad glyph. */}
          <div className="relative size-[32px] overflow-hidden rounded-full border-[0.78px] border-[#f2f2f2] bg-white">
            <Image
              src="/assets/thinking/ai.png"
              alt=""
              width={32}
              height={32}
              style={{
                position: "absolute",
                inset: 0,
                width: 32,
                height: 32,
                objectFit: "cover",
                opacity: 0.3,
              }}
            />
            <Image
              src="/assets/thinking/dialpad.svg"
              alt=""
              width={15.61}
              height={15.591}
              style={{
                position: "absolute",
                left: 7.8,
                top: 8.61,
                width: 15.61,
                height: 15.591,
              }}
            />
          </div>

          <p
            className="whitespace-nowrap text-[16px] text-[#ccc]"
            style={{ lineHeight: "20px", letterSpacing: "-0.64px" }}
          >
            Apply for a visa
          </p>
        </div>

        {/* Right cluster: mic + send. */}
        <div
          className="absolute flex items-center gap-[10px]"
          style={{ right: 11, top: 11 }}
        >
          <div className="relative size-[32px] overflow-hidden rounded-full bg-black/5">
            <Image
              src="/assets/thinking/mic.svg"
              alt=""
              width={17.6}
              height={17.6}
              style={{
                position: "absolute",
                left: 7.2,
                top: 7.2,
                width: 17.6,
                height: 17.6,
              }}
            />
          </div>
          <div className="relative size-[32px] overflow-hidden rounded-full bg-black">
            <Image
              src="/assets/thinking/arrow.svg"
              alt=""
              width={18}
              height={18}
              style={{
                position: "absolute",
                left: 7,
                top: 7,
                width: 18,
                height: 18,
                transform: "rotate(90deg)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Home indicator (852:8181). */}
      <div className="flex h-[34px] w-full items-center justify-center">
        <div
          className="rounded-full bg-black"
          style={{ width: 140, height: 5 }}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * The parent agent orb (852:8764) — four layers of the project's orb
 * material at 26px: the gradient blob, its specular mask, the bezel ring
 * and the vertical accent highlight.
 *
 * Entrance: a plain opacity fade, then a slow scale breathe it never drops
 * out of. The breathe is doing the work here — while the tree below is
 * still assembling, an orb sitting perfectly still reads as a static
 * asset, and the same orb inhaling on a 2.4s cycle reads as something
 * running.
 * -------------------------------------------------------------------------*/
function AgentOrb({
  visible,
  /* Pre-thinking puts the orb at 224, the Scan frame at 225. */
  top = 224,
}: {
  visible: boolean;
  top?: number;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: 24, top, width: 26, height: 26 }}
      initial={{ opacity: 0 }}
      animate={
        visible
          ? { opacity: 1, scale: [1, 1.06, 1] }
          : { opacity: 0, scale: 1 }
      }
      transition={{
        opacity: { duration: 0.55, ease: IN_EASE },
        scale: visible
          ? { duration: 2.4, ease: "easeInOut", repeat: Infinity }
          : { duration: 0 },
      }}
    >
      <Image
        src="/assets/thinking/orb-main.png"
        alt=""
        width={25.387}
        height={25.387}
        style={{
          position: "absolute",
          left: 0.3,
          top: 0.3,
          width: 25.387,
          height: 25.387,
        }}
      />
      <Image
        src="/assets/thinking/orb-main-mask.svg"
        alt=""
        width={21.459}
        height={21.459}
        style={{
          position: "absolute",
          left: 2.27,
          top: 2.27,
          width: 21.459,
          height: 21.459,
        }}
      />
      <Image
        src="/assets/thinking/orb-main-ring.svg"
        alt=""
        width={26}
        height={26}
        style={{ position: "absolute", inset: 0, width: 26, height: 26 }}
      />
      <Image
        src="/assets/thinking/orb-main-accent.svg"
        alt=""
        width={15.73}
        height={22.88}
        style={{
          position: "absolute",
          left: 5.14,
          top: 1.5,
          width: 15.73,
          height: 22.88,
        }}
      />
    </motion.div>
  );
}

/* ---------------------------------------------------------------------------
 * Parent step text. The title arrives as one blur-fade unit, and lifts from
 * y 229 (centred on the orb, which is where the design puts it while it is
 * the only line) to y 221 when the subline appears beneath it.
 * -------------------------------------------------------------------------*/
function StepText({ step }: { step: number }) {
  const titleIn = step >= S_TITLE;
  const sublineIn = step >= S_SUBLINE;
  /* The parent stops shimmering once its children are all deployed — the
     shine is what marks the step that is still working. */
  const working = step < S_ROW_2;

  return (
    <>
      <motion.div
        className="absolute overflow-hidden"
        style={{ left: 62, width: 176, height: 16 }}
        initial={{ opacity: 0, filter: "blur(8px)", top: 233 }}
        animate={{
          opacity: titleIn ? 1 : 0,
          filter: titleIn ? "blur(0px)" : "blur(8px)",
          top: sublineIn ? 221 : 229,
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <p
          className={
            "text-[12px] font-medium " +
            (working ? "agent-title-shine" : "agent-title-static")
          }
          style={{ lineHeight: "16px", letterSpacing: "-0.24px" }}
        >
          Preparing our agents
        </p>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 62, top: 241, width: 312.353 }}
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{
          opacity: sublineIn ? 1 : 0,
          filter: sublineIn ? "blur(0px)" : "blur(8px)",
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <RollingLine
          lines={SUBLINES}
          index={step >= S_DEPLOYED ? 1 : 0}
          className="text-[11px] text-[#666]"
        />
      </motion.div>
    </>
  );
}

/* ---------------------------------------------------------------------------
 * A sub-agent: connector, orb, title, rolling description — revealed in
 * that order, so the parent is visibly the thing that spawned it.
 *
 * The connector is a filled outline path, not a stroke, so it can't be
 * drawn with stroke-dash. It's revealed by growing a clipping box down
 * from its top instead, which comes out the same: the trunk extends, the
 * elbow curls right, and the terminating dot lands last — right where the
 * sub-orb then appears.
 * -------------------------------------------------------------------------*/
function SubAgent({
  sub,
  step,
}: {
  sub: (typeof SUB_AGENTS)[number];
  step: number;
}) {
  const rowIn = step >= sub.step;
  const descIndex = useDescriptionTicker(rowIn, sub.descOffset);

  return (
    <>
      <motion.div
        className="pointer-events-none absolute overflow-hidden"
        style={{ left: 35, top: sub.connector.top, width: 18 }}
        initial={{ height: 0 }}
        animate={{ height: step >= sub.connectorStep ? sub.connector.h : 0 }}
        transition={{ duration: 0.42, ease: IN_EASE }}
      >
        <Image
          src={sub.connector.src}
          alt=""
          width={18}
          height={sub.connector.h}
          style={{ width: 18, height: sub.connector.h }}
        />
      </motion.div>

      <SubOrb orb={sub.orb} visible={step >= sub.orbStep} />

      <motion.div
        className="absolute flex flex-col gap-[4px]"
        style={{ left: sub.text.left, top: sub.text.top, width: sub.text.width }}
        initial={{ opacity: 0, filter: "blur(8px)", y: 4 }}
        animate={{
          opacity: rowIn ? 1 : 0,
          filter: rowIn ? "blur(0px)" : "blur(8px)",
          y: rowIn ? 0 : 4,
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <div className="overflow-hidden" style={{ width: 176, height: 16 }}>
          <p
            className="agent-title-shine text-[12px] font-medium"
            style={{ lineHeight: "16px", letterSpacing: "-0.24px" }}
          >
            Sub agent task
          </p>
        </div>
        <RollingLine
          lines={SUB_DESCRIPTIONS}
          index={descIndex}
          className="text-[11px] text-[#666]"
        />
      </motion.div>
    </>
  );
}

function SubOrb({
  orb,
  visible,
}: {
  orb: (typeof SUB_AGENTS)[number]["orb"];
  visible: boolean;
}) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ left: orb.left, top: orb.top, width: 16, height: 16 }}
      initial={{ opacity: 0 }}
      animate={
        visible ? { opacity: 1, scale: [1, 1.07, 1] } : { opacity: 0, scale: 1 }
      }
      transition={{
        opacity: { duration: 0.45, ease: IN_EASE },
        /* Same breathe as the parent, a little tighter and offset by its
           own arrival time — the children shouldn't pulse in lockstep. */
        scale: visible
          ? { duration: 2.1, ease: "easeInOut", repeat: Infinity }
          : { duration: 0 },
      }}
    >
      <Image
        src={orb.blob.src}
        alt=""
        width={orb.blob.size}
        height={orb.blob.size}
        style={{
          position: "absolute",
          left: orb.blob.dx,
          top: orb.blob.dy,
          width: orb.blob.size,
          height: orb.blob.size,
        }}
      />
      <Image
        src={orb.mask.src}
        alt=""
        width={orb.mask.size}
        height={orb.mask.size}
        style={{
          position: "absolute",
          left: orb.mask.dx,
          top: orb.mask.dy,
          width: orb.mask.size,
          height: orb.mask.size,
        }}
      />
      {orb.ring ? (
        <Image
          src={orb.ring.src}
          alt=""
          width={orb.ring.size}
          height={orb.ring.size}
          style={{
            position: "absolute",
            inset: 0,
            width: orb.ring.size,
            height: orb.ring.size,
          }}
        />
      ) : null}
    </motion.div>
  );
}

/* Rolls a stack of lines through a one-line window: the outgoing line
 * leaves upward and blurs as it goes, the incoming one rises into its
 * place. The design draws this literally — a 16px clipped frame with the
 * lines parked at 32px intervals inside it — so the swap is a translate,
 * not a crossfade, and progress reads as a state change. */
function RollingLine({
  lines,
  index,
  className,
}: {
  lines: readonly string[];
  index: number;
  className?: string;
}) {
  return (
    <div className="overflow-hidden" style={{ height: 16 }}>
      <motion.div
        animate={{ y: -index * 16 }}
        transition={{ duration: 0.52, ease: IN_EASE }}
      >
        {lines.map((line, i) => (
          <motion.p
            key={line}
            className={className}
            style={{ height: 16, lineHeight: "16px" }}
            animate={{
              opacity: i === index ? 1 : 0,
              filter: i === index ? "blur(0px)" : "blur(3px)",
            }}
            transition={{ duration: 0.36, ease: IN_EASE }}
          >
            {line}
          </motion.p>
        ))}
      </motion.div>
    </div>
  );
}

/* Advances a sub-agent's description ticker while its row is on screen,
 * stopping on the last line — the checks run out, they don't loop back to
 * "Task description". */
function useDescriptionTicker(active: boolean, offset: number) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!active || i >= SUB_DESCRIPTIONS.length - 1) return;
    /* The offset staggers the two rows' first tick so they don't roll
       together. */
    const wait = i === 0 ? DESC_HOLD_MS + offset * 260 : DESC_HOLD_MS;
    const t = window.setTimeout(() => setI(i + 1), wait);
    return () => window.clearTimeout(t);
  }, [active, i, offset]);

  return i;
}

/* ===========================================================================
 * Stage 2 — Scanning passport (section 852:10995).
 *
 * The step line becomes "Scanning passport / Running 10 checks" and a row of
 * passport cards runs underneath it: each card is scanned by a green line
 * travelling across its face, then dims and takes a check, and the next one
 * starts. The board draws it three times over — 1 card, 2 cards, 3+ — which
 * is one sequence sampled at different depths, so it's built as three cards
 * scanned in turn with the row sliding left when it runs out of room.
 *
 * Geometry off frame 852:11139 (the "Scan" frame, which sits at y 210):
 *   agent orb        26×26 at (24, 225)
 *   title / subline  left 62, y 224 / 244
 *   card             128.491×101, first at (62, 272), pitch 137.491
 *   row clip         307 wide — Figma's Frame 1991431083, so the third card
 *                    is cut off until the row slides
 *
 * The card face is Figma's own export of passport-scan-w (852:11160): the
 * printed passport, its white carrier, the shadow card kicked 3.85° behind
 * it, and the black scan brackets are all one raster, because that artwork
 * is 20-odd nested vectors and an image fill — nothing an animation needs
 * to touch. The export carries ~15px of shadow bleed on each side, hence
 * CARD_IMG being bigger than the node box and offset back into place.
 * Everything that MOVES — the scan line, the dim, the check — is drawn over
 * it here.
 * -------------------------------------------------------------------------*/

const PASSPORT_STEP_DELAYS = [
  300, // 1  orb
  600, // 2  "Scanning passport"
  500, // 3  subline
  350, // 4  card 1 arrives and starts scanning
  1700, // 5  card 1 done
  450, // 6  card 2 arrives, scanning
  1700, // 7  card 2 done
  450, // 8  card 3 arrives, row slides left
  1700, // 9  card 3 done
] as const;

/* Each card's (arrive, done) step pair. */
const PASSPORT_CARDS = [
  { arrive: 4, done: 5 },
  { arrive: 6, done: 7 },
  { arrive: 8, done: 9 },
] as const;

/* Step at which the row has run out of room and slides one slot left. */
const ROW_SLIDE_STEP = 8;

const PASSPORT_CHECKS = [
  "Running 10 checks",
  "Glare detection",
  "Sharpness level",
  "Blur detection",
  "Analysing data",
] as const;

/* Card geometry, all in the node's own coordinates. */
const CARD_W = 128.491;
const CARD_H = 101;
const CARD_PITCH = 137.491;
/* The export box and where it has to sit so the card lands on the node box. */
const CARD_IMG_W = 159;
const CARD_IMG_H = 130;
const CARD_IMG_X = -(CARD_IMG_W - CARD_W) / 2;
const CARD_IMG_Y = -(CARD_IMG_H - CARD_H) / 2;
/* The printed face — what the scan line travels across. */
const PRINT = { left: 11.12, top: 13.59, w: 104.245, h: 71.662 };
/* Variant10's dim plate, in node coordinates. Figma's own numbers for it
 * are a 128.497×95.137 box hung at a negative offset — but it sits INSIDE
 * the white card, which is overflow-clip, so what actually renders is that
 * plate cut back to the card. Written here as the card's own rect, which
 * is the clipped result: a plate that covers the passport and nothing
 * else. Given as a free-floating box it bleeds out past the card edges. */
const DIM = { left: 3.71, top: 4.94, w: 119.849, h: 88.96, radius: 12.356 };
const CHECK = { size: 24.711, cx: 63.63, cy: 49.42 };
/* Figma's scan line colour (Line 234). */
const SCAN_GREEN = "#08da0f";
/* One pass of the line across a card. Two passes fit inside a card's scan
 * step, which reads as a device working rather than one clean swipe. */
const SWEEP_S = 0.85;

function ScanningPassportStage() {
  const step = useSequenceWith(PASSPORT_STEP_DELAYS);
  const working = step < 9;
  /* The subline ticks through the checks for as long as anything is being
     scanned, then settles back on the count. */
  const checkIndex = usePassportCheckTicker(step >= 4 && working);

  return (
    <>
      <AgentOrb visible={step >= 1} top={225} />

      <motion.div
        className="absolute overflow-hidden"
        style={{ left: 62, top: 224, width: 176, height: 16 }}
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{
          opacity: step >= 2 ? 1 : 0,
          filter: step >= 2 ? "blur(0px)" : "blur(8px)",
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <p
          className={
            "text-[12px] font-medium " +
            (working ? "agent-title-shine" : "agent-title-static")
          }
          style={{ lineHeight: "16px", letterSpacing: "-0.24px" }}
        >
          Scanning passport
        </p>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 62, top: 244, width: 312.353 }}
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{
          opacity: step >= 3 ? 1 : 0,
          filter: step >= 3 ? "blur(0px)" : "blur(8px)",
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <RollingLine
          lines={PASSPORT_CHECKS}
          index={checkIndex}
          className="text-[11px] text-[#666]"
        />
      </motion.div>

      {/* The card row. Clipped to Figma's 307, with vertical slack so the
          cards' drop shadows aren't sliced off at the top and bottom. */}
      <div
        className="pointer-events-none absolute overflow-hidden"
        style={{ left: 62, top: 272 - 16, width: 307, height: CARD_H + 32 }}
      >
        <motion.div
          className="absolute left-0 top-0"
          style={{ height: CARD_H + 32 }}
          animate={{ x: step >= ROW_SLIDE_STEP ? -CARD_PITCH : 0 }}
          transition={{ duration: 0.62, ease: IN_EASE }}
        >
          {PASSPORT_CARDS.map((card, i) => (
            <PassportCard
              key={i}
              x={i * CARD_PITCH}
              y={16}
              visible={step >= card.arrive}
              scanning={step >= card.arrive && step < card.done}
              done={step >= card.done}
            />
          ))}
        </motion.div>
      </div>
    </>
  );
}

function PassportCard({
  x,
  y,
  visible,
  scanning,
  done,
}: {
  x: number;
  y: number;
  visible: boolean;
  scanning: boolean;
  done: boolean;
}) {
  return (
    <motion.div
      className="absolute"
      style={{ left: x, top: y, width: CARD_W, height: CARD_H }}
      initial={{ opacity: 0, y: 10, scale: 0.96, filter: "blur(6px)" }}
      animate={{
        opacity: visible ? 1 : 0,
        y: visible ? 0 : 10,
        scale: visible ? 1 : 0.96,
        filter: visible ? "blur(0px)" : "blur(6px)",
      }}
      transition={{ duration: 0.52, ease: IN_EASE }}
    >
      <Image
        src="/assets/thinking/passport/card.png"
        alt=""
        width={CARD_IMG_W}
        height={CARD_IMG_H}
        style={{
          position: "absolute",
          left: CARD_IMG_X,
          top: CARD_IMG_Y,
          width: CARD_IMG_W,
          height: CARD_IMG_H,
        }}
      />

      {/* Scan pass — a hard green line with a soft trail behind it,
          clipped to the printed face so nothing leaks over the carrier.
          It loops while this card is the one being read. */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: PRINT.left,
          top: PRINT.top,
          width: PRINT.w,
          height: PRINT.h,
        }}
      >
        <motion.div
          className="absolute top-0"
          style={{ width: 40, height: PRINT.h, left: -40 }}
          animate={{ x: scanning ? [0, PRINT.w + 40] : 0 }}
          transition={
            scanning
              ? { duration: SWEEP_S, ease: "linear", repeat: Infinity }
              : { duration: 0 }
          }
          initial={false}
        >
          {/* Trail first, line on its leading edge. */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, rgba(8,218,15,0) 0%, rgba(8,218,15,0.22) 100%)`,
              opacity: scanning ? 1 : 0,
            }}
          />
          <div
            className="absolute top-0"
            style={{
              right: 0,
              width: 1.24,
              height: PRINT.h,
              background: SCAN_GREEN,
              boxShadow: `0 0 6px 1px rgba(8,218,15,0.55)`,
              opacity: scanning ? 1 : 0,
            }}
          />
        </motion.div>
      </div>

      {/* Read — Variant10: the card dims under a black plate and takes a
          check. The check lands with a small overshoot; a check that fades
          in reads as a label, one that pops reads as a verdict. */}
      <motion.div
        className="absolute"
        style={{
          left: DIM.left,
          top: DIM.top,
          width: DIM.w,
          height: DIM.h,
          borderRadius: DIM.radius,
          background: "rgba(0,0,0,0.6)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: done ? 0.4 : 0 }}
        transition={{ duration: 0.42, ease: IN_EASE }}
      />
      <motion.div
        className="absolute"
        style={{
          left: CHECK.cx - CHECK.size / 2,
          top: CHECK.cy - CHECK.size / 2,
          width: CHECK.size,
          height: CHECK.size,
        }}
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: done ? 1 : 0, scale: done ? 1 : 0.5 }}
        transition={
          done
            ? { type: "spring", stiffness: 520, damping: 24, delay: 0.14 }
            : { duration: 0.2 }
        }
      >
        <Image
          src="/assets/thinking/passport/check.svg"
          alt=""
          width={CHECK.size}
          height={CHECK.size}
          style={{ width: CHECK.size, height: CHECK.size }}
        />
      </motion.div>
    </motion.div>
  );
}

/* Same walk as useSequence, over whichever delay table a stage passes in. */
function useSequenceWith(delays: readonly number[]) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (step >= delays.length) return;
    const t = window.setTimeout(() => setStep(step + 1), delays[step]);
    return () => window.clearTimeout(t);
  }, [step, delays]);

  return step;
}

/* Rolls the subline through the check names while scanning is live, looping
 * back to the count when it reaches the end — unlike the sub-agent ticker,
 * these checks repeat for every card. */
function usePassportCheckTicker(active: boolean) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (!active) return;
    const t = window.setTimeout(
      () => setI((n) => (n + 1) % PASSPORT_CHECKS.length),
      850,
    );
    return () => window.clearTimeout(t);
  }, [active, i]);

  return active ? i : 0;
}
