"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

import { NAV_ROUTES, isActiveRoute, routeLabel } from "@/lib/routes";
import { cn } from "@/lib/cn";

/* The route switcher, as a notch rather than a bar.
 *
 * A top navbar was the first attempt and it was wrong for this site: every
 * route here is a phone mock being judged on its own motion and colour, and
 * a full-width bar sat in the frame of all of them, pushed the mock down,
 * and put its own grey above a screen whose ground is the thing under
 * review. So it works the way the Next dev indicator does — one small mark
 * in a corner, and everything else only when you ask for it.
 *
 * Dark on purpose. These prototypes are mostly light, so tooling that is
 * also light reads as part of the design; black reads as something sitting
 * on top of it, which is what it is.
 *
 * Bottom RIGHT, and that corner is not free by accident — `CheckpointPanel`
 * on the onboarding route is `fixed right-4 top-1/2` at `max-h-[80vh]`, so
 * it is vertically centred and leaves roughly the bottom tenth clear. The
 * notch is 44px and sits in it. Move either one and check the other. */

const PANEL_W = 288;

/* Opens from the corner it is anchored to, so it reads as the notch
   unfolding rather than a panel arriving from nowhere. */
const ORIGIN = "bottom right";

export default function RouteSwitcher() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  const current = routeLabel(pathname);

  /* Escape, and a click anywhere else. Both are subscriptions to something
     outside React, which is the case an effect is actually for — the sheet
     is closed from the link's own onClick, not from watching the pathname. */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };

    window.addEventListener("keydown", onKey);
    /* Capture phase: the prototypes stop propagation on their own taps —
       several of them advance a phase on any click on the screen — so a
       bubble-phase listener never hears the click that should close this. */
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="fixed bottom-4 right-4 z-[70] flex flex-col items-end"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            id="route-switcher-panel"
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 4 }}
            transition={
              reduced
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
            }
            style={{ width: PANEL_W, transformOrigin: ORIGIN }}
            className="mb-2 overflow-hidden rounded-2xl bg-[#0b0b0b] text-white shadow-[0_18px_60px_-12px_rgba(0,0,0,0.45)]"
          >
            {/* Where you are, stated rather than implied by a highlight you
                have to hunt for in the list below. */}
            <div className="flex items-baseline justify-between px-4 py-3">
              <span className="text-[13px] text-white/45">Screen</span>
              <span className="text-[13px] font-medium">
                {current ?? "Unlisted"}
              </span>
            </div>

            <div className="h-px bg-white/10" />

            <nav
              aria-label="Prototype routes"
              /* Tall enough that all ten rows fit outright on a laptop —
                 at 420px the last two sat below the fold of a panel that
                 gives no sign it scrolls. It still caps against the
                 viewport, so a short window scrolls rather than overflows. */
              className="max-h-[min(72vh,620px)] overflow-y-auto p-1.5"
            >
              {NAV_ROUTES.map((route, i) => {
                const active = isActiveRoute(route.href, pathname);
                /* Flows are screens you watch; benches are one component on
                   the ground it was measured against. A real split, so it
                   gets a rule — the same one the panel header gets. */
                const startsBenches =
                  route.kind === "bench" && NAV_ROUTES[i - 1]?.kind === "flow";

                return (
                  <div key={route.href}>
                    {startsBenches && (
                      <div className="my-1.5 h-px bg-white/10" aria-hidden />
                    )}
                    <Link
                      href={route.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex flex-col gap-0.5 rounded-xl px-2.5 py-2 transition-colors",
                        active ? "bg-white/10" : "hover:bg-white/[0.06]",
                      )}
                    >
                      <span
                        className={cn(
                          "text-[13px] font-medium",
                          active ? "text-white" : "text-white/85",
                        )}
                      >
                        {route.label}
                      </span>
                      <span className="text-[12px] leading-[15px] text-white/40">
                        {route.blurb}
                      </span>
                    </Link>
                  </div>
                );
              })}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close screens" : "Switch screen"}
        aria-expanded={open}
        aria-controls="route-switcher-panel"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0b0b0b] text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.45)] transition-[background-color,transform] hover:bg-[#1c1c1c] active:scale-95"
      >
        {/* Three rules that become an X — the same glyph the bar used, kept
            because it is the one shape everyone already reads as "menu". */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line
              x1="3"
              y1="5"
              x2="15"
              y2="5"
              className="origin-center transition-transform duration-200"
              style={{
                transform: open
                  ? "translateY(4px) rotate(45deg)"
                  : "translateY(0) rotate(0)",
              }}
            />
            <line
              x1="3"
              y1="9"
              x2="15"
              y2="9"
              className="transition-opacity duration-150"
              style={{ opacity: open ? 0 : 1 }}
            />
            <line
              x1="3"
              y1="13"
              x2="15"
              y2="13"
              className="origin-center transition-transform duration-200"
              style={{
                transform: open
                  ? "translateY(-4px) rotate(-45deg)"
                  : "translateY(0) rotate(0)",
              }}
            />
          </g>
        </svg>
      </button>
    </div>
  );
}
