import { EASE, gsap } from "../gsap";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";
import { createLayer, qa } from "./dom";
import { addFlight, type FlyPair } from "./fly";

/**
 * T2 · SOURCE → LEXER (versión DOM). La línea `const dev = new Developer("…")` se fragmenta en sus
 * tokens, que se colorean por tipo (ya lo están en el hero) y viajan con profundidad simulada por
 * escala a los carriles del analizador léxico, sincronizado con el scroll. Fila T2 de
 * docs/MOTION-SPEC.md. Reducida: los tokens del lexer aparecen con fundido escalonado.
 */
type TokenKind = "keyword" | "identifier" | "string" | "number";

/** Carril de destino de cada tipo de token de la línea de código. */
const LANE_OF: Record<string, TokenKind> = {
  keyword: "keyword",
  operator: "keyword",
  identifier: "identifier",
  type: "identifier",
  punct: "identifier",
  string: "string",
};

function laneHeadings(root: HTMLElement): Map<string, HTMLElement> {
  const map = new Map<string, HTMLElement>();
  for (const lane of qa(root, "#lexer [data-lane]")) {
    const heading = lane.querySelector<HTMLElement>("h3");
    if (heading && lane.dataset.lane) map.set(lane.dataset.lane, heading);
  }
  return map;
}

function buildDom(ctx: TransitionContext): TransitionHandle {
  const layer = createLayer("absolute", "T2");
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const laneTokens = qa(ctx.root, "#lexer [data-anim='token']");

    if (!ctx.compact) {
      const headings = laneHeadings(ctx.root);
      const fallback = headings.get("keyword") ?? headings.values().next().value;
      const cursor = new Map<string, number>(); // x acumulado por carril
      const pairs: FlyPair[] = [];
      for (const token of qa(ctx.root, "#source [data-token]")) {
        const lane = LANE_OF[token.dataset.token ?? ""] ?? "keyword";
        const to = headings.get(lane) ?? fallback;
        if (!to) continue;
        const used = cursor.get(lane) ?? 0;
        cursor.set(lane, used + token.getBoundingClientRect().width + 8);
        pairs.push({ from: token, to, offsetX: to.getBoundingClientRect().width + 12 + used });
      }
      addFlight(timeline, pairs, { layer, at: 0, spread: 0.25, length: 0.55 });
    }
    // Los tokens del lexer se ordenan en sus carriles al final del vuelo.
    if (laneTokens.length > 0) {
      timeline.fromTo(
        laneTokens,
        { opacity: 0, y: ctx.compact ? 24 : 16 },
        { opacity: 1, y: 0, duration: 0.3, ease: EASE.inExpo, stagger: 0.04 },
        ctx.compact ? 0 : 0.6,
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
    const tokens = qa(ctx.root, "#lexer [data-anim='token']");
    if (tokens.length > 0)
      timeline.fromTo(
        tokens,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: "none", stagger: 0.06 },
      );
  }, ctx.root);
  return { timeline, destroy: () => scope.revert() };
}

export const T2: TransitionDef = {
  id: "T2",
  from: "source",
  to: "lexer",
  range: ({ root }) => {
    const trigger = root.querySelector("#lexer");
    return trigger ? { trigger, start: "top bottom", end: "top 40%" } : null;
  },
  variants: { dom: buildDom, reduced: buildReduced },
};
