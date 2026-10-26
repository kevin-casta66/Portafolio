import { uniform, uniformArray } from "three/tsl";
import { Color, Vector2 } from "three/webgpu";

/**
 * Uniforms globales compartidos por TODOS los materiales (TSL). Se crean una vez; el motor escribe
 * sus `.value` una vez por frame (nunca estado de React). Los colores salen de los tokens.
 */
export const uTime = uniform(0);
/** Velocidad de scroll normalizada y acotada ∈ [-1, 1] (estira partículas y sube la aberración). */
export const uScrollVelocity = uniform(0);
/** Aberración cromática 0..1: pulso de cambio de fase (< 300 ms) + velocidad acotada. */
export const uChroma = uniform(0);
/** Puntero en píxeles de viewport (origen arriba-izquierda). */
export const uPointer = uniform(new Vector2(0, 0));
/** Tamaño del viewport en píxeles CSS. */
export const uView = uniform(new Vector2(1, 1));
/** Acento activo (interpolado entre fases) y tokens de color en espacio lineal. */
export const uAccent = uniform(new Color());
export const uBg = uniform(new Color());
export const uText = uniform(new Color());
export const uBorder = uniform(new Color());
export const uKeyword = uniform(new Color());
export const uType = uniform(new Color());
export const uString = uniform(new Color());
/** Acentos de las 7 fases (source → gpu) para el gradiente espectral del monitor (T9) y las transiciones. */
export const uAccents = uniformArray(
  Array.from({ length: 7 }, () => new Color()),
  "color",
);
