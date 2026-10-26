/** Utilidades DOM comunes a las transiciones (capas superpuestas, medidas y clones). */

export interface DocRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rectángulo en coordenadas de DOCUMENTO (no del viewport): estable mientras se hace scroll. */
export function docRect(el: Element): DocRect {
  const r = el.getBoundingClientRect();
  return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
}

export const qa = <T extends Element = HTMLElement>(root: ParentNode, selector: string): T[] =>
  Array.from(root.querySelectorAll<T>(selector));

/**
 * Capa decorativa superpuesta: ignorada por tecnologías de asistencia y sin capturar puntero.
 * `absolute` vive en coordenadas de documento; `fixed` cubre el viewport. Siempre por debajo de la
 * cabecera (z 70) y de la puerta de arranque (z 60).
 */
export function createLayer(kind: "absolute" | "fixed", name: string, zIndex = 30): HTMLDivElement {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.dataset.motionLayer = name;
  const style = layer.style;
  style.position = kind;
  style.left = "0";
  style.top = "0";
  style.pointerEvents = "none";
  style.zIndex = String(zIndex);
  if (kind === "fixed") {
    style.width = "100%";
    style.height = "100%";
    style.overflow = "hidden";
  } else {
    style.width = "0";
    style.height = "0";
    style.overflow = "visible";
  }
  document.body.appendChild(layer);
  return layer;
}

const COPIED_STYLES = [
  "color",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "backgroundColor",
  "borderTopColor",
  "borderTopWidth",
  "borderTopStyle",
  "borderRadius",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "whiteSpace",
] as const;

/**
 * Clon visual de un elemento para vuelos entre secciones. `outer` se posiciona/escala con la
 * geometría; `inner` recibe la escala de «profundidad». El clon no contiene el HTML original (solo su
 * texto), así no duplica ids ni controles.
 */
export function cloneLabel(
  source: HTMLElement,
  layer: HTMLElement,
): { outer: HTMLDivElement; inner: HTMLDivElement } {
  const outer = document.createElement("div");
  const inner = document.createElement("div");
  const computed = getComputedStyle(source);
  for (const key of COPIED_STYLES) inner.style[key] = computed[key];
  inner.textContent = (source.textContent ?? "").trim();
  const rect = source.getBoundingClientRect();
  outer.style.position = "absolute";
  outer.style.left = "0";
  outer.style.top = "0";
  outer.style.width = `${rect.width}px`;
  outer.style.height = `${rect.height}px`;
  outer.style.transformOrigin = "0 0";
  outer.style.willChange = "transform, opacity";
  inner.style.width = "100%";
  inner.style.height = "100%";
  inner.style.boxSizing = "border-box";
  inner.style.transformOrigin = "50% 50%";
  outer.appendChild(inner);
  layer.appendChild(outer);
  return { outer, inner };
}

export const isUsable = (el: Element | null | undefined): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

/** Divide `items` en `groups` grupos consecutivos del mismo tamaño aproximado. */
export function chunk<T>(items: readonly T[], groups: number): T[][] {
  const size = Math.ceil(items.length / Math.max(1, groups));
  return Array.from({ length: groups }, (_, i) => items.slice(i * size, (i + 1) * size)).filter(
    (g) => g.length > 0,
  );
}
