import { TSL, type N } from "./tsl";

const { float, vec2, smoothstep, length, clamp, max, normalize } = TSL;

/**
 * Nodos TSL de LENTE, compartidos por la transición T6 (lente de barril sobre la tarjeta que se expande)
 * y por la lente del Memory Heap (magnificación radial que sigue al puntero). Los dos usan las mismas
 * dos ideas —un peso que vale 0 en el centro y 1 en el borde, y un desplazamiento radial que separa
 * los canales de color— y por eso viven aquí, una sola vez.
 */

// ── Barril ponderado al borde (T6) ───────────────────────────────────────────────────────────────

/** Fracción del radio a partir de la cual la lente empieza a actuar (el centro queda limpio). */
export const LENS_EDGE_FROM = 0.35;
/** Empuje máximo del barril (fracción de las coordenadas normalizadas) con `uLens = 1`. */
export const LENS_BARREL = 0.06;
/** Separación relativa entre canales con `uLens = 1`. */
export const LENS_CHROMA = 0.12;

/** Peso de la lente: 0 en el centro, 1 en el borde (`r` = distancia normalizada 0..1 al centro). */
export const lensEdgeWeight = (r: N): N => smoothstep(LENS_EDGE_FROM, 1.0, r);

/** Barril: empuje radial ponderado por el cuadrado del peso de borde. */
export const lensBarrel = (edgeW: N, uLens: N): N => uLens.mul(LENS_BARREL).mul(edgeW).mul(edgeW);

/** Separación entre canales: unos 8 px en el borde de una pantalla de 1280 px (flecos finos, no bandas). */
export const lensChroma = (uLens: N): N => uLens.mul(LENS_CHROMA);

/** Coordenadas con las que se muestrea el canal `k` (+1 rojo, 0 verde, −1 azul): el barril lo empuja una fracción distinta. */
export const lensSample = (q: N, barrel: N, chroma: N, k: number): N =>
  q.mul(float(1).sub(barrel.mul(float(1).add(chroma.mul(k)))));

// ── Magnificación radial (Memory Heap) ───────────────────────────────────────────────────────────

/** Radio de la lente del heap (px CSS). */
export const HEAP_LENS_RADIUS = 140;
/** Magnificación extra en el centro: la escala del centro es `1 + HEAP_LENS_MAGNIFY` (aquí ×1,75: se lee bien sin deformar el texto del borde). */
export const HEAP_LENS_MAGNIFY = 0.75;

/**
 * Factor de escala de la lente en la distancia normalizada `t` (0 = centro, 1 = borde): `1 + m·(1−t)²`
 * dentro y 1 fuera. Con `m < 3` el mapa `t → t·factor` es monótono (la lente no se pliega sobre sí
 * misma) y continuo en el borde (factor 1 en `t = 1`), así que no hay saltos entre dentro y fuera.
 * Versión pura de `lensMagnifyNode`, usada por las pruebas y por la selección con el puntero.
 */
export function lensScale(t: number, m: number = HEAP_LENS_MAGNIFY): number {
  const c = Math.min(1, Math.max(0, t));
  return 1 + m * (1 - c) * (1 - c);
}

/**
 * Lente de magnificación en nodos: desplaza el punto `p` (px) radialmente respecto de `center`. Es un
 * mapa DIRECTO (objeto → pantalla) pensado para el vértice: la geometría subdividida se curva y el
 * contenido vectorial (bloques, texto MSDF) se amplía sin perder nitidez. Devuelve la posición
 * desplazada y el peso del aro de refracción (0 en el centro y fuera, 1 cerca del borde interior).
 */
export function lensMagnifyNode(p: N, center: N, radius: N, magnify: N): { pos: N; t: N; rim: N } {
  const d = p.sub(center);
  const t = length(d).div(max(radius, float(1)));
  const c = clamp(t, 0, 1);
  const factor = float(1).add(magnify.mul(float(1).sub(c)).mul(float(1).sub(c)));
  const rim = smoothstep(0.55, 0.98, t).mul(float(1).sub(smoothstep(0.98, 1.04, t)));
  return { pos: center.add(d.mul(factor)), t, rim };
}

/** Dirección radial unitaria desde `center` (para separar canales en el aro de refracción). */
export const lensRadialDir = (p: N, center: N): N => normalize(p.sub(center).add(vec2(1e-4, 0)));
