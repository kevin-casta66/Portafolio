import type { GraphicsBackend, QualityTier } from "@/lib/store";

/**
 * Cómo se hace la transición de página tarjeta ⇄ caso (design D6). Decide en este orden:
 *
 *  - `fade`    movimiento reducido (o apertura con fundido): fundido ≤ 200 ms, sin expansión ni lente.
 *  - `instant` sin backend gráfico (sin WebGPU ni WebGL2): navegación normal, sin errores.
 *  - `2d`      tier bajo, o el canvas / la escena de T6 aún no están listos: la tarjeta se expande en el
 *              DOM (transform, sin shader) hasta la cabecera.
 *  - `full`    canvas persistente: expansión con distorsión de lente y aberración cromática en los bordes.
 */
export type TransitionMode = "full" | "2d" | "instant" | "fade";
/** Intensidad pedida: `full` = tras un hold (≤ 1200 ms), `short` = clic / Enter (≤ 500 ms), `fade` = reducido. */
export type Intensity = "full" | "short" | "fade";

export interface ModeInputs {
  reduced: boolean;
  intensity: Intensity;
  backend: GraphicsBackend;
  tier: QualityTier;
  /** El canvas persistente terminó de cargar (`graphics.ready`). */
  canvasReady: boolean;
  /** La escena de T6 está creada y puede dibujar. */
  sceneReady: boolean;
}

export function resolveTransitionMode(i: ModeInputs): TransitionMode {
  if (i.reduced || i.intensity === "fade") return "fade";
  if (i.backend === "none") return "instant";
  if (i.tier === "low") return "2d";
  if (!i.canvasReady || !i.sceneReady) return "2d";
  return "full";
}
