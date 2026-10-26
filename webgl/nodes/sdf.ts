import { TSL, type N } from "./tsl";

const { Fn, abs, min, max, length, vec2, smoothstep, float, fract, step, floor, dot } = TSL;

/** Distancia con signo a un rectángulo redondeado (centro en el origen, semitamaño `b`, radio `r`). */
export const sdRoundRect = Fn(([p, b, r]: [N, N, N]) => {
  const q = abs(p).sub(b).add(r);
  return min(max(q.x, q.y), 0).add(length(max(q, vec2(0, 0)))).sub(r);
});

/** Relleno antialiasado (1 px) a partir de una distancia con signo en píxeles. */
export const fillSd = (d: N): N => float(1).sub(smoothstep(-0.5, 0.5, d));

/** Contorno antialiasado de `width` px centrado en d = 0. */
export const strokeSd = (d: N, width: number): N =>
  float(1).sub(smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, abs(d)));

/** Líneas de rejilla de `width` px cada `cell` px (coordenadas en px). */
export const gridLines = (p: N, cell: number, width: number): N => {
  const g = fract(p.div(cell));
  const w = width / cell;
  return max(step(g.x, w), step(g.y, w));
};

/** Hash 2D → [0, 1). */
export const hash21 = Fn(([p]: [N]) => {
  const q = fract(p.mul(vec2(0.1031, 0.103)));
  const d = q.add(dot(q, q.yx.add(33.33)));
  return fract(d.x.add(d.y).mul(d.x.mul(d.y).add(0.31)).mul(43.5453));
});

export const cellId = (p: N, cell: number): N => floor(p.div(cell));
