/* Every prototype route, in one place.
 *
 * There used to be two lists that had already drifted apart — the grid on
 * the home page and the pill row inside `ScreenHeader` — and six routes that
 * appeared in neither, reachable only by typing the URL. The navbar is the
 * only consumer now, so a route is either here and linked from every page,
 * or it is deliberately unlisted.
 *
 * Deliberately unlisted: `/payment-transition` (the scattered-cards first
 * pass, superseded by the reel) and `/liquid-glass-button` (the loyalty CTA
 * uses the shared NativeAIButton instead). Both still resolve — they are
 * only off the nav. */

export type NavRoute = {
  href: string;
  /** Short — ten of these share one row on a wide screen. */
  label: string;
  /** One line. Only the mobile menu has room to show it. */
  blurb: string;
  /** Flows are screens you watch; benches are one component on a ground. */
  kind: "flow" | "bench";
};

export const NAV_ROUTES: NavRoute[] = [
  {
    href: "/",
    label: "Onboarding",
    blurb: "The seven-screen intro",
    kind: "flow",
  },
  {
    href: "/payment-transition-v2",
    label: "Payment",
    blurb: "Photos reel in, then the ask",
    kind: "flow",
  },
  {
    href: "/post-payment",
    label: "Post-payment",
    blurb: "Frosted wash into success",
    kind: "flow",
  },
  {
    href: "/trips",
    label: "Trips",
    blurb: "Success knocks over to MyTrip",
    kind: "flow",
  },
  {
    href: "/trip-vault",
    label: "Vault",
    blurb: "Empty states, and the upload that fills them",
    kind: "flow",
  },
  {
    href: "/profile",
    label: "Profile",
    blurb: "WorldPass card on its pedestal",
    kind: "flow",
  },
  {
    href: "/loyalty",
    label: "Loyalty",
    blurb: "A radial dial turns rupees into points",
    kind: "flow",
  },
  {
    href: "/thinking-mode",
    label: "Thinking",
    blurb: "The agent tree assembles under the message",
    kind: "flow",
  },
  {
    href: "/orbs",
    label: "Orbs",
    blurb: "The orb as it is meant to ship",
    kind: "bench",
  },
  {
    href: "/test-orb",
    label: "Orb tests",
    blurb: "Six treatments side by side, with the dials open",
    kind: "bench",
  },
  {
    href: "/native-ai-button",
    label: "Button",
    blurb: "The Native AI gradient pill, on its Figma ground",
    kind: "bench",
  },
  {
    href: "/preview",
    label: "Components",
    blurb: "Orb, aura and the tilting card",
    kind: "bench",
  },
];

/** Exact match throughout — every route here is a leaf, and prefix matching
 *  would light up "Onboarding" on all of them. */
export function isActiveRoute(href: string, pathname: string) {
  return href === pathname;
}

export function routeLabel(pathname: string) {
  return NAV_ROUTES.find((r) => r.href === pathname)?.label;
}
