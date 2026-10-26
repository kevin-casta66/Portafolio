import { appStore } from "@/lib/store";
import { bytecodeChoreography } from "./choreography/bytecode";
import type { ChoreoContext, Choreography } from "./choreography/context";
import { heroChoreography } from "./choreography/hero";
import { lexerChoreography } from "./choreography/lexer";
import { parserChoreography } from "./choreography/parser";
import { runtimeChoreography } from "./choreography/runtime";
import { createClock, type Clock } from "./clock";
import { TEST_PARAM, motionConfig } from "./config";
import { Flip, Observer, ScrollTrigger, SplitText, gsap, registerGsap } from "./gsap";
import { onPhaseChange, phaseState } from "./phase-state";
import { startPhaseTracking } from "./phase-runtime";
import { hasFinePointer, isCompact, onReducedMotionChange, prefersReducedMotion } from "./reduced";
import { createSmoothScroll, type SmoothScroll } from "./smooth-scroll";
import { createTransitionController, type TransitionController } from "./transitions/controller";
import type { TransitionContext, TransitionDef } from "./transitions/contract";
import { glitchTitle } from "./transitions/glitch";
import { TRANSITIONS, attachScrollTrigger, replay, triggersById } from "./transitions";
import type { TransitionHandle, TransitionId, Variant } from "./transitions/contract";
import { createVelocityTracker, velocity } from "./velocity";

/**
 * Ensamblaje de la capa de movimiento (vive en el chunk diferido que `MotionLoader` importa tras el
 * LCP). Tres niveles de vida:
 *
 *  - Global (una vez): reloj único, scroll suave, señal de velocidad.
 *  - De página (`mountPage`): fase activa y color, coreografías de sección, transiciones y glitch.
 *    Se destruye y recrea al cambiar de ruta o de preferencia de movimiento.
 *  - Todo se libera con `destroy()` (gsap.context + limpiezas explícitas): sin disparadores huérfanos.
 */
const CHOREOGRAPHIES: readonly Choreography[] = [
  heroChoreography,
  lexerChoreography,
  parserChoreography,
  bytecodeChoreography,
  runtimeChoreography,
];

export interface MotionRuntime {
  /** Destruye y vuelve a montar lo que depende de la página (cambio de ruta). */
  remountPage(): void;
  destroy(): void;
  clock: Clock;
}

interface CompileMotionTestHook {
  triggerCount(): number;
  clockSubscribers(): number;
  variantOf(id: string): string | undefined;
  progressOf(id: string): number | undefined;
  /** Simula que el canvas (change 04) termina de cargar / se descarga. */
  setCanvasReady(ready: boolean): void;
  phase(): typeof phaseState;
  velocity(): number;
  reduced(): boolean;
  /** Desplaza el documento al progreso `p` (0..1) del tramo de scroll de una transición. */
  scrollTo(id: string, p: number): void;
  /** Reproduce una transición aislada (registro `replay`) en el progreso dado. */
  replay(id: string, progress: number, variant: Variant): number;
  destroyReplay(): void;
  /** Duración de la timeline de la última reproducción aislada y fijación de su tiempo. */
  replayTimeline(): { duration: number; setTime: (t: number) => void } | null;
  /** Crea un pin de prueba (scrub): la animación debe detenerse al soltar el scroll. */
  testPin(selector: string): void;
  gsapInfo(): Record<string, boolean | string>;
  counts(): { triggers: number; clock: number };
}

declare global {
  interface Window {
    __compileMotion?: CompileMotionTestHook;
  }
}

export function startMotionRuntime(): MotionRuntime {
  registerGsap();
  const clock = createClock(gsap.ticker);
  let reduced = prefersReducedMotion();
  let smooth: SmoothScroll | null = null;
  let unmountPage: (() => void) | null = null;
  let controller: TransitionController | null = null;
  let destroyed = false;
  const disposers: (() => void)[] = [];

  // ── Global ────────────────────────────────────────────────────────────────
  const setupGlobal = () => {
    if (motionConfig.smoothScroll && !reduced) smooth = createSmoothScroll(clock);
    const updateVelocity = createVelocityTracker({
      getScroll: () => window.scrollY,
      isReduced: () => reduced,
      isCompact,
    });
    return clock.subscribe(updateVelocity, 10);
  };
  let stopVelocity = setupGlobal();

  // ── De página ─────────────────────────────────────────────────────────────
  const mountPage = () => {
    const cleanups: (() => void)[] = [];
    const root = document.body;
    const hasHome = !!document.getElementById("lexer");
    const stopPhase = motionConfig.phases ? startPhaseTracking() : () => {};

    const ctx: ChoreoContext = {
      root,
      reduced,
      compact: isCompact(),
      finePointer: hasFinePointer(),
      clock,
      transitionsOn: motionConfig.transitions && hasHome,
      onCleanup: (fn) => cleanups.push(fn),
    };
    const scope = gsap.context(() => {
      if (motionConfig.choreography) CHOREOGRAPHIES.forEach((choreo) => choreo(ctx));
    });

    // Glitch del título de fase: solo en cambios de fase, una vez por entrada, nunca con movimiento reducido.
    const stopGlitch = onPhaseChange((phase) => {
      if (reduced) return;
      const title = document.getElementById(`${phase}-title`);
      if (title) glitchTitle(title);
    });

    // Transiciones scrubbed: se montan con el layout estable (fuentes cargadas).
    let cancelled = false;
    const tctx: TransitionContext = { root, compact: ctx.compact, clock };
    const defs: TransitionDef[] = [...TRANSITIONS];
    let testCanvasReady = false;
    let lastReplay: TransitionHandle | null = null;
    const params = new URLSearchParams(window.location.search);
    const testMode = params.has(TEST_PARAM);
    if (testMode) {
      // Variante «canvas» de prueba para T2 (copia de la DOM): permite verificar el cambio en caliente.
      defs[0] = {
        ...defs[0]!,
        variants: { ...defs[0]!.variants, canvas: (c) => defs[0]!.variants.dom!(c) },
      };
    }
    if (ctx.transitionsOn) {
      void document.fonts.ready.then(() => {
        if (cancelled || destroyed) return;
        controller = createTransitionController(defs, tctx, attachScrollTrigger, {
          reducedMotion: reduced,
          canvasReady: false,
          tier: appStore.getState().graphics.tier,
          backend: appStore.getState().graphics.backend,
        });
        controller.mount();
        ScrollTrigger.refresh();
        document.documentElement.dataset.motionReady = "true";
      });
    } else {
      document.documentElement.dataset.motionReady = "true";
    }

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => controller?.rebuild(), 250);
    };
    window.addEventListener("resize", onResize);

    if (testMode) {
      window.__compileMotion = {
        triggerCount: () => ScrollTrigger.getAll().length,
        clockSubscribers: () => clock.subscriberCount(),
        variantOf: (id) => controller?.variantOf(id),
        progressOf: (id) => controller?.progressOf(id),
        setCanvasReady: (ready) => {
          testCanvasReady = ready;
          controller?.setInputs({
            canvasReady: ready,
            backend: ready ? "webgpu" : "pending",
            tier: ready ? "high" : "auto",
          });
        },
        phase: () => phaseState,
        velocity: () => velocity.value,
        reduced: () => reduced,
        scrollTo: (id, p) => {
          const trigger = triggersById.get(id);
          if (!trigger) return;
          window.scrollTo(0, trigger.start + (trigger.end - trigger.start) * p);
        },
        replay: (id, progress, variant) => {
          lastReplay?.destroy();
          lastReplay = replay(id as TransitionId, progress, variant, tctx);
          return lastReplay ? Number(lastReplay.timeline.progress()) : -1;
        },
        destroyReplay: () => {
          lastReplay?.destroy();
          lastReplay = null;
        },
        replayTimeline: () => {
          const tl = lastReplay?.timeline as unknown as gsap.core.Timeline | undefined;
          return tl ? { duration: tl.duration(), setTime: (t: number) => void tl.time(t) } : null;
        },
        testPin: (selector) => {
          const el = document.querySelector<HTMLElement>(selector);
          if (!el) return;
          ScrollTrigger.create({
            trigger: el,
            start: "top top",
            end: "+=600",
            pin: true,
            scrub: true,
            animation: gsap.fromTo("html", { "--pin-test": 0 }, { "--pin-test": 1, ease: "none" }),
          });
        },
        gsapInfo: () => ({
          version: gsap.version,
          scrollTrigger: typeof ScrollTrigger.create === "function",
          splitText: typeof SplitText.create === "function",
          flip: typeof Flip.from === "function",
          observer: typeof Observer.create === "function",
          drawSVG: Boolean(gsap.plugins.drawSVG),
          morphSVG: Boolean(gsap.plugins.morphSVG),
          customEase: ["compile-in-expo", "compile-scene"].every(
            (n) => gsap.parseEase(n) !== gsap.parseEase("none"),
          ),
          springEase: gsap.parseEase("compile-spring") !== gsap.parseEase("none"),
        }),
        counts: () => ({ triggers: ScrollTrigger.getAll().length, clock: clock.subscriberCount() }),
      };
      void testCanvasReady;
    }

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      controller?.destroy();
      controller = null;
      stopGlitch();
      cleanups.forEach((fn) => fn());
      scope.revert();
      stopPhase();
      delete document.documentElement.dataset.motionReady;
      delete window.__compileMotion;
    };
  };

  unmountPage = mountPage();

  // Cambio de la preferencia de movimiento en caliente: se reconstruye todo.
  disposers.push(
    onReducedMotionChange((next) => {
      if (destroyed || next === reduced) return;
      reduced = next;
      unmountPage?.();
      smooth?.destroy();
      smooth = null;
      stopVelocity();
      stopVelocity = setupGlobal();
      unmountPage = mountPage();
    }),
  );

  return {
    clock,
    remountPage() {
      if (destroyed) return;
      unmountPage?.();
      unmountPage = mountPage();
    },
    destroy() {
      destroyed = true;
      unmountPage?.();
      unmountPage = null;
      stopVelocity();
      smooth?.destroy();
      disposers.forEach((d) => d());
      clock.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    },
  };
}
