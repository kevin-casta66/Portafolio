import { T4 as T4_DOM } from "@/motion/transitions/T4-parser-bytecode";
import type { CanvasTransition } from "./state";

/**
 * T4 · PARSER → BYTECODE (canvas). El árbol colapsa en recorrido post-order hacia la columna de
 * funciones (el mismo colapso DOM del change 03) mientras un túnel infinito de anillos —uno por
 * empleo, en el orden del DOM— pasa por la cámara con el scroll. Tier bajo/reducida: lista vertical
 * con revelado (change 03).
 */
export const T4: CanvasTransition = {
  id: "T4",
  order: 100,
  dom(ctx, tl) {
    // Reutiliza el colapso post-order y el revelado de las funciones de la versión DOM, normalizados
    // a la duración 1 de esta timeline.
    const factory = T4_DOM.variants.dom;
    if (!factory) return;
    const handle = factory(ctx);
    const inner = handle.timeline as gsap.core.Timeline;
    // La versión DOM crea su timeline en pausa; anidada debe avanzar con su padre (GSAP no
    // renderiza hijos pausados), si no las funciones de BYTECODE se quedan en opacity 0.
    inner.paused(false).duration(1);
    tl.add(inner, 0);
    return () => handle.destroy();
  },
  load: () => import("./T4.scene").then((m) => m.createT4Scene),
};
