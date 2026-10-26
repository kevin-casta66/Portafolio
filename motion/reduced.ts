/** Consulta de movimiento reducido. */
export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches;
}

/** Notifica cambios de la preferencia; devuelve la función de limpieza. */
export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  const mql = window.matchMedia(REDUCED_QUERY);
  const handler = () => callback(mql.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
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
