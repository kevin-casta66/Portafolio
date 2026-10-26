import { gsap } from "../gsap";
import { duration } from "../tokens";
import { createLayer, docRect } from "./dom";

/**
 * T11 · glitch del título de fase (versión DOM). Dos copias decorativas del título, teñidas con
 * acentos de fase, saltan unos píxeles en canales opuestos durante menos de 300 ms y desaparecen.
 * El título real NO se toca (ni su texto ni su árbol de accesibilidad): las copias viven en una capa
 * aparte, `aria-hidden`, sobre el rectángulo del título y recortadas a él (el desplazamiento nunca
 * ensancha la página). Solo se usa en cambios de fase y en la 404. Fila T11 de docs/MOTION-SPEC.md.
 */
/** Techo de la fila T11 (`glitch-max` = 300 ms). La animación dura 240 ms. */
export const GLITCH_MS = 240;

/** Saltos de offset (px) de cada copia: pasos discretos, no un movimiento suave. */
const STEPS = [
  { a: -7, b: 6 },
  { a: 5, b: -5 },
  { a: -3, b: 4 },
  { a: 2, b: -1 },
  { a: 0, b: 0 },
] as const;

const FONT_PROPS = [
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "letterSpacing",
  "lineHeight",
  "textTransform",
  "textAlign",
  "whiteSpace",
] as const;

export function glitchTitle(title: HTMLElement): gsap.core.Timeline | null {
  if (GLITCH_MS >= duration.glitchMax) return null;
  const rect = docRect(title);
  if (rect.w === 0 || rect.h === 0) return null;
  const computed = getComputedStyle(title);

  const layer = createLayer("absolute", "T11", 35);
  const clip = document.createElement("div");
  Object.assign(clip.style, {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
    overflow: "hidden",
  });
  layer.appendChild(clip);

  const copies = (["--accent-source", "--accent-gpu"] as const).map((token) => {
    const copy = document.createElement("div");
    copy.textContent = title.textContent;
    for (const key of FONT_PROPS) copy.style[key] = computed[key];
    Object.assign(copy.style, {
      position: "absolute",
      inset: "0",
      color: `var(${token})`,
      mixBlendMode: "screen",
      opacity: "0.85",
    });
    clip.appendChild(copy);
    return copy;
  });

  const step = GLITCH_MS / 1000 / STEPS.length;
  const tl = gsap.timeline({
    onComplete: () => layer.remove(),
    onInterrupt: () => layer.remove(),
  });
  STEPS.forEach((s, i) => {
    tl.set(copies[0] as HTMLElement, { x: s.a, skewX: s.a * 0.6 }, i * step);
    tl.set(copies[1] as HTMLElement, { x: s.b, skewX: s.b * 0.6 }, i * step);
  });
  tl.set(copies, { opacity: 0 }, STEPS.length * step);
  return tl;
}
