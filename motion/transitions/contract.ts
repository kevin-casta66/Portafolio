import type { Clock } from "../clock";
import type { PhaseId } from "../phase";

/**
 * Contrato de cada transición del catálogo (design D9): `{ id, dom(ctx), reduced(ctx) }`. El change
 * 04 añadirá `canvas(ctx)` sin tocar el resto: el selector decide qué variante se usa y el
 * controlador cambia de variante a mitad de recorrido sin saltos.
 */
export type TransitionId = "T2" | "T3" | "T4" | "T5" | "T8" | "T9";
export type Variant = "canvas" | "dom" | "reduced";

export interface TransitionContext {
  root: HTMLElement;
  /** Viewport estrecho: variante simplificada (fundido + desplazamiento, sin clones). */
  compact: boolean;
  clock: Clock;
}

/** Una animación pausada que alguien (scroll o `replay`) recorre con `progress(0..1)`. */
export interface TransitionHandle {
  timeline: { progress(value?: number): number | unknown; kill(): unknown; pause(): unknown };
  /** Libera clones, capas y estados inline. Debe dejar el DOM como el HTML SSR. */
  destroy(): void;
}

export interface TransitionRange {
  trigger: Element;
  start: string;
  end: string;
}

export type VariantFactory = (ctx: TransitionContext) => TransitionHandle;

export interface TransitionDef {
  id: TransitionId;
  from: PhaseId;
  to: PhaseId;
  /** Tramo de scroll en el que se recorre (scrubbed). `null` si falta algún elemento. */
  range(ctx: TransitionContext): TransitionRange | null;
  variants: Partial<Record<Variant, VariantFactory>>;
}
