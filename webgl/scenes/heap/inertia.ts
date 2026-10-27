import { HEAP_LENS_MAGNIFY, lensScale } from "../../nodes/lens";

/**
 * Física pura del heap (sin three ni DOM): inercia con fricción exponencial, envoltura modular de la
 * cuadrícula infinita, seguimiento de velocidad del arrastre y des-mapeo de la lente. La escena las usa
 * dentro del tick único del motor (sin rAF propio), y las pruebas las ejercitan sin navegador.
 */

/** Movimiento mínimo (px) para que un gesto sea un arrastre y no un clic (spec: «clic frente a arrastre»). */
export const DRAG_THRESHOLD = 6;
/** Tasa de decaimiento de la inercia (1/s): la velocidad se divide por e cada 1/RATE s (≈ 0,9 s hasta parar). */
export const INERTIA_RATE = 3.6;
/** Por debajo de esta velocidad (px/s) la inercia se da por terminada. */
export const REST_SPEED = 6;
/** Velocidad máxima aceptada al soltar (px/s): un gesto brusco no lanza la cuadrícula al infinito. */
export const MAX_SPEED = 5200;

export const isDrag = (dx: number, dy: number, threshold: number = DRAG_THRESHOLD): boolean =>
  Math.hypot(dx, dy) >= threshold;

/** `v` envuelto a [0, size): la cuadrícula es periódica con periodo `size`. */
export function wrap(v: number, size: number): number {
  if (size <= 0) return 0;
  return ((v % size) + size) % size;
}

/** `delta` llevado a [−size/2, size/2]: el camino MÁS CORTO entre dos desplazamientos periódicos. */
export function wrapDelta(delta: number, size: number): number {
  if (size <= 0) return delta;
  return wrap(delta + size / 2, size) - size / 2;
}

export interface Motion {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/**
 * Avanza `dt` segundos: posición += velocidad·dt y la velocidad decae exponencialmente. Devuelve
 * `true` mientras todavía se mueve (el motor seguirá pidiendo frames) y `false` al detenerse.
 */
export function stepInertia(m: Motion, dt: number, rate: number = INERTIA_RATE): boolean {
  if (Math.hypot(m.vx, m.vy) < REST_SPEED) {
    m.vx = 0;
    m.vy = 0;
    return false;
  }
  m.x += m.vx * dt;
  m.y += m.vy * dt;
  const k = Math.exp(-rate * dt);
  m.vx *= k;
  m.vy *= k;
  return true;
}

export function clampSpeed(vx: number, vy: number, max: number = MAX_SPEED): { vx: number; vy: number } {
  const s = Math.hypot(vx, vy);
  if (s <= max) return { vx, vy };
  const f = max / s;
  return { vx: vx * f, vy: vy * f };
}

/** Velocidad (px/s) del arrastre a partir de las últimas muestras (ventana corta: lo que hace el dedo al soltar). */
export class VelocityTracker {
  private samples: { t: number; x: number; y: number }[] = [];
  constructor(private readonly windowMs = 90) {}

  reset(): void {
    this.samples = [];
  }

  push(t: number, x: number, y: number): void {
    this.samples.push({ t, x, y });
    const min = t - this.windowMs;
    while (this.samples.length > 2 && (this.samples[0] as { t: number }).t < min) this.samples.shift();
  }

  /** Velocidad media en la ventana; 0 si la última muestra es antigua (el dedo se detuvo antes de soltar). */
  velocity(now: number): { vx: number; vy: number } {
    const n = this.samples.length;
    if (n < 2) return { vx: 0, vy: 0 };
    const a = this.samples[0] as { t: number; x: number; y: number };
    const b = this.samples[n - 1] as { t: number; x: number; y: number };
    if (now - b.t > this.windowMs * 1.5) return { vx: 0, vy: 0 };
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0) return { vx: 0, vy: 0 };
    return clampSpeed((b.x - a.x) / dt, (b.y - a.y) / dt);
  }
}

/**
 * Inversa de la lente: dado el radio en pantalla `rScreen` (px) a partir del centro de la lente, devuelve
 * el radio del punto del OBJETO que se ve ahí. Se usa para saber qué bloque hay bajo el cursor cuando la
 * lente lo amplía (la geometría dibujada está desplazada). El mapa directo es monótono (ver `lens.test.ts`),
 * así que una bisección basta.
 */
export function lensUnmapRadius(
  rScreen: number,
  radius: number,
  magnify: number = HEAP_LENS_MAGNIFY,
): number {
  if (magnify <= 0 || radius <= 0) return rScreen;
  // Fuera del borde el mapa es la identidad.
  if (rScreen >= radius) return rScreen;
  let lo = 0;
  let hi = radius;
  for (let i = 0; i < 28; i++) {
    const mid = (lo + hi) / 2;
    const screen = mid * lensScale(mid / radius, magnify);
    if (screen < rScreen) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Mapa directo de la lente sobre un punto (px): el mismo que el nodo TSL `lensMagnifyNode`. */
export function lensMapPoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
  magnify: number,
): { x: number; y: number } {
  const dx = px - cx;
  const dy = py - cy;
  const f = lensScale(Math.hypot(dx, dy) / Math.max(1, radius), magnify);
  return { x: cx + dx * f, y: cy + dy * f };
}

/** Inversa de `lensMapPoint`: el punto del objeto que se ve en pantalla en (px, py). */
export function lensUnmapPoint(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number,
  magnify: number,
): { x: number; y: number } {
  const dx = px - cx;
  const dy = py - cy;
  const r = Math.hypot(dx, dy);
  if (r < 1e-6) return { x: px, y: py };
  const ro = lensUnmapRadius(r, radius, magnify);
  const f = ro / r;
  return { x: cx + dx * f, y: cy + dy * f };
}
