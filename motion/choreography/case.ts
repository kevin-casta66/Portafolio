import { EASE, ScrollTrigger, gsap, seconds } from "../gsap";
import { duration, stagger } from "../tokens";
import { qa } from "../transitions/dom";
import type { Choreography } from "./context";

/**
 * CASO DE ESTUDIO · (1) el diagrama de arquitectura se construye por pasos con el scroll (scrub,
 * reversible: retroceder lo deshace en orden inverso) y (2) las barras de las métricas se dibujan al
 * entrar en viewport. El HTML SSR es el estado final (completo y legible sin JS); aquí solo se
 * añaden los estados iniciales «por construir». Con movimiento reducido no se crea ninguna animación.
 * Solo `transform`, `opacity` y el trazo SVG (DrawSVG).
 */
const STEP = 1; // cada paso del diagrama ocupa una unidad de la timeline

export const caseChoreography: Choreography = (ctx) => {
  if (ctx.reduced) return;

  // ── Diagrama por pasos ──
  const diagram = ctx.root.querySelector<HTMLElement>("[data-case-diagram]");
  if (diagram) {
    const steps = Number(diagram.dataset.steps ?? 0);
    const items = qa(diagram, "[data-diagram-step]");
    const tl = gsap.timeline({ paused: true, defaults: { ease: "none" } });

    const nodes = qa(diagram, "[data-diagram-node]");
    const edges = qa(diagram, "[data-diagram-edge]");
    for (let k = 0; k < steps; k++) {
      const at = k * STEP;
      for (const node of nodes.filter((n) => Number(n.dataset.step) === k)) {
        tl.fromTo(
          node,
          { opacity: 0, y: 10 },
          { opacity: 1, y: 0, duration: STEP * 0.45, ease: EASE.inExpo },
          at,
        );
      }
      for (const edge of edges.filter((e) => Number(e.dataset.step) === k)) {
        const line = edge.querySelector("path:not([data-diagram-arrow])");
        const arrow = edge.querySelector("[data-diagram-arrow]");
        // La conexión se dibuja cuando ya están sus extremos; la punta aparece al terminar el trazo.
        if (line) tl.fromTo(line, { drawSVG: "0%" }, { drawSVG: "100%", duration: STEP * 0.4 }, at + STEP * 0.3);
        if (arrow) tl.fromTo(arrow, { opacity: 0 }, { opacity: 1, duration: STEP * 0.1 }, at + STEP * 0.7);
      }
    }
    tl.duration(Math.max(1, steps) * STEP);

    // Paso actual (discreto: solo cambia un atributo cuando cambia el paso).
    let current = -1;
    const mark = (self: ScrollTrigger) => {
      const index = Math.min(steps - 1, Math.floor(self.progress * steps));
      if (index === current) return;
      current = index;
      items.forEach((item, i) => item.setAttribute("data-active", String(i === index)));
    };

    ScrollTrigger.create({
      trigger: diagram,
      start: "top 70%",
      end: "bottom 55%",
      scrub: true,
      animation: tl,
      onUpdate: mark,
      onRefresh: mark,
    });
    ctx.onCleanup(() => items.forEach((item) => item.removeAttribute("data-active")));
  }

  // ── Gráficos de métricas: se dibujan una vez al entrar en viewport ──
  for (const chart of qa(ctx.root, "[data-case-chart]")) {
    const bars = qa(chart, "[data-chart-bar]");
    if (bars.length === 0) continue;
    const draw = gsap.fromTo(
      bars,
      { scaleX: 0, transformOrigin: "0% 50%" },
      {
        scaleX: 1,
        duration: seconds(duration.reveal),
        ease: EASE.inExpo,
        stagger: seconds(stagger.item),
        paused: true,
      },
    );
    ScrollTrigger.create({
      trigger: chart,
      start: "top 80%",
      once: true,
      animation: draw,
      toggleActions: "play none none none",
    });
  }
};
