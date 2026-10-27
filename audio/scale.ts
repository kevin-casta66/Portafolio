/**
 * Teoría musical de la pieza (ADDENDUM-v3 §2): Re mayor, 84 BPM, 4/4, progresión Bm7 – Gmaj7 – Dmaj7 – A6.
 * Todo son funciones y constantes PURAS (sin Tone ni DOM) para poder probarlas: la escala de las
 * interacciones, el leitmotiv y sus variaciones, la cuantización al pulso y la asignación estable de
 * variaciones a logros.
 */

export const BPM = 84;
export const BEATS_PER_BAR = 4;
export const BEAT_S = 60 / BPM;
export const BAR_S = BEAT_S * BEATS_PER_BAR;
export const PROGRESSION_BARS = 4;

const SEMITONE: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };

/** Frecuencia de una nota con nombre científico («F#4», «D5»), afinación A4 = 440 Hz. */
export function noteToHz(note: string): number {
  const match = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`Nota inválida: ${note}`);
  const semitone = SEMITONE[match[1] as string] as number;
  const octave = Number(match[2]);
  const midi = 12 * (octave + 1) + semitone;
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Clase de altura (0..11) de una nota con nombre. */
export const pitchClass = (note: string): number => {
  const match = /^([A-G]#?)(-?\d)$/.exec(note);
  if (!match) throw new Error(`Nota inválida: ${note}`);
  return SEMITONE[match[1] as string] as number;
};

/** Pentatónica de Re mayor (Re, Mi, Fa#, La, Si) en dos octavas (D4–B5). */
export const PENTATONIC = ["D4", "E4", "F#4", "A4", "B4", "D5", "E5", "F#5", "A5", "B5"] as const;
/** Octava grave de la misma escala (comando desconocido, bajo). */
export const PENTATONIC_LOW = ["D3", "E3", "F#3", "A3", "B3"] as const;

/** Clases de altura de la pentatónica de Re mayor: D, E, F#, A, B. */
export const PENTATONIC_CLASSES: ReadonlySet<number> = new Set([2, 4, 6, 9, 11]);
/** Todas las clases de altura de Re mayor (para acordes y la melodía de fondo). */
export const D_MAJOR_CLASSES: ReadonlySet<number> = new Set([2, 4, 6, 7, 9, 11, 1]);

export const isInScale = (note: string): boolean => PENTATONIC_CLASSES.has(pitchClass(note));

/** Una nota de la pentatónica por índice (envuelve), para escaleras ascendentes como las líneas [ OK ]. */
export const pentatonicAt = (index: number): string =>
  PENTATONIC[((Math.floor(index) % PENTATONIC.length) + PENTATONIC.length) % PENTATONIC.length] as string;

/** Acordes de la progresión con voicing de pad suave (movimiento mínimo) y raíz de bajo. */
export interface ChordSpec {
  name: "Bm7" | "Gmaj7" | "Dmaj7" | "A6";
  /** Notas del pad (3 voces que se deslizan de un acorde al siguiente sin retocar la envolvente). */
  pad: readonly [string, string, string];
  /** Nota del bajo redondo. */
  bass: string;
  /** Notas del arpegio (ascendente) dentro de la escala del acorde. */
  arp: readonly string[];
}

export const PROGRESSION: readonly ChordSpec[] = [
  { name: "Bm7", pad: ["A3", "D4", "F#4"], bass: "B2", arp: ["B3", "D4", "F#4", "A4", "D5", "F#5"] },
  { name: "Gmaj7", pad: ["B3", "D4", "F#4"], bass: "G2", arp: ["G3", "B3", "D4", "F#4", "B4", "D5"] },
  { name: "Dmaj7", pad: ["A3", "D4", "F#4"], bass: "D3", arp: ["D4", "F#4", "A4", "C#5", "F#5", "A5"] },
  { name: "A6", pad: ["A3", "C#4", "F#4"], bass: "A2", arp: ["A3", "C#4", "E4", "F#4", "A4", "E5"] },
];

/** Acorde final de resolución (tónica de Re mayor) para el éxito del contacto: D F# A + octava. */
export const TONIC_CHORD = ["D3", "A3", "D4", "F#4", "A4"] as const;

/** Leitmotiv de 4 notas: sube por la pentatónica y resuelve en la tónica (Re). Duración en pulsos. */
export interface MotifNote {
  note: string;
  beats: number;
}
export const MOTIF: readonly MotifNote[] = [
  { note: "F#4", beats: 1 },
  { note: "A4", beats: 1 },
  { note: "B4", beats: 1 },
  { note: "D5", beats: 2 },
];

/** Variaciones de 3 notas del motivo para los logros (todas dentro de la pentatónica). */
export const MOTIF_VARIATIONS: readonly (readonly [string, string, string])[] = [
  ["A4", "B4", "D5"],
  ["F#4", "B4", "D5"],
  ["A4", "D5", "F#5"],
  ["B4", "D5", "F#5"],
  ["F#4", "A4", "D5"],
  ["D5", "B4", "A4"],
  ["E5", "A5", "D5"],
  ["F#5", "D5", "A4"],
  ["B4", "F#5", "D5"],
  ["D5", "E5", "A5"],
];

/** Hash estable (FNV-1a de 32 bits): el mismo id de logro suena siempre igual, ids distintos suelen sonar distinto. */
export function stableHash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Variación del leitmotiv de un logro. Con la lista de ids conocidos (orden del catálogo) la asignación
 * es inyectiva mientras haya menos logros que variaciones; sin ella se usa el hash.
 */
export function variationFor(id: string, knownIds: readonly string[] = []): readonly [string, string, string] {
  const known = knownIds.indexOf(id);
  const index = known >= 0 ? known : stableHash(id);
  return MOTIF_VARIATIONS[index % MOTIF_VARIATIONS.length] as readonly [string, string, string];
}

/** Nota de un token del LEXER según su tipo (keyword Re, identifier Mi, string Fa#, number La). */
export const TOKEN_NOTE: Record<"keyword" | "identifier" | "string" | "number", string> = {
  keyword: "D5",
  identifier: "E5",
  string: "F#5",
  number: "A5",
};

/** Nota de una tecnología según su categoría (todas de la pentatónica). */
export const SKILL_NOTE: Record<string, string> = {
  ai: "A5",
  backend: "D5",
  frontend: "F#5",
  "cloud-devops": "A4",
  data: "E5",
  design: "B4",
  "soft-skills": "D4",
};

/** Acorde que se abre al seleccionar una tecnología (mismas categorías): raíz + quinta + novena de la pentatónica. */
export function skillChord(category: string): readonly string[] {
  const root = SKILL_NOTE[category] ?? "D5";
  const index = PENTATONIC.indexOf(root as (typeof PENTATONIC)[number]);
  const at = (offset: number) => PENTATONIC[Math.min(PENTATONIC.length - 1, Math.max(0, index + offset))] as string;
  return [at(-3), at(0), at(1), at(2)];
}

export type Subdivision = "16n" | "8n" | "4n" | "1m";
/** Duración de una subdivisión en segundos. */
export const SUBDIVISION_S: Record<Subdivision, number> = {
  "16n": BEAT_S / 4,
  "8n": BEAT_S / 2,
  "4n": BEAT_S,
  "1m": BAR_S,
};

/**
 * Instante (s en el reloj del Transport) del siguiente límite de una subdivisión estrictamente posterior
 * a `positionS` (con una tolerancia de 1 ms para no esperar un compás entero por un redondeo).
 */
export function nextBoundary(positionS: number, subdivision: Subdivision): number {
  const step = SUBDIVISION_S[subdivision];
  const k = Math.ceil((positionS - 0.001) / step);
  return k * step;
}

/** Milisegundos que faltan hasta el siguiente límite de la subdivisión. */
export const msToBoundary = (positionS: number, subdivision: Subdivision): number =>
  Math.max(0, (nextBoundary(positionS, subdivision) - positionS) * 1000);

/** Índice del compás (0..3) de la progresión en un instante. */
export const progressionBarAt = (positionS: number): number =>
  Math.floor(positionS / BAR_S) % PROGRESSION_BARS;

/** Pulso del compás (0..3). */
export const beatInBar = (positionS: number): number =>
  Math.floor((positionS % BAR_S) / BEAT_S);

/** Convierte dB a ganancia lineal y viceversa (utilidades de la mezcla). */
export const dbToGain = (db: number): number => 10 ** (db / 20);
export const gainToDb = (gain: number): number => 20 * Math.log10(Math.max(gain, 1e-6));
