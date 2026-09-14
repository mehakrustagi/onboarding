import TripVaultScreen from "@/screens/TripVaultScreen";
import ScreenHeader from "@/components/ScreenHeader";

export default function TripVaultPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <ScreenHeader
        title="Trip Vault (KYC Not Done)"
        description="The vault before anything is in it, drawn as a loading state that is not loading — two versions of the empty screen, and the upload flow that fills it: picker, confirm, extract, and the booking landing in Tuesday's row."
        active="/trip-vault"
      />
      <TripVaultScreen />
    </main>
  );
}
