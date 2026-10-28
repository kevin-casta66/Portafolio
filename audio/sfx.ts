/**
 * Catálogo de sonidos de interacción (ADDENDUM-v3 §4–§5). Para cada evento: qué suena, cuándo (subdivisión
 * del pulso a la que se cuantiza), por qué bus, con qué prioridad de voz y cuánto puede durar. Es
 * DATO PURO: el motor (`mix.ts`) tiene un reproductor por `kind`, y los tests comprueban la tabla
 * (duración ≤ 1,2 s salvo el riser, subdivisiones válidas, cobertura de eventos).
 */
import type { AudioEvent } from "./types";
import type { Subdivision } from "./scale";

export type SfxKind =
  | "note" // pluck afinado (nota del payload o de la escala)
  | "bell" // campanita FM
  | "key" // tecla mecánica (sin altura: no se cuantiza)
  | "tick" // tick suave
  | "low" // nota grave suave
  | "chord" // acorde corto
  | "motif" // leitmotiv completo
  | "variation" // variación de 3 notas del motivo
  | "cymbal" // platillo suave en crescendo
  | "packet" // pulsos que viajan de izquierda a derecha
  | "descend" // dos notas descendentes (error)
  | "flash" // destello panoramizado
  | "swish" // barrido brillante
  | "riser" // riser del Hold
  | "impact"; // impacto + acorde resuelto

export interface SfxDef {
  kind: SfxKind;
  /** Subdivisión a la que se alinea; `now` para sonidos sin altura (clics, risers). */
  quant: Subdivision | "now";
  /** Prioridad de voz (mayor = más importante). */
  priority: number;
  /** Duración máxima audible en segundos (cola incluida): el presupuesto de voces la usa como vida de la voz. */
  maxS: number;
  /** Separación mínima entre disparos del mismo evento (ms). */
  gapMs: number;
  /** Nivel relativo del efecto en dB (antes del bus de efectos). */
  db: number;
  /** Con movimiento reducido: `skip` lo omite, `short` lo sustituye por una nota corta. */
  reduced?: "skip" | "short";
  /** `false`: no baja la música mientras suena (teclas y ticks muy frecuentes). Por defecto, sí. */
  duck?: false;
}

/** Duración máxima de cualquier efecto salvo el riser (ADDENDUM-v3 §8). */
export const SFX_MAX_S = 1.2;

/** Eventos que producen un sonido de interacción. El resto cambia la mezcla o no suena. */
export const SFX: Partial<Record<AudioEvent, SfxDef>> = {
  "boot:line": { kind: "note", quant: "16n", priority: 3, maxS: 0.3, gapMs: 60, db: -4 },
  "boot:done": { kind: "motif", quant: "1m", priority: 5, maxS: 1.2, gapMs: 1000, db: -6.5 },
  "hero:key": { kind: "note", quant: "16n", priority: 3, maxS: 0.3, gapMs: 60, db: -5.5 },
  "hover:token": { kind: "note", quant: "16n", priority: 2, maxS: 0.3, gapMs: 100, db: -4.5 },
  "counter:tick": { kind: "tick", quant: "now", priority: 1, maxS: 0.05, gapMs: 55, db: -3.5, duck: false },
  "counter:done": { kind: "bell", quant: "16n", priority: 3, maxS: 1.1, gapMs: 400, db: -4 },
  "hover:skill": { kind: "note", quant: "16n", priority: 2, maxS: 0.3, gapMs: 100, db: -4 },
  "select:skill": { kind: "chord", quant: "8n", priority: 4, maxS: 1.2, gapMs: 250, db: -12.5 },
  "bytecode:instruction": { kind: "note", quant: "16n", priority: 1, maxS: 0.25, gapMs: 120, db: -5 },
  "bytecode:function": { kind: "cymbal", quant: "8n", priority: 3, maxS: 1.2, gapMs: 700, db: -3, reduced: "short" },
  "runtime:core-hover": { kind: "flash", quant: "16n", priority: 2, maxS: 0.8, gapMs: 110, db: -4.5 },
  "hold:start": { kind: "riser", quant: "now", priority: 4, maxS: 1.0, gapMs: 0, db: -5, reduced: "skip" },
  "hold:complete": { kind: "impact", quant: "16n", priority: 6, maxS: 1.2, gapMs: 400, db: -11, reduced: "short" },
  "case:breakpoint": { kind: "tick", quant: "16n", priority: 1, maxS: 0.1, gapMs: 120, db: -1.5 },
  "contact:focus": { kind: "note", quant: "16n", priority: 2, maxS: 0.3, gapMs: 120, db: -5 },
  "contact:send": { kind: "packet", quant: "16n", priority: 4, maxS: 1.2, gapMs: 600, db: -5, reduced: "short" },
  "contact:ok": { kind: "motif", quant: "8n", priority: 6, maxS: 1.2, gapMs: 1500, db: -10.5 },
  "contact:error": { kind: "descend", quant: "16n", priority: 5, maxS: 0.9, gapMs: 600, db: -5 },
  "terminal:key": { kind: "key", quant: "now", priority: 1, maxS: 0.05, gapMs: 38, db: -8, duck: false },
  "terminal:unknown": { kind: "low", quant: "16n", priority: 3, maxS: 0.9, gapMs: 300, db: -5 },
  achievement: { kind: "variation", quant: "8n", priority: 5, maxS: 1.2, gapMs: 500, db: -9 },
  "ui:toggle": { kind: "note", quant: "16n", priority: 2, maxS: 0.3, gapMs: 120, db: -3.5 },
  "ui:enter": { kind: "note", quant: "16n", priority: 2, maxS: 0.3, gapMs: 120, db: -4 },
  "ui:open": { kind: "bell", quant: "16n", priority: 2, maxS: 0.9, gapMs: 200, db: -4.5 },
  "mixer:open": { kind: "chord", quant: "8n", priority: 3, maxS: 1.2, gapMs: 400, db: -6 },
  "notfound:restart": { kind: "tick", quant: "now", priority: 3, maxS: 0.3, gapMs: 400, db: -6 },
};

/** Eventos de contexto: cambian la mezcla (cuantizada al compás), no disparan un efecto propio. */
export const CONTEXT_EVENTS_FOR_MIX = [
  "phase:source", "phase:lexer", "phase:parser", "phase:bytecode", "phase:runtime", "phase:gpu", "phase:display",
  "case:enter", "case:leave", "notfound:enter", "notfound:restart", "quickview:on", "quickview:off",
] as const satisfies readonly AudioEvent[];

/** Eventos que modifican el motor sin sonido propio (los atiende `engine.ts`/`mix.ts`). */
export const CONTROL_EVENTS = [
  "gate:sound", "gate:silent", "hold:progress", "hold:cancel", "lab:modulate", "theme", "media:play", "media:stop",
] as const satisfies readonly AudioEvent[];
