"use client";

import { useEffect, useState, type ComponentType } from "react";
import { afterLcp } from "@/lib/after-lcp";

/**
 * Carga Hold-to-Execute (anillo, región en vivo y listeners) DESPUÉS del LCP y fuera del JS inicial.
 * Igual que `MotionLoader`: si el chunk no carga, las tarjetas siguen abriendo el caso con su enlace
 * «Caso de estudio» (un enlace normal): el hold solo mejora el gesto.
 */
export function HoldLoader() {
  const [Hold, setHold] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void afterLcp()
      .then(() => import("./HoldToExecute"))
      .then((m) => {
        if (!cancelled) setHold(() => m.default);
      })
      .catch(() => {
        /* sin hold: el enlace de la tarjeta sigue funcionando */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return Hold ? <Hold /> : null;
}
