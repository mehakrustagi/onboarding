import AgentOrb from "@/components/AgentOrb";
import AuraGlow from "@/components/AuraGlow";
import Card3D from "@/components/Card3D";

export default function Preview() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-24 bg-white p-10">
      <section className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-10">
          <AgentOrb size={60} />
          <AgentOrb size={90} />
          <AgentOrb size={140} />
          <AgentOrb size={200} />
        </div>
        <div className="text-sm text-gray-500">AgentOrb — 60 / 90 / 140 / 200</div>
      </section>

      <section className="flex flex-col items-center gap-4">
        <div className="relative flex h-[300px] w-[640px] items-center justify-center rounded-xl bg-[#f3f4f6]">
          <AuraGlow width={640} />
        </div>
        <div className="text-sm text-gray-500">AuraGlow — 640×280 (Figma default)</div>
      </section>

      <section className="flex flex-col items-center gap-4">
        <div className="relative flex h-[400px] w-[440px] items-center justify-center overflow-hidden rounded-xl bg-white">
          <AuraGlow width={440} style={{ position: "absolute" }} />
          <span className="relative text-lg font-medium">content on top of aura</span>
        </div>
        <div className="text-sm text-gray-500">AuraGlow used as background under content</div>
      </section>

      <section className="flex flex-col items-center gap-4">
        <div className="flex items-end gap-10 p-6">
          <Card3D>
            <p className="absolute bottom-5 left-5 text-[19.5px] font-medium leading-[22.8px] tracking-[-0.04em] text-white">
              02%
            </p>
          </Card3D>
          <Card3D>
            <p className="absolute bottom-5 left-5 text-[19.5px] font-medium leading-[22.8px] tracking-[-0.04em] text-white">
              48%
            </p>
          </Card3D>
        </div>
        <div className="text-sm text-gray-500">Card3D — hover to tilt</div>
      </section>
    </main>
  );
}
