// Sound effects for onboarding moments. Preloads on first call, then plays
// short one-shots via cloned Audio nodes so overlapping calls don't cut each
// other off. Autoplay policy note: modern browsers unlock audio after the
// first user gesture — since Screens 1–3 are tap-to-advance, audio is
// already unlocked by the time Screen 4 mounts.

type SoundName = "orbActivate";

const SOURCES: Record<SoundName, string> = {
  orbActivate: "/assets/sounds/orb-activate.mp3",
};

const cache: Partial<Record<SoundName, HTMLAudioElement>> = {};

function prime(name: SoundName): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;
  if (!cache[name]) {
    const a = new Audio(SOURCES[name]);
    a.preload = "auto";
    a.volume = 0.6;
    cache[name] = a;
  }
  return cache[name] ?? null;
}

export function playSound(name: SoundName) {
  const base = prime(name);
  if (!base) return;
  // Clone so rapid fires don't cut each other off.
  const clip = base.cloneNode(true) as HTMLAudioElement;
  clip.volume = base.volume;
  clip.play().catch(() => {
    // Autoplay blocked (user hasn't tapped yet) — silent failure is fine.
  });
}
