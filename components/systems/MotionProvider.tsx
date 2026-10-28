"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { startMotionRuntime, type MotionRuntime } from "@/motion/runtime";

/**
 * Monta la capa de movimiento (reloj único, scroll suave, fase, coreografías, transiciones). Se
 * carga como chunk diferido desde `MotionLoader`, después del LCP. Al cambiar de ruta recrea solo lo
 * que depende de la página; al desmontarse libera todo (ScrollTriggers, listeners, capas).
 *
 * La Vista Rápida (`?view=quick`) no cambia la ruta pero sí el DOM: el home cambia sus secciones por
 * el currículum y, al volver, monta secciones NUEVAS. Por eso entrar o salir de ella también recrea
 * la página; si no, las coreografías y transiciones seguirían enganchadas a los nodos ya retirados.
 */
export default function MotionProvider() {
  const pathname = usePathname();
  const runtime = useRef<MotionRuntime | null>(null);
  const view = useSearchParams().get("view");
  const lastPage = useRef(`${pathname}|${view}`);

  useEffect(() => {
    runtime.current = startMotionRuntime();
    return () => {
      runtime.current?.destroy();
      runtime.current = null;
    };
  }, []);

  useEffect(() => {
    const page = `${pathname}|${view}`;
    if (lastPage.current === page) return;
    lastPage.current = page;
    runtime.current?.remountPage();
  }, [pathname, view]);

  return null;
}
