import PaymentTransitionFlowV2 from "@/screens/PaymentTransitionFlowV2";
import ScreenHeader from "@/components/ScreenHeader";

export default function PaymentTransitionV2Page() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <ScreenHeader
        title="Payment transition"
        description="The trip details fold into the Atlys pass, four photos arrive as one vertical reel and converge on the folder, then the screen dims and lifts and the payment ask is put to you."
      />
      <PaymentTransitionFlowV2 />
    </main>
  );
}
