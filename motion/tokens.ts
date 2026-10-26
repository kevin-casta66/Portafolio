/**
 * Tokens de movimiento. Espejo de las custom properties de `styles/tokens.css`
 * (un test comprueba que coinciden) y de `docs/MOTION-SPEC.md`.
 * Si cambias un valor aquí, actualiza CSS y documentación en el mismo commit.
 */

export type CubicBezier = readonly [number, number, number, number];

export const easing = {
  /** Entradas y revelados (expo out). */
  inExpo: [0.16, 1, 0.3, 1],
  /** Transiciones de escena (quart in-out). */
  scene: [0.76, 0, 0.24, 1],
} as const satisfies Record<string, CubicBezier>;

/** Resorte de UI (Motion). */
export const spring = { stiffness: 300, damping: 30 } as const;

/** Duraciones en milisegundos. */
export const duration = {
  micro: 150,
  ui: 300,
  reveal: 700,
  /** Equivalente temporal de una transición de escena scrubbed por scroll. */
  sceneMin: 1200,
  sceneMax: 1800,
  /** Techo de cualquier glitch. */
  glitchMax: 300,
} as const;

/** Retardo entre elementos, en milisegundos (rangos permitidos: char 30–40, item 60–80). */
export const stagger = { char: 35, item: 70 } as const;

export const staggerRange = {
  char: { min: 30, max: 40 },
  item: { min: 60, max: 80 },
} as const;

/** Serializa una curva al formato de `transition-timing-function`. */
export const toCssBezier = (curve: CubicBezier): string => `cubic-bezier(${curve.join(", ")})`;

/** Curvas en formato CSS para WAAPI/CSS (sin cargar GSAP). */
export const cssEase = {
  inExpo: toCssBezier(easing.inExpo),
  scene: toCssBezier(easing.scene),
} as const;
