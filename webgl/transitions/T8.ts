import type { CanvasTransition } from "./state";

/**
 * T8 · RUNTIME → GPU (canvas, «rasterización»). La imagen del chip se pixela progresivamente con el
 * scroll (el tamaño de bloque crece de 1 a 12 celdas, con el promedio de cada bloque muestreado de
 * la cadena de mipmaps) hasta desvanecerse en una malla de vértices que se triangula en tiempo real
 * (Delaunay calculado en un Web Worker). Todo el cambio ocurre en el canvas: no hay nada en el DOM
 * que ocultar. Tier bajo/reducida: puente de celdas SVG (change 03).
 */
export const T8: CanvasTransition = {
  id: "T8",
  order: 100,
  load: () => import("./T8.scene").then((m) => m.createT8Scene),
};
