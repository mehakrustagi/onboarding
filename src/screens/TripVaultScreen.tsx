"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, useMotionValue } from "framer-motion";
import MyTripLayer from "./trips/MyTripLayer";
import EmptyVaultV1 from "./vault/EmptyVaultV1";
import EmptyVaultV2 from "./vault/EmptyVaultV2";
import FilledVault from "./vault/FilledVault";
import {
  ConfirmSheet,
  FlowVeil,
  PickerSheet,
  ResultCard,
  SuccessAura,
} from "./vault/UploadFlow";

/* Trip Vault (KYC Not Done) — Figma 13463:7884 (v1) and 13554:37134 (v2),
 * with the upload flow from section 1146:7099 hanging off their CTA.
 *
 * ONE SHEET, NOT SEVEN SCREENS. Figma draws nine frames here — two empty
 * states, a populated vault, a picker, a confirm sheet, an extracting
 * card and a success card — and every one of them redraws the whole trip
 * view behind it. That repetition is how a design file says "same screen,
 * different moment", and building it as seven routes would take the one
 * thing the sequence is about (a document arriving in a vault that was
 * empty a second ago) and replace it with seven page loads.
 *
 * So the trip view mounts once, the veil over it mounts once, and the
 * only thing that changes is what is sitting on top.
 *
 * THE FLOW
 *
 *   empty      v1 or v2, both with the placeholder stack animating
 *     ↓ Upload document
 *   picker     Take a Photo / Choose from Gallery / Choose a file
 *     ↓ any of the three
 *   confirm    the parsed document, Continue or Re-upload
 *     ↓ Continue
 *   extracting the ticket card, empty, working
 *     ↓ (1.9s — the only timed step, because it is the only one
 *        standing in for work rather than waiting on a tap)
 *   success    the same card, now carrying the booking
 *     ↓ (1.5s)
 *   filled     the vault, with that booking in Tuesday's row
 *
 * Sync from Email short-circuits to the filled vault: it is the same
 * outcome reached without a document to confirm, so the picker and the
 * confirm sheet have nothing to do.
 */

type Stage = "empty" | "picker" | "confirm" | "extracting" | "success" | "filled";
type Version = "v1" | "v2";

/* Long enough to read the line, short enough that you do not start to
 * wonder whether it has hung. */
const EXTRACT_MS = 1900;
/* The success card has one line and one card to show. Held slightly
 * longer than the extract so the payoff is not shorter than the wait. */
const SUCCESS_MS = 1500;

export default function TripVaultScreen() {
  const [version, setVersion] = useState<Version>("v1");
  const [stage, setStage] = useState<Stage>("empty");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /* The trip view behind everything. It reads `sweep` to decide how much
     of itself has surfaced; here the handoff is long over, so it is
     pinned at 1 rather than animated. */
  const sweep = useMotionValue(1);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clear, [clear]);

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);

  const start = useCallback(() => setStage("picker"), []);

  const pick = useCallback(() => setStage("confirm"), []);

  const confirm = useCallback(() => {
    setStage("extracting");
    at(EXTRACT_MS, () => setStage("success"));
    at(EXTRACT_MS + SUCCESS_MS, () => setStage("filled"));
  }, [at]);

  const sync = useCallback(() => {
    clear();
    setStage("filled");
  }, [clear]);

  const reset = useCallback(
    (v: Version) => {
      clear();
      setVersion(v);
      setStage("empty");
    },
    [clear],
  );

  const flowing = stage !== "empty" && stage !== "filled";

  return (
    <div className="flex flex-col items-center gap-5">
      <div
        data-stage={stage}
        className="relative select-none overflow-hidden rounded-[44px] bg-[#eceaef] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.5)]"
        style={{ width: 440, height: 965 }}
      >
        {/* The trip view, settled. KYC is not done on any frame in this
            section — the vault is one of the things the prompt is still
            offering to unlock — so it is the pending variant throughout. */}
        <MyTripLayer
          beat="settled"
          sweep={sweep}
          orbsOnTrack
          orbsRolled
          kycDone={false}
        />

        {/* Rectangle 240648158: the frost that turns the trip view into a
            backdrop. Present on all nine frames, so it never moves. */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 3,
            /* 0.8, not a polite dim. Sampled off the node the trip view
               behind this reads 49 grey against its own #F9FAFB ground,
               which is four fifths ink — the backdrop is meant to be
               gone, not merely quieted. At the 0.28 this started on, the
               KYC prompt behind the sheet stayed legible and competed
               with the sheet's own copy for the same glance. */
            background: "rgba(0,0,0,0.8)",
            backdropFilter: "blur(3px)",
            WebkitBackdropFilter: "blur(3px)",
          }}
        />

        {stage === "filled" ? (
          <FilledVault arrived onUpload={start} onSync={sync} />
        ) : version === "v1" ? (
          <EmptyVaultV1 onUpload={start} />
        ) : (
          <EmptyVaultV2 onUpload={start} onSync={sync} />
        )}

        <AnimatePresence>
          {flowing && <FlowVeil key="veil" />}
          {stage === "picker" && <PickerSheet key="picker" onPick={pick} />}
          {stage === "confirm" && (
            <ConfirmSheet key="confirm" onContinue={confirm} onReupload={() => setStage("picker")} />
          )}
          {/* Deliberately NOT keyed by stage — the card is one object
              across both beats and re-keying it would unmount the thing
              whose continuity is the point. */}
          {(stage === "extracting" || stage === "success") && (
            <ResultCard key="card" filled={stage === "success"} />
          )}
          {stage === "success" && <SuccessAura key="aura" />}
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => reset("v1")}
          className={
            "rounded-full px-3.5 py-1.5 text-[13px] transition-colors " +
            (version === "v1" && stage === "empty"
              ? "bg-[#0b0b0b] text-white"
              : "bg-black/5 text-[#4b4b53] hover:bg-black/10")
          }
        >
          Version 1
        </button>
        <button
          type="button"
          onClick={() => reset("v2")}
          className={
            "rounded-full px-3.5 py-1.5 text-[13px] transition-colors " +
            (version === "v2" && stage === "empty"
              ? "bg-[#0b0b0b] text-white"
              : "bg-black/5 text-[#4b4b53] hover:bg-black/10")
          }
        >
          Version 2
        </button>
        <button
          type="button"
          onClick={start}
          className="rounded-full bg-black/5 px-3.5 py-1.5 text-[13px] text-[#4b4b53] transition-colors hover:bg-black/10"
        >
          Run upload flow
        </button>
        <button
          type="button"
          onClick={sync}
          className={
            "rounded-full px-3.5 py-1.5 text-[13px] transition-colors " +
            (stage === "filled"
              ? "bg-[#0b0b0b] text-white"
              : "bg-black/5 text-[#4b4b53] hover:bg-black/10")
          }
        >
          Filled vault
        </button>
      </div>
    </div>
  );
}
