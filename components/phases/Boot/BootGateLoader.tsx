"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "@/i18n/navigation";
import { appStore } from "@/lib/store";
import { BOOTED_KEY } from "@/motion/config";
import { decideMode } from "./boot-controller";

/**
 * Carga la puerta de arranque en su propio chunk y SOLO si va a mostrarse (home, sin Vista Rápida,
 * sin ancla de sección). Si el chunk no se puede cargar, la cortina CSS se retira al instante y el
 * contenido SSR queda visible: la puerta nunca puede dejar la página tapada.
 */
export function BootGateLoader({ projectCount }: { projectCount: number }) {
  const pathname = usePathname();
  const [Gate, setGate] = useState<ComponentType<{ projectCount: number }> | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    let visited = false;
    try {
      visited = window.sessionStorage.getItem(BOOTED_KEY) === "1";
    } catch {
      /* sin almacenamiento de sesión: secuencia completa */
    }
    const mode = decideMode({
      pathname,
      search: window.location.search,
      hash: window.location.hash,
      visitedThisSession: visited,
    });
    if (mode === "off") {
      root.classList.remove("boot-pending");
      appStore.getState().setBootDone(true);
      return;
    }
    let cancelled = false;
    import("./BootGate")
      .then((m) => {
        if (!cancelled) setGate(() => m.BootGate);
      })
      .catch(() => {
        root.classList.remove("boot-pending");
        appStore.getState().setBootDone(true);
      });
    return () => {
      cancelled = true;
    };
    // Solo al montar: la puerta se decide en la carga inicial, no en cada navegación.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return Gate ? <Gate projectCount={projectCount} /> : null;
}
