"use client";

import { useSyncExternalStore } from "react";

/**
 * SSR-safe hook that tracks a CSS media query via `useSyncExternalStore`.
 * Returns `false` during server rendering, then the live match on the client.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
