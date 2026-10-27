"use client";

import { useEffect } from "react";
import { emit, on } from "@/lib/events";
import { appStore, type Theme } from "@/lib/store";

/**
 * Lee las preferencias persistidas tras la hidratación y las vuelca al store global, y conecta el
 * bus de eventos con el store: `achievement:unlock` (Hold-to-Execute, 404, terminal, Debug…) queda
 * registrado aunque el sistema de avisos de logros aún no se haya descargado.
 */
export function StoreHydrator() {
  useEffect(() => {
    const dom = document.documentElement.getAttribute("data-theme");
    appStore
      .getState()
      .hydrate(dom === "light" || dom === "dark" ? (dom satisfies Theme) : undefined);
    const stopAchievements = on("achievement:unlock", ({ id }) => {
      appStore.getState().unlockAchievement(id);
    });
    // `data-tier` permite que el CSS (vidrio, refracción) se adapte a la calidad vigente.
    const root = document.documentElement;
    const syncTier = () => {
      const { tier } = appStore.getState().graphics;
      if (tier === "auto") delete root.dataset.tier;
      else root.dataset.tier = tier;
    };
    syncTier();
    // Gancho de pruebas en navegador (solo con `?motionTest`, como `__portafolioMotion` y `__portafolioWebgl`).
    if (new URLSearchParams(window.location.search).has("motionTest")) {
      (window as unknown as { __portafolioApp?: unknown }).__portafolioApp = { store: appStore, emit };
    }
    const stopTier = appStore.subscribe((state, prev) => {
      if (state.graphics.tier !== prev.graphics.tier) syncTier();
    });
    return () => {
      stopAchievements();
      stopTier();
      delete (window as unknown as { __portafolioApp?: unknown }).__portafolioApp;
    };
  }, []);
  return null;
}
