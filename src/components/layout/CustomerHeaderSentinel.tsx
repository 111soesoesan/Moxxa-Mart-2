"use client";

import { useEffect, useRef } from "react";
import { useCustomerFloatingUi } from "@/context/CustomerFloatingUiContext";

/**
 * Normal-flow sentinel directly above the sticky main `<header>`.
 * When it has scrolled upward out of view (`bottom <= 0`), the main bar is elevated / “floating”.
 * IntersectionObserver + scroll/resize ticks keep this accurate across viewports and zoom.
 */
export function CustomerHeaderSentinel() {
  const ref = useRef<HTMLDivElement>(null);
  const floating = useCustomerFloatingUi();
  const setElevated = floating?.setMainNavElevated;

  useEffect(() => {
    const el = ref.current;
    if (!el || !setElevated) return;

    const tick = () => {
      const r = el.getBoundingClientRect();
      setElevated(r.bottom <= 0);
    };

    const io = new IntersectionObserver(tick, {
      root: null,
      rootMargin: "0px",
      threshold: [0, 0.01, 0.5, 1],
    });

    io.observe(el);
    tick();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", tick, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", tick);
      setElevated(false);
    };
  }, [setElevated]);

  return (
    <div
      ref={ref}
      className="pointer-events-none h-2.5 w-full shrink-0"
      aria-hidden
    />
  );
}
