/**
 * Reloj de frame único. Todo lo que avanza por frame (scroll suave, animaciones, render 3D del
 * change 04, señal de velocidad) se suscribe aquí; el reloj se apoya en un único callback del ticker
 * de GSAP. Ningún otro módulo debe registrar su propio `requestAnimationFrame` (lo hace cumplir
 * ESLint fuera de `motion/`).
 *
 * Orden dentro del frame: `priority` menor se ejecuta antes. Convención:
 *   0 scroll suave · 10 señales (velocidad, fase) · 50 animaciones propias · 100 render 3D.
 */
export type ClockCallback = (timeSeconds: number, deltaMs: number, frame: number) => void;

/** Subconjunto del ticker de GSAP que usamos (facilita los tests). */
export interface Ticker {
  add(callback: (time: number, deltaTime: number, frame: number) => void): unknown;
  remove(callback: (time: number, deltaTime: number, frame: number) => void): unknown;
}

export interface Clock {
  subscribe(callback: ClockCallback, priority?: number): () => void;
  subscriberCount(): number;
  destroy(): void;
}

export function createClock(ticker: Ticker): Clock {
  const subscribers: { callback: ClockCallback; priority: number; order: number }[] = [];
  let counter = 0;
  let attached = false;

  const tick = (time: number, deltaTime: number, frame: number) => {
    // Copia: un suscriptor puede darse de baja durante el frame.
    for (const subscriber of [...subscribers]) subscriber.callback(time, deltaTime, frame);
  };

  const attach = () => {
    if (!attached) {
      ticker.add(tick);
      attached = true;
    }
  };
  const detach = () => {
    if (attached) {
      ticker.remove(tick);
      attached = false;
    }
  };

  return {
    subscribe(callback, priority = 50) {
      const entry = { callback, priority, order: counter++ };
      subscribers.push(entry);
      subscribers.sort((a, b) => a.priority - b.priority || a.order - b.order);
      attach();
      return () => {
        const index = subscribers.indexOf(entry);
        if (index >= 0) subscribers.splice(index, 1);
        if (subscribers.length === 0) detach();
      };
    },
    subscriberCount: () => subscribers.length,
    destroy() {
      subscribers.length = 0;
      detach();
    },
  };
}
