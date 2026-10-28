"use client";

import { useEffect, useState, type ComponentType } from "react";
import { usePathname } from "@/i18n/navigation";
import { afterLcp } from "@/lib/after-lcp";
import { getExperience, useIsReduced } from "@/lib/experience";
import { appStore, useAppStore } from "@/lib/store";
import { prefersReducedMotion } from "@/motion/reduced";

/**
 * Carga el motor 3D (three, R3F, escenas) DESPUÉS del LCP y fuera del JS inicial. Igual que
 * `MotionLoader`: el `import()` es manual y está protegido; si falla (red, bloqueo, sin WebGL) el
 * sitio sigue siendo el HTML completo con las transiciones DOM del change 03.
 *
 * Cadena de fallbacks (change 09, design D4): el motor SOLO se descarga con el modo `full` y con algún
 * backend disponible. Con movimiento reducido, con `fallback2d` por fps, o sin WebGPU ni WebGL2 (la
 * comprobación ocurre ANTES del `import()`, con `backendSupport()` cacheado) el chunk 3D nunca se pide y
 * cada fase muestra su ilustración 2D. Si el modo deja de ser `full` con el motor ya montado (el usuario
 * activa movimiento reducido, o los fps caen), se desmonta y libera su contexto. Una pérdida de contexto
 * NO lo desmonta: `WebglRoot` gestiona el reintento y el modo temporal `fallback2d`.
 *
 * `/motion` (change 08) NO lo carga: la página no tiene escenas 3D propias y sus demos viven en
 * escenarios aislados (iframes) que cargan el motor solo al primer Replay. Al salir de `/motion` hacia
 * otra ruta del sitio, el motor se carga con normalidad.
 */
export function WebglLoader() {
  const [Root, setRoot] = useState<ComponentType | null>(null);
  const pathname = usePathname();
  const reduced = useIsReduced();
  const fpsDegraded = useAppStore((s) => s.experience.fpsDegraded);
  const backend = useAppStore((s) => s.graphics.backend);
  const blocked = pathname === "/motion" || pathname.startsWith("/motion/");
  const allowed = !blocked && !reduced && !fpsDegraded && backend !== "none";

  useEffect(() => {
    if (!allowed || Root) return;
    let cancelled = false;
    void afterLcp()
      .then(async () => {
        if (cancelled) return null;
        // El modo pudo cambiar mientras se esperaba al LCP (elección manual, sincronización del sistema).
        if (getExperience() !== "full" || prefersReducedMotion()) return null;
        const { detectBackend } = await import("@/webgl/core/backend");
        if ((await detectBackend()) === "none") {
          appStore.getState().setBackend("none");
          return null;
        }
        return import("@/webgl/WebglRoot");
      })
      .then((m) => {
        if (m && !cancelled) setRoot(() => m.default);
      })
      .catch(() => {
        appStore.getState().setBackend("none");
      });
    return () => {
      cancelled = true;
    };
  }, [allowed, Root]);

  return Root && allowed ? <Root /> : null;
}
