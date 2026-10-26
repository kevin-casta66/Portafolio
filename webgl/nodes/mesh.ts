import { CHIP_TRIANGLES, CHIP_VERTICES, triangleArea, uniqueEdges } from "../objects/shape";
import { TSL, type N } from "./tsl";

const { Fn, vec2, float, min, max, length, clamp, dot, fract, floor } = TSL;

/** Distancia (px) de `p` al segmento ab. */
export const sdSegment = Fn(([p, a, b]: [N, N, N]) => {
  const pa = p.sub(a);
  const ba = b.sub(a);
  const h = clamp(dot(pa, ba).div(dot(ba, ba)), 0, 1);
  return length(pa.sub(ba.mul(h)));
});

/** Brillo fijo de cada triángulo (determinista): da relieve a la malla rasterizada. */
export const TRIANGLE_SHADE: readonly number[] = CHIP_TRIANGLES.map((_, i) => {
  const s = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return 0.42 + (s - Math.floor(s)) * 0.5;
});

/**
 * Nodos de la malla del chip en coordenadas de píxel relativas al centro (y hacia abajo) y con
 * `half` = semitamaño en px de la caja [-1, 1]. Las funciones devuelven nodos TSL (vértices, aristas,
 * cobertura de triángulos con su brillo y el muestreo por celdas de rasterización).
 */
export function meshNodes(half: N) {
  const verts: N[] = CHIP_VERTICES.map(([x, y]) => vec2(float(x).mul(half), float(y).mul(half)));
  const edges = uniqueEdges();

  /** Cobertura (0..1, AA de 1 px) y brillo en el punto `q`. */
  const sample = (q: N): { coverage: N; shade: N } => {
    let coverage: N = float(0);
    let shade: N = float(0);
    CHIP_TRIANGLES.forEach(([ia, ib, ic], i) => {
      const a = verts[ia] as N;
      const b = verts[ib] as N;
      const c = verts[ic] as N;
      const orient = Math.sign(
        triangleArea(CHIP_VERTICES[ia]!, CHIP_VERTICES[ib]!, CHIP_VERTICES[ic]!),
      );
      // Distancia con signo (px) a cada arista; positiva dentro del triángulo.
      const edge = (u: N, v: N): N => {
        const d = v.sub(u);
        const n = vec2(d.y.negate(), d.x).div(length(d));
        return dot(q.sub(u), n).mul(orient);
      };
      const inside = clamp(min(edge(a, b), min(edge(b, c), edge(c, a))).add(0.5), 0, 1);
      shade = max(shade, inside.mul(TRIANGLE_SHADE[i] as number));
      coverage = max(coverage, inside);
    });
    return { coverage, shade };
  };

  return {
    /** Puntos de los vértices (radio en px). */
    dots(p: N, radius: N): N {
      let a: N = float(0);
      for (const v of verts) a = max(a, float(1).sub(clamp(length(p.sub(v)).sub(radius).add(0.5), 0, 1)));
      return a;
    },
    /** Aristas (anchura en px). */
    edges(p: N, width: N): N {
      let a: N = float(0);
      for (const [i, j] of edges) {
        const d = sdSegment(p, verts[i] as N, verts[j] as N);
        a = max(a, float(1).sub(clamp(d.sub(width.mul(0.5)).add(0.5), 0, 1)));
      }
      return a;
    },
    sample,
    /** Muestreo en el centro de la celda de rasterización de lado `cell` (px): bloques de píxeles. */
    raster(p: N, cell: N): { coverage: N; shade: N; inCell: N } {
      const center = floor(p.div(cell)).add(0.5).mul(cell);
      const s = sample(center);
      // Separación entre píxeles: se ve en las celdas grandes y desaparece al refinar.
      const g = fract(p.div(cell)).sub(0.5).abs().mul(2);
      const inCell = float(1).sub(clamp(max(g.x, g.y).sub(0.86).mul(cell).add(0.5), 0, 1));
      return { ...s, inCell };
    },
  };
}
