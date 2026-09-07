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
  { id: "fetching-docs", label: "Fetching docs", built: true },
  { id: "scanning-photos", label: "Scanning photos", built: true },
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
        ) : stage === "scanning-passport" ? (
          <ScanningPassportStage key={run} />
        ) : stage === "scanning-photos" ? (
          <ScanningPhotosStage key={run} />
        ) : (
          <FetchingDocsStage key={run} />
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
  400, // 4  the whole row lands; the front card is being read
  1600, // 5  front card leaves, the next slides up
  1600, // 6  and the next
  1600, // 7  last one read
] as const;

/* Step at which the row is on screen. Card i is the one being read at
 * step ROW_STEP + i, so the step counter doubles as the read head. */
const PASSPORT_ROW_STEP = 4;
const PASSPORT_COUNT = 3;

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
/* Figma parks the cards 137.491 apart, which is the card plus a gap — that
 * spacing is for a static frame showing the whole queue. Running it as a
 * conveyor they overlap instead: each card tucks behind the one in front,
 * so the row reads as a stack being worked through rather than a list, and
 * three of them fit in the clip with the front one fully visible. */
const CARD_PITCH = CARD_W * 0.78;
/* Room for the row: from its left edge to the screen edge, not Figma's
 * 307-wide frame. That frame is sized for a static shot of two-and-a-bit
 * cards; a conveyor needs all three on screen or the queue reads as
 * chopped off rather than as waiting. Vertical slack keeps the cards'
 * drop shadows off the clip edges. */
const CARD_ROW_X = 62;
const CARD_ROW_W = 393 - CARD_ROW_X;
const CARD_ROW_SLACK = 26;
/* How far a finished card travels as it leaves. Enough to clear the clip. */
const CARD_EXIT_X = -(CARD_W + 60);
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
  const rowIn = step >= PASSPORT_ROW_STEP;
  /* Which card the read head is on. Runs off the end once the last one is
     done, which is what stops the sweep and settles the title. */
  const reading = rowIn ? step - PASSPORT_ROW_STEP : -1;
  const working = reading >= 0 && reading < PASSPORT_COUNT;
  /* The subline ticks through the checks for as long as anything is being
     scanned, then settles back on the count. */
  const checkIndex = usePassportCheckTicker(working);

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

      {/* The card row — a conveyor. Every card lands together and then the
          read head works along them: the one being read sits at the front
          slot, and once it's done it slides off the left edge while the
          rest shift up one slot. Clipped to Figma's 307, with vertical
          slack so the cards' drop shadows aren't sliced off. */}
      <div
        className="pointer-events-none absolute overflow-hidden"
        style={{
          left: CARD_ROW_X,
          top: 272 - CARD_ROW_SLACK,
          width: CARD_ROW_W,
          height: CARD_H + CARD_ROW_SLACK * 2,
        }}
      >
        {Array.from({ length: PASSPORT_COUNT }, (_, i) => (
          <PassportCard
            key={i}
            y={CARD_ROW_SLACK}
            /* Slot 0 is the read position; cards queue to its right and a
               finished card drops to a negative slot and leaves. */
            slot={i - Math.max(0, reading)}
            visible={rowIn}
            delay={i * 0.08}
            scanning={reading === i}
            done={reading > i}
          />
        ))}
      </div>
    </>
  );
}

function PassportCard({
  slot,
  y,
  visible,
  delay,
  scanning,
  done,
}: {
  /* 0 is the read position, 1+ queue to the right, negative = gone. */
  slot: number;
  y: number;
  visible: boolean;
  delay: number;
  scanning: boolean;
  done: boolean;
}) {
  const gone = slot < 0;
  return (
    <motion.div
      className="absolute"
      style={{
        top: y,
        width: CARD_W,
        height: CARD_H,
        /* Front card on top, the queue stacking behind it to the right. */
        zIndex: 50 - Math.max(0, slot),
      }}
      initial={{
        x: Math.max(0, slot) * CARD_PITCH,
        opacity: 0,
        y: 10,
        scale: 0.96,
        filter: "blur(6px)",
      }}
      animate={{
        x: gone ? CARD_EXIT_X : slot * CARD_PITCH,
        opacity: !visible ? 0 : gone ? 0 : 1,
        y: visible ? 0 : 10,
        scale: visible ? 1 : 0.96,
        filter: visible && !gone ? "blur(0px)" : "blur(6px)",
      }}
      transition={{
        duration: gone ? 0.66 : 0.52,
        ease: IN_EASE,
        delay: visible && !gone ? delay : 0,
      }}
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

/* ===========================================================================
 * Stage 3 — Scanning photos (section 852:13192).
 *
 * Same shape as the passport stage, different subject: the step line reads
 * "Scanning your photos / Running 10 checks" and a row of passport-photo
 * cards is read one after another. The board's 1 / 2 / 3+ frames show the
 * row arriving and then all four cards sitting there with the scan line on
 * one of them, so here all four arrive on a stagger and the line walks
 * along them.
 *
 * Two things differ from the passport cards, both from the design:
 *   · the scan line is HORIZONTAL and travels down the face (Line 234 sits
 *     at 41.18% of the card's height, mid-face), where the passport's line
 *     is vertical and travels across
 *   · there is no dim-and-check finish — the design leaves the brackets on
 *     and moves the line to the next card, so completion is carried by the
 *     line having moved on rather than by a badge
 *
 * Geometry off photo-scan-w (852:13271), node box 77.962×80:
 *   row              starts (57, 281), pitch 89.962 — the fourth card runs
 *                    past the screen edge and is clipped by the shell, as
 *                    Figma's 347.848-wide row is
 *   shadow card      the carrier's rect again, kicked 6.16°
 *   carrier          72.46×72.47 at (1.82, 3.86), r9.11, white
 *   photo            63.771 square at (6.08, 12.14), 0.569 #d6d9dc border
 *   brackets         6.66 square, one glyph rotated into each corner
 * -------------------------------------------------------------------------*/

const PHOTO_STEP_DELAYS = [
  300, // 1  orb
  600, // 2  "Scanning your photos"
  500, // 3  subline
  400, // 4  the row arrives, first card starts being read
  1250, // 5  card 2
  1250, // 6  card 3
  1250, // 7  card 4
  1250, // 8  done
] as const;

/* Step at which the row is on screen; each later step moves the line one
 * card along, so card i is being read at step 4 + i. */
const PHOTO_ROW_STEP = 4;
const PHOTO_COUNT = 4;

const PHOTO_CHECKS = [
  "Running 10 checks",
  "Face detection",
  "Background check",
  "Glare detection",
  "Analysing data",
] as const;

const PHOTO_W = 77.962;
const PHOTO_H = 80;
/* As with the passports: Figma's 89.962 spacing is card-plus-gap for a
 * static frame. On the conveyor they overlap, each tucking behind the one
 * in front. */
/* A gentler overlap than the passports': four photos have to fit between
 * the row's left edge and the screen edge, and at a tight pitch the queued
 * faces disappear behind the one in front. */
const PHOTO_PITCH = PHOTO_W * 0.9;
const PHOTO_EXIT_X = -(PHOTO_W + 70);
const PHOTO_ROW_X = 57;
const PHOTO_ROW_Y = 281;

/* Card internals, in the node's own coordinates. */
const CARRIER = { left: 1.82, top: 3.86, w: 72.46, h: 72.47, radius: 9.11 };
const FACE = { left: 6.08, top: 12.14, size: 63.771 };
const BRACKET = 6.66;
/* Carrier-relative bracket corners, from the design; +CARRIER to place. */
const BRACKET_CORNERS = [
  { left: 7.53, top: 8.29, rotate: -90 }, // top-left
  { left: 59.46, top: 8.28, rotate: 0 }, // top-right
  { left: 7.53, top: 60.18, rotate: 180 }, // bottom-left
  { left: 59.46, top: 60.18, rotate: 90 }, // bottom-right
] as const;

const PORTRAITS = [
  "/assets/thinking/photos/portrait-1.png",
  "/assets/thinking/photos/portrait-2.png",
  "/assets/thinking/photos/portrait-3.png",
  "/assets/thinking/photos/portrait-4.png",
] as const;

/* One pass of the line down a face. */
const PHOTO_SWEEP_S = 0.62;

function ScanningPhotosStage() {
  const step = useSequenceWith(PHOTO_STEP_DELAYS);
  const rowIn = step >= PHOTO_ROW_STEP;
  /* Which card the line is on. Runs off the end when the last one is read,
     which is what stops the sweep everywhere. */
  const reading = rowIn ? step - PHOTO_ROW_STEP : -1;
  const working = reading >= 0 && reading < PHOTO_COUNT;
  const checkIndex = usePassportCheckTicker(working);

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
            "whitespace-nowrap text-[12px] font-medium " +
            (working ? "agent-title-shine" : "agent-title-static")
          }
          style={{ lineHeight: "16px", letterSpacing: "-0.24px" }}
        >
          Scanning your photos
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
          lines={PHOTO_CHECKS}
          index={checkIndex}
          className="text-[11px] text-[#666]"
        />
      </motion.div>

      {/* Conveyor, same as the passports: the row lands together, the read
          head works along it, and a finished photo slides off the left
          edge while the rest shift up one slot. */}
      {PORTRAITS.map((src, i) => (
        <PhotoCard
          key={src}
          src={src}
          slot={i - Math.max(0, reading)}
          visible={rowIn}
          /* The cards land left to right rather than all at once — a row
             that arrives together reads as a static image. */
          delay={i * 0.09}
          scanning={reading === i}
        />
      ))}
    </>
  );
}

function PhotoCard({
  src,
  slot,
  visible,
  delay,
  scanning,
}: {
  src: string;
  /* 0 is the read position, 1+ queue to the right, negative = gone. */
  slot: number;
  visible: boolean;
  delay: number;
  scanning: boolean;
}) {
  const gone = slot < 0;
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{
        left: PHOTO_ROW_X,
        top: PHOTO_ROW_Y,
        width: PHOTO_W,
        height: PHOTO_H,
        zIndex: 50 - Math.max(0, slot),
      }}
      initial={{
        x: Math.max(0, slot) * PHOTO_PITCH,
        opacity: 0,
        y: 10,
        scale: 0.94,
        filter: "blur(6px)",
      }}
      animate={{
        x: gone ? PHOTO_EXIT_X : slot * PHOTO_PITCH,
        opacity: !visible ? 0 : gone ? 0 : 1,
        y: visible ? 0 : 10,
        scale: visible ? 1 : 0.94,
        filter: visible && !gone ? "blur(0px)" : "blur(6px)",
      }}
      transition={{
        duration: gone ? 0.6 : 0.5,
        ease: IN_EASE,
        delay: visible && !gone ? delay : 0,
      }}
    >
      {/* The kicked shadow card behind the carrier. */}
      <div
        style={{
          position: "absolute",
          left: CARRIER.left,
          top: CARRIER.top,
          width: CARRIER.w,
          height: CARRIER.h,
          borderRadius: CARRIER.radius,
          background: "#d8d8d8",
          opacity: 0.77,
          transform: "rotate(6.16deg)",
          boxShadow:
            "0 0 4.555px rgba(0,0,0,0.04), 0 9.11px 18.22px rgba(0,0,0,0.08)",
        }}
      />

      {/* White carrier. */}
      <div
        style={{
          position: "absolute",
          left: CARRIER.left,
          top: CARRIER.top,
          width: CARRIER.w,
          height: CARRIER.h,
          borderRadius: CARRIER.radius,
          background: "#ffffff",
          boxShadow:
            "0 0 2.278px rgba(0,0,0,0.04), 0 9.11px 9.11px rgba(0,0,0,0.08)",
        }}
      />

      {/* The photo, and the scan pass over it. */}
      <div
        className="absolute overflow-hidden"
        style={{
          left: FACE.left,
          top: FACE.top,
          width: FACE.size,
          height: FACE.size,
          border: "0.569px solid #d6d9dc",
        }}
      >
        <Image
          src={src}
          alt=""
          width={FACE.size}
          height={FACE.size}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Horizontal line travelling down the face, trail above it. */}
        <motion.div
          className="absolute left-0"
          style={{ width: "100%", height: 26, top: -26 }}
          animate={{ y: scanning ? [0, FACE.size + 26] : 0 }}
          transition={
            scanning
              ? { duration: PHOTO_SWEEP_S, ease: "linear", repeat: Infinity }
              : { duration: 0 }
          }
          initial={false}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(8,218,15,0) 0%, rgba(8,218,15,0.28) 100%)",
              opacity: scanning ? 1 : 0,
            }}
          />
          <div
            className="absolute left-0 w-full"
            style={{
              bottom: 0,
              height: 1.24,
              background: SCAN_GREEN,
              boxShadow: "0 0 6px 1px rgba(8,218,15,0.55)",
              opacity: scanning ? 1 : 0,
            }}
          />
        </motion.div>
      </div>

      {/* Scan brackets — one glyph rotated into each corner, as drawn. */}
      {BRACKET_CORNERS.map((c) => (
        <Image
          key={`${c.left}-${c.top}`}
          src="/assets/thinking/photos/bracket.svg"
          alt=""
          width={BRACKET}
          height={BRACKET}
          style={{
            position: "absolute",
            left: CARRIER.left + c.left,
            top: CARRIER.top + c.top,
            width: BRACKET,
            height: BRACKET,
            transform: `rotate(${c.rotate}deg)`,
          }}
        />
      ))}
    </motion.div>
  );
}

/* ===========================================================================
 * Stage 4 — Fetching documents from your profile (section 852:12711).
 *
 * The board calls this one out as three beats rather than a queue:
 *   step 01.a  loop — the sources and the folder, connectors between them
 *   step 01.b  loop — "energy bounce inside the folder"
 *   step 02    finishing — "docs appear inside the folder → success state"
 *
 * So it is built as a connection being made rather than a row being worked
 * through: two source chips on the left, a folder on the right, and the two
 * curved links bridging the 20px between them. The links draw themselves in
 * (stroke-dash, using Figma's own path data and its #10B981→white gradient),
 * then the folder's border carries a lit arc travelling around its edge for
 * three seconds while energy pulses inside it, and when it lands the border
 * settles to a solid green and the documents appear inside the folder.
 *
 * Geometry off frame 852:12830 — content block at (0, 210), px24 py14:
 *   agent orb     26×26 at (24, 224)
 *   title         left 62, y 224
 *   description   left 62, y 248, 12/16 #666, wraps over 312
 *   row           y 292: chips column at 62, folder 40×40 at 102
 *   links         20 wide, bridging (82, 302.57) and (82, 319.29)
 *   folder art    32.117×25 centred in the 40 box; back plate, the two
 *                 kicked documents, then the front flap over them
 * -------------------------------------------------------------------------*/

const FETCH_STEP_DELAYS = [
  300, // 1  orb
  600, // 2  title
  400, // 3  description
  400, // 4  source chips
  400, // 5  folder
  300, // 6  links draw, folder border starts travelling
  3000, // 7  ...for three seconds, then success
] as const;

const FETCH_LOADING_STEP = 6;
const FETCH_DONE_STEP = 7;

/* Row geometry, in screen coordinates. */
const FETCH_ROW_Y = 292;
const CHIP_X = 62;
const CHIP_SIZE = 20;
const CHIP_GAP = 8;
const SOURCE_CHIPS = [
  { src: "/assets/thinking/fetching/source-atlys-chip.png", whole: true },
  { src: "/assets/thinking/fetching/source-gmail.svg", whole: false },
] as const;
const FOLDER_X = 102;
const FOLDER_SIZE = 40;
const FOLDER_Y = FETCH_ROW_Y + 4; // items-center in a 48-tall row
/* Folder artwork inside the 40 box. */
const ART = { left: 3.94, top: 7.5, w: 32.117, h: 25 };
/* Figma's link paths, kept as path data so they can be drawn on with
 * stroke-dash instead of dropped in as flat images. */
const LINKS = [
  {
    /* chip 1 → folder */
    top: 302.57,
    w: 20,
    h: 12.0927,
    d: "M0 11.7927H5.25366C8.42728 11.7927 11 9.21995 11 6.04634C11 2.87272 13.5727 0.3 16.7463 0.3H20",
  },
  {
    /* chip 2 → folder */
    top: 319.29,
    w: 20,
    h: 13.2372,
    d: "M0 12.9372H2.6814C6.17106 12.9372 9 10.1083 9 6.6186C9 3.12894 11.8289 0.3 15.3186 0.3H20",
  },
] as const;

/* The two documents in the folder. Figma expresses them as rotated rects
 * inside bounding boxes (the hypot(...cqw, ...cqh) sizing), which works out
 * to a pair of ~28.4×18.9 sheets kicked -34.78° and -23.95°, centred just
 * above the middle of the folder artwork so their corners poke out over the
 * top-left of it. Stated here as centres, since that is what the rotation
 * is about. */
const DOC_W = 28.37;
const DOC_H = 18.86;
const DOCS = [
  { rotate: -34.78, cx: 16.03, cy: 9.84, delay: 0 },
  { rotate: -23.95, cx: 17.04, cy: 10.84, delay: 0.12 },
] as const;

/* Border stroke maths. Half the stroke width in from the edge so the line
 * sits fully inside the tile, and the perimeter of that rounded rect —
 * straight runs plus one full circle of corner arc — is the dash cycle the
 * travelling segment walks around. */
const BORDER_INSET = 0.6;
const BORDER_PERIMETER =
  4 * (FOLDER_SIZE - BORDER_INSET * 2 - 2 * (10 - BORDER_INSET)) +
  2 * Math.PI * (10 - BORDER_INSET);
/* The reference has the rim lit nearly all the way round — brightest down
 * the right, fading out toward the bottom-left — rather than one short
 * segment doing laps. So it is built as two strokes: a full ring carrying
 * the gradient, and a long bright run travelling over it. */
const BORDER_ARC = BORDER_PERIMETER * 0.62;

/* The connection's colour, used by the links and the folder's edge alike.
 * Figma strokes the links #10B981→white, which next to a brand-gradient
 * border reads as two unrelated things; the connection is one thing, so
 * both carry these stops while it is live and both go green when it
 * lands. */
const BRAND_STOPS = [
  { offset: 0, color: "#5057ea" },
  { offset: 0.45, color: "#ef4646" },
  { offset: 1, color: "#edd758" },
] as const;

/* Same hues with the ends taken to transparent, so a full ring fades out
 * where it meets itself instead of butting one hue against another. */
const RIM_STOPS = [
  { offset: 0, color: "#5057ea", opacity: 0 },
  { offset: 0.16, color: "#5057ea", opacity: 1 },
  { offset: 0.5, color: "#ef4646", opacity: 1 },
  { offset: 0.84, color: "#edd758", opacity: 1 },
  { offset: 1, color: "#edd758", opacity: 0 },
] as const;

/* Success green — the design's border-input-success / link gradient hue. */
const LINK_GREEN = "#10b981";

function FetchingDocsStage() {
  const step = useSequenceWith(FETCH_STEP_DELAYS);
  const loading = step >= FETCH_LOADING_STEP && step < FETCH_DONE_STEP;
  const done = step >= FETCH_DONE_STEP;

  return (
    <>
      <AgentOrb visible={step >= 1} />

      <motion.div
        className="absolute"
        style={{ left: 62, top: 224, width: 312 }}
        initial={{ opacity: 0, filter: "blur(8px)" }}
        animate={{
          opacity: step >= 2 ? 1 : 0,
          filter: step >= 2 ? "blur(0px)" : "blur(8px)",
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <p
          className={
            "whitespace-nowrap text-[12px] font-medium " +
            (done ? "agent-title-static" : "agent-title-shine")
          }
          style={{ lineHeight: "16px", letterSpacing: "-0.24px" }}
        >
          Fetching document from your profile
        </p>
      </motion.div>

      <motion.div
        className="absolute"
        style={{ left: 62, top: 248, width: 312 }}
        initial={{ opacity: 0, filter: "blur(8px)", y: 4 }}
        animate={{
          opacity: step >= 3 ? 1 : 0,
          filter: step >= 3 ? "blur(0px)" : "blur(8px)",
          y: step >= 3 ? 0 : 4,
        }}
        transition={{ duration: 0.5, ease: IN_EASE }}
      >
        <p
          className="text-[12px] text-[#666]"
          style={{ lineHeight: "16px", letterSpacing: "-0.12px" }}
        >
          The agent is reviewing your profile to identify the documents we
          currently possess.
        </p>
      </motion.div>

      {/* Source chips — the places the agent is pulling documents from.
          The first one is Figma's render of the whole chip: its glyph is an
          image fill that exports as an empty file, so the ring comes with
          it. The second is the chip drawn in CSS around Figma's Gmail
          glyph — same spec either way (#f7f7f7, 0.75px #e8e8e8). */}
      {SOURCE_CHIPS.map((chip, i) => (
        <motion.div
          key={chip.src}
          className={
            "absolute flex items-center justify-center rounded-full " +
            (chip.whole
              ? ""
              : "border-[0.75px] border-[#e8e8e8] bg-[#f7f7f7]")
          }
          style={{
            left: CHIP_X,
            top: FETCH_ROW_Y + i * (CHIP_SIZE + CHIP_GAP),
            width: CHIP_SIZE,
            height: CHIP_SIZE,
            /* The reference sits each chip in a faint lavender halo, which
               is what stops them reading as flat grey discs. */
            boxShadow: "0 1px 6px rgba(80,87,234,0.12)",
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{
            opacity: step >= 4 ? 1 : 0,
            scale: step >= 4 ? 1 : 0.7,
          }}
          transition={{
            duration: 0.42,
            ease: IN_EASE,
            delay: step >= 4 ? i * 0.1 : 0,
          }}
        >
          <Image
            src={chip.src}
            alt=""
            width={chip.whole ? CHIP_SIZE : 10}
            height={chip.whole ? CHIP_SIZE : 10}
            style={
              chip.whole
                ? { width: CHIP_SIZE, height: CHIP_SIZE }
                : { width: 10, height: 10 }
            }
          />
        </motion.div>
      ))}

      {/* The links. Drawn on with stroke-dash so the connection reads as
          being made rather than as having always been there. */}
      {LINKS.map((link, i) => (
        <svg
          key={link.top}
          className="absolute"
          style={{ left: 82, top: link.top, width: link.w, height: link.h }}
          viewBox={`0 0 ${link.w} ${link.h}`}
          fill="none"
        >
          <defs>
            <linearGradient
              id={`link-grad-${i}`}
              x1="0"
              y1="0"
              x2={link.w}
              y2={link.h}
              gradientUnits="userSpaceOnUse"
            >
              {BRAND_STOPS.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          </defs>
          <motion.path
            d={link.d}
            stroke={done ? LINK_GREEN : `url(#link-grad-${i})`}
            /* Figma's 0.6 hairline all but disappears once it is carrying
               colour rather than a flat green, so it goes to 0.9. */
            strokeWidth={0.9}
            /* The reference keeps these soft — the same hues as the rim,
               well short of full strength, so the links read as the quiet
               half of the connection and the folder's edge stays the loud
               half. Full green once it lands. */
            strokeOpacity={done ? 1 : 0.55}
            /* One path length's worth of dash, offset a whole length, is a
               line that hasn't been drawn yet; walking the offset to zero
               draws it from the chip toward the folder. */
            strokeDasharray={34}
            initial={{ strokeDashoffset: 34, opacity: 0 }}
            animate={{
              strokeDashoffset: step >= FETCH_LOADING_STEP ? 0 : 34,
              opacity: step >= FETCH_LOADING_STEP ? 1 : 0,
            }}
            transition={{
              duration: 0.6,
              ease: IN_EASE,
              delay: step >= FETCH_LOADING_STEP ? i * 0.12 : 0,
            }}
          />
        </svg>
      ))}

      {/* The folder. */}
      <motion.div
        className="absolute"
        style={{ left: FOLDER_X, top: FOLDER_Y, width: FOLDER_SIZE, height: FOLDER_SIZE }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: step >= 5 ? 1 : 0, scale: step >= 5 ? 1 : 0.8 }}
        transition={{ duration: 0.46, ease: IN_EASE }}
      >
        <div
          className="absolute inset-0 overflow-hidden rounded-[10px] border-[0.6px] border-white bg-[#f9fafb]"
        >
          {/* Folder artwork: back plate, the documents, then the front flap
              over them — so a document arriving slides in BEHIND the flap,
              which is what puts it inside the folder rather than on it. */}
          <div
            className="absolute"
            style={{ left: ART.left, top: ART.top, width: ART.w, height: ART.h }}
          >
            <Image
              src="/assets/thinking/fetching/folder-back.svg"
              alt=""
              width={27.38}
              height={24.98}
              style={{ position: "absolute", left: 2.37, top: 0, width: 27.38, height: 24.98 }}
            />

            {DOCS.map((doc) => (
              <motion.div
                key={doc.rotate}
                className="absolute overflow-hidden rounded-[4.854px] border-[0.187px] border-white"
                style={{
                  /* Figma gives these as rotated rects inside a bounding
                     box, so they're placed by CENTRE — by corner they land
                     in the wrong place and read oversized. */
                  left: doc.cx - DOC_W / 2,
                  top: doc.cy - DOC_H / 2,
                  width: DOC_W,
                  height: DOC_H,
                  transform: `rotate(${doc.rotate}deg)`,
                }}
                initial={{ opacity: 0, y: 10, scale: 0.7 }}
                animate={{
                  opacity: done ? 1 : 0,
                  y: done ? 0 : 10,
                  scale: done ? 1 : 0.7,
                }}
                transition={{
                  duration: 0.5,
                  ease: IN_EASE,
                  delay: done ? doc.delay : 0,
                }}
              >
                <Image
                  src="/assets/thinking/fetching/doc.png"
                  alt=""
                  width={DOC_W}
                  height={DOC_H}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              </motion.div>
            ))}

            <Image
              src="/assets/thinking/fetching/folder-front.svg"
              alt=""
              width={ART.w}
              height={9.67}
              style={{
                position: "absolute",
                left: 0,
                top: 15.33,
                width: ART.w,
                height: 9.67,
              }}
            />
          </div>
        </div>

        {/* The border, and ONLY the border. A lit arc runs around the edge
            while the fetch is live, then the whole edge settles to green.
            Drawn as a stroked rounded rect with a dash gap: one lit
            segment, its offset walked around the perimeter. The earlier
            attempt was a conic gradient with the middle masked out, which
            is how the gradient ended up flooding the whole tile —
            `mask-image` doesn't accept a `content-box` keyword (that
            belongs to the `mask` shorthand), so the declaration was
            dropped and the ring rendered as a filled box. A stroke can't
            fail that way: there is no fill to leak. */}
        <svg
          className="absolute inset-0"
          width={FOLDER_SIZE}
          height={FOLDER_SIZE}
          viewBox={`0 0 ${FOLDER_SIZE} ${FOLDER_SIZE}`}
          fill="none"
        >
          <defs>
            <linearGradient
              id="folder-rim-grad"
              x1="0"
              y1="0"
              x2={FOLDER_SIZE}
              y2={FOLDER_SIZE}
              gradientUnits="userSpaceOnUse"
            >
              {RIM_STOPS.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                  stopOpacity={stop.opacity}
                />
              ))}
            </linearGradient>
            <linearGradient
              id="folder-border-grad"
              x1="0"
              y1="0"
              x2={FOLDER_SIZE}
              y2={FOLDER_SIZE}
              gradientUnits="userSpaceOnUse"
            >
              {BRAND_STOPS.map((stop) => (
                <stop
                  key={stop.offset}
                  offset={stop.offset}
                  stopColor={stop.color}
                />
              ))}
            </linearGradient>
          </defs>

          {/* The rim itself — on the whole time the fetch is live. */}
          <motion.rect
            x={BORDER_INSET}
            y={BORDER_INSET}
            width={FOLDER_SIZE - BORDER_INSET * 2}
            height={FOLDER_SIZE - BORDER_INSET * 2}
            rx={10 - BORDER_INSET}
            stroke="url(#folder-rim-grad)"
            strokeWidth={1.2}
            initial={{ opacity: 0 }}
            animate={{ opacity: loading ? 0.75 : 0 }}
            transition={{ duration: 0.35, ease: IN_EASE }}
          />

          {/* Bright run travelling over it. */}
          <motion.rect
            x={BORDER_INSET}
            y={BORDER_INSET}
            width={FOLDER_SIZE - BORDER_INSET * 2}
            height={FOLDER_SIZE - BORDER_INSET * 2}
            rx={10 - BORDER_INSET}
            stroke="url(#folder-border-grad)"
            strokeWidth={1.2}
            strokeLinecap="round"
            strokeDasharray={`${BORDER_ARC} ${BORDER_PERIMETER - BORDER_ARC}`}
            initial={{ strokeDashoffset: 0, opacity: 0 }}
            animate={
              loading
                ? { strokeDashoffset: -BORDER_PERIMETER, opacity: 1 }
                : { strokeDashoffset: 0, opacity: 0 }
            }
            transition={
              loading
                ? {
                    strokeDashoffset: {
                      duration: 1.4,
                      ease: "linear",
                      repeat: Infinity,
                    },
                    opacity: { duration: 0.3 },
                  }
                : { duration: 0.3 }
            }
          />

          {/* Settled green edge once it lands. */}
          <motion.rect
            x={BORDER_INSET}
            y={BORDER_INSET}
            width={FOLDER_SIZE - BORDER_INSET * 2}
            height={FOLDER_SIZE - BORDER_INSET * 2}
            rx={10 - BORDER_INSET}
            stroke={LINK_GREEN}
            strokeWidth={1.2}
            initial={{ opacity: 0 }}
            animate={{ opacity: done ? 1 : 0 }}
            transition={{ duration: 0.42, ease: IN_EASE }}
          />
        </svg>
      </motion.div>
    </>
  );
}
