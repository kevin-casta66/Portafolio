/**
 * Tipos públicos del audio (change 08b). Sin dependencias en tiempo de ejecución: este archivo y
 * `audio/index.ts` entran en el bundle inicial y NO pueden importar `tone`.
 */
import type { SKILL_CATEGORIES } from "@/lib/content/schema";

/** Fases con su propia mezcla (las 7 del compilador). */
export type AudioPhase = "source" | "lexer" | "parser" | "bytecode" | "runtime" | "gpu" | "display";

/** Contexto de mezcla: las fases más los estados que cambian el arreglo musical. */
export type MixContext = AudioPhase | "boot" | "case" | "notfound";

/** Capas verticales de la pieza (ADDENDUM-v3 §3). */
export const LAYER_IDS = ["pad", "keys", "perc", "arp", "bass", "shimmer"] as const;
export type LayerId = (typeof LAYER_IDS)[number];

export type TokenKind = "keyword" | "identifier" | "string" | "number";
export type SkillCategory = (typeof SKILL_CATEGORIES)[number];

/**
 * Catálogo COMPLETO de eventos de sonido (design D1). Los componentes solo conocen esto: nunca el motor.
 * `void` = sin carga. Añadir un evento exige tocar este archivo y el test de contrato.
 */
export interface AudioEventMap {
  // Puerta de arranque
  "gate:sound": void;
  "gate:silent": void;
  // BOOT
  "boot:line": { index: number };
  "boot:done": void;
  // Contexto/fase activa (el SoundManager lo emite desde el store; el motor cuantiza al compás)
  "phase:source": void;
  "phase:lexer": void;
  "phase:parser": void;
  "phase:bytecode": void;
  "phase:runtime": void;
  "phase:gpu": void;
  "phase:display": void;
  // Casos de estudio
  "case:enter": void;
  "case:leave": void;
  "case:breakpoint": void;
  // SOURCE
  "hero:key": { index: number };
  // LEXER
  "hover:token": { kind: TokenKind };
  "counter:tick": void;
  "counter:done": void;
  // PARSER
  "hover:skill": { category: SkillCategory };
  "select:skill": { category: SkillCategory };
  // BYTECODE
  "bytecode:instruction": void;
  "bytecode:function": void;
  // RUNTIME (x normalizada 0..1 para el panorama)
  "runtime:core-hover": { x: number };
  // Hold-to-Execute (progress 0..1)
  "hold:start": void;
  "hold:progress": { progress: number };
  "hold:cancel": void;
  "hold:complete": void;
  // GPU: las demos del laboratorio pueden modular la música (0..1)
  "lab:modulate": { cutoff?: number; reverb?: number };
  // DISPLAY
  "contact:focus": void;
  "contact:send": void;
  "contact:ok": void;
  "contact:error": void;
  // 404
  "notfound:enter": void;
  "notfound:restart": void;
  // Terminal, logros, tema, controles
  "terminal:key": void;
  "terminal:unknown": void;
  achievement: { id: string };
  theme: { theme: "light" | "dark" };
  "ui:toggle": void;
  "ui:enter": void;
  "ui:open": void;
  // Contextos que cambian la mezcla
  "quickview:on": void;
  "quickview:off": void;
  "media:play": void;
  "media:stop": void;
  "mixer:open": void;
}

export type AudioEvent = keyof AudioEventMap;

/** Lista exhaustiva en tiempo de compilación: el test de contrato la compara con las emisiones reales. */
export const AUDIO_EVENTS = [
  "gate:sound", "gate:silent", "boot:line", "boot:done",
  "phase:source", "phase:lexer", "phase:parser", "phase:bytecode", "phase:runtime", "phase:gpu", "phase:display",
  "case:enter", "case:leave", "case:breakpoint", "hero:key", "hover:token", "counter:tick", "counter:done",
  "hover:skill", "select:skill", "bytecode:instruction", "bytecode:function", "runtime:core-hover",
  "hold:start", "hold:progress", "hold:cancel", "hold:complete", "lab:modulate",
  "contact:focus", "contact:send", "contact:ok", "contact:error", "notfound:enter", "notfound:restart",
  "terminal:key", "terminal:unknown", "achievement", "theme", "ui:toggle", "ui:enter", "ui:open",
  "quickview:on", "quickview:off", "media:play", "media:stop", "mixer:open",
] as const satisfies readonly AudioEvent[];

/** Estado de una capa para el mezclador y el indicador «now playing». */
export interface LayerState {
  id: LayerId;
  /** Ganancia objetivo de la capa en la fase actual (0 = fuera de la mezcla). */
  gain: number;
  muted: boolean;
  solo: boolean;
}

/**
 * API de lectura y control que el motor registra al cargar y consumen el mezclador (`mixer`) y el
 * Call Stack («now playing»). Antes de que el motor cargue, `audio.controls` devuelve una versión
 * inerte (`ready: false`) con la misma forma, para que los componentes no ramifiquen.
 */
export interface AudioControls {
  /** `true` cuando el motor está cargado y el contexto de audio está en marcha. */
  readonly ready: boolean;
  /** Se invoca cuando cambia algo estructural (motor listo, fase, mute/solo). No por frame. */
  subscribe(listener: () => void): () => void;
  layers(): readonly LayerState[];
  setLayerMuted(id: LayerId, muted: boolean): void;
  setLayerSolo(id: LayerId, solo: boolean): void;
  /** Nivel 0..1 de una capa (medidor), para los vúmetros; barato de leer en el tick único. */
  layerLevel(id: LayerId): number;
  /** Rellena `out` con magnitudes 0..1 del espectro del bus de música (para las barras). */
  spectrum(out: Float32Array): void;
  /** Energía 0..1 del bus de música (la misma que alimenta `uAudioEnergy`). */
  energy(): number;
  /** Contexto de mezcla actual y capa predominante (la más alta de la mezcla). */
  context(): MixContext;
  dominantLayer(): LayerId;
  /** Milisegundos hasta el siguiente compás, o `null` si el motor no está sonando. */
  timeToNextBar(): number | null;
  /** Llama a `cb` la primera vez que suena algo en la sesión del motor (aviso «Pulsa M para silenciar»). */
  onFirstSound(cb: () => void): () => void;
}
