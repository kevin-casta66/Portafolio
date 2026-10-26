import { chipBitmap, downsample, triangulatedMesh } from "../chip";
import { EASE, gsap } from "../gsap";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";
import { createLayer, docRect, qa } from "./dom";

/**
 * T8 · RUNTIME → GPU (versión DOM/SVG). El chip (die con núcleos y pines) se pixela
 * progresivamente con el scroll —celdas cada vez mayores— hasta convertirse en una malla de
 * vértices unidos por aristas (triángulos) que da paso a la sección GPU. Cada nivel de pixelado es
 * un grupo SVG; se encadenan con fundidos (opacity). Fila T8 de docs/MOTION-SPEC.md.
 */
const COLS = 48;
const ROWS = 30;
const CELL = 10;
const SVG_NS = "http://www.w3.org/2000/svg";
/** Tamaños de bloque de cada nivel de pixelado: 1 (nítido) → 8 (muy grueso). */
const BLOCKS = [1, 2, 4, 8];

const svgEl = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] => {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
  return el;
};

function buildChip(): { svg: SVGSVGElement; levels: SVGGElement[]; mesh: SVGGElement } {
  const svg = svgEl("svg", {
    viewBox: `0 0 ${COLS * CELL} ${ROWS * CELL}`,
    width: "100%",
    preserveAspectRatio: "xMidYMid meet",
  });
  const bitmap = chipBitmap(COLS, ROWS);

  const levels = BLOCKS.map((block) => {
    const g = svgEl("g");
    const data = block === 1 ? bitmap : downsample(bitmap, block);
    data.forEach((row, y) =>
      row.forEach((value, x) => {
        if (value < 0.08) return;
        g.appendChild(
          svgEl("rect", {
            x: x * block * CELL,
            y: y * block * CELL,
            width: block * CELL,
            height: block * CELL,
            fill: "var(--accent-runtime)",
            "fill-opacity": (value * 0.9).toFixed(2),
          }),
        );
      }),
    );
    svg.appendChild(g);
    return g;
  });

  // Malla triangulada: vértices cada 4 celdas con aristas horizontales, verticales y diagonales.
  const mesh = svgEl("g");
  const step = 4 * CELL;
  const { points, edges } = triangulatedMesh(COLS / 4 + 1, ROWS / 4 + 1, step);
  for (const [a, b] of edges) {
    const p = points[a];
    const q = points[b];
    if (!p || !q) continue;
    mesh.appendChild(
      svgEl("line", {
        x1: p.x,
        y1: p.y,
        x2: q.x,
        y2: q.y,
        stroke: "var(--accent-gpu)",
        "stroke-opacity": 0.5,
        "stroke-width": 1,
        "vector-effect": "non-scaling-stroke",
      }),
    );
  }
  for (const p of points)
    mesh.appendChild(svgEl("circle", { cx: p.x, cy: p.y, r: 3, fill: "var(--accent-gpu)" }));
  svg.appendChild(mesh);
  return { svg, levels, mesh };
}

function buildDom(ctx: TransitionContext): TransitionHandle {
  const layer = createLayer("absolute", "T8", 20);
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const gpu = ctx.root.querySelector("#gpu");
    if (!gpu) return;

    const { svg, levels, mesh } = buildChip();
    const bridge = document.createElement("div");
    const width = Math.min(900, window.innerWidth * (ctx.compact ? 0.92 : 0.8));
    const height = (width * ROWS) / COLS;
    const boundary = docRect(gpu).y;
    Object.assign(bridge.style, {
      position: "absolute",
      width: `${width}px`,
      left: `${(document.documentElement.clientWidth - width) / 2}px`,
      top: `${boundary - height * 0.55}px`,
    });
    bridge.appendChild(svg);
    layer.appendChild(bridge);

    const [l0, l1, l2, l3] = levels as [SVGGElement, SVGGElement, SVGGElement, SVGGElement];
    // Todo el puente aparece y desaparece; el chip nunca tapa el contenido (opacidad máxima moderada).
    timeline.fromTo(bridge, { opacity: 0 }, { opacity: 0.55, duration: 0.12 }, 0);
    timeline.fromTo([l1, l2, l3, mesh], { opacity: 0 }, { opacity: 0, duration: 0.001 }, 0);
    // Pixelado: 1 → 2 → 4 → 8 por crossfades sucesivos.
    timeline
      .to(l0, { opacity: 0, duration: 0.1 }, 0.15)
      .to(l1, { opacity: 1, duration: 0.1 }, 0.15);
    timeline.to(l1, { opacity: 0, duration: 0.1 }, 0.3).to(l2, { opacity: 1, duration: 0.1 }, 0.3);
    timeline
      .to(l2, { opacity: 0, duration: 0.1 }, 0.42)
      .to(l3, { opacity: 1, duration: 0.1 }, 0.42);
    // Aparece la malla de vértices y aristas; el chip pixelado se retira.
    timeline.to(mesh, { opacity: 1, duration: 0.2, ease: EASE.inExpo }, 0.45);
    timeline.to(l3, { opacity: 0, duration: 0.15 }, 0.62);
    timeline.to(bridge, { opacity: 0, duration: 0.12 }, 0.88);
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
    const cards = qa(ctx.root, "#gpu article");
    // Sin chip ni pixelado: las tarjetas del laboratorio entran con un fundido.
    if (cards.length > 0)
      timeline.fromTo(
        cards,
        { opacity: 0.4 },
        { opacity: 1, duration: 0.4, ease: "none", stagger: 0.05 },
      );
  }, ctx.root);
  return { timeline, destroy: () => scope.revert() };
}

export const T8: TransitionDef = {
  id: "T8",
  from: "runtime",
  to: "gpu",
  range: ({ root }) => {
    const trigger = root.querySelector("#gpu");
    return trigger ? { trigger, start: "top bottom", end: "top 25%" } : null;
  },
  variants: { dom: buildDom, reduced: buildReduced },
};
