import { spring } from "./tokens";

/**
 * Respuesta al escalón de un oscilador amortiguado (el «resorte» de UI: rigidez 300, amortiguación
 * 30, masa 1). `t` está en segundos y el resultado tiende a 1 con un rebote casi imperceptible.
 */
export function springStep(
  t: number,
  { stiffness, damping, mass = 1 }: { stiffness: number; damping: number; mass?: number } = spring,
): number {
  if (t <= 0) return 0;
  const w0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  if (zeta < 1) {
    const wd = w0 * Math.sqrt(1 - zeta * zeta);
    return (
      1 - Math.exp(-zeta * w0 * t) * (Math.cos(wd * t) + ((zeta * w0) / wd) * Math.sin(wd * t))
    );
  }
  return 1 - Math.exp(-w0 * t) * (1 + w0 * t);
}

/** Segundos hasta que el resorte queda (para siempre) a menos de 0,1 % del valor final. */
export const SPRING_SETTLE_SECONDS: number = (() => {
  let last = 0;
  for (let t = 0.005; t <= 5; t += 0.005) {
    if (Math.abs(1 - springStep(t)) >= 0.001) last = t;
  }
  return last + 0.005;
})();

export const SPRING_SETTLE_MS: number = Math.ceil(SPRING_SETTLE_SECONDS * 1000);

/** Ease de progreso 0→1 equivalente al resorte (para GSAP). */
export function springEase(progress: number): number {
  if (progress <= 0) return 0;
  if (progress >= 1) return 1;
  return springStep(progress * SPRING_SETTLE_SECONDS);
}

/**
 * Easing CSS `linear(...)` que aproxima el resorte, para animaciones WAAPI/CSS sin cargar GSAP.
 * Duración recomendada: `SPRING_SETTLE_MS`.
 */
export function springLinear(points = 40): string {
  const values = Array.from({ length: points }, (_, i) => springEase(i / (points - 1)));
  return `linear(${values.map((v) => v.toFixed(4)).join(", ")})`;
}
