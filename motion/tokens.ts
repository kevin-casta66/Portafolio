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
  /** Hold-to-Execute: tiempo que hay que mantener pulsado (T6). */
  hold: 800,
  /** Una pulsación más corta que esto, sin desplazarse, es un clic normal. */
  holdClick: 200,
  /**
   * Transición de página tarjeta → caso: completa (tras un hold) y corta (clic / Enter). Son el tiempo
   * de las dos mitades (expansión + entrega); los techos de 1200 ms y 500 ms incluyen además las
   * esperas de la navegación (~100 ms), de ahí el margen.
   */
  pageFull: 1100,
  pageShort: 400,
  /** Techo del fundido de movimiento reducido al abrir un caso. */
  fadeMax: 200,
  /** Cambio de tema: revelado circular desde el botón (T10). */
  theme: 600,
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
