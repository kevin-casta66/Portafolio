import { buildTreeReveal } from "@/motion/choreography/tree-reveal";
import type { CanvasTransition } from "./state";

/**
 * T3 · LEXER → PARSER (canvas). Las ramas del árbol se dibujan como tubos iluminados que crecen a lo
 * largo de curvas desde cada nodo padre hasta su hijo, recorridos por un pulso de luz; los nodos
 * reales del árbol aparecen con el mismo revelado de resorte de la versión DOM, así que al terminar
 * los tubos se desvanecen sobre las posiciones EXACTAS de los nodos interactivos. Tier bajo y
 * movimiento reducido usan las ramas SVG del change 03.
 */
const REVEAL_AT = 0.2; // los nodos empiezan a aparecer cuando los primeros tubos ya crecen
const REVEAL_SPAN = 0.72; // el revelado del árbol ocupa este tramo (termina en 0,92)

export const T3: CanvasTransition = {
  id: "T3",
  order: 100,
  dom(ctx, tl) {
    const reveal = buildTreeReveal(ctx.root);
    reveal.duration(REVEAL_SPAN);
    tl.add(reveal, REVEAL_AT);
  },
  load: () => import("./T3.scene").then((m) => m.createT3Scene),
};
