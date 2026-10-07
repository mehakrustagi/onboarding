import TripsScreen from "@/screens/TripsScreen";
import ScreenHeader from "@/components/ScreenHeader";

export default function TripsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <ScreenHeader
        title="Trips"
        description="Payment success hands off to MyTrip on an iPhone-style knock — the phone rattles, the slab wobbles, and the colour carries the new screen up from the bottom edge. MyTrip itself is a first pass above the fold."
      />
      <TripsScreen />
    </main>
  );
}
