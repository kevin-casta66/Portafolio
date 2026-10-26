import { ScrollTrigger } from "../gsap";
import type { Attach } from "./controller";
import type {
  TransitionDef,
  TransitionHandle,
  TransitionId,
  Variant,
  TransitionContext,
} from "./contract";
import { T2 } from "./T2-source-lexer";
import { T3 } from "./T3-lexer-parser";
import { T4 } from "./T4-parser-bytecode";
import { T5 } from "./T5-bytecode-runtime";
import { T8 } from "./T8-runtime-gpu";
import { T9 } from "./T9-gpu-display";

/** Transiciones entre fases con versión DOM/SVG en este change (T11 es el glitch: ver glitch.ts). */
export const TRANSITIONS: readonly TransitionDef[] = [T2, T3, T4, T5, T8, T9];

/** ScrollTriggers activos por transición (herramientas de prueba y página /motion). */
export const triggersById = new Map<string, ScrollTrigger>();

/** Engancha una transición a su tramo de scroll: scrubbed, sin snapping ni bloqueo. */
export const attachScrollTrigger: Attach = (def, handle, ctx) => {
  const range = def.range(ctx);
  if (!range) return null;
  const trigger = ScrollTrigger.create({
    trigger: range.trigger,
    // `clamp()`: si el tramo empieza «antes» del inicio de la página (T2: el lexer asoma en el primer
    // viewport), arranca en 0 y la transición está en progreso 0 al cargar (el hero nunca sale mutilado).
    start: `clamp(${range.start})`,
    end: `clamp(${range.end})`,
    // `scrub: true` = el progreso ES la posición de scroll: al soltar, la animación no sigue sola.
    scrub: true,
    animation: handle.timeline as gsap.core.Timeline,
  });
  triggersById.set(def.id, trigger);
  return {
    progress: () => trigger.progress,
    destroy: () => {
      triggersById.delete(def.id);
      trigger.kill();
    },
  };
};

/**
 * Registro reproducible: cada transición puede reproducirse aislada con `replay(progress)` (la página
 * /motion del change 08 lo usa). Devuelve el handle con la timeline ya posicionada en `progress`.
 */
export function replay(
  id: TransitionId,
  progress: number,
  variant: Variant,
  ctx: TransitionContext,
): TransitionHandle | null {
  const def = TRANSITIONS.find((d) => d.id === id);
  const factory = def?.variants[variant] ?? def?.variants.dom;
  if (!factory) return null;
  const handle = factory(ctx);
  handle.timeline.progress(Math.min(1, Math.max(0, progress)));
  return handle;
}
