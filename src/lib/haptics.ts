// Haptic feedback for onboarding moments. Uses navigator.vibrate — works
// on Android Chrome/Firefox and PWAs; silently no-ops on iOS Safari and
// desktop, which is the correct fallback (never throws, never blocks).
//
// Each trigger is a named semantic moment so screens call haptic('orbLand')
// without knowing the underlying pattern. Tune the patterns here in one place.

type Trigger =
  | "orbLand"          // Screen 4: each perk orb drops into a pill
  | "carouselSnap"     // Screen 7: car snaps to center
  | "stagedLock"       // Screen 7: car commits to Staged
  | "cardRise"         // Screen 5: WorldPass card clears the fold
  | "benefitLand"      // Screen 5: a benefit orb hits the card
  | "finaleReveal"     // Screen 5: name + ID appear on the finished card
  | "screenAdvance"    // Any screen → next screen transition
  | "tapAdvance"       // User tap-to-advance on intro screens
  | "cardSwipeReveal"  // Screen 6: name+ID card slides into view
  | "milestoneTick"    // Screen 5: percentage counter crosses 25/50/75/100
  | "statusFlip"       // Screen 4: agent status flips (Working → Done)
  | "screenMount";     // Screen 7: initial car reveal / entrance thump

const PATTERNS: Record<Trigger, number | number[]> = {
  orbLand: 12,
  carouselSnap: 8,
  stagedLock: [20, 40, 20],
  cardRise: 15,
  benefitLand: 10,
  finaleReveal: [30, 60, 30, 60, 40],
  screenAdvance: 10,
  tapAdvance: 6,
  cardSwipeReveal: [12, 30, 18],
  milestoneTick: 5,
  statusFlip: 6,
  screenMount: 14,
};

export function haptic(trigger: Trigger) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;
  try {
    navigator.vibrate(PATTERNS[trigger]);
  } catch {
    // Some browsers throw when called too frequently or in the wrong context.
  }
}
