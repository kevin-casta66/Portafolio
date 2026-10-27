/**
 * Capas de la pieza y mapa de mezcla por fase (ADDENDUM-v3 §3–§4). Datos y cálculos PUROS: qué capas
 * suenan en cada contexto, con qué ganancia relativa, y los patrones de 4 compases de cada capa sobre la
 * progresión Bm7 – Gmaj7 – Dmaj7 – A6. El motor (`mix.ts`) los programa en el Transport.
 */
import { LAYER_IDS, type LayerId, type MixContext } from "./types";
import { PROGRESSION } from "./scale";

/** Una mezcla: ganancia relativa (0..1) de cada capa y parámetros que cambian con el contexto. */
export interface MixSpec {
  layers: Record<LayerId, number>;
  /** El bombo (parte de PERC) solo suena en RUNTIME. */
  kick: boolean;
  /** Densidad del arpegio (0..1): cuántas corcheas del compás suenan. */
  arpDensity: number;
  /** Cantidad de «bitcrush» leve del arpegio (rasterización de GPU). */
  crush: number;
  /** Recorte de la música en dB (los casos de estudio bajan 8 dB). */
  trimDb: number;
  /** Cutoff base del filtro de la música (Hz) y envío de reverb base (0..1). */
  cutoff: number;
  reverb: number;
}

const L = (pad: number, keys: number, perc: number, arp: number, bass: number, shimmer: number): Record<LayerId, number> => ({
  pad,
  keys,
  perc,
  arp,
  bass,
  shimmer,
});

export const MIX: Record<MixContext, MixSpec> = {
  boot: { layers: L(1, 0, 0, 0, 0, 0), kick: false, arpDensity: 0, crush: 0, trimDb: 0, cutoff: 700, reverb: 0.34 },
  source: { layers: L(1, 0.85, 0, 0, 0, 0), kick: false, arpDensity: 0, crush: 0, trimDb: 0, cutoff: 3000, reverb: 0.3 },
  lexer: { layers: L(1, 0.85, 0.55, 0, 0, 0), kick: false, arpDensity: 0, crush: 0, trimDb: 0, cutoff: 3200, reverb: 0.28 },
  parser: { layers: L(1, 0.8, 0.55, 0.5, 0, 0), kick: false, arpDensity: 0.5, crush: 0, trimDb: 0, cutoff: 3400, reverb: 0.28 },
  bytecode: { layers: L(0.95, 0.75, 0.55, 0.5, 0.85, 0), kick: false, arpDensity: 0.6, crush: 0, trimDb: 0, cutoff: 3400, reverb: 0.26 },
  runtime: { layers: L(1, 0.8, 1, 0.7, 1, 0), kick: true, arpDensity: 0.8, crush: 0, trimDb: 0, cutoff: 4000, reverb: 0.24 },
  gpu: { layers: L(1, 0.7, 0.6, 0.65, 0.6, 1), kick: false, arpDensity: 0.65, crush: 0.35, trimDb: 0, cutoff: 4500, reverb: 0.3 },
  display: { layers: L(1, 0.85, 0, 0, 0, 0), kick: false, arpDensity: 0, crush: 0, trimDb: 0, cutoff: 3000, reverb: 0.32 },
  case: { layers: L(0.85, 0.85, 0, 0, 0, 0), kick: false, arpDensity: 0, crush: 0, trimDb: -8, cutoff: 2800, reverb: 0.3 },
  notfound: { layers: L(0.5, 0, 0, 0, 0, 0), kick: false, arpDensity: 0, crush: 0, trimDb: 0, cutoff: 900, reverb: 0.4 },
};

/** Ajuste fino de nivel de cada capa en dB (calibrado con las medidas RMS de `audio/measure`). */
export const LAYER_TRIM_DB: Record<LayerId, number> = {
  pad: -0.5,
  keys: 2,
  perc: -7,
  arp: -1,
  bass: -6,
  shimmer: 2,
};

/** Capas cuya ganancia cambia entre dos mezclas (las que hay que fundir en el siguiente compás). */
export function changedLayers(prev: MixSpec, next: MixSpec): LayerId[] {
  return LAYER_IDS.filter((id) => Math.abs(prev.layers[id] - next.layers[id]) > 1e-3);
}

/** Capa más fuerte de una mezcla (la «predominante» del indicador now playing); el pad por defecto. */
export function dominantOf(spec: MixSpec): LayerId {
  // Se prefiere la capa más «alta en la pieza» que está presente, no la más fuerte: describe lo que se oye.
  const order: LayerId[] = ["shimmer", "arp", "bass", "perc", "keys", "pad"];
  return order.find((id) => spec.layers[id] > 0.4) ?? "pad";
}

/** Capas efectivas con mute/solo del mezclador: si hay algún solo, solo suenan las solistas. */
export function effectiveGain(
  id: LayerId,
  spec: MixSpec,
  state: { muted: ReadonlySet<LayerId>; solo: ReadonlySet<LayerId> },
): number {
  if (state.muted.has(id)) return 0;
  if (state.solo.size > 0) return state.solo.has(id) ? Math.max(spec.layers[id], 0.9) : 0;
  return spec.layers[id];
}

// ───────────────────────────── Patrones (4 compases, rejilla de 16 pasos por compás) ─────────────────────────────

export interface PatternEvent {
  /** Compás (0..3) y paso de semicorchea (0..15). */
  bar: number;
  step: number;
  note: string;
  /** Duración en semicorcheas. */
  dur: number;
  vel: number;
}

/** KEYS: el motivo, más lento, en el piano eléctrico; el último compás queda abierto (Mi sobre A6). */
export const KEYS_PATTERN: readonly PatternEvent[] = [
  { bar: 0, step: 0, note: "F#4", dur: 5, vel: 0.7 },
  { bar: 0, step: 8, note: "A4", dur: 4, vel: 0.6 },
  { bar: 0, step: 12, note: "B4", dur: 4, vel: 0.6 },
  { bar: 1, step: 0, note: "D5", dur: 6, vel: 0.72 },
  { bar: 2, step: 4, note: "A4", dur: 4, vel: 0.55 },
  { bar: 2, step: 8, note: "F#4", dur: 4, vel: 0.55 },
  { bar: 3, step: 0, note: "E4", dur: 6, vel: 0.62 },
];

/** Orden en que se van activando las corcheas del arpegio al subir la densidad. */
const ARP_STEP_PRIORITY = [0, 4, 2, 6, 1, 5, 3, 7] as const;
/** Índice (en `chord.arp`) de cada corchea del compás: sube y baja por el acorde. */
const ARP_SHAPE = [0, 2, 4, 5, 4, 2, 3, 1] as const;

/** Corcheas activas (0..7) para una densidad dada. */
export function arpActiveSteps(density: number): number[] {
  const count = Math.round(Math.min(1, Math.max(0, density)) * ARP_STEP_PRIORITY.length);
  return [...ARP_STEP_PRIORITY.slice(0, count)].sort((a, b) => a - b);
}

/** Nota del arpegio en una corchea de un compás de la progresión. */
export function arpNote(bar: number, eighth: number): string {
  const chord = PROGRESSION[((bar % PROGRESSION.length) + PROGRESSION.length) % PROGRESSION.length]!;
  return chord.arp[ARP_SHAPE[eighth % ARP_SHAPE.length]! % chord.arp.length] as string;
}

/** BASS: corcheas rectas sobre la raíz (el contador de programa), con acentos. */
export const BASS_VELOCITY = [1, 0.5, 0.72, 0.5, 0.9, 0.5, 0.72, 0.55] as const;

/** PERC: pasos (de 16) de cada pieza de percusión en el compás. */
export const PERC_STEPS = {
  hat: [2, 6, 10, 14] as const,
  ghost: [15] as const,
  rim: [4, 12] as const,
  kick: [0, 8] as const,
  kickGhost: [10] as const,
};

/** SHIMMER: notas altas de la pentatónica que se reparten de forma pseudoaleatoria (determinista). */
export const SHIMMER_NOTES = ["D6", "F#6", "A5", "B5", "E6", "A6"] as const;

/** PRNG determinista (mulberry32): la humanización y el shimmer suenan igual en cada ejecución y en los tests. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pasos (de 16) con una ráfaga de shimmer en un compás: ~1 de cada 4 semicorcheas, sin repetir nota consecutiva. */
export function shimmerSteps(bar: number): { step: number; note: string }[] {
  const rnd = mulberry32(0x5eed + bar * 9973);
  const events: { step: number; note: string }[] = [];
  let last = -1;
  for (let step = 0; step < 16; step++) {
    if (rnd() < 0.2) {
      let pick = Math.floor(rnd() * SHIMMER_NOTES.length);
      if (pick === last) pick = (pick + 1) % SHIMMER_NOTES.length;
      last = pick;
      events.push({ step, note: SHIMMER_NOTES[pick] as string });
    }
  }
  return events;
}
