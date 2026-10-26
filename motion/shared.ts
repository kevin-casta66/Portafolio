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

/**
 * Superficie de la transición T6 (tarjeta ⇄ cabecera del caso). La escribe `motion/pageTransition.ts`
 * (chunk de movimiento) y la dibuja la escena `T6.scene.ts` del motor 3D (chunk del canvas): como
 * los dos se cargan en cualquier orden, se encuentran aquí, igual que el reloj y las variantes.
 */
export interface PlaneState {
  /** Rectángulo de la superficie en px CSS de viewport (x, y arriba-izquierda, w, h). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 0..1: distorsión de lente y aberración (0 = la superficie es exactamente una tarjeta). */
  lens: number;
  /** Opacidad de la superficie. */
  alpha: number;
  /** La superficie debe dibujarse. */
  visible: boolean;
}

export const t6: {
  state: PlaneState;
  /** Mientras es `true` la escena existe (se carga y se mantiene); al terminar la transición se suelta. */
  armed: boolean;
  /** La escena está creada y puede dibujar. */
  ready: boolean;
  /** Pide un frame al motor (lo publica la escena). */
  markDirty: (() => void) | null;
  /**
   * Vista de máscara (prototipo, y después el interruptor «ver internos» de /motion): en lugar de la
   * cara de la tarjeta se pinta el PESO de la lente por píxel (0 = centro limpio, 1 = borde).
   */
  maskView: boolean;
} = {
  state: { x: 0, y: 0, w: 0, h: 0, lens: 0, alpha: 0, visible: false },
  armed: false,
  ready: false,
  markDirty: null,
  maskView: false,
};

/** Pide al motor 3D que cargue la escena de T6 (antes de que haga falta). */
export function armT6(): void {
  if (t6.armed) return;
  t6.armed = true;
  t6.markDirty?.();
}

export function disarmT6(): void {
  t6.armed = false;
  t6.state.visible = false;
  t6.state.alpha = 0;
  t6.markDirty?.();
}
