import { prefersReducedMotion } from "@/motion/reduced";
/**
 * Controlador de los botones magnéticos (design D7): UN único listener `pointermove` para todos los
 * CTAs. Solo con puntero fino y sin movimiento reducido. Cada elemento registrado tiene dos capas
 * visuales (fondo y etiqueta) que se desplazan con `transform`; el elemento interactivo —su área de
 * clic y su anillo de foco— NO se mueve nunca.
 */
export interface MagneticItem {
  /** Elemento interactivo (enlace/botón): solo se lee su rectángulo. */
  host: HTMLElement;
  /** Capas visuales que se desplazan. */
  layers: readonly { el: HTMLElement; factor: number }[];
}

/** Desplazamiento máximo (px) de la capa más externa. */
export const MAX_OFFSET = 8;
/** Margen (px) alrededor del elemento en el que el puntero ya lo atrae. */
export const ZONE = 72;
/** Fracción de la distancia al centro que se recorre. */
const PULL = 0.25;

const items = new Set<MagneticItem>();
let attached = false;

const reduced = () => prefersReducedMotion();
const finePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/** Desplazamiento del elemento hacia el puntero: acotado, y cero fuera de la zona de influencia. */
export function offsetFor(
  rect: { left: number; top: number; width: number; height: number },
  pointer: { x: number; y: number },
  zone = ZONE,
  max = MAX_OFFSET,
): { x: number; y: number } {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const inside =
    pointer.x >= rect.left - zone &&
    pointer.x <= rect.left + rect.width + zone &&
    pointer.y >= rect.top - zone &&
    pointer.y <= rect.top + rect.height + zone;
  if (!inside) return { x: 0, y: 0 };
  const clamp = (v: number) => Math.max(-max, Math.min(max, v));
  return { x: clamp((pointer.x - cx) * PULL), y: clamp((pointer.y - cy) * PULL) };
}

function apply(item: MagneticItem, offset: { x: number; y: number }): void {
  for (const { el, factor } of item.layers) {
    el.style.transform =
      offset.x === 0 && offset.y === 0 ? "" : `translate3d(${offset.x * factor}px, ${offset.y * factor}px, 0)`;
  }
}

function reset(): void {
  for (const item of items) apply(item, { x: 0, y: 0 });
}

const onMove = (event: PointerEvent) => {
  if (event.pointerType !== "mouse") return;
  if (reduced() || !finePointer()) {
    reset();
    return;
  }
  // Lecturas primero y escrituras después: sin layout thrashing.
  const rects = [...items].map((item) => [item, item.host.getBoundingClientRect()] as const);
  for (const [item, rect] of rects) apply(item, offsetFor(rect, { x: event.clientX, y: event.clientY }));
};

/** Registra un elemento magnético. Devuelve la función que lo retira (y limpia su transform). */
export function registerMagnetic(item: MagneticItem): () => void {
  items.add(item);
  if (!attached) {
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    attached = true;
  }
  return () => {
    apply(item, { x: 0, y: 0 });
    items.delete(item);
    if (items.size === 0 && attached) {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      attached = false;
    }
  };
}
