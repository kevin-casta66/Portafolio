/**
 * Síntesis de los sonidos del sitio (change 06, design D8). Todo se GENERA en el cliente con la Web
 * Audio API: no hay ningún archivo de audio que descargar, así que con el sonido desactivado no se
 * solicita ningún recurso de audio por red (spec `sound`), y con él activado solo se sintetiza la
 * fase actual y la siguiente.
 *
 * Funciones puras (sin `AudioContext`): devuelven `Float32Array` para poder probarlas en Node.
 */
export type PhaseName = "source" | "lexer" | "parser" | "bytecode" | "runtime" | "gpu" | "display";

/** Duración (s) de cada bucle de ambiente. Las frecuencias son múltiplos de 1/LOOP_SECONDS: el bucle es continuo. */
export const LOOP_SECONDS = 4;

/** Generador pseudoaleatorio determinista (mulberry32): mismo sonido en cada visita y en las pruebas. */
function prng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TAU = Math.PI * 2;

interface Voice {
  freq: number;
  amp: number;
}

function sines(out: Float32Array, rate: number, voices: readonly Voice[], tremoloHz = 0, depth = 0): void {
  for (let i = 0; i < out.length; i++) {
    const t = i / rate;
    const trem = tremoloHz > 0 ? 1 - depth + depth * (0.5 + 0.5 * Math.sin(TAU * tremoloHz * t)) : 1;
    let v = 0;
    for (const { freq, amp } of voices) v += amp * Math.sin(TAU * freq * t);
    out[i] = (out[i] ?? 0) + v * trem;
  }
}

/** Ruido filtrado (paso bajo de un polo) con modulación lenta; la cola se mezcla con el inicio para que el bucle no «clic». */
function filteredNoise(out: Float32Array, rate: number, seed: number, cutoffHz: number, amp: number, modHz = 0, modDepth = 0): void {
  const random = prng(seed);
  const alpha = 1 - Math.exp((-TAU * cutoffHz) / rate);
  let state = 0;
  const raw = new Float32Array(out.length);
  for (let i = 0; i < out.length; i++) {
    state += alpha * (random() * 2 - 1 - state);
    const t = i / rate;
    const mod = modHz > 0 ? 1 - modDepth + modDepth * (0.5 + 0.5 * Math.sin(TAU * modHz * t)) : 1;
    raw[i] = state * mod * amp * 3;
  }
  // Mezcla circular: los últimos 80 ms se funden con los primeros para un bucle sin salto.
  const fade = Math.min(Math.floor(rate * 0.08), Math.floor(out.length / 4));
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    raw[i] = (raw[i] ?? 0) * w + (raw[out.length - fade + i] ?? 0) * (1 - w);
  }
  for (let i = 0; i < out.length - fade; i++) out[i] = (out[i] ?? 0) + (raw[i] ?? 0);
}

/** Clics periódicos (ráfagas de ruido muy cortas con caída exponencial). */
function clicks(out: Float32Array, rate: number, seed: number, everySeconds: number, amp: number, jitter = 0): void {
  const random = prng(seed);
  const length = Math.floor(rate * 0.012);
  for (let at = 0; at < LOOP_SECONDS; at += everySeconds) {
    const start = Math.floor((at + (random() - 0.5) * jitter) * rate);
    for (let i = 0; i < length; i++) {
      const index = start + i;
      if (index < 0 || index >= out.length) continue;
      out[index] = (out[index] ?? 0) + (random() * 2 - 1) * amp * Math.exp((-i / length) * 5);
    }
  }
}

/** Normaliza para que el pico no supere `peak`. */
function normalize(out: Float32Array, peak: number): Float32Array {
  let max = 0;
  for (const v of out) max = Math.max(max, Math.abs(v));
  if (max > 0) {
    const gain = peak / max;
    for (let i = 0; i < out.length; i++) out[i] = (out[i] ?? 0) * gain;
  }
  return out;
}

/**
 * Bucle de ambiente de una fase: zumbido eléctrico en las fases de CPU, clics de reloj en BYTECODE,
 * ventiladores en GPU, un colchón tranquilo en DISPLAY. Mono, normalizado a un pico bajo (el volumen
 * final lo fija el bus de ambiente).
 */
export function ambienceLoop(phase: PhaseName, sampleRate: number): Float32Array {
  const out = new Float32Array(Math.floor(sampleRate * LOOP_SECONDS));
  switch (phase) {
    case "source": // zumbido eléctrico de red (50 Hz y armónicos)
      sines(out, sampleRate, [{ freq: 50, amp: 0.5 }, { freq: 100, amp: 0.25 }, { freq: 150, amp: 0.12 }]);
      filteredNoise(out, sampleRate, 11, 400, 0.04);
      break;
    case "lexer": // teclas suaves sobre un zumbido bajo
      sines(out, sampleRate, [{ freq: 80, amp: 0.3 }]);
      clicks(out, sampleRate, 21, 0.25, 0.5, 0.12);
      break;
    case "parser": // dron ramificado con trémolo lento
      sines(out, sampleRate, [{ freq: 98, amp: 0.4 }, { freq: 147, amp: 0.3 }, { freq: 196, amp: 0.15 }], 0.5, 0.5);
      break;
    case "bytecode": // clics de reloj, uno cada medio segundo
      sines(out, sampleRate, [{ freq: 50, amp: 0.2 }]);
      clicks(out, sampleRate, 31, 0.5, 0.8);
      break;
    case "runtime": // CPU: dron con armónicos y un poco de ruido
      sines(out, sampleRate, [1, 2, 3, 4, 5, 6].map((n) => ({ freq: 110 * n, amp: 0.4 / n })), 1, 0.25);
      filteredNoise(out, sampleRate, 41, 600, 0.05);
      break;
    case "gpu": // ventiladores: ruido de banda ancha que respira
      filteredNoise(out, sampleRate, 51, 900, 0.5, 0.5, 0.35);
      sines(out, sampleRate, [{ freq: 60, amp: 0.06 }]);
      break;
    case "display": // colchón tranquilo (acorde abierto)
      sines(out, sampleRate, [{ freq: 130, amp: 0.3 }, { freq: 196, amp: 0.25 }, { freq: 262, amp: 0.2 }], 0.25, 0.4);
      break;
  }
  return normalize(out, 0.5);
}

export type UiSoundName = "key" | "enter" | "toggle" | "achievement" | "open";

/** Sonido de interfaz corto (mono). Más suave que el ambiente: el bus de UI lo reduce todavía más. */
export function uiSound(name: UiSoundName, sampleRate: number): Float32Array {
  const spec: Record<UiSoundName, { seconds: number; notes: readonly (readonly [freq: number, at: number])[]; noise: number }> = {
    key: { seconds: 0.03, notes: [], noise: 1 },
    enter: { seconds: 0.09, notes: [[660, 0], [880, 0.04]], noise: 0 },
    toggle: { seconds: 0.07, notes: [[520, 0]], noise: 0 },
    achievement: { seconds: 0.5, notes: [[523.25, 0], [659.25, 0.12], [783.99, 0.24]], noise: 0 },
    open: { seconds: 0.18, notes: [[300, 0], [450, 0.05]], noise: 0.2 },
  };
  const { seconds, notes, noise } = spec[name];
  const out = new Float32Array(Math.floor(sampleRate * seconds));
  const random = prng(name.length * 977);
  for (const [freq, at] of notes) {
    const start = Math.floor(at * sampleRate);
    for (let i = start; i < out.length; i++) {
      const t = (i - start) / sampleRate;
      out[i] = (out[i] ?? 0) + Math.sin(TAU * freq * t) * Math.exp(-t * 14) * 0.6;
    }
  }
  if (noise > 0) {
    const length = Math.floor(sampleRate * Math.min(seconds, 0.012));
    for (let i = 0; i < length; i++) out[i] = (out[i] ?? 0) + (random() * 2 - 1) * noise * Math.exp((-i / length) * 4);
  }
  // Ataque de 1 ms: evita el chasquido del primer muestreo.
  const attack = Math.floor(sampleRate * 0.001);
  for (let i = 0; i < attack && i < out.length; i++) out[i] = (out[i] ?? 0) * (i / attack);
  return normalize(out, 0.7);
}

/** Frecuencia del tono continuo según la velocidad de scroll ∈ [-1, 1], acotada entre reposo y máximo. */
export const TONE = { restHz: 110, maxHz: 440, restGain: 0.012, maxGain: 0.045 } as const;

export function toneFor(velocity: number): { hz: number; gain: number } {
  const v = Math.min(1, Math.abs(velocity));
  return { hz: TONE.restHz + (TONE.maxHz - TONE.restHz) * v, gain: TONE.restGain + (TONE.maxGain - TONE.restGain) * v };
}

/** Fases del ambiente que conviene tener listas: la actual y la siguiente (si existe). */
export function phasesToPreload(current: PhaseName, order: readonly PhaseName[]): PhaseName[] {
  const index = order.indexOf(current);
  const next = order[index + 1];
  return index < 0 ? [] : next ? [current, next] : [current];
}
