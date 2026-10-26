import { duration } from "./tokens";

/**
 * Señal global de velocidad de scroll, normalizada y acotada a [-1, 1], suavizada y fuera de React
 * (objeto mutable + suscripción; nunca en el store, para no provocar renders). La consumen el canvas
 * (uniform global, change 04) y el audio (tono, change 06).
 */
export interface VelocitySignal {
  /** Valor actual en [-1, 1]; el signo es la dirección del scroll. */
  value: number;
}

/** Velocidad (px/ms) que equivale a 1. Se calibra con el efecto real en el change 04. */
export const VELOCITY_MAX = { desktop: 3, compact: 2.2 } as const;

/** Constante de tiempo de la amortiguación: decae a ~5 % en ≈ 3τ ≈ token de revelado. */
export const VELOCITY_TAU_MS = duration.reveal / 3;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Convierte px/ms a [-1, 1]. */
export const normalizeVelocity = (pxPerMs: number, max: number): number =>
  clamp(pxPerMs / max, -1, 1);

/** Un paso de amortiguación exponencial hacia `target`. */
export function stepVelocity(
  current: number,
  target: number,
  dtMs: number,
  tauMs = VELOCITY_TAU_MS,
): number {
  if (dtMs <= 0) return current;
  return current + (target - current) * (1 - Math.exp(-dtMs / tauMs));
}

export const velocity: VelocitySignal = { value: 0 };
const listeners = new Set<(value: number) => void>();

export function subscribeVelocity(listener: (value: number) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export interface VelocityTrackerOptions {
  getScroll: () => number;
  isReduced: () => boolean;
  isCompact: () => boolean;
}

/**
 * Devuelve la función `update(timeSeconds)` que se llama una vez por frame desde el reloj.
 * Con movimiento reducido la señal queda fija en 0.
 */
export function createVelocityTracker({ getScroll, isReduced, isCompact }: VelocityTrackerOptions) {
  let lastTime: number | null = null;
  let lastScroll = getScroll();

  return function update(timeSeconds: number): number {
    const timeMs = timeSeconds * 1000;
    if (isReduced()) {
      velocity.value = 0;
      lastTime = timeMs;
      lastScroll = getScroll();
      return 0;
    }
    const dt = lastTime === null ? 0 : timeMs - lastTime;
    const scroll = getScroll();
    if (dt > 0) {
      const raw = (scroll - lastScroll) / dt;
      const target = normalizeVelocity(
        raw,
        isCompact() ? VELOCITY_MAX.compact : VELOCITY_MAX.desktop,
      );
      const next = clamp(stepVelocity(velocity.value, target, dt), -1, 1);
      // Cerca de 0 se corta para no emitir ruido eternamente.
      velocity.value = Math.abs(next) < 0.0005 ? 0 : next;
      listeners.forEach((l) => l(velocity.value));
    }
    lastTime = timeMs;
    lastScroll = scroll;
    return velocity.value;
  };
}
