import type { PhaseId } from "./phase";

/**
 * Estado de fase FUERA de React: objeto mutable que el canvas (change 04), el sonido (06) y la
 * navegación (06) leen cada frame sin provocar renders. Solo `phase` (que cambia raramente) se
 * replica además en el store global.
 */
export interface PhaseState {
  phase: PhaseId;
  /** Progreso 0..1 dentro de la sección activa. */
  progress: number;
  /** Progreso global 0..1. */
  global: number;
  /** Interpolación hacia la fase siguiente. */
  from: PhaseId;
  to: PhaseId | null;
  mix: number;
}

export const phaseState: PhaseState = {
  phase: "source",
  progress: 0,
  global: 0,
  from: "source",
  to: null,
  mix: 0,
};

const listeners = new Set<(state: PhaseState) => void>();
const changeListeners = new Set<(phase: PhaseId, previous: PhaseId) => void>();

export function subscribePhaseState(listener: (state: PhaseState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Se llama solo cuando CAMBIA la fase (p. ej. para el glitch del título). */
export function onPhaseChange(listener: (phase: PhaseId, previous: PhaseId) => void): () => void {
  changeListeners.add(listener);
  return () => changeListeners.delete(listener);
}

export function writePhaseState(next: PhaseState): void {
  const previous = phaseState.phase;
  Object.assign(phaseState, next);
  listeners.forEach((l) => l(phaseState));
  if (previous !== next.phase) changeListeners.forEach((l) => l(next.phase, previous));
}
