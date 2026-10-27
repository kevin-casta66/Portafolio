/**
 * Gancho de pruebas del sonido (ADDENDUM-v3 §10): `window.__portafolioSound`. Solo se carga con
 * `?motionTest` en la URL (ver el final de `audio/index.ts`); sin ese parámetro NO existe.
 * Expone el estado de la puerta (disponible aunque el motor aún no haya cargado) y, cuando hay motor,
 * su foto: contexto de mezcla (fase), tempo, capas activas, RMS por bus, pico y voces.
 */
import { audio, hasEngine, readSoundProbe } from "./index";

export interface SoundTestHook {
  /** Estado de la puerta de arranque (disponible aunque el motor no haya cargado). */
  gate(): { resolved: boolean; bootDone: boolean; lines: number };
  /** `true` cuando el motor de audio está cargado y registrado. */
  started(): boolean;
  /** Foto completa del motor (contexto de mezcla, tempo, capas, RMS por bus, pico, voces…) o `null`. */
  snapshot(): unknown;
  /** Capas con ganancia objetivo > 0 en este momento. */
  layers(): string[];
  phase(): string | null;
  bpm(): number | null;
  rms(): { music: number; sfx: number; master: number } | null;
  peak(): number | null;
  voices(): number | null;
  /** Eventos emitidos desde que se instaló el gancho. */
  events(): unknown[];
  /** Emite un evento como lo haría un componente (para que las pruebas dirijan el motor). */
  emit(event: string, payload?: unknown): void;
}

declare global {
  interface Window {
    __portafolioSound?: SoundTestHook;
    __portafolioAudioLog?: unknown[];
  }
}

type SnapshotShape = {
  context: string;
  bpm: number;
  layers: { id: string; target: number }[];
  rms: { music: number; sfx: number; master: number };
  peak: number;
  voices: number;
};

window.__portafolioAudioLog ??= [];
const snap = () => readSoundProbe() as SnapshotShape | null;
window.__portafolioSound = {
  gate: () => ({ ...audio.gate }),
  started: () => hasEngine(),
  snapshot: () => snap(),
  layers: () => snap()?.layers.filter((l) => l.target > 0.02).map((l) => l.id) ?? [],
  phase: () => snap()?.context ?? null,
  bpm: () => snap()?.bpm ?? null,
  rms: () => snap()?.rms ?? null,
  peak: () => snap()?.peak ?? null,
  voices: () => snap()?.voices ?? null,
  events: () => window.__portafolioAudioLog ?? [],
  emit: (event, payload) => (audio.emit as (e: string, p?: unknown) => void)(event, payload),
};
