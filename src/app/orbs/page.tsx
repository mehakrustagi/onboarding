import CoreOrb from "@/screens/orb/CoreOrb";
import { ORB_ART } from "@/screens/orb/orbArt";

/* The ten orbs, each wearing the same treatment.
 *
 * One animation, ten subjects. Nothing is chosen per orb: the particles are
 * sampled out of each orb's own export, so orb 2's grains are its blues and
 * orb 7's are its oranges without anyone picking a palette, and the wash
 * behind the glass is that same image blurred. Add an eleventh to
 * `ORB_ART` and it arrives here already coloured.
 *
 * No dials. `/test-orb` is where the treatments are compared and the
 * sliders are open; this is where the chosen one is looked at. Both read
 * `CORE_DEFAULTS`, so there is no second copy of the settings to drift. */
export default function OrbsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-white px-6 py-12">
      <h1 className="mb-12 text-[22px] font-medium tracking-[-0.4px] text-[#0b0b0b]">
        Orbs
      </h1>

      <div className="grid w-full max-w-[980px] grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-5">
        {ORB_ART.map((a) => (
          <div
            key={a.id}
            data-orb={a.id}
            className="flex items-center justify-center"
          >
            <CoreOrb skin="glass" art={a} orb={168} controls={false} />
          </div>
        ))}
      </div>
    </main>
  );
}
