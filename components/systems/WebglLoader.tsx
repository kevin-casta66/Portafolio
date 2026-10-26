"use client";

import { useEffect, useState, type ComponentType } from "react";
import { afterLcp } from "@/lib/after-lcp";
import { appStore } from "@/lib/store";

/**
 * Carga el motor 3D (three, R3F, escenas) DESPUÉS del LCP y fuera del JS inicial. Igual que
 * `MotionLoader`: el `import()` es manual y está protegido; si falla (red, bloqueo, sin WebGL) el
 * sitio sigue siendo el HTML completo con las transiciones DOM del change 03.
 */
export function WebglLoader() {
  const [Root, setRoot] = useState<ComponentType | null>(null);

  useEffect(() => {
    let cancelled = false;
    void afterLcp()
      .then(() => import("@/webgl/WebglRoot"))
      .then((m) => {
        if (!cancelled) setRoot(() => m.default);
      })
      .catch(() => {
        appStore.getState().setBackend("none");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return Root ? <Root /> : null;
}
