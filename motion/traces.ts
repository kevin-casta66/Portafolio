import { EASE, gsap, registerGsap, seconds } from "./gsap";
import { duration } from "./tokens";

/**
 * Trazas de luz del árbol de habilidades: al seleccionar una tecnología se dibujan curvas luminosas
 * (trazo SVG animado con DrawSVG + resplandor por `filter`) desde la hoja hasta las vistas previas de
 * los proyectos que la usan; al deseleccionar se retraen. Es la prueba visual que conecta habilidad
 * con proyecto. Solo trazo SVG y `filter`: nada que provoque layout.
 */
const SVG_NS = "http://www.w3.org/2000/svg";

export interface TraceHandle {
  /** Retrae las trazas con una animación y las elimina. */
  retract(): void;
}

export function drawTraces(
  container: HTMLElement,
  from: HTMLElement,
  targets: readonly HTMLElement[],
): TraceHandle {
  registerGsap();
  const box = container.getBoundingClientRect();
  const origin = from.getBoundingClientRect();

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-anim", "traces");
  Object.assign(svg.style, {
    position: "absolute",
    left: "0",
    top: "0",
    width: `${box.width}px`,
    height: `${box.height}px`,
    overflow: "visible",
    pointerEvents: "none",
    zIndex: "5",
  });

  const x1 = origin.left + origin.width / 2 - box.left;
  const y1 = origin.bottom - box.top;
  const paths = targets.map((target) => {
    const r = target.getBoundingClientRect();
    const x2 = r.left + r.width / 2 - box.left;
    const y2 = r.top - box.top;
    const dy = Math.max(24, (y2 - y1) / 2);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "var(--accent)");
    path.setAttribute("stroke-width", "2");
    path.setAttribute("stroke-linecap", "round");
    path.style.filter = "drop-shadow(0 0 6px var(--accent))";
    svg.appendChild(path);
    return path;
  });
  container.appendChild(svg);

  gsap.fromTo(
    paths,
    { drawSVG: "0%" },
    {
      drawSVG: "100%",
      duration: seconds(duration.reveal),
      ease: EASE.inExpo,
      stagger: seconds(duration.micro) / 2,
    },
  );

  return {
    retract() {
      // La traza se retrae hacia su destino y desaparece.
      gsap.to(paths, {
        drawSVG: "100% 100%",
        duration: seconds(duration.ui),
        ease: EASE.inExpo,
        onComplete: () => svg.remove(),
      });
    },
  };
}
