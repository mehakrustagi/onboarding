import PostPaymentScreen from "@/screens/PostPaymentScreen";
import ScreenHeader from "@/components/ScreenHeader";

export default function PostPaymentPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <ScreenHeader
        title="Post-payment"
        description="A frosted veil washes up over the payment card and resolves into the success state. The card is still rendered underneath — the veil samples it rather than replacing it."
      />
      <PostPaymentScreen />
    </main>
  );
}
