/**
 * Geometría lógica del túnel de T4 (pura, sin three): un anillo por empleo a profundidad creciente
 * y la posición de la cámara según el progreso. El orden de los anillos ES el del DOM.
 */
export const RING_GAP = 3;

export interface RingSpec {
  /** Identificador del empleo (`data-stage-id`). */
  id: string;
  index: number;
  /** Profundidad (z negativa: se aleja de la cámara). */
  z: number;
  /** Mezcla 0..1 entre el acento de BYTECODE y el de RUNTIME. */
  tint: number;
}

export function tunnelRings(ids: readonly string[], gap = RING_GAP): RingSpec[] {
  return ids.map((id, index) => ({
    id,
    index,
    z: -(index + 1) * gap,
    tint: ids.length <= 1 ? 0 : index / (ids.length - 1),
  }));
}

/** z de la cámara: avanza hasta atravesar el último anillo con el progreso (0..1). */
export function cameraZ(progress: number, ringCount: number, gap = RING_GAP): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return -clamped * (ringCount + 0.6) * gap;
}

/** Envolvente de opacidad del túnel: aparece, domina el tramo central y se va (sin saltos). */
export function tunnelEnvelope(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  const inT = Math.min(1, p / 0.18);
  const outT = Math.min(1, (1 - p) / 0.22);
  const s = (x: number) => x * x * (3 - 2 * x);
  return s(inT) * s(outT);
}
