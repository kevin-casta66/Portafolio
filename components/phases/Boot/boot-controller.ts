import { BOOT_MAX_MS, createBootRegistry, type BootRegistry } from "@/motion/boot";
import { BOOTED_KEY } from "@/motion/config";

/**
 * Máquina de estados de la puerta de arranque (T1), sin React ni DOM: decide si se muestra, cuándo
 * pasan los logs a la elección y cómo termina. El componente solo pinta su `snapshot` y ejecuta las
 * animaciones. Estados: `idle` → `logs` → `choose` → `exit` → `done` (la versión corta salta
 * directamente a `exit`).
 */
export type BootMode = "off" | "full" | "short";
export type BootStage = "idle" | "logs" | "choose" | "exit" | "done";
export type BootChoice = "sound" | "silent";

export interface BootLineState {
  id: string;
  done: boolean;
  value?: string | number | undefined;
}

export interface BootSnapshot {
  mode: BootMode;
  stage: BootStage;
  progress: number;
  lines: BootLineState[];
  choice: BootChoice | null;
}

export interface BootEnv {
  /** Ruta sin prefijo de idioma (`/` es el home). */
  pathname: string;
  search: string;
  hash: string;
  /** `true` si ya se mostró la puerta en esta sesión del navegador. */
  visitedThisSession: boolean;
}

/**
 * ¿Se muestra la puerta? Nunca fuera del home, nunca con Vista Rápida, nunca con un ancla de
 * sección; en visitas posteriores de la sesión, la versión corta.
 */
export function decideMode(env: BootEnv): BootMode {
  if (env.pathname !== "/") return "off";
  if (/[?&]view=quick(&|$)/.test(env.search)) return "off";
  if (env.hash && env.hash !== "#content") return "off";
  return env.visitedThisSession ? "short" : "full";
}

export interface BootControllerOptions {
  registry?: BootRegistry;
  maxMs?: number;
  /** Guarda la elección (store + sessionStorage). */
  onChoice?: (choice: BootChoice) => void;
  /** Marca la sesión como ya arrancada. */
  onBooted?: () => void;
  onDone?: () => void;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
}

export const OFF_SNAPSHOT: BootSnapshot = {
  mode: "off",
  stage: "idle",
  progress: 1,
  lines: [],
  choice: null,
};

export function createBootController(options: BootControllerOptions = {}) {
  const registry = options.registry ?? createBootRegistry();
  const maxMs = options.maxMs ?? BOOT_MAX_MS;
  const setT = options.setTimeoutFn ?? setTimeout;
  const clearT = options.clearTimeoutFn ?? clearTimeout;

  let snapshot: BootSnapshot = OFF_SNAPSHOT;
  let lettersDone = false;
  let timeUp = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let unsubscribeRegistry: (() => void) | undefined;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<BootSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  };

  const syncRegistry = () => {
    if (snapshot.stage === "idle" || snapshot.stage === "done") return;
    set({
      progress: registry.progress(),
      lines: registry.tracks().map((t) => ({ id: t.id, done: t.done, value: t.value })),
    });
    maybeChoose();
  };

  /** Los logs terminan cuando el arranque real acabó (y la marca ya entró) o al llegar al tope. */
  function maybeChoose() {
    if (snapshot.stage !== "logs" || !lettersDone) return;
    if (registry.settled() || timeUp) set({ stage: "choose", progress: registry.progress() });
  }

  const beginExit = (choice: BootChoice) => {
    if (snapshot.stage === "exit" || snapshot.stage === "done") return;
    clearT(timer);
    options.onChoice?.(choice);
    options.onBooted?.();
    set({ stage: "exit", choice });
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getServerSnapshot: () => OFF_SNAPSHOT,
    registry,

    /** Arranca según el entorno; devuelve el modo elegido. */
    start(env: BootEnv): BootMode {
      const mode = decideMode(env);
      if (mode === "off") {
        set({ mode: "off", stage: "done" });
        return mode;
      }
      if (mode === "short") {
        // Sin logs ni opciones: aplica la elección guardada y sale en ≤ 400 ms.
        set({ mode, stage: "exit", progress: 1, choice: null });
        options.onBooted?.();
        return mode;
      }
      set({ mode, stage: "logs", progress: registry.progress() });
      unsubscribeRegistry = registry.subscribe(syncRegistry);
      syncRegistry();
      timer = setT(() => {
        timeUp = true;
        maybeChoose();
      }, maxMs);
      return mode;
    },

    /** La animación de entrada de las letras de Portafolio terminó. */
    lettersFinished() {
      lettersDone = true;
      maybeChoose();
    },

    /** Elección explícita («con sonido» / «en silencio»). */
    choose(choice: BootChoice) {
      if (snapshot.stage === "logs" || snapshot.stage === "choose") beginExit(choice);
    },

    /** Salto, scroll, Escape o cualquier acceso superior: equivale a «en silencio». */
    skip() {
      if (snapshot.stage === "logs" || snapshot.stage === "choose") beginExit("silent");
    },

    /** La animación de salida terminó. */
    exitFinished() {
      if (snapshot.stage !== "exit") return;
      set({ stage: "done" });
      options.onDone?.();
    },

    destroy() {
      clearT(timer);
      unsubscribeRegistry?.();
      listeners.clear();
    },
  };
}

export type BootController = ReturnType<typeof createBootController>;

export const BOOTED_STORAGE_KEY = BOOTED_KEY;
