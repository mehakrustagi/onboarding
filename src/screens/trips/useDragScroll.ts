"use client";

import { useEffect, useRef } from "react";

/* Grab-and-pull for the horizontal strips.
 *
 * The action rows and the category tabs are both wider than the frame on
 * purpose — Figma clips them so the row reads as having more in it. On a
 * phone that is enough, because a finger drag scrolls an overflow-x box
 * natively. With a mouse there is nothing to do: the strips have no
 * scrollbar (by design) and a plain mouse has no horizontal wheel, so the
 * clipped pills were unreachable on the one device this prototype is
 * actually reviewed on.
 *
 * Touch is left alone deliberately. The native behaviour already has
 * momentum, rubber-banding and the right relationship to the vertical
 * scroller underneath, and none of that is worth reimplementing.
 */
export function useDragScroll<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let down = false;
    let dragging = false;
    let startX = 0;
    let startLeft = 0;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      down = true;
      dragging = false;
      startX = e.clientX;
      startLeft = el.scrollLeft;
    };

    const onMove = (e: PointerEvent) => {
      if (!down) return;
      const dx = e.clientX - startX;
      /* 4px of slop before it counts as a drag, so a slightly imprecise
         tap on a pill still registers as a tap. */
      if (!dragging) {
        if (Math.abs(dx) < 4) return;
        dragging = true;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
      }
      el.scrollLeft = startLeft - dx;
      e.preventDefault();
    };

    const onUp = (e: PointerEvent) => {
      if (dragging && el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
      down = false;
      el.style.cursor = "";
    };

    /* Capture phase: a drag that ends over a pill still fires a click on
       it, and opening a panel because someone scrolled is worse than the
       scroll not working at all. The flag clears on the next pointerdown,
       so a real tap after a drag is unaffected. */
    const onClick = (e: MouseEvent) => {
      if (!dragging) return;
      e.preventDefault();
      e.stopPropagation();
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("click", onClick, true);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("click", onClick, true);
    };
  }, []);

  return ref;
}
