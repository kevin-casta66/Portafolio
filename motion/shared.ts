import type { Clock } from "./clock";
import type { TransitionId, VariantFactory } from "./transitions/contract";
import { TRANSITIONS } from "./transitions";

/**
 * Puente entre la capa de movimiento (change 03) y el motor 3D (change 04). Los dos se cargan como
 * chunks diferidos tras el LCP, en cualquier orden, así que se encuentran aquí:
 *
 *  - El reloj único: el motor 3D se suscribe a ÉL (prioridad 100) en lugar de crear su propio bucle.
 *  - Las variantes `canvas` de las transiciones: el motor las registra al terminar de cargar; el
 *    controlador de transiciones las elige cuando el store marca `graphics.ready`.
 */
let currentClock: Clock | null = null;
const clockListeners = new Set<(clock: Clock | null) => void>();

export function publishClock(clock: Clock | null): void {
  currentClock = clock;
  clockListeners.forEach((listener) => listener(clock));
}

/** Llama de inmediato con el reloj actual (o `null`) y de nuevo en cada publicación. */
export function subscribeClock(listener: (clock: Clock | null) => void): () => void {
  listener(currentClock);
  clockListeners.add(listener);
  return () => clockListeners.delete(listener);
}

/** Registra (o retira con `null`) la versión en canvas de una transición. */
export function setCanvasVariant(id: TransitionId, factory: VariantFactory | null): void {
  const def = TRANSITIONS.find((d) => d.id === id);
  if (!def) return;
  if (factory) def.variants.canvas = factory;
  else delete def.variants.canvas;
}

/** Estado que el motor 3D publica para la capa de movimiento. */
export const canvasState: {
  /**
   * Glitch del título (T11) hecho por el canvas: devuelve `true` si el título tiene gemelo MSDF y el
   * canvas lo animó; con `false` (o sin canvas) se usa el glitch DOM de respaldo.
   */
  glitch: ((title: HTMLElement) => boolean) | null;
} = {
  glitch: null,
};
