import type { Variant } from "./transitions/contract";
import { duration } from "./tokens";

/**
 * Contrato de la vitrina `/motion` (change 08). Cada transición T1–T11 se envuelve en un adaptador
 * con la MISMA forma (`TransitionDemo`) y la página solo conoce esta interfaz.
 *
 * Arquitectura (design D1/D2, ajustada tras aplicar 03–07): una demo es el código REAL de producción
 * ejecutándose en un «escenario» aislado, `/stage/<locale>/<Tn>`: una página con SOLO las secciones que
 * la transición conecta (las mismas que montan los prototipos) y el canvas persistente, dentro de un
 * iframe del mismo origen que la tarjeta monta al primer Replay. Así `/motion` no carga el motor 3D
 * hasta que se pide, solo hay una demo viva a la vez (al cambiar se retira el iframe y con él se
 * liberan el contexto, las escenas y los render targets) y el sitio real no se toca. El escenario
 * publica `window.__showcaseStage` (`StageApi`) y el adaptador (`createStageDemo`) habla con él.
 */

export const DEMO_IDS = ["T1", "T2", "T3", "T4", "T5", "T6", "T7", "T8", "T9", "T10", "T11"] as const;
export type DemoId = (typeof DEMO_IDS)[number];

export const DEMO_SPEEDS = [0.25, 0.5, 1] as const;
export type DemoSpeed = (typeof DEMO_SPEEDS)[number];
export const DEFAULT_SPEED: DemoSpeed = 1;

/** Duración nominal (ms) de una demo scrubbed por scroll: el punto medio de la banda `scene-scrub`. */
export const SCENE_DEMO_MS = (duration.sceneMin + duration.sceneMax) / 2;

/** Lo que dura una reproducción a la velocidad elegida (0,25× tarda cuatro veces su duración nominal). */
export const effectiveMs = (nominalMs: number, speed: DemoSpeed): number => nominalMs / speed;

/** Transiciones cuya versión principal usa el canvas 3D (T7 y T10 son DOM; T11 tiene versión SDF). */
export const DEMO_USES_3D: Record<DemoId, boolean> = {
  T1: false,
  T2: true,
  T3: true,
  T4: true,
  T5: true,
  T6: true,
  T7: false,
  T8: true,
  T9: true,
  T10: false,
  T11: true,
};

/** Estado que el escenario comunica al adaptador cuando está listo. */
export interface StageInfo {
  id: DemoId;
  /** Variante con la que se reproduce: `canvas` (3D), `dom` (2D) o `reduced` (fundidos). */
  variant: Variant;
  backend: "pending" | "webgpu" | "webgl2" | "none";
  tier: string;
  /** Se está mostrando la versión 2D de una demo que normalmente es 3D (falta aceleración). */
  fallback2d: boolean;
  reducedMotion: boolean;
  /** Este escenario sabe mostrar los internos de la transición (`setInternals` tiene efecto). */
  supportsInternals: boolean;
}

/** API que el escenario expone en `window.__showcaseStage`. */
export interface StageApi {
  /** Resuelve cuando el motor (o su ausencia) está decidido y la transición creada. */
  ready: Promise<StageInfo>;
  /** Reproduce una vez desde el estado inicial; resuelve al terminar. */
  replay(): Promise<void>;
  setSpeed(speed: DemoSpeed): void;
  /** Devuelve `false` si esta transición no tiene vista de internos activa. */
  setInternals(on: boolean): boolean;
  /** Pausa/reanuda el reloj del escenario (la demo sale/entra del viewport). */
  pause(): void;
  resume(): void;
  /** Fija el estado final sin animación (fotogramas estáticos / pósters). */
  showEnd(): Promise<void>;
  /** Progreso actual 0..1 de la reproducción. */
  progress(): number;
  /** Coloca la transición en un progreso 0..1 sin reproducirla (pruebas y fotogramas intermedios). */
  seek(progress: number): Promise<void>;
}

declare global {
  interface Window {
    __showcaseStage?: StageApi;
  }
}

/** Contrato común de todos los adaptadores (design D1). */
export interface TransitionDemo {
  readonly id: DemoId;
  /** Monta el escenario dentro del contenedor y resuelve con el estado cuando está listo. */
  mount(el: HTMLElement): Promise<StageInfo>;
  replay(): Promise<void>;
  setSpeed(speed: DemoSpeed): void;
  /** Devuelve si la demo mostró (o dejó de mostrar) sus internos. */
  setInternals(on: boolean): boolean;
  /** Pausa el renderizado cuando la demo sale del viewport y lo reanuda al volver. */
  setVisible(visible: boolean): void;
  /** Ruta del fotograma estático (SSR, sin JS, reduced motion y demos inactivas). */
  renderPoster(): string;
  /** Retira el escenario y libera sus recursos (contexto, escenas, render targets). */
  dispose(): void | Promise<void>;
}

/** Ruta pública del fotograma estático de una transición. */
export const posterSrc = (id: DemoId): string => `/motion/posters/${id}.webp`;

/** Ruta del escenario aislado de una transición. */
export const stageHref = (locale: string, id: DemoId, extra = ""): string =>
  `/stage/${locale}/${id}${extra}`;
