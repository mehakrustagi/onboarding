import ThinkingModeScreen from "@/screens/ThinkingModeScreen";
import ScreenHeader from "@/components/ScreenHeader";

export default function ThinkingModePage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <ScreenHeader
        title="Thinking mode"
        description="Pre-thinking: the message is sent and the agent tree assembles under it — orb, step lines, then sub-agents hung off drawing connectors."
        active="/thinking-mode"
      />
      <ThinkingModeScreen />
    </main>
  );
}
