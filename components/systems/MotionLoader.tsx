"use client";

import { useEffect, useState, type ComponentType } from "react";
import { afterLcp } from "@/lib/after-lcp";

/**
 * Carga la capa de movimiento (GSAP, plugins, Lenis…) DESPUÉS del LCP y fuera del JS inicial. El
 * `import()` es manual y está protegido: si el chunk no carga (red, bloqueo), no se lanza ningún error
 * a React y el sitio sigue siendo el HTML estático del change 02, completo y operable.
 */
export function MotionLoader() {
  const [Provider, setProvider] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void afterLcp()
      .then(() => import("./MotionProvider"))
      .then((m) => {
        if (!cancelled) setProvider(() => m.default);
      })
      .catch(() => {
        /* sin capa de movimiento: el contenido estático sigue intacto */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return Provider ? <Provider /> : null;
}
