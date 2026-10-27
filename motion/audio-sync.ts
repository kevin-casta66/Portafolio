import { audio } from "@/audio";

/** Retraso máximo que el audio puede añadir a una respuesta visual (ADDENDUM-v3 §6). */
export const MAX_AUDIO_DELAY_MS = 350;

/**
 * Hace que una respuesta visual NO scrubbed (el glitch del título al cambiar de fase, avisos) caiga en
 * el primer tiempo del compás cuando el audio está activo: si el siguiente compás llega en ≤ 350 ms,
 * espera hasta él; si no, o si no hay audio, se ejecuta de inmediato. Las transiciones que sigue el
 * scroll NO pasan por aquí (el visitante controla su ritmo). Devuelve el retraso aplicado (ms).
 */
export function landOnBar(run: () => void, maxDelayMs: number = MAX_AUDIO_DELAY_MS): number {
  const wait = audio.timeToNextBar();
  const delay = wait !== null && wait <= maxDelayMs ? wait : 0;
  // Gancho de pruebas (solo existe con `?motionTest`): registra el retraso aplicado.
  if (typeof window !== "undefined") window.__portafolioAudioLog?.push({ event: "landOnBar", payload: { delay } });
  if (delay > 0) window.setTimeout(run, delay);
  else run();
  return delay;
}
