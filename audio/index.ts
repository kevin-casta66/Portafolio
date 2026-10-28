/**
 * Fachada del audio (change 08b, design D1). ÚNICO punto de entrada que conocen los componentes:
 * `audio.emit("phase:runtime")`, `audio.emit("hold:progress", { progress: 0.4 })`…
 *
 * Vive en el bundle inicial (< 1 KB) y NO importa `tone` ni el motor: el motor (`audio/engine.ts`,
 * chunk propio) se carga solo tras elegir sonido y se registra aquí con `registerEngine`. Mientras no
 * hay motor, emitir no hace nada (salvo recordar la fase actual para que el motor arranque en ella);
 * emitir nunca falla ni retrasa nada.
 */
import type {
  AudioControls,
  AudioEvent,
  AudioEventMap,
  LayerId,
  LayerState,
  MixContext,
} from "./types";

export * from "./types";

/** Lo que el motor implementa para recibir eventos. */
export interface AudioSink {
  handle<K extends AudioEvent>(event: K, payload: AudioEventMap[K]): void;
}

type EmitArgs<K extends AudioEvent> = AudioEventMap[K] extends void ? [] : [payload: AudioEventMap[K]];

const idleControls: AudioControls = {
  ready: false,
  subscribe: () => () => {},
  layers: () => [] as readonly LayerState[],
  setLayerMuted: () => {},
  setLayerSolo: () => {},
  layerLevel: () => 0,
  spectrum: (out) => out.fill(0),
  energy: () => 0,
  context: () => "boot" as MixContext,
  dominantLayer: () => "pad" as LayerId,
  timeToNextBar: () => null,
  onFirstSound: () => () => {},
};

let sink: AudioSink | null = null;
let controls: AudioControls = idleControls;
/** Estado de la puerta de arranque que el motor necesita al cargar tarde (nada suena antes de elegir). */
const gate = { resolved: false, bootDone: false, lines: 0 };
const gateListeners = new Set<() => void>();
/** Último evento de contexto (fase, caso, 404…) para que el motor arranque en el estado correcto. */
let lastContextEvent: AudioEvent | null = null;
const controlListeners = new Set<() => void>();

/** Eventos que cambian el contexto de mezcla (fase, caso de estudio, 404, Vista Rápida): se recuerda el último. */
const isContextEvent = (event: AudioEvent): boolean => /^(phase|case|notfound|quickview):/.test(event) && event !== "case:breakpoint";

export const audio = {
  emit<K extends AudioEvent>(event: K, ...args: EmitArgs<K>): void {
    const payload = args[0] as AudioEventMap[K];
    if (typeof window !== "undefined") {
      // Gancho de pruebas: si la página define `window.__portafolioAudioLog = []`, se anota aquí.
      (window as { __portafolioAudioLog?: unknown[] }).__portafolioAudioLog?.push({ event, payload });
    }
    if (isContextEvent(event)) lastContextEvent = event;
    if (event === "gate:sound" || event === "gate:silent") gate.resolved = true;
    else if (event === "boot:done") {
      gate.resolved = true;
      gate.bootDone = true;
    } else if (event === "boot:line") gate.lines++;
    if (event === "gate:sound" || event === "gate:silent" || event === "boot:done") for (const l of [...gateListeners]) l();
    if (!sink) return;
    try {
      sink.handle(event, payload);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error(`[audio] ${event}`, error);
    }
  },

  /** API de lectura/control para el mezclador y «now playing»; inerte hasta que el motor carga. */
  get controls(): AudioControls {
    return controls;
  },

  /**
   * Estado de la puerta de arranque: `resolved` (el visitante eligió o la puerta terminó), `bootDone` (la
   * salida de la puerta ya ocurrió) y `lines` (líneas [ OK ] emitidas antes de que hubiese motor).
   */
  get gate(): Readonly<typeof gate> {
    return gate;
  },

  /** Avisa cuando cambia el estado de la puerta (elección o fin del arranque). */
  onGate(listener: () => void): () => void {
    gateListeners.add(listener);
    return () => gateListeners.delete(listener);
  },

  /** Milisegundos hasta el siguiente compás o `null` (sin motor). Lo usa el controlador de transiciones. */
  timeToNextBar(): number | null {
    return controls.timeToNextBar();
  },

  /** Registra el motor cargado (lo llama `audio/engine.ts`). Devuelve la función que lo retira. */
  registerEngine(next: AudioSink, nextControls: AudioControls): () => void {
    sink = next;
    controls = nextControls;
    if (lastContextEvent) next.handle(lastContextEvent, undefined as never);
    for (const listener of controlListeners) listener();
    return () => {
      if (sink === next) {
        sink = null;
        controls = idleControls;
        for (const listener of controlListeners) listener();
      }
    };
  },

  /** Cambios del propio registro (motor listo/retirado); los de capas los notifica `controls.subscribe`. */
  onRegistryChange(listener: () => void): () => void {
    controlListeners.add(listener);
    return () => controlListeners.delete(listener);
  },

  /** Solo para tests. */
  reset(): void {
    sink = null;
    controls = idleControls;
    lastContextEvent = null;
    controlListeners.clear();
    gateListeners.clear();
    gate.resolved = false;
    gate.bootDone = false;
    gate.lines = 0;
  },
};

export type Audio = typeof audio;

// ───────────────────────────── Gancho de pruebas (solo con `?motionTest`) ─────────────────────────────

/** Lo que el motor aporta al gancho de pruebas (foto del estado de la mezcla). */
export interface SoundProbe {
  snapshot(): unknown;
  /** Efectos reproducidos y descartados (con motivo) desde el último `clearSfxLog`. */
  sfxLog?(): unknown[];
  clearSfxLog?(): void;
  /** Picos desde la última lectura (dBFS del bus de efectos y de la salida) y nivel de la música (dB RMS). */
  levels?(reset?: boolean): { sfxPeakDb: number; masterPeakDb: number; musicDb: number };
}

let probe: SoundProbe | null = null;

/** El motor registra aquí su foto de estado para `window.__portafolioSound` (null al retirarse). */
export function setSoundProbe(next: SoundProbe | null): void {
  probe = next;
}

/** Sonda completa del motor (registro de efectos, picos) para el gancho de pruebas. */
export const readSoundProbeApi = (): SoundProbe | null => probe;

/** Lectura de la foto del motor para el gancho de pruebas. */
export const readSoundProbe = (): unknown => (probe ? probe.snapshot() : null);

/** `true` mientras hay un motor registrado. */
export const hasEngine = (): boolean => sink !== null;

// El gancho vive en su propio chunk y SOLO se pide con `?motionTest`: sin ese parámetro no existe ningún
// objeto global de pruebas y el bundle inicial no lleva su código.
if (typeof window !== "undefined" && window.location.search.includes("motionTest")) void import("./test-hook");
