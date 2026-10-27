import type { HeapBlock } from "./blocks";

/**
 * Layout del heap (design D3): UNA función pura que alimenta la cuadrícula 3D, la 2D y el orden de la
 * lista, de modo que «Run GC» y la lista siempre coinciden. Cada bloque aparece exactamente una vez:
 * con el criterio `tech` va al grupo de su tecnología principal (la primera de su stack).
 */
export const HEAP_CRITERIA = ["none", "tech", "year"] as const;
export type HeapCriterion = (typeof HEAP_CRITERIA)[number];
export const isHeapCriterion = (value: unknown): value is HeapCriterion =>
  typeof value === "string" && (HEAP_CRITERIA as readonly string[]).includes(value);

export const DEFAULT_COLUMNS = 4;

export interface HeapCell {
  key: string;
  col: number;
  row: number;
  /** Id del grupo al que pertenece (`null` con el criterio `none`). */
  group: string | null;
}

export interface HeapGroup {
  /** `tech:<idHabilidad>` o `year:<año>`. */
  id: string;
  /** Id de habilidad (`tech`) o año en texto (`year`): la UI traduce el id a nombre. */
  label: string;
  /** Fila donde se dibuja la etiqueta; las celdas del grupo empiezan en `row + 1`. */
  row: number;
  count: number;
}

export interface HeapLayout {
  criterion: HeapCriterion;
  columns: number;
  /** Celdas en orden de lectura (fila, columna): es también el orden de la lista accesible. */
  cells: HeapCell[];
  groups: HeapGroup[];
  /** Total de filas ocupadas (etiquetas incluidas). */
  rows: number;
}

function place(blocks: readonly HeapBlock[], columns: number, firstRow: number, group: string | null): HeapCell[] {
  return blocks.map((block, i) => ({
    key: block.key,
    col: i % columns,
    row: firstRow + Math.floor(i / columns),
    group,
  }));
}

export function layoutBlocks(
  blocks: readonly HeapBlock[],
  criterion: HeapCriterion,
  columns: number = DEFAULT_COLUMNS,
): HeapLayout {
  const cols = Math.max(1, Math.floor(columns));
  if (criterion === "none") {
    const cells = place(blocks, cols, 0, null);
    return { criterion, columns: cols, cells, groups: [], rows: Math.ceil(blocks.length / cols) };
  }

  const buckets = new Map<string, { label: string; blocks: HeapBlock[] }>();
  for (const block of blocks) {
    const label = criterion === "tech" ? block.primaryTech : String(block.year);
    const id = `${criterion}:${label}`;
    const bucket = buckets.get(id) ?? { label, blocks: [] };
    bucket.blocks.push(block);
    buckets.set(id, bucket);
  }
  // `tech`: más bloques primero, luego por id; `year`: cronológico (más antiguo primero).
  const ordered = [...buckets.entries()].sort(([, a], [, b]) =>
    criterion === "year"
      ? Number(a.label) - Number(b.label)
      : b.blocks.length - a.blocks.length || (a.label < b.label ? -1 : a.label > b.label ? 1 : 0),
  );

  const cells: HeapCell[] = [];
  const groups: HeapGroup[] = [];
  let row = 0;
  for (const [id, bucket] of ordered) {
    groups.push({ id, label: bucket.label, row, count: bucket.blocks.length });
    cells.push(...place(bucket.blocks, cols, row + 1, id));
    row += 1 + Math.ceil(bucket.blocks.length / cols);
  }
  return { criterion, columns: cols, cells, groups, rows: row };
}

/** Bloques en el orden del layout (el de la lista accesible). */
export function orderBlocks(blocks: readonly HeapBlock[], layout: HeapLayout): HeapBlock[] {
  const byKey = new Map(blocks.map((b) => [b.key, b]));
  return layout.cells.map((c) => byKey.get(c.key) as HeapBlock);
}
