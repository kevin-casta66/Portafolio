import { EASE, gsap } from "../gsap";
import { cloneLabel, docRect, isUsable, type DocRect } from "./dom";

/**
 * Vuelo scrubbed de elementos de una sección a otra (T2, T3, T5): clones del origen viajan a las
 * posiciones del destino con profundidad simulada por escala; el original se oculta al despegar y
 * el destino queda como estado final. Todo con `transform` y `opacity`.
 */
export interface FlyPair {
  from: HTMLElement;
  to: HTMLElement;
  /** Desplazamiento horizontal extra en el destino (para repartir varios clones sobre un mismo rótulo). */
  offsetX?: number;
}

export interface FlyOptions {
  layer: HTMLElement;
  /** Escala máxima a mitad de vuelo (profundidad). */
  depth?: number;
  /** Fracción de la timeline en la que salen todos los clones (stagger). */
  spread?: number;
  /** Posición (0..1) a la que empieza el vuelo dentro de la timeline. */
  at?: number;
  /** Fracción de la timeline que dura el vuelo de cada clon. */
  length?: number;
}

export function addFlight(
  tl: gsap.core.Timeline,
  pairs: readonly FlyPair[],
  options: FlyOptions,
): void {
  const { layer, depth = 1.7, spread = 0.25, at = 0, length = 0.6 } = options;
  const usable = pairs.filter((p) => isUsable(p.from) && isUsable(p.to));
  usable.forEach((pair, i) => {
    const f: DocRect = docRect(pair.from);
    const t: DocRect = docRect(pair.to);
    const { outer, inner } = cloneLabel(pair.from, layer);
    const start = at + (usable.length > 1 ? (i / (usable.length - 1)) * spread : 0);
    const tx = t.x + (pair.offsetX ?? 0);

    gsap.set(outer, { x: f.x, y: f.y, opacity: 0 });
    // Despega: aparece el clon, se oculta el original.
    tl.to(outer, { opacity: 1, duration: 0.02, ease: "none" }, start);
    tl.to(pair.from, { opacity: 0, duration: 0.02, ease: "none" }, start);
    // Vuelo: posición + tamaño (transform) con el easing de escena.
    tl.to(
      outer,
      {
        x: tx,
        y: t.y,
        scaleX: t.w / Math.max(1, f.w),
        scaleY: t.h / Math.max(1, f.h),
        duration: length,
        ease: EASE.scene,
      },
      start,
    );
    // Profundidad: crece hacia la «cámara» a mitad de vuelo y vuelve.
    tl.to(inner, { scale: depth, duration: length / 2, ease: "sine.out" }, start);
    tl.to(inner, { scale: 1, duration: length / 2, ease: "sine.in" }, start + length / 2);
    // Aterriza: el clon se desvanece sobre el destino.
    tl.to(outer, { opacity: 0, duration: 0.06, ease: "none" }, start + length);
  });
}
