/* Loyalty — Figma KxbtgBnr5QKC708d7KlSmx, frames 1503:544 (dial),
 * 1503:1285 (the pull) and 1503:2047 (the drop).
 *
 * Three frames, ONE screen. They are the same composition at three points
 * in a single gesture — the card never leaves, it moves — so building them
 * as three routes would have thrown the whole thing away. Same reasoning as
 * the trips handoff; see TripsScreen's header.
 *
 * Every coordinate below is in FRAME SPACE: the 440×964 artboard, origin at
 * its top-left. The shell renders at 440×965 to match the other screens in
 * this project, which is a 1px difference at the bottom edge and affects
 * nothing that is positioned here.
 *
 *
 * WHERE THESE NUMBERS CAME FROM, because two sources disagree.
 *
 * Most are read off the node tree. The DIAL's are not: `get_design_context`
 * flattens the whole tick ruler into one <img> and the six tick nodes it
 * does expose describe 12px ticks at r≈250.7–262.7, which is wrong. Sampling
 * the frame's own render puts them at 8px, r≈248.3–256.3 — the exposed nodes
 * are the ruler's far side, near the bottom of the circle, and they are not
 * the same size as the ones on the visible arc.
 *
 * So everything under "the dial" is MEASURED, not read. The measurement is
 * reproducible: sample luminance along arcs about the centre below and look
 * for the bands. Do that before changing any of it.
 */

/* ── The shell ──────────────────────────────────────────────────────────── */

export const SHELL_W = 440;
export const SHELL_H = 965;

/* ── Money ──────────────────────────────────────────────────────────────── */

/** 1503:1143 — "Using ₹0 / ₹12,800". */
export const MAX_RUPEES = 12_800;
/** 1503:1144 — "₹1 = 1 PTS". The conversion is identity, so points and
 *  rupees are the same number everywhere; kept named rather than inlined
 *  because it is a business rule that will not stay 1 forever. */
export const PTS_PER_RUPEE = 1;
/** 1503:1184 — the balance printed on the card before any conversion. */
export const OPENING_BALANCE = 23_545;

/* ── The card ───────────────────────────────────────────────────────────── */

/** 1503:1176 at rest, 1503:2631 after the drop. Same card: it travels
 *  369.26px down the screen and grows 7px wider, which is the whole
 *  difference between the two nodes. */
export const CARD = {
  x: 62.293,
  y: 120,
  w: 315.415,
  h: 210,
  radius: 24.901,
} as const;

export const CARD_SETTLED = {
  x: 62.293,
  y: 489.263,
  w: 322.395,
  h: 210,
} as const;

/** 1503:1185 / 1527:3755 — the Maharaja Club lockup, top-left of the card.
 *
 *  THE HEIGHT IS NOT FIGMA'S, DELIBERATELY. The node is 98.676 × 22.34,
 *  an aspect of 4.42, and the artwork it holds is 1024 × 363 — an aspect
 *  of 2.82. Figma resolves that by STRETCHING: measured on its own render
 *  of 1527:3746 the lockup comes out 97 × 22, so the emblem is an oval
 *  rather than a circle and the letterforms are 1.56× too wide.
 *
 *  Matching the node exactly would mean shipping that distortion. Keeping
 *  the node's WIDTH and deriving the height from the source instead —
 *  98.676 × 363 / 1024 = 34.98 — gives the lockup at the size the design
 *  intends with the proportions the artwork actually has.
 *
 *  (An earlier pass used `object-fit: contain` inside the 22.34 box. That
 *  is undistorted but fits by height, so the lockup rendered 58px wide
 *  against Figma's 97 — correct shape, two-thirds the size.) */
export const CARD_LOGO = { x: 20, y: 20, w: 98.676, h: 34.98 } as const;
/** 1503:1186 — the dot field, top-right. Drawn rotated 180° in Figma; the
 *  asset is exported already rotated, so it is placed as-is. */
export const CARD_DOTS = { x: 157.627, y: 20, w: 137.786, h: 41.207 } as const;
/** 1503:1184 / 1503:1183 — balance and its "Pts" suffix, card-relative. */
export const CARD_BALANCE_Y = 85;
/** 1503:2046 — "+1,800 pts", card-relative (frame coords 189.5, 289). */
export const CARD_DELTA_Y = 169;
/** 1503:2042 — the green wash, card-relative. Frame coords put it at
 *  (113.844, 320) 212.313×46.053, i.e. straddling the card's bottom edge:
 *  it is masked to the card, so only the top half of the ellipse shows. */
export const CARD_WASH = { x: 51.551, y: 200, w: 212.313, h: 46.053 } as const;

/* ── The gem ────────────────────────────────────────────────────────────── */

/** 1503:1276 — the gem itself. 1503:1277 is a 39.27×36.85 ellipse behind it
 *  that reads as its ground shadow / glow. */
export const GEM = { x: 206.926, y: 430.982, w: 26.141, h: 50 } as const;
export const GEM_GLOW = { x: 200.363, y: 425.982, w: 39.27, h: 36.85 } as const;

/** 1503:2025 / 2029 / 2032 — the three green trails of frame 2, as assets.
 *  Frame 2 draws them parked at fixed offsets above the gem, because a
 *  still frame has nowhere to put motion; here they are the particles of a
 *  stream and their positions come from STREAM below. */
export const TRAIL_SRC = {
  a: { src: "trail-a.svg", w: 25.23, h: 52.252 },
  b: { src: "trail-b.svg", w: 8, h: 52.253 },
  c: { src: "trail-c.svg", w: 8, h: 32.252 },
} as const;

/** 1503:2019 — the silver one, the only trail travelling INTO the gem from
 *  underneath rather than out of it. */
export const TRAIL_BELOW = { x: 207.617, y: 485.918, w: 25.996, h: 49.486 } as const;

/** Where the stream runs: from below the gem, up to just inside the card's
 *  bottom edge. Both ends matter — it has to start off-screen-ish enough
 *  that particles are already moving when you first see them, and finish
 *  INSIDE the card so they are absorbed rather than stopping short of it. */
export const STREAM_START_Y = 588;
export const STREAM_END_Y = CARD.y + CARD.h - 10;

/** The particles. Deterministic, never randomised: `Math.random()` here
 *  renders one arrangement on the server and a different one on the
 *  client, which is a hydration mismatch.
 *
 *  `dx` is a FIXED lane, not a start point. They rise straight up and stay
 *  in their lane — an earlier pass had them converging on the card's
 *  centre as they climbed, and while that is a fair way to draw a pull it
 *  is not what the design does: 1503:2012 is a column of stars rising
 *  vertically, each with its own trail, and the lanes are what make it
 *  read as several separate things rather than one funnel. */
export const STREAM = [
  { k: "b" as const, dx: -22, delay: 0, dur: 1.55 },
  { k: "a" as const, dx: 14, delay: 0.26, dur: 1.75 },
  { k: "c" as const, dx: -7, delay: 0.5, dur: 1.38 },
  { k: "b" as const, dx: 25, delay: 0.68, dur: 1.64 },
  { k: "c" as const, dx: 5, delay: 0.92, dur: 1.48 },
  { k: "a" as const, dx: -15, delay: 1.12, dur: 1.7 },
] as const;

/* ── The readout ────────────────────────────────────────────────────────── */

/** 1503:1143 — "Using ₹0 / ₹12,800", centred, Denton Medium 20/26. */
export const USING_Y = 555.392;
/** 1503:1144 — "₹1 = 1 PTS", Inter Bold 12/14, tracking 0.96, #808080. */
export const RATE_Y = 589.392;

/* ── The dial ───────────────────────────────────────────────────────────── */
/*  MEASURED off the 1503:544 render. See the header.                       */

/** Centre of the ruler circle, well below the bottom of the frame — the
 *  screen only ever shows the top ~110° of it. From the two ellipse nodes:
 *  both 1503:1140 and 1503:1141 are concentric on (220, 897.78). */
export const DIAL_CX = 220;
export const DIAL_CY = 897.78;

/** 1503:1141, the thin arc the ticks stand on. Confirmed by probe: at
 *  x=200 the arc lands at y≈663.6, and 897.78 − √(235² − 20²) = 663.63. */
export const DIAL_R = 235;

/** Tick band. Probe at x=200 puts a tick between y 641.5 and 649.5, i.e.
 *  radius 248.3 → 256.3 — 8px long, sitting 13px clear of the arc. (The
 *  node tree claims 12px at 250.7–262.7. It is describing other ticks.) */
export const TICK_R_INNER = 248.3;
export const TICK_R_OUTER = 256.3;
export const TICK_W = 1;

/** Angular pitch, from peak-finding along the arc at 0.05° resolution:
 *  consecutive ticks are 0.900° apart (median over 70 peaks between ±30°),
 *  and every 10th is brighter and longer — the bright ones land at 0°,
 *  8.875°, 17.75°, 26.6°, 35.6°, which is every ~9.9 ticks.
 *
 *  AN EARLIER PASS HAD THIS AT 1.775° AND IT WAS WRONG BY EXACTLY 2×. The
 *  peak-finder that produced it discarded peaks closer together than 0.9°,
 *  which is the pitch itself — so it merged every adjacent pair and
 *  reported the gap between the survivors. The ruler came out a third as
 *  dense as the reference, which is obvious side by side and invisible in
 *  a whole-frame error score: the ticks are 1px on a dark ground, so three
 *  quarters of them can go missing and the mean error barely moves.
 *
 *  If you re-measure, sample finer than the thing you are measuring and
 *  check the result against a crop, not against a number. */
export const TICK_PITCH_DEG = 0.9;
export const MAJOR_EVERY = 10;

/** One tick is ₹50, so the full ₹12,800 is 256 ticks and 230.4° of travel
 *  — most of the circle, which is why the centre sits off-screen, and
 *  roughly twice the ~110° that is ever on screen at once.
 *
 *  A design decision, not a measurement: the frames only ever show the
 *  ruler at ₹0 and ₹1,800, which pins the PITCH but not the SCALE. ₹50 is
 *  chosen so the range is about two screenfuls of ruler — at ₹100 a tick
 *  the whole scale would be 115°, barely more than the visible window, and
 *  the dial would hardly turn. Majors then fall every ₹500. */
export const RUPEES_PER_TICK = 50;
export const TICK_COUNT = MAX_RUPEES / RUPEES_PER_TICK;

/** How far from the pointer a tick is still drawn. Probe shows brightness
 *  decaying from 255 at 0° to the scrim's own 36 by about ±55°, so past
 *  this the ticks are not merely dim — they are gone. */
export const TICK_FADE_DEG = 55;

/** 1503:1145 — the pointer, a 2×30.44 bar from r=233.95 out to r=264.39,
 *  and 1503:1167 — the 8px dot centred on the arc at r≈234.4. Both fixed
 *  at 12 o'clock: the RULER turns, the pointer never does. */
export const POINTER_R_INNER = 233.95;
export const POINTER_R_OUTER = 264.39;
export const POINTER_W = 2;
export const HANDLE_R = 4;

/* ── Furniture ──────────────────────────────────────────────────────────── */

/** 1503:1169 and its four chevrons at ±81 and ±89.35 from centre. */
export const SWIPE_Y = 790.688;
export const CHEVRON = { size: 20, inner: 81, outer: 89.355, top: 787.688 } as const;

/** 1503:1113 — 380×50 at (30, 874), radius 84. */
export const CTA = { x: 30, y: 874, w: 380, h: 50, radius: 84 } as const;

/** 1503:1278 — 45×45 at (365, 30). */
export const CLOSE = { x: 365, y: 30, size: 45 } as const;

/* ── Success copy ───────────────────────────────────────────────────────── */

/** 1503:2624 — "1,800 / Maharaja Pts Added", Inter Medium 20/25. */
export const SUCCESS_TITLE_Y = 312.264;
/** 1503:2625 — the supporting line, Inter Semibold 14/19 at 50%. */
export const SUCCESS_BODY_Y = 382.264;
/** 1503:2626 — the sparkle row above the title. */
export const SUCCESS_SPARKS = { x: 140.484, y: 264.736, w: 166, h: 35 } as const;
/** 1503:2619 — "image 26", the light shaft. Identical placement to the
 *  vault's 1558 (left 14.79, 410×614 from the top edge), which is why this
 *  screen reuses that component outright instead of drawing a second one. */
export const SHAFT = { x: 14.999, y: 0, w: 410, h: 614 } as const;

export const ASSETS = "/assets/loyalty";
