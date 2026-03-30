"use client";

import NextTopLoader from "nextjs-toploader";

/** Thin primary bar at the top of the viewport during App Router navigations. */
export function NavigationTopLoader() {
  return (
    <NextTopLoader
      color="var(--primary)"
      height={2}
      showSpinner={false}
      shadow={false}
      crawlSpeed={150}
      speed={280}
      easing="ease"
      zIndex={2147483000}
      showForHashAnchor={false}
    />
  );
}
