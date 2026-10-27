"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "@/i18n/navigation";
import { afterLcp } from "@/lib/after-lcp";
import { appStore } from "@/lib/store";

/**
 * Carga el motor 3D (three, R3F, escenas) DESPUÉS del LCP y fuera del JS inicial. Igual que
 * `MotionLoader`: el `import()` es manual y está protegido; si falla (red, bloqueo, sin WebGL) el
 * sitio sigue siendo el HTML completo con las transiciones DOM del change 03.
 *
 * `/motion` (change 08) NO lo carga: la página no tiene escenas 3D propias y sus demos viven en
 * escenarios aislados (iframes) que cargan el motor solo al primer Replay. Al salir de `/motion` hacia
 * otra ruta del sitio, el motor se carga con normalidad.
 */
export function WebglLoader() {
  const [Root, setRoot] = useState<ComponentType | null>(null);
  const pathname = usePathname();
  const blocked = pathname === "/motion" || pathname.startsWith("/motion/");

  useEffect(() => {
    if (blocked || Root) return;
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
  }, [blocked, Root]);

  return Root ? <Root /> : null;
}
