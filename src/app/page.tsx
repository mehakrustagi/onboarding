import OnboardingFlow from "@/screens/OnboardingFlow";

/* The onboarding flow, and nothing else.
 *
 * This page used to end in a grid of links to the other prototype routes,
 * because without it they were only findable by typing the URL. `SiteNav` in
 * the root layout does that job now, on every route rather than just this
 * one, so the grid was a second list of the same links to keep in step — and
 * it had already fallen out of step with the one in `ScreenHeader`. */
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[var(--bg-page)] px-6 py-10">
      <OnboardingFlow />
    </main>
  );
}
