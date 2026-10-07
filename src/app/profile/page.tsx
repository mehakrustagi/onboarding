import ProfileScreen from "@/screens/ProfileScreen";
import ScreenHeader from "@/components/ScreenHeader";

export default function ProfilePage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <ScreenHeader
        title="Profile"
        description="WorldPass card on its pedestal, with the next card peeking in from the right. Built block by block — content cards below are still shells."
      />
      <ProfileScreen />
    </main>
  );
}
