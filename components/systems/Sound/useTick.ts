"use client";

import { useEffect, useRef } from "react";
import { subscribeClock } from "@/motion/shared";

/**
 * Ejecuta `callback` en cada tick del reloj único (el mismo de Lenis, GSAP y el 3D) mientras
 * `active`. Así los vúmetros y las barras de «now playing» leen el nivel del audio sin estado de
 * React por frame y sin bucle de frame propio. Si el reloj aún no se ha publicado (motion carga tras
 * el LCP), espera a que aparezca; el nivel simplemente no se mueve hasta entonces.
 */
export function useTick(callback: () => void, active = true): void {
  const latest = useRef(callback);
  useEffect(() => {
    latest.current = callback;
  });

  useEffect(() => {
    if (!active) return;
    let stopClock: (() => void) | null = null;
    const run = () => latest.current();
    const unsubscribe = subscribeClock((clock) => {
      stopClock?.();
      stopClock = clock ? clock.subscribe(run, 60) : null;
    });
    return () => {
      unsubscribe();
      stopClock?.();
    };
  }, [active]);
}
