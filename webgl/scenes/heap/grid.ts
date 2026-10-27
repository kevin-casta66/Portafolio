import type { HeapLayout } from "@/lib/heap";
import { wrap } from "./inertia";

/**
 * Geometría de la cuadrícula del heap (pura). Las celdas del layout (`lib/heap/layout.ts`) se colocan en un
 * «tile» de `columns × rows` celdas que se REPITE sin bordes en ambas direcciones: la infinitud es un
 * desplazamiento módulo el tamaño del tile, y el número de instancias solo depende del tamaño del
 * viewport (copias visibles), nunca del contenido.
 */
export const CELL_W = 232;
export const CELL_H = 168;
export const GAP = 20;
export const PITCH_X = CELL_W + GAP;
export const PITCH_Y = CELL_H + GAP;
/** Margen interior del escenario antes de la primera celda (px). */
export const STAGE_PAD = 24;
/** Tope de copias por eje: acota el coste aunque el viewport sea enorme (4K con un tile de 2 celdas). */
export const MAX_COPIES = 6;

export interface Tile {
  w: number;
  h: number;
}

export function tileOf(layout: HeapLayout): Tile {
  return { w: Math.max(1, layout.columns) * PITCH_X, h: Math.max(1, layout.rows) * PITCH_Y };
}

export interface Slot {
  key: string;
  /** Esquina superior izquierda del bloque en coordenadas del tile (px, y hacia abajo). */
  x: number;
  y: number;
}

export function slotsOf(layout: HeapLayout): Slot[] {
  return layout.cells.map((c) => ({ key: c.key, x: c.col * PITCH_X, y: c.row * PITCH_Y }));
}

/** Copias del tile necesarias por eje para cubrir un viewport, con una de margen para la envoltura. */
export function copiesFor(viewW: number, viewH: number, tile: Tile): { nx: number; ny: number } {
  const n = (view: number, size: number) => Math.min(MAX_COPIES, Math.max(2, Math.ceil(view / size) + 1));
  return { nx: n(viewW, tile.w), ny: n(viewH, tile.h) };
}

/** Desplazamiento de envoltura: `pan` módulo el tile (siempre en [0, tile)). */
export const wrappedPan = (pan: { x: number; y: number }, tile: Tile): { x: number; y: number } => ({
  x: wrap(pan.x, tile.w),
  y: wrap(pan.y, tile.h),
});

/**
 * Bloque que hay en el punto `(qx, qy)` del espacio del tile (ya sin origen ni pan; se envuelve aquí).
 * Devuelve `null` si cae en la separación entre celdas, en una fila de etiqueta o en una celda vacía.
 */
export function blockAtPoint(layout: HeapLayout, qx: number, qy: number): { key: string; x: number; y: number } | null {
  const tile = tileOf(layout);
  const tx = wrap(qx, tile.w);
  const ty = wrap(qy, tile.h);
  const col = Math.floor(tx / PITCH_X);
  const row = Math.floor(ty / PITCH_Y);
  if (tx - col * PITCH_X >= CELL_W || ty - row * PITCH_Y >= CELL_H) return null;
  const cell = layout.cells.find((c) => c.col === col && c.row === row);
  return cell ? { key: cell.key, x: col * PITCH_X, y: row * PITCH_Y } : null;
}

/** Pan que deja el bloque `slot` en el centro del escenario (mismo espacio que `pan`). */
export function panToCenter(slot: Slot, stageW: number, stageH: number): { x: number; y: number } {
  return {
    x: stageW / 2 - STAGE_PAD - slot.x - CELL_W / 2,
    y: stageH / 2 - STAGE_PAD - slot.y - CELL_H / 2,
  };
}
