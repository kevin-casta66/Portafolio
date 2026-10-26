import { EASE, gsap } from "../gsap";
import { postOrder } from "../tree-order";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";
import { docRect, qa } from "./dom";

/**
 * T4 · PARSER → BYTECODE (versión DOM). El árbol se aplana colapsando sus nodos en recorrido
 * post-order (cada hoja antes que su rama, la raíz «Developer» la última) hacia una columna lineal
 * que se convierte en la lista vertical de funciones de BYTECODE, cuyas tarjetas se revelan con el
 * scroll. Reducida: solo el revelado de la lista. Fila T4 de docs/MOTION-SPEC.md.
 */
function revealFunctions(tl: gsap.core.Timeline, ctx: TransitionContext, at: number) {
  const functions = qa(ctx.root, "#bytecode li[data-anim='function']");
  if (functions.length > 0) {
    tl.fromTo(
      functions,
      { opacity: 0, y: 48 },
      { opacity: 1, y: 0, duration: 0.3, ease: EASE.inExpo, stagger: 0.12 },
      at,
    );
  }
}

function buildDom(ctx: TransitionContext): TransitionHandle {
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const rows = qa(ctx.root, "#parser [role='treeitem']");
    if (!ctx.compact && rows.length > 0) {
      // Cada nodo se anima a través de su <li> contenedor (la fila ya usa opacity para el atenuado).
      const items = rows.map((row) => row.closest<HTMLElement>("li") ?? row);
      const order = postOrder(rows.map((row) => Number(row.getAttribute("aria-level") ?? 1)));
      const column = qa(ctx.root, "#bytecode li[data-anim='function']")[0];
      const colX = column ? docRect(column).x : 0;
      const treeTop = docRect(items[0] as HTMLElement).y;
      const n = order.length;
      order.forEach((index, k) => {
        const li = items[index] as HTMLElement;
        const rect = docRect(li);
        timeline.to(
          li,
          {
            x: colX - rect.x,
            y: treeTop + k * 6 - rect.y,
            scale: 0.4,
            opacity: 0,
            transformOrigin: "0 0",
            duration: 0.14,
            ease: EASE.scene,
          },
          0.02 + k * (0.55 / n),
        );
      });
    }
    revealFunctions(timeline, ctx, ctx.compact ? 0 : 0.5);
  }, ctx.root);
  return { timeline, destroy: () => scope.revert() };
}

function buildReduced(ctx: TransitionContext): TransitionHandle {
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true });
    const functions = qa(ctx.root, "#bytecode li[data-anim='function']");
    if (functions.length > 0)
      timeline.fromTo(
        functions,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "none", stagger: 0.1 },
      );
  }, ctx.root);
  return { timeline, destroy: () => scope.revert() };
}

export const T4: TransitionDef = {
  id: "T4",
  from: "parser",
  to: "bytecode",
  range: ({ root }) => {
    const trigger = root.querySelector("#bytecode");
    return trigger ? { trigger, start: "top 95%", end: "top 25%" } : null;
  },
  variants: { dom: buildDom, reduced: buildReduced },
};
