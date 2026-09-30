"use client";

/* The detent click for the loyalty dial.
 *
 * Synthesised rather than shipped as a file. A 4KB wav would be simpler,
 * but a dial fires this every ~45ms at speed, and an <audio> element per
 * tick is both an allocation and a decode on the main thread. One
 * AudioContext with a handful of oscillator nodes costs nothing and lets
 * the tick change pitch with speed, which is what stops a fast sweep
 * sounding like a machine gun.
 *
 * WHAT A DETENT ACTUALLY SOUNDS LIKE. Not a beep. A beep has a pitch you
 * can hum, so twenty of them in a row become a melody and the ear starts
 * tracking the tune instead of the motion. What we want is a CLICK: a very
 * short burst of noise-ish energy with almost no sustain, closer to a
 * fingernail on a ridge than to a tone. So:
 *
 *   - 7ms total. Past about 15ms it stops reading as a click.
 *   - A triangle, not a sine. The odd harmonics give it an edge; a pure
 *     sine at this length is a dull thud.
 *   - Exponential decay to silence, never a linear ramp to zero — a linear
 *     tail ends on a discontinuity and you hear the cut as a faint pop.
 *   - Bandpassed around the fundamental so the click sits in one part of
 *     the spectrum rather than spraying across it.
 *
 * VOLUME IS DELIBERATELY NEAR THE FLOOR. Peak gain 0.05. The brief was
 * "slight" and "subtle", and a UI sound that you notice as a sound has
 * already failed — this should register as texture under the thumb, the
 * audible half of the haptic. On laptop speakers at normal volume it is
 * barely there, which is correct.
 */

const CLICK_MS = 7;
const PEAK_GAIN = 0.05;

/* Pitch rises with speed, the way a real ratchet does — the faster the
 * wheel turns the tighter the click. Held to a narrow band: a wide sweep
 * turns the dial into a slide whistle. */
const BASE_HZ = 2100;
const FAST_HZ = 2700;

/* Two ticks closer together than this are one tick. At a fast flick the
 * dial can cross several detents inside a frame, and firing all of them
 * produces a buzz rather than a run of clicks — the ear cannot resolve
 * them anyway, so the extras are pure distortion. */
const MIN_GAP_MS = 22;

let ctx: AudioContext | null = null;
let lastAt = 0;
let enabled = true;

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/* Must be called from inside a real user gesture. Browsers create an
 * AudioContext in a "suspended" state unless a gesture is on the stack,
 * and a suspended context plays nothing while still reporting success —
 * so the dial would be silent with no error anywhere. The dial calls this
 * on pointerdown, before any tick can be scheduled. */
export function primeTicker() {
  if (typeof window === "undefined") return;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    /* Safari suspends the context again whenever the tab is backgrounded,
       so this is a resume on every gesture, not just the first. */
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* Some embedded webviews throw on construction. Silence is the right
       failure here — never let a decorative sound break the dial. */
    ctx = null;
  }
}

export function setTickerEnabled(on: boolean) {
  enabled = on;
}

/**
 * One detent click.
 *
 * @param speed 0–1, how fast the dial is turning. Drives pitch and a
 *              little of the level, so a slow deliberate turn is softer
 *              and lower than a flick.
 * @param accent A detent that means more than its neighbours — the major
 *               ticks, and the ends of travel. Slightly louder and a
 *               fifth lower so it is distinguishable without being a
 *               different sound.
 */
export function playTick(speed = 0, accent = false) {
  if (!enabled || !ctx || ctx.state !== "running") return;

  const now = ctx.currentTime;
  const nowMs = now * 1000;
  if (nowMs - lastAt < MIN_GAP_MS) return;
  lastAt = nowMs;

  const s = Math.min(1, Math.max(0, speed));

  try {
    const osc = ctx.createOscillator();
    const band = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    osc.type = "triangle";
    const hz = (BASE_HZ + (FAST_HZ - BASE_HZ) * s) * (accent ? 0.667 : 1);
    osc.frequency.setValueAtTime(hz, now);

    band.type = "bandpass";
    band.frequency.setValueAtTime(hz, now);
    /* Q of 1.2 — enough to colour the click, not enough to ring. Above
       about 4 the filter starts to resonate and the click grows a tail. */
    band.Q.setValueAtTime(1.2, now);

    const peak = PEAK_GAIN * (accent ? 1.5 : 1) * (0.7 + 0.3 * s);
    /* Ramp UP over 1ms rather than starting at peak. A hard start is a
       step discontinuity, which is itself a click — an ugly one, on top
       of the one we meant. */
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.001);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + CLICK_MS / 1000);

    osc.connect(band);
    band.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + CLICK_MS / 1000 + 0.01);
    /* Nodes are single-use and self-collect once stopped, but the
       explicit disconnect keeps the graph from growing during a long
       sweep on browsers that are lazy about it. */
    osc.onended = () => {
      try {
        osc.disconnect();
        band.disconnect();
        gain.disconnect();
      } catch {
        /* Already torn down — nothing to do. */
      }
    };
  } catch {
    /* Never let audio failure surface to the user. */
  }
}
