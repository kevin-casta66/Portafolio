import { defaultParams, type ExperimentKind, type Params } from "./definitions";

/**
 * Estado compartido entre el DOM del laboratorio y sus escenas 3D, FUERA de React: los controles
 * nativos escriben parámetros y eventos de entrada; las escenas los leen cada frame. Nada de esto
 * provoca renders de React por frame.
 */
export interface LabInput {
  /** Puntero relativo al escenario, 0..1 (origen arriba-izquierda); `inside` si está sobre él. */
  x: number;
  y: number;
  inside: boolean;
  down: boolean;
  /** Movimiento desde el frame anterior (px). */
  dx: number;
  dy: number;
  /** Impulsos de teclado pendientes (−1, 0, 1) y petición de reinicio. */
  keyX: number;
  keyY: number;
  reset: boolean;
  /** El escenario tiene el foco de teclado. */
  focused: boolean;
}

interface Entry {
  kind: ExperimentKind;
  params: Params;
  input: LabInput;
}

const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

export function labEntry(id: string, kind: ExperimentKind): Entry {
  let entry = entries.get(id);
  if (!entry) {
    entry = {
      kind,
      params: defaultParams(kind),
      input: { x: 0.5, y: 0.5, inside: false, down: false, dx: 0, dy: 0, keyX: 0, keyY: 0, reset: false, focused: false },
    };
    entries.set(id, entry);
  }
  return entry;
}

export function setParam(id: string, kind: ExperimentKind, key: string, value: number | string): void {
  labEntry(id, kind).params[key] = value;
  listeners.forEach((l) => l());
}

export function getParams(id: string): Params | undefined {
  return entries.get(id)?.params;
}

export function subscribeLab(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Pide un frame al motor 3D cuando cambia un parámetro o una entrada (lo conecta la escena). */
export const labHooks: { wake: (() => void) | null } = { wake: null };

export function wakeLab(): void {
  labHooks.wake?.();
}

// ── Lectura de datos (visualización): texto que la escena publica y el DOM anuncia ──────────────────
const readouts = new Map<string, string>();

export function setReadout(id: string, text: string): void {
  if (readouts.get(id) === text) return;
  readouts.set(id, text);
  listeners.forEach((l) => l());
}

export function getReadout(id: string): string {
  return readouts.get(id) ?? "";
}
