import { layout, type Range } from "../core/layout";

/** Margen (px) alrededor de cada título dentro del cual la capa de texto está activa. */
export const TEXT_MARGIN = 80;

let rangeCache: { version: number; ranges: Range[]; count: number } | null = null;

/**
 * Rangos de documento de los títulos con gemelo MSDF (cacheados por versión de layout). Vive aparte
 * de `text.ts` para que el registro de escenas pueda consultarlo sin importar three.
 */
export function textRanges(): Range[] {
  const els = document.querySelectorAll<HTMLElement>("[data-msdf]");
  if (rangeCache && rangeCache.version === layout.version && rangeCache.count === els.length)
    return rangeCache.ranges;
  const scrollY = window.scrollY;
  const ranges: Range[] = [];
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    ranges.push({ start: r.top + scrollY - TEXT_MARGIN, end: r.bottom + scrollY + TEXT_MARGIN });
  });
  rangeCache = { version: layout.version, ranges, count: els.length };
  return ranges;
}
