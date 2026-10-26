/**
 * Malla del chip: el «vértices → triángulos» de la narrativa. T8 convierte la imagen pixelada del
 * chip en esta malla, y la fase GPU la recorre (vértices → triángulos → rasterización → píxeles):
 * es literalmente el mismo objeto de una fase a la siguiente.
 *
 * Coordenadas normalizadas en [-1, 1] (y hacia ABAJO, como el DOM). Datos puros, sin three.
 */
export type Vec2 = readonly [number, number];

export const CHIP_VERTICES: readonly Vec2[] = [
  // Octógono exterior (0–7)
  [-0.6, -1],
  [0.6, -1],
  [1, -0.6],
  [1, 0.6],
  [0.6, 1],
  [-0.6, 1],
  [-1, 0.6],
  [-1, -0.6],
  // Cuadrado interior (8–11)
  [-0.45, -0.45],
  [0.45, -0.45],
  [0.45, 0.45],
  [-0.45, 0.45],
];

/** Triángulos por índices de vértice (corona entre el octógono y el cuadrado, más el cuadrado). */
export const CHIP_TRIANGLES: readonly (readonly [number, number, number])[] = [
  [0, 1, 9],
  [0, 9, 8],
  [1, 2, 9],
  [2, 3, 10],
  [2, 10, 9],
  [3, 4, 10],
  [4, 5, 11],
  [4, 11, 10],
  [5, 6, 11],
  [6, 7, 8],
  [6, 8, 11],
  [7, 0, 8],
  [8, 9, 10],
  [8, 10, 11],
];

/** Aristas únicas (pares ordenados de índices) de la malla. */
export function uniqueEdges(
  triangles: readonly (readonly [number, number, number])[] = CHIP_TRIANGLES,
): [number, number][] {
  const seen = new Set<string>();
  const edges: [number, number][] = [];
  for (const [a, b, c] of triangles) {
    for (const [i, j] of [
      [a, b],
      [b, c],
      [c, a],
    ] as const) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push(i < j ? [i, j] : [j, i]);
    }
  }
  return edges;
}

/** Área con signo de un triángulo (para comprobar orientación y que la malla cubre el polígono). */
export function triangleArea(a: Vec2, b: Vec2, c: Vec2): number {
  return ((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
}
