/**
 * Navegación entre fases fuera de React: salto con scroll suave a una sección del home y foco en su
 * encabezado (el foco viaja con el visitante, design D5). El scroll es el nativo (Lenis solo
 * interpola la rueda), así que `scrollTo` con `behavior: "smooth"` funciona y respeta el movimiento
 * reducido.
 */
const prefersReducedMotion = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Se desplaza al inicio de la sección `id` y mueve el foco a su encabezado. Devuelve si existía. */
export function jumpToSection(id: string, { updateHash = true } = {}): boolean {
  const section = document.getElementById(id);
  if (!section) return false;
  const margin = Number.parseFloat(getComputedStyle(section).scrollMarginTop) || 0;
  const top = section.getBoundingClientRect().top + window.scrollY - margin;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  if (updateHash) {
    try {
      window.history.replaceState(window.history.state, "", `#${id}`);
    } catch {
      /* historial no disponible: el salto ya ocurrió */
    }
  }
  const labelledBy = section.getAttribute("aria-labelledby");
  const heading = labelledBy ? document.getElementById(labelledBy) : section;
  heading?.focus({ preventScroll: true });
  return true;
}
