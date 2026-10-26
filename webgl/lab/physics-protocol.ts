/**
 * Protocolo entre el hilo principal y el Web Worker de física (Rapier). Es solo tipos y constantes
 * puras (sin three ni Rapier), así que se importa desde ambos lados.
 *
 * El mundo es 2D lógico simulado con Rapier 3D: las traslaciones en z y las rotaciones en x/y están
 * bloqueadas. Unidades de mundo: metros; el escenario mide `WORLD_W × WORLD_H`.
 */
export const WORLD_W = 6.4;
export const WORLD_H = 4;
/** Frecuencia fija de la simulación (Hz): independiente de los FPS del render. */
export const STEP_HZ = 60;
export const BODY_COUNT = 22;

export type ToWorker =
  | { type: "init"; gravity: number; bounce: number }
  | { type: "params"; gravity: number; bounce: number }
  /** Arrastre: coordenadas de mundo del puntero para el cuerpo `index`. */
  | { type: "drag"; index: number; x: number; y: number }
  | { type: "release" }
  | { type: "impulse"; x: number; y: number }
  | { type: "reset" }
  | { type: "stop" };

export type FromWorker =
  | { type: "ready" }
  /** x, y, ángulo, radio por cuerpo (4 floats). */
  | { type: "state"; bodies: Float32Array; step: number };

/** Forma de cada cuerpo (determinista): círculo o cuadrado y su tamaño, por índice. */
export function bodySpec(index: number): { shape: "ball" | "box"; size: number } {
  const size = 0.2 + ((index * 37) % 11) * 0.018;
  return { shape: index % 3 === 2 ? "box" : "ball", size };
}

/** Posición inicial en cuadrícula suelta (determinista). */
export function bodyStart(index: number): { x: number; y: number } {
  const cols = 8;
  const col = index % cols;
  const row = Math.floor(index / cols);
  return { x: 0.9 + col * 0.65 + (row % 2) * 0.25, y: WORLD_H - 0.6 - row * 0.55 };
}

/** Del escenario (0..1, y hacia abajo) a coordenadas de mundo (y hacia arriba). */
export function stageToWorld(x: number, y: number): { x: number; y: number } {
  return { x: x * WORLD_W, y: (1 - y) * WORLD_H };
}
