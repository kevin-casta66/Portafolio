/**
 * Disposición de los núcleos del die (un núcleo por proyecto). Es lógica pura y SIN three: la usan
 * a la vez la escena 3D del chip (dibuja cada núcleo) y el componente DOM del escenario (coloca un
 * botón accesible encima de cada núcleo), así ambos coinciden por construcción.
 *
 * Coordenadas normalizadas del escenario: (0,0) arriba-izquierda, (1,1) abajo-derecha.
 */
export interface CoreSlot {
  index: number;
  /** Centro del núcleo (0..1). */
  cx: number;
  cy: number;
  /** Ancho y alto del núcleo como fracción del ancho y del alto del escenario. */
  w: number;
  h: number;
}

/** Márgenes del die dentro del escenario (fracción). */
export const DIE_INSET = { x: 0.1, y: 0.14 } as const;

export function coreLayout(count: number, aspect: number): CoreSlot[] {
  if (count <= 0) return [];
  // Más columnas que filas en un escenario apaisado.
  const cols = Math.min(count, Math.max(1, Math.round(Math.sqrt(count * Math.max(1, aspect) * 0.75))));
  const rows = Math.ceil(count / cols);
  const areaW = 1 - DIE_INSET.x * 2;
  const areaH = 1 - DIE_INSET.y * 2;
  const cellW = areaW / cols;
  const cellH = areaH / rows;
  // Núcleos cuadrados en píxeles: el lado en píxeles es min(cellW·aspect, cellH)·0.62 (aspect = ancho/alto).
  const side = Math.min(cellW * aspect, cellH) * 0.62;
  return Array.from({ length: count }, (_, index) => {
    const col = index % cols;
    const row = Math.floor(index / cols);
    // La última fila se centra si queda incompleta.
    const inRow = row === rows - 1 ? count - row * cols : cols;
    const offset = ((cols - inRow) * cellW) / 2;
    return {
      index,
      cx: DIE_INSET.x + offset + cellW * (col + 0.5),
      cy: DIE_INSET.y + cellH * (row + 0.5),
      w: side / aspect,
      h: side,
    };
  });
}
