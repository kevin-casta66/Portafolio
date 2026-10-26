import type { Camera, Scene, WebGPURenderer } from "three/webgpu";
import type { Range } from "./layout";
import type { FrameState } from "./frame";
import type { QualityPreset } from "../quality";
import type { TokenColors } from "./color";

/** Una escena viva: su `Scene`/cámara de three, su actualización por frame y su limpieza. */
export interface SceneInstance {
  scene: Scene;
  camera: Camera;
  /**
   * Actualiza la escena. Devuelve `true` si sigue animándose (el motor pedirá otro frame); con
   * `false` el motor deja de renderizar hasta el siguiente cambio de scroll, puntero o tamaño.
   */
  update(frame: FrameState): boolean;
  /** Ejecuta compute shaders antes del render (solo tier alto; opcional). */
  compute?(renderer: WebGPURenderer, frame: FrameState): void;
  /** Escala de resolución propia (p. ej. 1 para el texto, que siempre es nítido); por defecto la del tier. */
  resolutionScale?: number;
  /** La escena emite en el canal `glow` del MRT (bloom selectivo). */
  emits?: boolean;
  /** Tamaño del viewport en píxeles CSS cambió. */
  resize?(width: number, height: number): void;
  /** El tier cambió en caliente: reconstruye solo lo que depende de él. */
  applyQuality?(preset: QualityPreset): void;
  /** Los tokens de color cambiaron (tema). */
  applyColors?(colors: TokenColors): void;
  /** Información interna para pruebas y Modo Debug (opcional). */
  debug?(): Record<string, unknown>;
  /** Libera geometrías, materiales, texturas y render targets propios. */
  dispose(): void;
}

export interface EngineContext {
  renderer: WebGPURenderer;
  frame: FrameState;
  colors(): TokenColors;
  /** Pide otro frame (una animación empieza fuera del bucle de scroll/puntero). */
  markDirty(): void;
  /** Pulso de aberración cromática (cambio de fase). */
  pulseChroma(): void;
}

export type SceneFactory = (ctx: EngineContext) => SceneInstance | Promise<SceneInstance>;

/** Declaración de una escena en el registro (un `SceneDef` por fase o transición). */
export interface SceneDef {
  id: string;
  /** Orden de composición (menor = más al fondo). */
  order: number;
  /** Rango(s) de scroll (px de documento) en los que la escena está activa; `null` si aún no se puede medir. */
  range(): Range | Range[] | null;
  /** Distancia extra antes del rango en la que ya se carga el código (por defecto 1 viewport). */
  preload?: number;
  /** Importación dinámica del módulo de la escena: solo se pide al acercarse al rango. */
  load(): Promise<SceneFactory>;
  /** La escena solo existe si el preset lo permite (p. ej. fluido solo en tier alto). */
  enabled?(preset: QualityPreset, frame: FrameState): boolean;
}
