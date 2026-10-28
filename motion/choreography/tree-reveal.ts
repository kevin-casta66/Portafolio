import { EASE, ScrollTrigger, gsap } from "../gsap";
import { qa } from "../transitions/dom";

/**
 * Crecimiento del árbol de habilidades (PARSER) atado al scroll. El árbol mide varias pantallas, así
 * que no se revela de una vez: cada nodo aparece cuando su fila llega a `APPEAR` de la altura de la
 * ventana, y las líneas verticales de cada grupo crecen desde su padre al mismo ritmo. Es UNA
 * timeline scrubbed sobre todo el árbol en la que cada tween se coloca en la fracción de scroll
 * que corresponde a la posición de su fila, así que subir lo rebobina en orden inverso.
 *
 * Las filas no se animan con `opacity` (la usa el atenuado de la selección) sino con la propiedad
 * registrada `--reveal` (`styles/systems.css`); las líneas, con `--line`.
 * Debe crearse dentro de un `gsap.context` para que se revierta al limpiar.
 */
export const APPEAR = 0.85;
/** Borde del árbol (fracción de la ventana) en el que termina T3: hasta ahí llegan vuelos y tubos. */
export const T3_END_EDGE = 0.4;
/** Recorrido de scroll (px) que tarda en completarse la aparición de una fila. */
const ROW_PX = 90;

export function buildTreeGrowth(root: HTMLElement): ScrollTrigger | null {
  const tree = qa(root, "#parser [role='tree']")[0];
  if (!tree) return null;
  const rows = qa(tree, "[role='treeitem']");
  const groups = qa(tree, "[role='group']");
  if (rows.length === 0) return null;

  const height = Math.max(1, tree.offsetHeight);
  const top = tree.getBoundingClientRect().top;
  const at = (el: Element) =>
    Math.min(1, Math.max(0, (el.getBoundingClientRect().top - top) / height));
  const span = Math.min(0.2, ROW_PX / height);

  const tl = gsap.timeline({ defaults: { ease: "none" } });
  for (const group of groups) {
    const start = at(group);
    const end = Math.min(1, start + group.offsetHeight / height);
    tl.fromTo(
      group,
      { "--line": 0 },
      { "--line": 1, duration: Math.max(0.001, end - start) },
      start,
    );
  }
  for (const row of rows) {
    const t = at(row);
    const stub = qa<SVGPathElement>(row, "svg[data-anim='branch'] path");
    if (stub.length > 0)
      tl.fromTo(stub, { drawSVG: "0%" }, { drawSVG: "100%", duration: span * 0.5 }, t);
    tl.fromTo(
      row,
      { "--reveal": 0, scale: 0.85, transformOrigin: "0% 50%" },
      { "--reveal": 1, scale: 1, duration: span, ease: EASE.spring },
      t + span * 0.3,
    );
  }
  // Cola vacía hasta 1 para que la fracción de cada tween coincida con la de su fila.
  if (tl.duration() < 1) tl.set({}, {}, 1);

  return ScrollTrigger.create({
    trigger: tree,
    start: `top ${APPEAR * 100}%`,
    end: `bottom ${APPEAR * 100}%`,
    scrub: 0.3,
    animation: tl,
    invalidateOnRefresh: true,
  });
}

/**
 * Filas que ya son visibles cuando el borde superior del árbol llega a `edge` (fracción de la
 * ventana): los destinos del vuelo de T3, que aterriza justo donde el árbol empieza a crecer.
 */
export function headRows(root: HTMLElement, edge: number): HTMLElement[] {
  const tree = qa(root, "#parser [role='tree']")[0];
  if (!tree) return [];
  const top = tree.getBoundingClientRect().top;
  const limit = (APPEAR - edge) * window.innerHeight;
  return qa(tree, "[role='treeitem']").filter(
    (row) => row.getBoundingClientRect().top - top <= limit,
  );
}
