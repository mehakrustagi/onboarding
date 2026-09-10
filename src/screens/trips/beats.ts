/* The handoff timeline.
 *
 * Five beats, because the effect being copied is five things happening in
 * order and collapsing any two of them kills it:
 *
 *   idle      the success screen, settled. Nothing is happening yet.
 *   charging  something is close. Light gathers at the bottom edge and the
 *             whole slab draws down toward it a fraction.
 *   contact   the knock. Rattle, wobble, flash, haptic — all on one frame.
 *   sweeping  the wave. A glowing band crosses the screen top to bottom,
 *             blurring and recolouring what it passes over, with MyTrip
 *             already revealed behind its trailing edge.
 *   settled   MyTrip alone, wave gone.
 *
 * The charging beat is the one that's tempting to drop and the one that
 * matters most. Without it the contact is a jump-scare: nothing, then a
 * violent shake. With it there's a second of "something is about to
 * happen", and the shake becomes the payoff to a setup rather than an
 * event on its own. Apple's version has the same shape — the glow always
 * precedes the thump.
 */

export type HandoffBeat = "idle" | "charging" | "contact" | "sweeping" | "settled";

/* How long the wave takes to cross, seconds.
 *
 * The brief originally called for 0.6–0.8s and this is now more than twice
 * that, deliberately. Every step slower has read better, and the reason is
 * what the wave has to do: it is not a wipe arriving somewhere, it is a body
 * of water dragging a screenful of type through four stages of displacement.
 * At 0.78s that was a flash; at 1.15 you could see it but not feel the text
 * being carried. 1.85 gives each line of copy time to lean, be thrown, be
 * pulled back and settle as the crest passes over it. */
export const SWEEP_S = 1.85;

/* Milliseconds from the start of the sequence to the START of each beat.
 * Absolute rather than per-beat durations so the schedule reads as a
 * timeline and a change to one beat doesn't silently shift every later one. */
export const BEAT_AT: Record<Exclude<HandoffBeat, "idle">, number> = {
  /* Long enough for the success card to have finished arriving and been
     read. Charging over the top of an animation still settling reads as
     part of that animation rather than as something new. */
  charging: 1750,
  /* ~900ms of gathering. Under about 700 it doesn't register as a build;
     much over a second and you start waiting for it. */
  contact: 2650,
  /* Deliberately INSIDE the rattle rather than after it. The wave leaves
     while the phone is still ringing, so it looks caused by the impact
     instead of merely following it. */
  sweeping: 2760,
  /* The body wobble (1.45s from contact) is still decaying when the wave
     lands, on purpose — the tail of the knock plays out on MyTrip, which
     is what stitches the two screens into one object. */
  settled: 2760 + SWEEP_S * 1000,
};

export const SEQUENCE_END = BEAT_AT.settled;
