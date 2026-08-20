"use client";

/**
 * Dev checkpoint definitions — used by the CheckpointPanel to jump the app
 * to any moment in the flow.
 *
 * `outerIdx` selects which screen component to render (in OnboardingFlow's
 * SCREENS array). `inner` (only for Screen 4) sets the internal state of the
 * multi-agent choreography.
 */

export type InnerCheckpoint = {
  timelineIdx: number;
  promoteLevel: number;
  welcomeProgress: number;
  welcomeTextIdx: number;
  arcProgress: number;
  settleProgress: number;
};

export type Checkpoint = {
  label: string;
  outerIdx: number;
  inner?: InnerCheckpoint;
};

export const CHECKPOINTS_OUTER: Checkpoint[] = [
  { label: "1 · Visa splash", outerIdx: 0 },
  { label: "2 · Travel agent intro", outerIdx: 1 },
  { label: "3 · That job is over", outerIdx: 2 },
];

export const CHECKPOINTS_END: Checkpoint[] = [
  { label: "5 · WorldPass benefits", outerIdx: 4 },
];

// Inner checkpoints for Screen 4. `outerIdx: 3` = Screen 4.
// `timelineIdx: -1` means "start from the beginning" (arc entrance).
// Actual timeline indices are computed at runtime inside Screen4 since they
// depend on the AGENTS data structure.
export const CHECKPOINTS_INNER: Array<Omit<Checkpoint, "outerIdx"> & {
  outerIdx: 3;
  matcher:
    | { kind: "start" }
    | { kind: "working"; agentIdx: number; lineIdx: number; statusIdx: number }
    | { kind: "summary"; agentIdx: number }
    | { kind: "welcome" }
    | { kind: "teamPerks" };
}> = [
  {
    label: "4a · Meet team intro",
    outerIdx: 3,
    matcher: { kind: "start" },
  },
  {
    label: "4b · Visa checking",
    outerIdx: 3,
    matcher: { kind: "working", agentIdx: 0, lineIdx: 0, statusIdx: 0 },
  },
  {
    label: "4c · Visa summary",
    outerIdx: 3,
    matcher: { kind: "summary", agentIdx: 0 },
  },
  {
    label: "4d · Flight",
    outerIdx: 3,
    matcher: { kind: "working", agentIdx: 1, lineIdx: 0, statusIdx: -1 },
  },
  {
    label: "4e · Flight summary",
    outerIdx: 3,
    matcher: { kind: "summary", agentIdx: 1 },
  },
  {
    label: "4f · Forex",
    outerIdx: 3,
    matcher: { kind: "working", agentIdx: 2, lineIdx: 0, statusIdx: 0 },
  },
  {
    label: "4g · Forex summary",
    outerIdx: 3,
    matcher: { kind: "summary", agentIdx: 2 },
  },
  {
    label: "4h · Safety",
    outerIdx: 3,
    matcher: { kind: "working", agentIdx: 3, lineIdx: 0, statusIdx: 0 },
  },
  {
    label: "4i · Safety summary",
    outerIdx: 3,
    matcher: { kind: "summary", agentIdx: 3 },
  },
  {
    label: "4j · Welcome",
    outerIdx: 3,
    matcher: { kind: "welcome" },
  },
  {
    label: "4k · Team perks",
    outerIdx: 3,
    matcher: { kind: "teamPerks" },
  },
];

export type CheckpointOrInner = (typeof CHECKPOINTS_INNER)[number] | Checkpoint;

export const ALL_CHECKPOINTS: CheckpointOrInner[] = [
  ...CHECKPOINTS_OUTER,
  ...CHECKPOINTS_INNER,
  ...CHECKPOINTS_END,
];

export function CheckpointPanel({
  activeIdx,
  onJump,
}: {
  activeIdx: number;
  onJump: (idx: number) => void;
}) {
  return (
    <div className="fixed right-4 top-1/2 z-50 flex max-h-[90vh] -translate-y-1/2 flex-col gap-1 overflow-y-auto rounded-2xl bg-black/60 p-2 text-[11px] font-medium text-white backdrop-blur">
      <div className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-wider text-white/50">
        Checkpoints
      </div>
      {ALL_CHECKPOINTS.map((cp, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onJump(i);
          }}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-left transition-colors ${
            activeIdx === i
              ? "bg-white text-black"
              : "bg-white/10 hover:bg-white/20"
          }`}
        >
          {cp.label}
        </button>
      ))}
    </div>
  );
}
