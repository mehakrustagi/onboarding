import Link from "next/link";

/* Header for the prototype routes.
 *
 * These pages are review surfaces, not product — someone opening a Vercel
 * preview link needs to know which variant they're looking at and how to
 * reach the others without editing the URL. Kept quiet and grey so it
 * frames the phone rather than competing with it. */

const ROUTES = [
  { href: "/payment-transition", label: "Scattered" },
  { href: "/payment-transition-v2", label: "Reel" },
  { href: "/post-payment", label: "Post-payment" },
  { href: "/profile", label: "Profile" },
  { href: "/thinking-mode", label: "Thinking mode" },
] as const;

export default function ScreenHeader({
  title,
  description,
  active,
}: {
  title: string;
  description: string;
  /** Href of the current route, so it can be marked in the nav. */
  active: string;
}) {
  return (
    <header className="mb-8 flex w-full max-w-[560px] flex-col items-center gap-4 text-center">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[22px] font-medium tracking-[-0.4px] text-[#0b0b0b]">
          {title}
        </h1>
        <p className="text-[14px] leading-[20px] text-[#6b6b73]">
          {description}
        </p>
      </div>

      <nav className="flex flex-wrap items-center justify-center gap-1.5">
        {ROUTES.map((r) => {
          const isActive = r.href === active;
          return (
            <Link
              key={r.href}
              href={r.href}
              aria-current={isActive ? "page" : undefined}
              className={
                "rounded-full px-3.5 py-1.5 text-[13px] transition-colors " +
                (isActive
                  ? "bg-[#0b0b0b] text-white"
                  : "bg-black/5 text-[#4b4b53] hover:bg-black/10")
              }
            >
              {r.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
