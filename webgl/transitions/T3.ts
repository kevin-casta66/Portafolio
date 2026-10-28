import type { CanvasTransition } from "./state";

/**
 * T3 · LEXER → PARSER (canvas). Las ramas del árbol se dibujan como tubos iluminados que crecen a lo
 * largo de curvas desde cada nodo padre hasta su hijo, recorridos por un pulso de luz; los nodos
 * reales del árbol crecen fila a fila con el scroll (`buildTreeGrowth`, coreografía de PARSER), igual
 * que en la versión DOM, y al terminar los tubos se desvanecen sobre los nodos interactivos. Tier
 * bajo y movimiento reducido usan las ramas SVG del change 03.
 */

export const T3: CanvasTransition = {
  id: "T3",
  order: 100,
  dom() {
    // Sin capa DOM propia: los nodos los revela el crecimiento del árbol atado al scroll.
  },
  load: () => import("./T3.scene").then((m) => m.createT3Scene),
};
