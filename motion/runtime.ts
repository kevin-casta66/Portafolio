import { appStore } from "@/lib/store";
import { bytecodeChoreography } from "./choreography/bytecode";
import { caseChoreography } from "./choreography/case";
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
import { canvasState, publishClock, setCanvasVariant } from "./shared";
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
  caseChoreography,
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
  /**
   * T6 aislada (sin navegar): reproduce la superficie de la tarjeta `slug` a la cabecera `[data-case-header]`
   * (o a un rectángulo fijo) hasta el progreso dado. Devuelve el estado de la superficie.
   */
  playT6(slug: string, progress: number, surface: "canvas" | "dom"): Promise<Record<string, unknown>>;
  /** Destruye la reproducción de `playT6`. */
  stopT6(): void;
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
  publishClock(clock);
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
      // Las rutas de prototipos (change 04) recorren una transición con un control manual, no con el scroll.
      transitionsOn:
        motionConfig.transitions && hasHome && !document.querySelector("[data-transition-prototype]"),
      onCleanup: (fn) => cleanups.push(fn),
    };
    const scope = gsap.context(() => {
      if (motionConfig.choreography) CHOREOGRAPHIES.forEach((choreo) => choreo(ctx));
    });

    // Glitch del título de fase: solo en cambios de fase, una vez por entrada, nunca con movimiento reducido.
    const stopGlitch = onPhaseChange((phase) => {
      if (reduced) return;
      const title = document.getElementById(`${phase}-title`);
      if (!title) return;
      // Con el gemelo MSDF activo el glitch lo hace el canvas (T11 canvas); el DOM queda de respaldo.
      if (canvasState.glitch?.(title)) return;
      glitchTitle(title);
    });

    // Transiciones scrubbed: se montan con el layout estable (fuentes cargadas).
    let cancelled = false;
    const tctx: TransitionContext = { root, compact: ctx.compact, clock };
    const defs: TransitionDef[] = [...TRANSITIONS];
    let testCanvasReady = false;
    let lastReplay: TransitionHandle | null = null;
    let t6Playback: { timeline: { progress(value?: number): unknown }; destroy(): void } | null = null;
    const params = new URLSearchParams(window.location.search);
    const testMode = params.has(TEST_PARAM);
    const t2 = TRANSITIONS.find((d) => d.id === "T2");
    // Prueba (change 03): sin motor 3D real, `setCanvasReady` simula una variante «canvas» de T2 (copia de la DOM).
    const installStubCanvas = () => {
      if (testMode && t2 && !t2.variants.canvas) setCanvasVariant("T2", (c) => t2.variants.dom!(c));
    };
    if (ctx.transitionsOn) {
      void document.fonts.ready.then(() => {
        if (cancelled || destroyed) return;
        controller = createTransitionController(defs, tctx, attachScrollTrigger, {
          reducedMotion: reduced,
          canvasReady: appStore.getState().graphics.ready,
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

    // El motor 3D (change 04) publica backend, tier y «listo» en el store: la variante se reevalúa.
    const syncGraphics = () => {
      const { tier, backend, ready } = appStore.getState().graphics;
      controller?.setInputs({ canvasReady: ready, tier, backend });
    };
    const stopGraphics = appStore.subscribe((state, prev) => {
      if (state.graphics !== prev.graphics) syncGraphics();
    });
    cleanups.push(stopGraphics);

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
          if (ready) installStubCanvas();
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
        playT6: async (slug, progress, surface) => {
          const [{ playT6, rectOf, viewportRect }, shared] = await Promise.all([import("./t6"), import("./shared")]);
          t6Playback?.destroy();
          const card = document.querySelector<HTMLElement>(`[data-hold="${slug}"]`);
          if (!card) return { error: "sin tarjeta" };
          const header = document.querySelector<HTMLElement>("[data-case-header]");
          const view = viewportRect();
          if (surface === "canvas") shared.armT6();
          t6Playback = playT6({
            from: rectOf(card),
            to: header ? rectOf(header) : { x: view.w * 0.1, y: 80, w: view.w * 0.8, h: 260 },
            intensity: "full",
            surface,
          });
          t6Playback.timeline.progress(progress);
          return { ...shared.t6.state, ready: shared.t6.ready, urlAntes: location.href };
        },
        stopT6: () => {
          t6Playback?.destroy();
          t6Playback = null;
          void import("./shared").then((s) => s.disarmT6());
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
      publishClock(null);
      clock.destroy();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    },
  };
}
