"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "@/i18n/navigation";
import { startMotionRuntime, type MotionRuntime } from "@/motion/runtime";

/**
 * Monta la capa de movimiento (reloj único, scroll suave, fase, coreografías, transiciones). Se
 * carga como chunk diferido desde `MotionLoader`, después del LCP. Al cambiar de ruta recrea solo lo
 * que depende de la página; al desmontarse libera todo (ScrollTriggers, listeners, capas).
 */
export default function MotionProvider() {
  const pathname = usePathname();
  const runtime = useRef<MotionRuntime | null>(null);
  const lastPath = useRef(pathname);

  useEffect(() => {
    runtime.current = startMotionRuntime();
    return () => {
      runtime.current?.destroy();
      runtime.current = null;
    };
  }, []);

  useEffect(() => {
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    runtime.current?.remountPage();
  }, [pathname]);

  return null;
}
