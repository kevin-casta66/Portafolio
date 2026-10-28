import { EASE, gsap } from "../gsap";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";
import { createLayer, qa } from "./dom";
import { addFlight, type FlyPair } from "./fly";

/**
 * T5 · BYTECODE → RUNTIME (versión DOM/SVG). Un barrido en espacio de pantalla, teñido con el acento
 * ámbar y con borde de dithering ordenado (matriz Bayer 4×4 como `mask-image` SVG), recorre la
 * pantalla con el scroll; bajo él las instrucciones se convierten en los procesos de RUNTIME y las
 * tarjetas se encienden una a una. Fila T5 de docs/MOTION-SPEC.md.
 */
const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Patrón Bayer con densidad `level/16` como imagen SVG (solo el canal alfa importa para la máscara). */
function bayerMask(level: number): string {
  const rects = BAYER.flatMap((row, y) =>
    row.map((value, x) => (value < level ? `<rect x='${x}' y='${y}' width='1' height='1'/>` : "")),
  ).join("");
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='4' height='4' viewBox='0 0 4 4' shape-rendering='crispEdges' fill='black'>${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const DENSITIES = [4, 8, 12, 16];

function buildSweep(layer: HTMLElement): HTMLDivElement {
  const sweep = document.createElement("div");
  sweep.style.position = "absolute";
  sweep.style.left = "0";
  sweep.style.right = "0";
  sweep.style.top = "0";
  sweep.style.height = "140vh";
  const body = document.createElement("div");
  body.style.height = "100vh";
  body.style.background = "var(--accent-runtime)";
  body.style.opacity = "0.16";
  sweep.appendChild(body);
  // Borde dithered: cuatro franjas de densidad creciente hacia el cuerpo del barrido.
  const edge = document.createElement("div");
  edge.style.height = "40vh";
  edge.style.display = "flex";
  edge.style.flexDirection = "column-reverse";
  for (const level of DENSITIES) {
    const strip = document.createElement("div");
    strip.style.flex = "1";
    strip.style.background = "var(--accent-runtime)";
    strip.style.opacity = "0.16";
    const mask = bayerMask(level);
    strip.style.maskImage = mask;
    strip.style.setProperty("-webkit-mask-image", mask);
    strip.style.maskSize = "8px 8px";
    strip.style.setProperty("-webkit-mask-size", "8px 8px");
    strip.style.imageRendering = "pixelated";
    edge.appendChild(strip);
  }
  sweep.appendChild(edge);
  layer.appendChild(sweep);
  return sweep;
}

function buildDom(ctx: TransitionContext): TransitionHandle {
  const layer = createLayer("fixed", "T5", 25);
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const sweep = buildSweep(layer);
    // El frente baja de arriba a abajo; al final el barrido sale por el borde inferior.
    timeline.fromTo(sweep, { yPercent: -100 }, { yPercent: 71, duration: 1, ease: EASE.scene }, 0);

    const cards = qa(ctx.root, "#runtime article[data-anim='process-card']");
    // Los núcleos (tarjetas) se encienden uno a uno, en orden.
    if (cards.length > 0) {
      timeline.fromTo(
        cards,
        { opacity: 0.35, filter: "brightness(1.7)" },
        { opacity: 1, filter: "brightness(1)", duration: 0.25, ease: EASE.inExpo, stagger: 0.09 },
        0.3,
      );
    }
    if (!ctx.compact) {
      // Las instrucciones del último empleo se convierten en los procesos.
      const labels = qa(
        ctx.root,
        "#bytecode li[data-anim='function']:last-child li[data-anim='instruction'] code",
      ).slice(0, 4);
      const targets = cards
        .map((card) => card.querySelector<HTMLElement>("p"))
        .filter((el): el is HTMLElement => !!el);
      const pairs: FlyPair[] = labels
        .map((from, i) => ({ from, to: targets[i] as HTMLElement }))
        .filter((p) => p.to);
      addFlight(timeline, pairs, { layer, depth: 1.3, spread: 0.2, at: 0.15, length: 0.45 });
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
    const cards = qa(ctx.root, "#runtime article[data-anim='process-card']");
    // Fundido cruzado: núcleos ya encendidos, sin barrido ni vuelos.
    if (cards.length > 0)
      timeline.fromTo(
        cards,
        { opacity: 0.4 },
        { opacity: 1, duration: 0.3, ease: "none", stagger: 0.05 },
      );
  }, ctx.root);
  return { timeline, destroy: () => scope.revert() };
}

export const T5: TransitionDef = {
  id: "T5",
  from: "bytecode",
  to: "runtime",
  range: ({ root }) => {
    const trigger = root.querySelector("#runtime");
    return trigger ? { trigger, start: "top 95%", end: "top 10%" } : null;
  },
  variants: { dom: buildDom, reduced: buildReduced },
};
