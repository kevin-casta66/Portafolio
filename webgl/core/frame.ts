import type { PhaseId } from "@/motion/phase";
import { PRESETS, type QualityPreset, type Tier } from "../quality";

/**
 * Estado por frame que leen TODAS las escenas (objeto mutable, fuera de React). El motor lo rellena
 * una vez por tick antes de actualizar las escenas.
 */
export interface FrameState {
  /** Segundos desde que arrancó el motor. */
  time: number;
  /** Segundos desde el frame renderizado anterior (acotado). */
  dt: number;
  scrollY: number;
  viewW: number;
  viewH: number;
  /** Densidad de píxeles efectiva (≤ 2). */
  dpr: number;
  /** Puntero en píxeles CSS de viewport; `active` si está sobre la página; `moved` si cambió este frame. */
  pointer: { x: number; y: number; active: boolean; moved: boolean };
  /** Velocidad de scroll normalizada y acotada ∈ [-1, 1]. */
  velocity: number;
  reduced: boolean;
  mobile: boolean;
  /** `true` con backend WebGPU: hay compute shaders y storage textures. */
  gpuCompute: boolean;
  tier: Tier;
  preset: QualityPreset;
  phase: PhaseId;
  /** Fase hacia la que se interpola y mezcla 0..1 (acento). */
  phaseTo: PhaseId | null;
  phaseMix: number;
}

export const frame: FrameState = {
  time: 0,
  dt: 0,
  scrollY: 0,
  viewW: 1,
  viewH: 1,
  dpr: 1,
  pointer: { x: 0, y: 0, active: false, moved: false },
  velocity: 0,
  reduced: false,
  mobile: false,
  gpuCompute: false,
  tier: "medium",
  preset: PRESETS.medium,
  phase: "source",
  phaseTo: null,
  phaseMix: 0,
};
