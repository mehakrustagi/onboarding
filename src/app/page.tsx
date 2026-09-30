import OnboardingFlow from "@/screens/OnboardingFlow";
import Link from "next/link";

/* Prototype routes reachable from here. The home page renders the
 * onboarding flow and nothing else, so without these the payment screens
 * are only findable by typing the URL — which is no use to anyone opening
 * a preview link. */
const SCREENS = [
  {
    href: "/payment-transition",
    label: "Payment transition",
    note: "Scattered cards",
  },
  {
    href: "/payment-transition-v2",
    label: "Payment transition — reel",
    note: "Vertical strip",
  },
  {
    href: "/post-payment",
    label: "Post-payment",
    note: "Wash + success",
  },
  {
    href: "/profile",
    label: "Profile",
    note: "WorldPass card",
  },
  {
    href: "/native-ai-button",
    label: "Native AI button",
    note: "Liquid gradient",
  },
  {
    href: "/liquid-glass-button",
    label: "Liquid glass button",
    note: "Bead lens on tap",
  },
  {
    href: "/loyalty",
    label: "Loyalty",
    note: "Radial dial → points",
  },
] as const;

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <OnboardingFlow />

      <nav className="mt-10 flex w-full max-w-[560px] flex-col items-center gap-3">
        <p className="text-[12px] uppercase tracking-[0.88px] text-[#9a9aa2]">
          Other screens
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SCREENS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="group flex flex-col items-center gap-0.5 rounded-2xl bg-black/5 px-4 py-2.5 transition-colors hover:bg-black/10"
            >
              <span className="text-[13px] font-medium text-[#0b0b0b]">
                {s.label}
              </span>
              <span className="text-[11px] text-[#6b6b73]">{s.note}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
