import type { gsap } from "@/motion/gsap";
import type { TransitionContext, TransitionId } from "@/motion/transitions/contract";
import type { EngineContext, SceneInstance } from "../core/types";

/** Progreso de una transición en canvas (0..1); lo escribe la timeline que recorre el scroll. */
export interface TransitionState {
  p: number;
}

export type TransitionTimeline = gsap.core.Timeline;

export type TransitionSceneFactory = (
  ctx: EngineContext,
  state: TransitionState,
  tctx: TransitionContext,
) => SceneInstance | Promise<SceneInstance>;

/**
 * Una transición en canvas se divide en dos mitades (design D6):
 *  - `dom`: rápida y sin three; añade a la timeline lo que cambia en el DOM (opacidades que ceden el
 *    paso al canvas) y devuelve su limpieza. Se ejecuta al crear la variante.
 *  - `load`: la escena 3D, con importación dinámica; solo se pide al acercarse al tramo de scroll.
 */
export interface CanvasTransition {
  id: TransitionId;
  /** Orden de composición (las transiciones van sobre las escenas de fase y bajo el texto). */
  order: number;
  dom?(ctx: TransitionContext, tl: TransitionTimeline, state: TransitionState): (() => void) | void;
  load(): Promise<TransitionSceneFactory>;
}

/**
 * Modo prototipo: las rutas `/prototypes/[transition]` recorren una transición con un control de
 * progreso manual en lugar del scroll, así que su escena está activa siempre.
 */
export const prototypeMode = { active: false };
