import { EASE, gsap } from "../gsap";
import { qa } from "../transitions/dom";

/**
 * Revelado del árbol de habilidades (PARSER): las ramas SVG se dibujan animando su trazo y los
 * nodos aparecen con el resorte de UI, por profundidad desde la raíz (cada nodo al completarse su
 * rama). Devuelve una timeline pausada: T3 la integra en su recorrido scrubbed; si las transiciones
 * están desactivadas, `parser.ts` la reproduce al entrar en viewport.
 * Debe crearse dentro de un `gsap.context` para que se revierta al limpiar.
 */
export function buildTreeReveal(root: HTMLElement): gsap.core.Timeline {
  // Sin `paused`: al anidarse en la timeline de T3 debe avanzar con su padre (ScrollTrigger pausa la
  // standalone por su cuenta).
  const tl = gsap.timeline();
  let cursor = 0;
  for (const level of [1, 2, 3]) {
    const rows = qa(root, `#parser [role='treeitem'][aria-level='${level}']`);
    if (rows.length === 0) continue;
    const paths = rows.flatMap((row) => qa<SVGPathElement>(row, "svg[data-anim='branch'] path"));
    // El CSS anima `opacity` en las filas (atenuado de la selección): se anula mientras dura el revelado.
    gsap.set(rows, { transition: "none" });
    if (paths.length > 0) {
      tl.fromTo(
        paths,
        { drawSVG: "0%" },
        { drawSVG: "100%", duration: 0.18, ease: EASE.inExpo, stagger: 0.015 },
        cursor,
      );
    }
    tl.fromTo(
      rows,
      { opacity: 0, scale: 0.85, transformOrigin: "0% 50%" },
      { opacity: 1, scale: 1, duration: 0.3, ease: EASE.spring, stagger: 0.03 },
      cursor + (paths.length > 0 ? 0.1 : 0),
    );
    cursor += 0.25;
  }
  return tl;
}
