import type { gsap } from "@/motion/gsap";
import type { TransitionContext, TransitionId } from "@/motion/transitions/contract";
import type { EngineContext, SceneInstance } from "../core/types";

/**
 * Progreso de una transición en canvas (0..1); lo escribe la timeline que recorre el scroll.
 *
 * `internals` es el interruptor «Ver internos» de `/motion` (change 08, análogo a `maskView` de T6):
 * con `true` la escena dibuja su máscara o render target interno (docs/MOTION-SPEC.md §3) en lugar
 * de la vista normal. Las escenas lo leen en cada `update` (`state.internals`); apagado (`false`,
 * por defecto) no cambia ni un píxel ni cuesta nada. Solo lo escribe `setTransitionInternals`.
 */
export interface TransitionState {
  p: number;
  internals: boolean;
}

export const createTransitionState = (): TransitionState => ({ p: 0, internals: false });

/** Estados vivos por id de transición (los registra `canvasVariant`): así un adaptador llega a ellos. */
export const transitionStates = new Map<string, TransitionState>();

/** Gancho al motor (lo publica `installCanvasVariants`): pide un frame sin necesitar la instancia. */
export const transitionHooks: {
  markDirty: (() => void) | null;
  /** ¿La escena con este id ya está cargada y puede dibujar? (la usa /motion antes de reproducir). */
  sceneLoaded: ((id: string) => boolean) | null;
} = { markDirty: null, sceneLoaded: null };

/** Enciende o apaga «Ver internos» de una transición en canvas; devuelve `false` si no hay variante viva. */
export function setTransitionInternals(
  id: string,
  on: boolean,
  markDirty: (() => void) | null = transitionHooks.markDirty,
): boolean {
  const state = transitionStates.get(id);
  if (!state) return false;
  if (state.internals !== on) {
    state.internals = on;
    markDirty?.();
  }
  return true;
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
