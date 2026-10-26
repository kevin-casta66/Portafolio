import Delaunator from "delaunator";
import { chipBitmap } from "@/motion/chip";

/**
 * Triangulación de Delaunay del chip (T8): puntos repartidos con jitter por las celdas del mapa de
 * intensidades donde hay «chip», más el contorno, y filtrado de los triángulos cuyo centroide cae
 * fuera. Es el trabajo pesado «triangulación inicial de T8»: se ejecuta en un Web Worker
 * (`workers/triangulate.worker.ts`); el hilo principal solo recibe los buffers ya calculados.
 * Esta función es pura para poder probarla y usarla de respaldo si el worker no está disponible.
 */
export interface Triangulation {
  /** x, y en celdas del mapa (0..cols, 0..rows). */
  points: Float32Array;
  /** Tres índices de punto por triángulo. */
  triangles: Uint32Array;
  /** Intensidad 0..1 del chip en el centroide de cada triángulo. */
  shade: Float32Array;
  /** Pares de índices de las aristas únicas. */
  edges: Uint32Array;
}

export interface TriangulateOptions {
  cols?: number;
  rows?: number;
  /** Separación media de los puntos en celdas. */
  spacing?: number;
  seed?: number;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function triangulateChip({
  cols = 48,
  rows = 30,
  spacing = 2.4,
  seed = 8,
}: TriangulateOptions = {}): Triangulation {
  const bitmap = chipBitmap(cols, rows);
  const value = (x: number, y: number) => bitmap[Math.floor(y)]?.[Math.floor(x)] ?? 0;
  const random = mulberry(seed);
  const pts: number[] = [];

  for (let y = 0; y <= rows; y += spacing) {
    for (let x = 0; x <= cols; x += spacing) {
      const jx = Math.min(cols, Math.max(0, x + (random() - 0.5) * spacing * 0.7));
      const jy = Math.min(rows, Math.max(0, y + (random() - 0.5) * spacing * 0.7));
      if (value(jx, jy) > 0.08) pts.push(jx, jy);
    }
  }
  const delaunay = new Delaunator(Float64Array.from(pts));
  const tris: number[] = [];
  const shade: number[] = [];
  for (let i = 0; i < delaunay.triangles.length; i += 3) {
    const a = delaunay.triangles[i] as number;
    const b = delaunay.triangles[i + 1] as number;
    const c = delaunay.triangles[i + 2] as number;
    const cx = ((pts[a * 2] as number) + (pts[b * 2] as number) + (pts[c * 2] as number)) / 3;
    const cy = ((pts[a * 2 + 1] as number) + (pts[b * 2 + 1] as number) + (pts[c * 2 + 1] as number)) / 3;
    const v = value(cx, cy);
    if (v <= 0.08) continue; // fuera del chip: se descarta (la envolvente convexa cubriría huecos)
    tris.push(a, b, c);
    shade.push(v);
  }
  const seen = new Set<number>();
  const edges: number[] = [];
  const n = pts.length / 2;
  for (let i = 0; i < tris.length; i += 3) {
    for (const [p, q] of [
      [tris[i] as number, tris[i + 1] as number],
      [tris[i + 1] as number, tris[i + 2] as number],
      [tris[i + 2] as number, tris[i] as number],
    ] as const) {
      const lo = Math.min(p, q);
      const hi = Math.max(p, q);
      const key = lo * n + hi;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(lo, hi);
    }
  }
  return {
    points: Float32Array.from(pts),
    triangles: Uint32Array.from(tris),
    shade: Float32Array.from(shade),
    edges: Uint32Array.from(edges),
  };
}
