/* Class-name joiner.
 *
 * The Aceternity components this project borrows are written against a `cn`
 * built from clsx + tailwind-merge. Neither is a dependency here and neither
 * earns one for what we actually ask of it: nothing in this repo passes two
 * CONFLICTING Tailwind classes through `cn` and relies on the later one
 * winning, which is the only thing tailwind-merge buys you. If that ever
 * starts happening, install it and swap this body out — every call site
 * already has the right shape. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
