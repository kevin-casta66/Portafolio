"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

const subscribe = (notify: () => void) => {
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", notify);
  return () => list.removeEventListener("change", notify);
};

/** `true` con la preferencia de movimiento reducido (en el servidor, `false`: el HTML es estático igualmente). */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
