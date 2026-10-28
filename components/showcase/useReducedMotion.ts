"use client";

import { useIsReduced } from "@/lib/experience";

/**
 * `true` con el modo de movimiento reducido (preferencia del sistema O elección manual): se apoya en el
 * modo de experiencia central (lib/experience.ts) en lugar de leer `matchMedia` por su cuenta.
 */
export const useReducedMotion = useIsReduced;
