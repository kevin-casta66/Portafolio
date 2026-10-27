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
/**
 * Parámetros del postprocesado ajustables en vivo (modo Debug, `webgl/tweakables.ts`). Son uniforms de
 * MÓDULO: sobreviven a los cambios de tier (que reasignan `outputNode`) sin recompilar.
 */
export const uBloomStrength = uniform(0.9);
/** Multiplica la aberración cromática calculada (1 = la del diseño). */
export const uChromaGain = uniform(1);
/** Multiplica la intensidad del grano de película (1 = la del diseño). */
export const uGrainGain = uniform(1);
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
