import { buildTreeReveal } from "../choreography/tree-reveal";
import { EASE, gsap } from "../gsap";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";
import { createLayer, qa } from "./dom";
import { addFlight, type FlyPair } from "./fly";

/**
 * T3 · LEXER → PARSER (versión DOM/SVG). Los tokens de la biografía vuelan desde sus carriles (de
 * primera a última posición) y se acoplan como los primeros nodos del árbol, que crece desde arriba:
 * las ramas se dibujan como trazos SVG desde la raíz y los nodos aparecen con resorte. Al terminar,
 * los clones desaparecen sobre las posiciones EXACTAS de los nodos reales, que son el árbol
 * interactivo. Fila T3 de docs/MOTION-SPEC.md.
 */
function buildDom(ctx: TransitionContext): TransitionHandle {
  const layer = createLayer("absolute", "T3");
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    if (!ctx.compact) {
      const tokens = qa(ctx.root, "#lexer [data-anim='token']");
      const rows = qa(ctx.root, "#parser [role='treeitem']");
      const pairs: FlyPair[] = tokens
        .slice(0, rows.length)
        .map((from, i) => ({ from, to: rows[i] as HTMLElement }));
      addFlight(timeline, pairs, { layer, depth: 1.4, spread: 0.2, at: 0, length: 0.5 });
      timeline.add(buildTreeReveal(ctx.root), 0.45);
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
      timeline.fromTo(tree, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: "none" });
  }, ctx.root);
  return { timeline, destroy: () => scope.revert() };
}

export const T3: TransitionDef = {
  id: "T3",
  from: "lexer",
  to: "parser",
  range: ({ root }) => {
    const trigger = root.querySelector("#parser");
    return trigger ? { trigger, start: "top bottom", end: "top 40%" } : null;
  },
  variants: { dom: buildDom, reduced: buildReduced },
};
