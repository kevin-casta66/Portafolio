import type { HeapCell, HeapLayout } from "./layout";

export type HeapMove = "left" | "right" | "up" | "down" | "first" | "last";

/**
 * Siguiente bloque al pulsar una flecha / Inicio / Fin (patrón grid, design D8). Las etiquetas de
 * grupo no reciben foco: arriba/abajo saltan a la siguiente fila con bloques, eligiendo la columna
 * más cercana. Devuelve la misma clave si no hay a dónde moverse (los extremos no envuelven).
 */
export function moveFocus(layout: HeapLayout, from: string, move: HeapMove): string {
  const cells = layout.cells;
  if (cells.length === 0) return from;
  if (move === "first") return (cells[0] as HeapCell).key;
  if (move === "last") return (cells[cells.length - 1] as HeapCell).key;
  const current = cells.find((c) => c.key === from);
  if (!current) return (cells[0] as HeapCell).key;

  if (move === "left" || move === "right") {
    const step = move === "right" ? 1 : -1;
    const neighbour = cells.find((c) => c.row === current.row && c.col === current.col + step);
    return neighbour?.key ?? from;
  }

  const rows = [...new Set(cells.map((c) => c.row))].sort((a, b) => a - b);
  const at = rows.indexOf(current.row);
  const targetRow = rows[at + (move === "down" ? 1 : -1)];
  if (targetRow === undefined) return from;
  const candidates = cells.filter((c) => c.row === targetRow);
  const nearest = candidates.reduce((best, c) =>
    Math.abs(c.col - current.col) < Math.abs(best.col - current.col) ? c : best,
  );
  return nearest.key;
}
