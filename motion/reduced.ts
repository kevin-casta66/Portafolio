import { getExperience, onExperienceChange } from "@/lib/experience";

/** Consulta de movimiento reducido. */
export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * ¿Modo de movimiento reducido? Se apoya en el modo de experiencia central (lib/experience.ts: manual >
 * sistema), no en `matchMedia` suelto, de modo que el control manual también gobierna a `motion/`.
 * El atributo `data-experience` de <html> (script de <head>) existe antes que el store hidratado.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  const attr = document.documentElement?.getAttribute?.("data-experience");
  if (attr) return attr === "reduced";
  return getExperience() === "reduced" || window.matchMedia(REDUCED_QUERY).matches;
}

/** Notifica cambios del modo reducido (preferencia del sistema o elección manual); devuelve la limpieza. */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  let last = prefersReducedMotion();
  return onExperienceChange((mode) => {
    const next = mode === "reduced";
    if (next === last) return;
    last = next;
    callback(next);
  });
}

/** `true` en dispositivos con puntero fino y hover (descarta táctiles). */
export function hasFinePointer(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

/** Viewport estrecho: las coreografías usan variantes simplificadas. */
export const COMPACT_QUERY = "(max-width: 767px)";
export function isCompact(): boolean {
  return typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches;
}
