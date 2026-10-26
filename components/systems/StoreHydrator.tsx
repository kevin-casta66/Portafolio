"use client";

import { useEffect } from "react";
import { appStore, type Theme } from "@/lib/store";

/** Lee las preferencias persistidas tras la hidratación y las vuelca al store global. */
export function StoreHydrator() {
  useEffect(() => {
    const dom = document.documentElement.getAttribute("data-theme");
    appStore
      .getState()
      .hydrate(dom === "light" || dom === "dark" ? (dom satisfies Theme) : undefined);
  }, []);
  return null;
}
