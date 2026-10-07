import RippleOrb from "@/screens/orb/RippleOrb";
import TwirlOrb from "@/screens/orb/TwirlOrb";
import CoreOrb from "@/screens/orb/CoreOrb";
import HaloOrb from "@/screens/orb/HaloOrb";
import GradientOrb from "@/screens/orb/GradientOrb";
import RimOrb from "@/screens/orb/RimOrb";
import OrbV2 from "@/components/OrbV2";

/* Bench for the orb, one cell per treatment.
 *
 * White ground. The orb's own base runs #181818 → #525edf, so on white it
 * reads as a lit sphere sitting on the page rather than as a light source
 * in the dark — which is the right reading for a thing that will live in
 * these prototypes, all of which are light.
 *
 * The one thing tied to this choice is `RING_PAINT` in `RippleOrb`: the
 * ripple is ink on white and would be invisible if the ground went dark
 * again. Change both or neither.
 *
 * Add a variant by adding a cell. Each one gets the same frame so they can
 * be compared against each other rather than against their own staging. */

const GROUND = "#ffffff";

const VARIANTS = [
  {
    id: "ripple",
    title: "Ripple",
    note: "Rings are released at the rim, light up in the orb\u2019s own colours, and are gone within half their travel. Kept deliberately small \u2014 this is a state that has to sit quietly while something else is the subject.",
    render: <RippleOrb />,
  },
  {
    id: "twirl",
    title: "Twirl",
    note: "The orb\u2019s own surface turns against itself \u2014 inner and outer bands rotating by different amounts, shearing the colour into a swiggle. No grain: the image is drawn whole, once per one-pixel ring, each rotated by its own amount.",
    render: <TwirlOrb />,
  },
  {
    id: "mush",
    title: "Swirl",
    note: "The orb\u2019s own colour smears around itself and softens \u2014 the thing that swirls IS the orb, two blurred copies of its render turning against each other. When it finishes they fade and the orb resolves back out, crisp.",
    render: <GradientOrb />,
  },
  {
    id: "rims",
    title: "Rims",
    note: "Two hairline rims at fixed radii, turning in opposite directions and gliding to a stop when it is done. The orb never changes \u2014 nothing else moves at all.",
    render: <RimOrb />,
  },
  {
    id: "core",
    title: "Core",
    note: "The orb disintegrates into a few thousand fine grains on a real sphere \u2014 a surface plot of itself \u2014 which turns, wobbles on a height field, and glows where the grains stack up. Then it reforms. The dark field is deliberate: additive light needs somewhere dark to be light against.",
    render: <CoreOrb />,
  },
  {
    id: "halo",
    title: "Halo",
    note: "Four masked rings turning behind the orb at different speeds and directions, in gold and silver, with the orb breathing inside them. Adapted from a loader; the ring stack is the same, the monochrome and the text are not.",
    render: <HaloOrb />,
  },
];

export default function OrbPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center px-6 py-10"
      style={{ background: GROUND }}
    >
      <header className="mb-10 flex w-full max-w-[560px] flex-col gap-1.5 text-center">
        <h1 className="text-[22px] font-medium tracking-[-0.4px] text-[#0b0b0b]">
          Orb
        </h1>
        <p className="text-[14px] leading-[20px] text-[#6b6b73]">
          One orb, treated several ways. The orb itself is Figma 405:8740 and
          is identical in every cell — only what happens around it changes.
        </p>
      </header>

      {/* Two to a row, so a treatment can be watched against its neighbour
          rather than remembered from further up the page — which is the
          only thing this bench exists to make possible. One column below
          the breakpoint, because two 340px cells plus their gutters do not
          fit a phone and a squeezed tile tells you nothing.

          Each tile gets a fixed minimum height so the row does not step
          when one treatment's field is taller than the other's. */}
      <div className="grid w-full max-w-[920px] grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-2">
        {VARIANTS.map((v) => (
          <section
            key={v.id}
            className="flex flex-col items-center justify-start gap-5"
          >
            <div
              data-variant={v.id}
              className="flex min-h-[380px] items-center justify-center"
            >
              {v.render}
            </div>
            <div className="flex max-w-[400px] flex-col gap-1 text-center">
              <h2 className="text-[15px] font-medium text-[#0b0b0b]">{v.title}</h2>
              <p className="text-[13px] leading-[18px] text-[#6b6b73]">
                {v.note}
              </p>
            </div>
          </section>
        ))}
      </div>

      {/* The orb on its own, at the node's natural size, so a treatment can
          always be checked against the untouched thing. */}
      <section className="mt-16 flex flex-col items-center gap-4">
        {/* The wrapper is exactly the orb's box, so a probe can clip to it
            and compare the result against the node's own export. */}
        <div data-orb-untreated style={{ width: 137.685, height: 137.685 }}>
          <OrbV2 />
        </div>
        <p className="text-[13px] text-[#9a9aa2]">
          Untreated — 137.685px, the node&rsquo;s own size
        </p>
      </section>
    </main>
  );
}
