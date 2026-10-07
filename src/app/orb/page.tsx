import RippleOrb from "@/screens/orb/RippleOrb";
import TwirlOrb from "@/screens/orb/TwirlOrb";
import CoreOrb from "@/screens/orb/CoreOrb";
import HaloOrb from "@/screens/orb/HaloOrb";
import GradientOrb from "@/screens/orb/GradientOrb";
import RimOrb from "@/screens/orb/RimOrb";
import OrbV2 from "@/components/OrbV2";

/* Bench for the orb, one cell per treatment.
 *
 * Names and prototypes only. Each treatment used to carry a paragraph
 * explaining what it does, and they were worth writing — but they are
 * reasoning about the build, and the place for that is the component, not a
 * page whose entire job is letting you watch six things side by side. Every
 * one of them survives at the top of its own file.
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
    render: <RippleOrb />,
  },
  {
    id: "twirl",
    title: "Twirl",
    render: <TwirlOrb />,
  },
  {
    id: "mush",
    title: "Swirl",
    render: <GradientOrb />,
  },
  {
    id: "rims",
    title: "Rims",
    render: <RimOrb />,
  },
  {
    id: "core",
    title: "Core",
    render: <CoreOrb />,
  },
  {
    id: "halo",
    title: "Halo",
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
      <div className="grid w-full max-w-[920px] grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-2">
        {VARIANTS.map((v) => (
          <section
            key={v.id}
            className="flex flex-col items-center justify-start gap-3"
          >
            <div
              data-variant={v.id}
              className="flex min-h-[360px] items-center justify-center"
            >
              {v.render}
            </div>
            <h2 className="text-[15px] font-medium text-[#0b0b0b]">
              {v.title}
            </h2>
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
