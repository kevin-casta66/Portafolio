import { bayerValue } from "../nodes/bayer";
import type { TransitionState } from "./state";

/**
 * Lógica pura de las vistas «Ver internos» de T5, T8 y T9 (docs/MOTION-SPEC.md §3). Las escenas
 * dibujan estas mismas magnitudes con nodos TSL; aquí están en JS para poder probarlas y para que la
 * constante de cada vista tenga un único dueño.
 *
 * El flag `internals` lo define el estado de la transición (`TransitionState`, `state.ts`) y solo lo
 * escribe `setTransitionInternals`; las escenas lo leen en cada `update`.
 */
export function internalsOn(state: TransitionState): boolean {
  return state.internals === true;
}

/** Matriz de Bayer 2^levels × 2^levels en filas (umbrales en (0, 1)): la leyenda de T5. */
export function bayerMatrixRows(levels = 3): number[][] {
  const n = 2 ** levels;
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => bayerValue(x, y, levels)));
}

/** Tamaño del bloque de píxel de T8 según el progreso (1 → 12 entre p = 0,1 y 0,55, suavizado). */
export function mosaicBlock(p: number): number {
  const t = Math.min(1, Math.max(0, (p - 0.1) / 0.45));
  return 1 + 11 * t * t * (3 - 2 * t);
}

/** Avance suavizado (smoothstep) de una partícula de T9 con progreso relativo `rel` ∈ [0, 1]. */
export const easeParticle = (rel: number): number => rel * rel * (3 - 2 * rel);

/**
 * Velocidad (px por unidad de progreso global) de una partícula de T9: derivada del suavizado por la
 * distancia origen → destino. Es 0 en reposo y llega a su máximo a mitad de viaje.
 */
export function particleSpeed(distance: number, rel: number): number {
  if (rel <= 0 || rel >= 1) return 0;
  return (distance * 6 * rel * (1 - rel)) / 0.58;
}

/**
 * Velocidad normalizada 0..1 respecto a la de un viaje típico: un viaje de ~900 px alcanza ~2.300 px por
 * unidad de progreso a mitad de camino, así que 4.000 deja el degradado magenta → ámbar repartido.
 */
export const SPEED_REFERENCE = 4000;
export const speedNorm = (distance: number, rel: number): number =>
  Math.min(1, particleSpeed(distance, rel) / SPEED_REFERENCE);
