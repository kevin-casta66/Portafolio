import type { Clock } from "@/motion/clock";
import { gsap, registerGsap } from "@/motion/gsap";
import { isCompact } from "@/motion/reduced";
import { SCENE_DEMO_MS, type DemoId } from "@/motion/showcase";
import type { Variant } from "@/motion/transitions/contract";
import { replay } from "@/motion/transitions";
import { prototypeMode, setTransitionInternals, transitionHooks } from "@/webgl/transitions/state";

/**
 * Reproductores de los escenarios de `/motion` (change 08): uno por transición, todos con la misma
 * forma. Reutilizan EXACTAMENTE el código de producción (`replay()` del registro de transiciones,
 * `playT6`, el glitch del título…) sobre las secciones reales que monta `StageSections`; la velocidad
 * (0,25×/0,5×/1×) la aplica el escenario con `gsap.globalTimeline.timeScale()`, así que sirve igual
 * para timelines, Flip y todo lo que GSAP anime.
 */
export interface StageEnv {
  variant: Variant;
  clock: Clock;
  reduced: boolean;
}

export interface Player {
  /** Reproduce una vez desde el estado inicial; resuelve al terminar. */
  play(): Promise<void>;
  /** Estado final sin animación (póster / fotograma estático). */
  showEnd(): Promise<void>;
  /** Interruptor «Ver internos»; `false` si esta transición no lo soporta en la variante actual. */
  setInternals(on: boolean): boolean;
  progress(): number;
  /** Coloca la transición en un progreso 0..1 a mano (prototipos con deslizador); las DOM no lo soportan. */
  seek?(progress: number): void;
  destroy(): void;
}

export type PlayerFactory = (env: StageEnv) => Player | null | Promise<Player | null>;

/** Deja pasar ~`n` frames (el motor dibuja con el reloj único) sin crear un bucle de frame propio. */
export const nextFrames = (n = 2): Promise<void> => new Promise((resolve) => setTimeout(resolve, n * 20));

/** Espera (con tope) a que la escena 3D de la transición esté cargada: sin ella el primer tramo no se ve. */
export async function waitForScene(id: string, env: StageEnv, maxMs = 6000): Promise<void> {
  if (env.variant !== "canvas") return;
  const start = performance.now();
  while (performance.now() - start < maxMs) {
    if (transitionHooks.sceneLoaded?.(id) !== false) return;
    await new Promise((resolve) => setTimeout(resolve, 60));
  }
}

/**
 * Reproduce una timeline pausada de principio a fin. Si se pide otra reproducción mientras la anterior
 * sigue en curso, la anterior se da por terminada (nadie se queda esperando para siempre).
 */
function createRunner(tl: gsap.core.Timeline): () => Promise<void> {
  let pending: (() => void) | null = null;
  return () =>
    new Promise<void>((resolve) => {
      pending?.();
      pending = resolve;
      tl.eventCallback("onComplete", () => {
        tl.eventCallback("onComplete", null);
        pending = null;
        resolve();
      });
      tl.pause(0);
      tl.play();
    });
}

/** Qué encuadrar en el escenario de cada transición: donde está lo que se ve (no siempre es el límite entre secciones). */
const FOCUS: Partial<Record<DemoId, string>> = {
  T3: "#parser [role='tree']",
  T9: "[data-twin='monitor']",
};

/** Encuadra la transición: el elemento que protagoniza (`FOCUS`) centrado, o el límite entre secciones al 40 %. */
function focusStage(id: DemoId): void {
  const target = FOCUS[id] ? document.querySelector(FOCUS[id] as string) : null;
  if (target) {
    target.scrollIntoView({ block: "center" });
    return;
  }
  focusBoundary();
}

/** Coloca el límite entre las dos secciones del escenario en el 40 % del viewport (como el prototipo). */
function focusBoundary(): void {
  const sections = document.querySelectorAll<HTMLElement>("[data-transition-prototype] > section");
  const boundary = sections[1];
  if (boundary)
    window.scrollTo(0, boundary.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.4);
}

/** T2–T5, T8, T9: transiciones scrubbed por scroll, aquí recorridas por el tiempo (design D1). */
export function scrollPlayer(id: Extract<DemoId, "T2" | "T3" | "T4" | "T5" | "T8" | "T9">): PlayerFactory {
  return async (env) => {
    registerGsap();
    prototypeMode.active = env.variant === "canvas";
    const handle = replay(id, 0, env.variant, { root: document.body, compact: isCompact(), clock: env.clock });
    if (!handle) return null;
    const tl = handle.timeline as gsap.core.Timeline;
    // La timeline mide 1 (o su duración propia): se reescala a la duración nominal de `scene-scrub`.
    tl.pause(0);
    tl.timeScale((tl.totalDuration() || 1) / (SCENE_DEMO_MS / 1000));
    focusStage(id);
    await waitForScene(id, env);
    const run = createRunner(tl);
    return {
      play: run,
      async showEnd() {
        tl.pause(1);
        await nextFrames();
      },
      // Sin canvas (variante DOM o reducida) los internos son las cajas de los elementos animados.
      setInternals: (on) => (env.variant === "canvas" ? setTransitionInternals(id, on) || domInternals(on) : domInternals(on)),
      progress: () => tl.progress(),
      seek(value) {
        tl.pause();
        tl.progress(Math.min(1, Math.max(0, value)));
      },
      destroy() {
        tl.eventCallback("onComplete", null);
        tl.kill();
        handle.destroy();
        prototypeMode.active = false;
      },
    };
  };
}

/** T6 · Hold-to-Execute: la superficie de la tarjeta se expande a la cabecera del caso, sin navegar. */
export const t6Player: PlayerFactory = async (env) => {
  registerGsap();
  const [t6mod, shared] = await Promise.all([import("@/motion/t6"), import("@/motion/shared")]);
  const card = document.querySelector<HTMLElement>("[data-hold]");
  const header = document.querySelector<HTMLElement>("[data-case-header]");
  if (!card || !header) return null;
  const canvas = env.variant === "canvas";
  if (canvas) shared.armT6();
  const playback = t6mod.playT6({
    from: t6mod.rectOf(card),
    to: t6mod.rectOf(header),
    intensity: "full",
    surface: canvas ? "canvas" : "dom",
    label: "Attaching debugger…",
  });
  const tl = playback.timeline;
  tl.pause(0);
  if (canvas) {
    // La escena de T6 se carga al armarla: se espera a que pueda dibujar.
    const start = performance.now();
    while (!shared.t6.ready && performance.now() - start < 6000) await new Promise((r) => setTimeout(r, 60));
  }
  const run = createRunner(tl);
  return {
    async play() {
      // Tras un `showEnd` la escena de T6 se soltó: se vuelve a armar y se espera a que pueda dibujar.
      if (canvas && !shared.t6.armed) {
        shared.armT6();
        const start = performance.now();
        while (!shared.t6.ready && performance.now() - start < 6000) await new Promise((r) => setTimeout(r, 60));
      }
      await run();
    },
    async showEnd() {
      tl.pause(1);
      // Estado final de la transición real: la superficie se suelta (la cabecera ya es el DOM).
      if (canvas) shared.disarmT6();
      await nextFrames();
    },
    setInternals(on) {
      if (!canvas) return domInternals(on);
      shared.t6.maskView = on;
      shared.t6.markDirty?.();
      return true;
    },
    progress: () => tl.progress(),
    seek(value) {
      tl.pause();
      tl.progress(Math.min(1, Math.max(0, value)));
    },
    destroy() {
      shared.t6.maskView = false;
      tl.eventCallback("onComplete", null);
      playback.destroy();
      shared.disarmT6();
    },
  };
};

// ── Demos DOM (T1, T7, T10, T11) ──────────────────────────────────────────────

import { canvasState } from "@/motion/shared";
import { glitchTitle } from "@/motion/transitions/glitch";
import { duration } from "@/motion/tokens";
import { t1Stage } from "./T1Stage";

const globalSpeed = (): number => gsap.globalTimeline.timeScale() || 1;
/** Espera `ms` nominales a la velocidad vigente (0,25× tarda cuatro veces más). */
const waitNominal = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms / globalSpeed()));

const waitFor = async (test: () => boolean, maxMs: number): Promise<boolean> => {
  const start = performance.now();
  while (performance.now() - start < maxMs) {
    if (test()) return true;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return test();
};

/** «Ver internos» de las demos DOM: cajas de los elementos animados (styles/showcase.css). */
export function domInternals(on: boolean): boolean {
  if (on) document.documentElement.dataset.internals = "on";
  else delete document.documentElement.dataset.internals;
  return true;
}

const clickOption = (option: string) =>
  document.querySelector<HTMLElement>(`[data-layout-option="${option}"]`)?.click();

/** Lleva la lista de proyectos al centro del escenario (la que cambia de layout y la que filtra T10). */
const bringList = () => document.getElementById("runtime-list")?.scrollIntoView({ block: "center" });

/** T7 · Cambio de layout: Cuadrícula → Lista → Cuadrícula con el Flip real de `LayoutToggle`. */
export const t7Player: PlayerFactory = () => {
  bringList();
  return {
  async play() {
    registerGsap();
    clickOption("grid");
    await waitNominal(300);
    clickOption("list");
    await waitNominal(duration.ui + 450);
    clickOption("grid");
    await waitNominal(duration.ui + 450);
  },
  async showEnd() {
    clickOption("grid");
    await nextFrames();
  },
  setInternals: domInternals,
  progress: () => 0,
  destroy() {
    clickOption("grid");
    domInternals(false);
  },
  };
};

/** T10 · Tema con revelado circular desde el botón (ida y vuelta, vuelve al tema inicial). */
export const t10Player: PlayerFactory = () => {
  let internals = false;
  bringList();
  const toggle = document.querySelector<HTMLElement>("[data-theme-toggle]");
  const reveal = async () => {
    if (!toggle) return;
    if (internals) {
      const box = toggle.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const ring = document.createElement("div");
      ring.className = "stage-reveal-ring";
      ring.style.left = `${x}px`;
      ring.style.top = `${y}px`;
      document.body.append(ring);
      const anim = ring.animate(
        [
          { width: "0px", height: "0px", opacity: 1 },
          { width: `${radius * 2}px`, height: `${radius * 2}px`, opacity: 0.2 },
        ],
        { duration: duration.theme, easing: "ease-in-out", fill: "forwards" },
      );
      void anim.finished.then(() => ring.remove());
    }
    toggle.click();
    await waitNominal(duration.theme + 350);
  };
  return {
    // El filtro y el índice móvil navegan o dependen de la página real: aquí se muestra el tema.
    async play() {
      await reveal();
      await reveal();
    },
    async showEnd() {
      await nextFrames();
    },
    setInternals(on) {
      internals = on;
      return domInternals(on);
    },
    progress: () => 0,
    destroy() {
      domInternals(false);
    },
  };
};

/** T11 · Glitch del título de LEXER: por el canvas (SDF) si tiene gemelo activo; si no, el DOM de respaldo. */
export const t11Player: PlayerFactory = (env) => {
  const title = () => document.getElementById("lexer-title");
  const bring = () => title()?.scrollIntoView({ block: "center" });
  bring();
  return {
    async play() {
      const el = title();
      if (!el) return;
      bring();
      await waitNominal(250);
      if (env.reduced) return; // sin glitch con movimiento reducido: solo cambia el color de la fase
      const speed = globalSpeed();
      const byCanvas = env.variant === "canvas" && canvasState.glitch?.(el, speed);
      if (byCanvas) {
        const { titleGlitchMs } = await import("@/webgl/text/title-text");
        await new Promise((resolve) => setTimeout(resolve, titleGlitchMs(speed) + 120));
        return;
      }
      const tl = glitchTitle(el);
      if (tl) await new Promise<void>((resolve) => tl.eventCallback("onComplete", () => resolve()));
    },
    async showEnd() {
      bring();
      await nextFrames();
    },
    setInternals: (on) => (env.variant === "canvas" ? setTransitionInternals("T11", on) || domInternals(on) : domInternals(on)),
    progress: () => 0,
    destroy() {
      domInternals(false);
      setTransitionInternals("T11", false);
    },
  };
};

/** T1 · Puerta de arranque: monta la puerta real en modo demo y elige «en silencio» como lo haría un visitante. */
export const t1Player: PlayerFactory = () => ({
  async play() {
    t1Stage.bump?.();
    const silent = () => document.querySelector<HTMLElement>('[data-boot-choice="silent"]');
    if (await waitFor(() => silent() !== null, 15000)) silent()?.click();
    await waitFor(() => document.querySelector("[data-boot-gate]") === null, 12000);
  },
  async showEnd() {
    await nextFrames();
  },
  setInternals: domInternals,
  progress: () => 0,
  destroy() {
    domInternals(false);
  },
});


// ── Utilidades compartidas por el escenario de /motion y los prototipos de desarrollo ─────────────

/** Espera al reloj único de movimiento (lo publica `MotionProvider` tras el LCP). */
export function waitForClock(maxMs: number): Promise<Clock> {
  return new Promise((resolve, reject) => {
    void import("@/motion/shared").then(({ subscribeClock }) => {
      const sub: { stop?: () => void } = {};
      const timer = setTimeout(() => {
        sub.stop?.();
        reject(new Error("El reloj de movimiento no arrancó."));
      }, maxMs);
      sub.stop = subscribeClock((clock) => {
        if (!clock) return;
        clearTimeout(timer);
        queueMicrotask(() => sub.stop?.());
        resolve(clock);
      });
    });
  });
}

/** El reproductor de cada transición (el mismo en `/motion` y en la ruta de prototipos de desarrollo). */
export function playerFor(id: DemoId): PlayerFactory {
  switch (id) {
    case "T1":
      return t1Player;
    case "T6":
      return t6Player;
    case "T7":
      return t7Player;
    case "T10":
      return t10Player;
    case "T11":
      return t11Player;
    default:
      return scrollPlayer(id);
  }
}
