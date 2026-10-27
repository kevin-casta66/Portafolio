/**
 * Flags de la capa de movimiento. Cada pieza puede desactivarse sin tocar el contenido: es el
 * «rollback» del change (ver design.md › Migration Plan). Desactivar un flag deja el sitio estático
 * del change 02 intacto.
 */
export const motionConfig = {
  /** Scroll suave (Lenis) sobre el scroll nativo. */
  smoothScroll: true,
  /** Seguimiento de fase, color de acento y glitch del título de fase. */
  phases: true,
  /** Coreografías por sección (hero, lexer, parser, bytecode, runtime, lab, contacto, 404). */
  choreography: true,
  /** Transiciones scrubbed entre fases (T2–T5, T8, T9). */
  transitions: true,
  /** Puerta de arranque (T1). */
  boot: true,
} as const;

export type MotionConfig = typeof motionConfig;

/** Clave de sesión: la puerta completa solo se muestra una vez por sesión. */
export const BOOTED_KEY = "portafolio:booted";
/** Parámetro de prueba: expone `window.__portafolioMotion` (no cambia el comportamiento). */
export const TEST_PARAM = "motionTest";
