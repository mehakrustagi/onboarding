/* The ten orbs from Animation-Native-Ai, section 424:8997.
 *
 * Each is a 200px frame holding a coloured base, one to four photographic
 * layers at bespoke offsets, rotations and blurs, and the same front glass
 * group on top. Reproducing those layer stacks in CSS would be ten
 * one-off layouts, and none of this treatment cares about them: what it
 * needs is the orb's COMPOSED appearance — to show it, to fade it, and to
 * sample the particles' colour out of it.
 *
 * So each orb is two assets. `src` is Figma's own export of the frame, and
 * `glass` is the front layer on its own, which the glass skin keeps in
 * front of the particles while the body behind them is gone.
 *
 * The export has the glass BAKED IN, which is why the skin shows its own
 * copy only while the body is faded. At rest the two would otherwise draw
 * the same white strokes twice and the line work would come out brighter
 * than the design.
 *
 * GENERATED, not authored. Figma's asset URLs expire after about a week,
 * so these files are the only lasting copies; re-export from the section if
 * the designs move. */

export type OrbArt = {
  id: string;
  /** Figma's export of the whole frame. Base layer and colour source. */
  src: string;
  /** The front glass group on its own. */
  glass: string;
  /* Where the glass sits, in the frame's own 200px coordinates. It
     overhangs the frame on every side and the circular clip trims it. */
  glassBox: { left: number; top: number; width: number; height: number };
};

/** The frame size every number above is expressed in. */
export const ORB_ART_BASE = 199.9958;

export const ORB_ART: OrbArt[] = [
  { id: "orb-1", src: "/assets/orbs/orb-1.png", glass: "/assets/orbs/orb-1-glass.svg", glassBox: { left: -11.0599, top: -14.4413, width: 221.2985, height: 227.9663 } },
  { id: "orb-2", src: "/assets/orbs/orb-2.png", glass: "/assets/orbs/orb-2-glass.svg", glassBox: { left: -10.8892, top: -14.4413, width: 210.9886, height: 227.9663 } },
  { id: "orb-3", src: "/assets/orbs/orb-3.png", glass: "/assets/orbs/orb-3-glass.svg", glassBox: { left: -10.7176, top: -14.4413, width: 221.2983, height: 227.9663 } },
  { id: "orb-4", src: "/assets/orbs/orb-4.png", glass: "/assets/orbs/orb-4-glass.svg", glassBox: { left: -11.5176, top: -14.4413, width: 221.2982, height: 227.9662 } },
  { id: "orb-5", src: "/assets/orbs/orb-5.png", glass: "/assets/orbs/orb-5-glass.svg", glassBox: { left: -11.0594, top: -14.4413, width: 221.2985, height: 227.9663 } },
  { id: "orb-6", src: "/assets/orbs/orb-6.png", glass: "/assets/orbs/orb-6-glass.svg", glassBox: { left: -11.0595, top: -14.4415, width: 221.2984, height: 227.9666 } },
  { id: "orb-7", src: "/assets/orbs/orb-7.png", glass: "/assets/orbs/orb-7-glass.svg", glassBox: { left: -11.0595, top: -14.4415, width: 221.2982, height: 227.9665 } },
  { id: "orb-8", src: "/assets/orbs/orb-8.png", glass: "/assets/orbs/orb-8-glass.svg", glassBox: { left: -11.0595, top: -14.4415, width: 221.2984, height: 227.9666 } },
  { id: "orb-9", src: "/assets/orbs/orb-9.png", glass: "/assets/orbs/orb-9-glass.svg", glassBox: { left: -11.0595, top: -14.4415, width: 221.2984, height: 227.9666 } },
  { id: "orb-10", src: "/assets/orbs/orb-10.png", glass: "/assets/orbs/orb-10-glass.svg", glassBox: { left: -11.0594, top: -14.4415, width: 221.2984, height: 227.9666 } },
];
