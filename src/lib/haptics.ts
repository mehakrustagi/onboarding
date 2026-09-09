// Haptic feedback for onboarding moments. Uses navigator.vibrate — works
// on Android Chrome/Firefox and PWAs; silently no-ops on iOS Safari and
// desktop, which is the correct fallback (never throws, never blocks).
//
// Each trigger is a named semantic moment so screens call haptic('orbLand')
// without knowing the underlying pattern. Tune the patterns here in one place.

type Trigger =
  | "orbLand"          // Screen 4: each perk orb drops into a pill
  | "carouselSnap"     // Screen 7: car snaps to center; profile carousel
  | "cardFlip"         // Profile: WorldPass card turns
  | "stagedLock"       // Screen 7: car commits to Staged
  | "cardRise"         // Screen 5: WorldPass card clears the fold
  | "benefitLand"      // Screen 5: a benefit orb hits the card
  | "finaleReveal"     // Screen 5: name + ID appear on the finished card
  | "screenAdvance"    // Any screen → next screen transition
  | "tapAdvance"       // User tap-to-advance on intro screens
  | "cardSwipeReveal"  // Screen 6: name+ID card slides into view
  | "milestoneTick"    // Screen 5: percentage counter crosses 25/50/75/100
  | "statusFlip"       // Screen 4: agent status flips (Working → Done)
  | "screenMount"      // Screen 7: initial car reveal / entrance thump
  | "whirlpoolSwirl"   // Screen 5: orbs spiral inward → final card reveal
  | "carDriveOff"      // Screen 7: Reserve tap → car accelerates off-screen
  | "carParked"        // Screen 7: car decelerates and parks at the top
  | "typeChar"         // Screen 6: name / ID typing effect, per character
  | "ropeBeadLand"     // Screen 4: one bead of the rope arc arriving
  | "ropeSettled"      // Screen 4: all beads settled into the column
  | "agentActivate"    // Screen 4: an agent takes the spotlight — the peak
  | "agentComplete"    // Screen 4: agent finishes and green check lands
  | "textReveal"       // Screens 1–3: word / line reveal beats
  | "splashLand"       // Screen 1: visa logo lands into place
  | "orbTravel"        // Screen 5: orb traveling row → card
  | "dragGrab"         // Control panel: icon picked up
  | "dragResist"       // Control panel: repeating tick while the magnet fights you
  | "dragBreak"        // Control panel: past the threshold, the magnet lets go
  | "tunnelEnter"      // Control panel: icon committed, descent begins
  | "tunnelExit";      // Control panel: icon lands on the far platform

const PATTERNS: Record<Trigger, number | number[]> = {
  orbLand: 12,
  /* The drag ladder. Resist is deliberately tiny and fires repeatedly as
     the icon is pulled — many small ticks read as friction, where one
     long buzz reads as an error. Break is the release: a sharp double
     that says the hold has given way. */
  dragGrab: 8,
  dragResist: 4,
  dragBreak: [18, 30, 24],
  tunnelEnter: [30, 40, 60],
  tunnelExit: [40, 60, 30],
  carouselSnap: 8,
  /* A short double — the card has two faces, and the pattern says a
     surface turned over rather than a button pressed. */
  cardFlip: [10, 28, 14],
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
  // Accelerating rope of ticks over ~1.5s, ending with a final thump.
  // Gaps shrink from 200ms → 20ms so the sensation "tightens" like the
  // spiral collapsing inward. Final 60ms pulse = the eye closing.
  whirlpoolSwirl: [
    10, 200, 10, 175, 10, 150, 10, 130, 10, 110,
    10, 90, 10, 75, 10, 60, 10, 48, 10, 38,
    10, 30, 15, 25, 20, 22, 25, 20, 60,
  ],
  // Car drive-off (~1.0s of the 1.7s launch): pulses grow LONGER and
  // gaps grow SHORTER as the car accelerates off the line. Trails off
  // before the car reaches the top so the deceleration+park is felt as
  // a separate carParked tick, not a mid-drive slam.
  carDriveOff: [
    6, 180, 10, 150, 14, 130, 20, 110, 28, 85,
    38, 62, 50, 45, 65,
  ],
  // Fired the moment the car settles into its parked position at the
  // top of the frame — soft two-part thump (arrival + settle).
  carParked: [22, 55, 32],
  // Featherweight tick — one per character as text types itself onto
  // the WorldPass card. 3ms is short enough to feel like a soft pulse,
  // not a buzz, when fired every ~100ms.
  typeChar: 3,
  // A single bead dropping onto the row — soft, discrete.
  ropeBeadLand: 8,
  // All beads settled — a short "confirmation" accord after the last bead.
  ropeSettled: [6, 40, 12],
  // Agent takes the spotlight — layered "rising into focus" pattern.
  agentActivate: [10, 30, 22],
  // Agent completes — short "triumphant" accord ending on a longer beat.
  agentComplete: [15, 25, 30],
  // Word / line reveals on intro screens — nearly imperceptible on its own,
  // but adds cadence when several fire in quick succession.
  textReveal: 5,
  // Screen 1: logo settles into the splash — soft "thunk".
  splashLand: 18,
  // Screen 5: orb in motion (row → card). Accelerating rope of ticks
  // over ~950ms — gaps shrink so the sensation grows tighter as the
  // orb approaches the card. Terminated by benefitLand's stronger tick.
  orbTravel: [4, 280, 6, 220, 8, 170, 12, 120, 16, 90],
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
