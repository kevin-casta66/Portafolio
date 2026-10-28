import { T3_END_EDGE, headRows } from "../choreography/tree-reveal";
import { EASE, gsap } from "../gsap";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";
import { createLayer, qa } from "./dom";
import { addFlight, type FlyPair } from "./fly";

/**
 * T3 · LEXER → PARSER (versión DOM/SVG). Los tokens de la biografía vuelan desde sus carriles (de
 * primera a última posición) y se acoplan como los primeros nodos del árbol, que crece desde arriba.
 * El tramo va anclado al ÁRBOL (no al título de la sección) para que todo ocurra en pantalla, y cada
 * clon aterriza cuando su nodo aparece: el crecimiento del árbol (ramas y nodos con resorte, fila a
 * fila con el scroll) lo hace `buildTreeGrowth` desde la coreografía de PARSER. Al terminar, los
 * clones desaparecen sobre las posiciones EXACTAS de los nodos reales. Fila T3 de docs/MOTION-SPEC.md.
 */
function buildDom(ctx: TransitionContext): TransitionHandle {
  const layer = createLayer("absolute", "T3");
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    if (!ctx.compact) {
      const tokens = qa(ctx.root, "#lexer [data-anim='token']");
      // Solo los nodos que ya han aparecido al final del tramo (borde del árbol al 40 %): el primero
      // aterriza a mitad del tramo, cuando aparece la raíz, y el último al terminar.
      const rows = headRows(ctx.root, T3_END_EDGE);
      const pairs: FlyPair[] = tokens
        .slice(0, rows.length)
        .map((from, i) => ({ from, to: rows[i] as HTMLElement }));
      addFlight(timeline, pairs, { layer, depth: 1.4, spread: 0.5, at: 0.1, length: 0.4 });
      // Duración fija: la posición de cada aterrizaje es una fracción del tramo aunque falten clones.
      timeline.set({}, {}, 1);
    } else {
      // Móvil: el árbol aparece con fundido + desplazamiento, sin vuelos.
      const tree = qa(ctx.root, "#parser [role='tree']");
      if (tree.length > 0)
        timeline.fromTo(
          tree,
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.5, ease: EASE.inExpo },
        );
    }
  }, ctx.root);
  return {
    timeline,
    destroy() {
      scope.revert();
      layer.remove();
    },
  };
}

function buildReduced(ctx: TransitionContext): TransitionHandle {
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true });
    const tree = qa(ctx.root, "#parser [role='tree']");
    // Ramas estáticas con fundido: sin vuelos, sin trazo, sin desplazamientos.
    if (tree.length > 0)
      timeline.fromTo(tree, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" });
  }, ctx.root);
  return { timeline, destroy: () => scope.revert() };
}

export const T3: TransitionDef = {
  id: "T3",
  from: "lexer",
  to: "parser",
  range: ({ root }) => {
    const trigger = root.querySelector("#parser [role='tree']");
    return trigger ? { trigger, start: "top bottom", end: `top ${T3_END_EDGE * 100}%` } : null;
  },
  variants: { dom: buildDom, reduced: buildReduced },
};
