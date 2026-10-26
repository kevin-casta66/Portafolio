import { layout } from "./layout";

/**
 * Gemelos DOM↔3D (design D5). Un elemento con `data-twin="<tipo>:<id>"` tiene un plano 3D que
 * reproduce su posición y tamaño en cada frame. En cada tick el motor lee TODOS los rectángulos en
 * un solo lote (una lectura de `getBoundingClientRect` por elemento, antes de escribir nada en
 * ningún uniform) y las escenas solo escriben uniforms/posiciones: nunca se toca el DOM en ese tick.
 *
 * La cámara de los gemelos es ortográfica a escala de píxel: x hacia la derecha, y hacia ABAJO en el
 * DOM, y = −y en el mundo 3D. `twinPosition()` hace esa conversión.
 */
export interface TwinRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Twin {
  id: string;
  kind: string;
  el: HTMLElement;
  /** Rectángulo en px CSS de viewport, actualizado por `read()`. */
  rect: TwinRect;
  /** Intersecta el viewport (con margen). */
  visible: boolean;
}

const MARGIN = 120;
/** Cambio mínimo (px) que cuenta como movimiento de un gemelo. */
const EPSILON = 0.25;

class TwinRegistry {
  private twins = new Map<string, Twin>();
  private scanVersion = -1;
  private mutated = true;
  private observer: MutationObserver | null = null;
  private consumers = 0;
  private polledAt = -1;

  /** Una escena que usa gemelos lo declara mientras vive: sin consumidores no se lee nada. */
  acquire(): () => void {
    this.consumers++;
    if (this.consumers === 1) this.start();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.consumers--;
      if (this.consumers === 0) this.stop();
    };
  }

  private start(): void {
    this.observer = new MutationObserver(() => {
      this.mutated = true;
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.mutated = true;
  }

  private stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.twins.clear();
  }

  private scan(): void {
    this.mutated = false;
    this.scanVersion = layout.version;
    const live = new Map<string, HTMLElement>();
    document.querySelectorAll<HTMLElement>("[data-twin]").forEach((el) => {
      const value = el.dataset.twin ?? "";
      if (value) live.set(value, el);
    });
    for (const id of this.twins.keys()) if (!live.has(id)) this.twins.delete(id);
    for (const [id, el] of live) {
      const existing = this.twins.get(id);
      if (existing && existing.el === el) continue;
      const kind = id.includes(":") ? id.slice(0, id.indexOf(":")) : id;
      this.twins.set(id, { id, kind, el, rect: { x: 0, y: 0, w: 0, h: 0 }, visible: false });
    }
  }

  /**
   * Lectura en lote de todos los rectángulos (una vez por tick, antes de cualquier escritura).
   * Devuelve `true` si algún rectángulo cambió más de `EPSILON` px desde la lectura anterior.
   */
  read(viewH = window.innerHeight): boolean {
    if (this.consumers === 0) return false;
    // Una lectura ya hecha en este mismo instante (el sondeo de `needsFrame`) se reutiliza.
    const now = performance.now();
    if (this.polledAt >= 0 && now - this.polledAt < 1) return this.lastChanged;
    this.polledAt = now;
    if (this.mutated || this.scanVersion !== layout.version) this.scan();
    let changed = false;
    for (const twin of this.twins.values()) {
      const r = twin.el.getBoundingClientRect();
      const rect = twin.rect;
      if (
        Math.abs(rect.x - r.left) > EPSILON ||
        Math.abs(rect.y - r.top) > EPSILON ||
        Math.abs(rect.w - r.width) > EPSILON ||
        Math.abs(rect.h - r.height) > EPSILON
      )
        changed = true;
      rect.x = r.left;
      rect.y = r.top;
      rect.w = r.width;
      rect.h = r.height;
      twin.visible = r.bottom > -MARGIN && r.top < viewH + MARGIN && r.width > 0;
    }
    this.lastChanged = changed;
    return changed;
  }

  private lastChanged = false;

  get active(): boolean {
    return this.consumers > 0;
  }

  get(id: string): Twin | undefined {
    return this.twins.get(id);
  }

  all(kind?: string): Twin[] {
    const list = [...this.twins.values()];
    return kind ? list.filter((t) => t.kind === kind) : list;
  }
}

export const twins = new TwinRegistry();

/** Centro del plano gemelo en el mundo 3D de la cámara ortográfica de píxeles. */
export function twinPosition(rect: TwinRect): { x: number; y: number } {
  return { x: rect.x + rect.w / 2, y: -(rect.y + rect.h / 2) };
}
