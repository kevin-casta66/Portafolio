import { perimeterPoints, seededRandom } from "../chip";
import { EASE, gsap } from "../gsap";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";
import { createLayer, docRect } from "./dom";

/**
 * T9 · GPU → DISPLAY (versión DOM/SVG). Los «píxeles» de la sección GPU migran con el scroll hasta
 * formar la silueta del monitor alrededor del formulario de contacto; en el momento del ensamblaje
 * aparece el gradiente espectral con todos los acentos (también es el acento activo de DISPLAY). El
 * marco queda dibujado como decoración (aria-hidden). Fila T9 de docs/MOTION-SPEC.md.
 */
const SVG_NS = "http://www.w3.org/2000/svg";
const ACCENTS = ["source", "parser", "bytecode", "runtime", "gpu"] as const;
const CELLS = 90;
const PAD = 28;

/** Marco del monitor alrededor del formulario, acotado al ancho del documento (sin desbordar en móvil). */
function monitorRect(form: HTMLElement) {
  const f = docRect(form);
  const edge = 4;
  const docWidth = document.documentElement.clientWidth;
  const left = Math.max(edge, f.x - PAD);
  const right = Math.min(docWidth - edge, f.x + f.w + PAD);
  return { x: left, y: f.y - PAD, w: right - left, h: f.h + PAD * 2 };
}

function buildFrame(x: number, y: number, w: number, h: number) {
  const svg = document.createElementNS(SVG_NS, "svg");
  const stand = 36;
  const total = h + stand;
  svg.setAttribute("viewBox", `0 0 ${w} ${total}`);
  Object.assign(svg.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${total}px`,
    overflow: "visible",
  });
  const defs = document.createElementNS(SVG_NS, "defs");
  const gradient = document.createElementNS(SVG_NS, "linearGradient");
  gradient.setAttribute("id", "t9-spectrum");
  gradient.setAttribute("x1", "0");
  gradient.setAttribute("x2", "1");
  ACCENTS.forEach((accent, i) => {
    const stop = document.createElementNS(SVG_NS, "stop");
    stop.setAttribute("offset", String(i / (ACCENTS.length - 1)));
    stop.style.stopColor = `var(--accent-${accent})`;
    gradient.appendChild(stop);
  });
  defs.appendChild(gradient);
  svg.appendChild(defs);

  const frame = document.createElementNS(SVG_NS, "rect");
  for (const [k, v] of Object.entries({
    x: 1.5,
    y: 1.5,
    width: w - 3,
    height: h - 3,
    rx: 18,
    fill: "none",
    stroke: "url(#t9-spectrum)",
    "stroke-width": 3,
  }))
    frame.setAttribute(k, String(v));
  const base = document.createElementNS(SVG_NS, "path");
  base.setAttribute(
    "d",
    `M${w / 2 - 28} ${h + 2} L${w / 2 - 44} ${total - 2} H${w / 2 + 44} L${w / 2 + 28} ${h + 2}`,
  );
  for (const [k, v] of Object.entries({
    fill: "none",
    stroke: "url(#t9-spectrum)",
    "stroke-width": 3,
    "stroke-linejoin": "round",
  }))
    base.setAttribute(k, String(v));
  svg.append(frame, base);
  return { svg, frame, base };
}

function buildDom(ctx: TransitionContext): TransitionHandle {
  const layer = createLayer("absolute", "T9", 20);
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true, defaults: { ease: "none" } });
    const form = ctx.root.querySelector<HTMLElement>("#display form");
    const gpu = ctx.root.querySelector<HTMLElement>("#gpu");
    if (!form || !gpu) return;

    const frameRect = monitorRect(form);
    const { svg, frame, base } = buildFrame(frameRect.x, frameRect.y, frameRect.w, frameRect.h);
    layer.appendChild(svg);

    if (!ctx.compact) {
      const g = docRect(gpu);
      const random = seededRandom(2026);
      const targets = perimeterPoints(frameRect.x, frameRect.y, frameRect.w, frameRect.h, CELLS);
      const cells = Array.from({ length: CELLS }, (_, i) => {
        const cell = document.createElement("div");
        Object.assign(cell.style, {
          position: "absolute",
          left: "0",
          top: "0",
          width: "8px",
          height: "8px",
          background: `var(--accent-${ACCENTS[i % ACCENTS.length]})`,
        });
        layer.appendChild(cell);
        return cell;
      });
      cells.forEach((cell, i) => {
        const to = targets[i] as { x: number; y: number };
        const from = { x: g.x + random() * g.w, y: g.y + random() * g.h };
        gsap.set(cell, { x: from.x, y: from.y, opacity: 0 });
        timeline.to(cell, { opacity: 1, duration: 0.05 }, 0.02 + (i / CELLS) * 0.2);
        timeline.to(
          cell,
          { x: to.x, y: to.y, duration: 0.55, ease: EASE.scene },
          0.02 + (i / CELLS) * 0.2,
        );
        timeline.to(cell, { opacity: 0, duration: 0.08 }, 0.82);
      });
    }

    // Ensamblaje: el marco se dibuja con el gradiente espectral.
    timeline.fromTo(
      [frame, base],
      { drawSVG: "0%" },
      { drawSVG: "100%", duration: ctx.compact ? 0.5 : 0.25, ease: EASE.inExpo },
      ctx.compact ? 0 : 0.75,
    );
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
  const layer = createLayer("absolute", "T9", 20);
  let timeline!: gsap.core.Timeline;
  const scope = gsap.context(() => {
    timeline = gsap.timeline({ paused: true });
    const form = ctx.root.querySelector<HTMLElement>("#display form");
    if (!form) return;
    const m = monitorRect(form);
    const { svg } = buildFrame(m.x, m.y, m.w, m.h);
    layer.appendChild(svg);
    // Monitor con gradiente que aparece con fundido; sin píxeles migrando.
    timeline.fromTo(svg, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: "none" });
  }, ctx.root);
  return {
    timeline,
    destroy() {
      scope.revert();
      layer.remove();
    },
  };
}

export const T9: TransitionDef = {
  id: "T9",
  from: "gpu",
  to: "display",
  range: ({ root }) => {
    const trigger = root.querySelector("#display");
    return trigger ? { trigger, start: "top bottom", end: "top 30%" } : null;
  },
  variants: { dom: buildDom, reduced: buildReduced },
};
