import LoyaltyScreen from "@/screens/LoyaltyScreen";
import ScreenHeader from "@/components/ScreenHeader";

export default function LoyaltyPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <ScreenHeader
        title="Loyalty"
        description="Convert rupees to Maharaja points. Swipe the radial dial — it has detents you can feel and hear — then Convert pulls the points up through the gem and into the card, and the whole screen settles down onto the result."
        active="/loyalty"
      />
      <LoyaltyScreen />
    </main>
  );
}
