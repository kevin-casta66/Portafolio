import { gsap } from "@/motion/gsap";
import { setCanvasVariant } from "@/motion/shared";
import { triggersById } from "@/motion/transitions";
import type { TransitionContext, TransitionHandle, TransitionId } from "@/motion/transitions/contract";
import type { Engine } from "../core/engine";
import type { Range } from "../core/layout";
import { CANVAS_TRANSITIONS } from "./registry";
import { prototypeMode, type CanvasTransition, type TransitionState } from "./state";

/** Margen (en viewports) alrededor del tramo de scroll en el que la escena de la transición existe. */
const MARGIN_VIEWPORTS = 0.5;

/** Rango de documento de una transición: el de su ScrollTrigger (o «siempre» en un prototipo). */
export function transitionRange(id: TransitionId): Range | null {
  if (prototypeMode.active) return { start: -Infinity, end: Infinity };
  const trigger = triggersById.get(id);
  if (!trigger) return null;
  const margin = window.innerHeight * MARGIN_VIEWPORTS;
  return { start: trigger.start - margin, end: trigger.end + margin };
}

/**
 * Crea la variante `canvas` de una transición: una timeline pausada que escribe `state.p` (y las
 * opacidades DOM que ceden el paso al canvas) y el registro de su escena en el motor. El
 * controlador de transiciones (change 03) la engancha al scroll igual que a la versión DOM, y
 * puede cambiar entre variantes a mitad de recorrido sin saltos (la nueva toma el progreso actual).
 */
export function canvasVariant(engine: Engine, config: CanvasTransition) {
  return (tctx: TransitionContext): TransitionHandle => {
    const state: TransitionState = { p: 0 };
    let timeline!: gsap.core.Timeline;
    let cleanup: (() => void) | void;
    const scope = gsap.context(() => {
      // Cada cambio de progreso pide un frame (en un prototipo el progreso cambia sin scroll).
      timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "none" },
        onUpdate: () => engine.markDirty(),
      });
      timeline.to(state, { p: 1, duration: 1 }, 0);
      cleanup = config.dom?.(tctx, timeline, state);
    }, tctx.root);

    const sceneId = `${config.id}`;
    const unregister = engine.register({
      id: sceneId,
      order: config.order,
      range: () => transitionRange(config.id),
      preload: window.innerHeight,
      load: () =>
        config.load().then((factory) => (ectx) => factory(ectx, state, tctx)),
    });

    return {
      timeline,
      destroy() {
        unregister();
        cleanup?.();
        scope.revert();
      },
    };
  };
}

/** Registra las variantes `canvas` de todas las transiciones; devuelve la limpieza. */
export function installCanvasVariants(engine: Engine): () => void {
  for (const config of CANVAS_TRANSITIONS)
    setCanvasVariant(config.id, canvasVariant(engine, config));
  return () => {
    for (const config of CANVAS_TRANSITIONS) setCanvasVariant(config.id, null);
  };
}
