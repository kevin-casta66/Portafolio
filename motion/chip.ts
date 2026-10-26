/**
 * Chip procedural para T8 (RUNTIME → GPU, versión DOM/SVG): un mapa de intensidades 0..1 que se
 * pixela por bloques cada vez mayores y acaba como malla de puntos y aristas triangulada.
 * Funciones puras, sin DOM.
 */
export type Bitmap = number[][];

/** Dibuja un «die» con borde, cuatro núcleos, pistas internas y pines en los cuatro lados. */
export function chipBitmap(cols = 48, rows = 30): Bitmap {
  const grid: Bitmap = Array.from({ length: rows }, () => Array.from({ length: cols }, () => 0.06));
  const set = (x: number, y: number, v: number) => {
    const row = grid[y];
    if (row && x >= 0 && x < cols) row[x] = Math.max(row[x] ?? 0, v);
  };

  const m = 4; // margen para los pines
  for (let x = m; x < cols - m; x++) {
    set(x, m, 0.7);
    set(x, rows - m - 1, 0.7);
  }
  for (let y = m; y < rows - m; y++) {
    set(m, y, 0.7);
    set(cols - m - 1, y, 0.7);
  }
  // Pines: de 2 en 2 alrededor.
  for (let x = m + 2; x < cols - m - 2; x += 2) {
    for (let d = 1; d <= 2; d++) {
      set(x, m - d, 0.55);
      set(x, rows - m - 1 + d, 0.55);
    }
  }
  for (let y = m + 2; y < rows - m - 2; y += 2) {
    for (let d = 1; d <= 2; d++) {
      set(m - d, y, 0.55);
      set(cols - m - 1 + d, y, 0.55);
    }
  }
  // Cuatro núcleos.
  const coreW = Math.floor((cols - 2 * m - 6) / 2);
  const coreH = Math.floor((rows - 2 * m - 6) / 2);
  for (const [cx, cy] of [
    [m + 2, m + 2],
    [m + 4 + coreW, m + 2],
    [m + 2, m + 4 + coreH],
    [m + 4 + coreW, m + 4 + coreH],
  ] as const) {
    for (let y = cy; y < cy + coreH; y++) for (let x = cx; x < cx + coreW; x++) set(x, y, 0.95);
  }
  // Pista central.
  for (let x = m + 1; x < cols - m - 1; x++) set(x, Math.floor(rows / 2), 0.4);
  for (let y = m + 1; y < rows - m - 1; y++) set(Math.floor(cols / 2), y, 0.4);
  return grid;
}

/** Pixelado: promedia bloques de `block × block` (el resultado conserva el tamaño lógico por bloque). */
export function downsample(bitmap: Bitmap, block: number): Bitmap {
  const rows = bitmap.length;
  const cols = bitmap[0]?.length ?? 0;
  const out: Bitmap = [];
  for (let y = 0; y < rows; y += block) {
    const line: number[] = [];
    for (let x = 0; x < cols; x += block) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < block; dy++) {
        for (let dx = 0; dx < block; dx++) {
          const v = bitmap[y + dy]?.[x + dx];
          if (v !== undefined) {
            sum += v;
            count++;
          }
        }
      }
      line.push(count ? sum / count : 0);
    }
    out.push(line);
  }
  return out;
}

export interface Mesh {
  points: { x: number; y: number }[];
  /** Pares de índices de `points`: aristas horizontales, verticales y una diagonal por celda (triángulos). */
  edges: [number, number][];
}

/** Malla triangulada sobre una rejilla de `cols × rows` puntos separados `step` unidades. */
export function triangulatedMesh(cols: number, rows: number, step: number): Mesh {
  const points: Mesh["points"] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) points.push({ x: x * step, y: y * step });
  const edges: Mesh["edges"] = [];
  const at = (x: number, y: number) => y * cols + x;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x + 1 < cols) edges.push([at(x, y), at(x + 1, y)]);
      if (y + 1 < rows) edges.push([at(x, y), at(x, y + 1)]);
      if (x + 1 < cols && y + 1 < rows) edges.push([at(x, y), at(x + 1, y + 1)]); // diagonal → triángulos
    }
  }
  return { points, edges };
}

/** PRNG determinista (mulberry32): mismas posiciones en cada carga, útil para T9. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` puntos repartidos uniformemente por el perímetro de un rectángulo (marco del monitor, T9). */
export function perimeterPoints(
  x: number,
  y: number,
  w: number,
  h: number,
  count: number,
): { x: number; y: number }[] {
  const perimeter = 2 * (w + h);
  return Array.from({ length: count }, (_, i) => {
    let d = (i / count) * perimeter;
    if (d < w) return { x: x + d, y };
    d -= w;
    if (d < h) return { x: x + w, y: y + d };
    d -= h;
    if (d < w) return { x: x + w - d, y: y + h };
    d -= w;
    return { x, y: y + h - d };
  });
}
