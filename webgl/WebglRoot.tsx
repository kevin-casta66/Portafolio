"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { appStore } from "@/lib/store";
import { subscribeClock, t6 } from "@/motion/shared";
import { TEST_PARAM } from "@/motion/config";
import { debugBridge } from "./core/debug";
import { registerPostTweakables } from "./postfx-tweakables";
import { tweakablesFor } from "./tweakables";
import { backendOf, forcedBackend, hasAnyBackend } from "./core/backend";
import { Engine } from "./core/engine";
import { twins } from "./core/twins";
import { uChroma, uScrollVelocity } from "./nodes/globals";
import { SCENE_DEFS } from "./scenes";
import { installCanvasVariants } from "./transitions/install";
import { setTransitionInternals } from "./transitions/state";
import { disposeRenderer, liveContexts, trackContext, whenDisposed } from "./dispose";
import { detectTier } from "./detect";
import type { Tier } from "./quality";

/**
 * Canvas persistente del sitio (change 04): UN `<Canvas>` de R3F en el layout raíz, con
 * `frameloop="never"` (el render lo avanza el reloj único con `advance()`), fábrica ASÍNCRONA de
 * `gl` (`WebGPURenderer` + `await init()`, con fallback automático a WebGL2) y densidad de píxeles
 * acotada a 2. Si no hay ningún backend, no se monta nada: el sitio es el HTML completo.
 */
type Status = "checking" | "ready" | "none";

interface Boot {
  tier: Tier;
  mobile: boolean;
}

interface TestHook {
  engine(): Engine | null;
  stats(): Engine["stats"] | null;
  info(): { geometries: number; textures: number; drawCalls: number; pixelRatio: number };
  canvasCount(): number;
  liveContexts(): number;
  setTier(tier: Tier): void;
  /** «Ver internos» de una transición en canvas (change 08): devuelve `false` si no hay variante viva. */
  setInternals(id: string, on: boolean): boolean;
  loseContext(): boolean;
  renderRequests(): number;
  /** Máxima desviación (px) entre el rectángulo de cada gemelo y el de su elemento DOM ahora mismo. */
  twinDeviation(): number;
  signals(): { velocity: number; chroma: number };
  sceneDebug(id: string): Record<string, unknown> | null;
  /** Parámetros ajustables (modo Debug) y su valor actual. */
  tweakables(): { id: string; value: number; defaultValue: number }[];
  /** Materiales de las escenas activas que están en wireframe / el total que lo soporta. */
  wireframeCount(): { on: number; total: number };
}

declare global {
  interface Window {
    __portafolioWebgl?: TestHook;
  }
}

/** Máximo de reinicios del contexto tras una pérdida (la 2.ª pérdida deja el sitio en DOM). */
const MAX_RESTARTS = 1;
/** Tiempo sano tras el cual se restablece el contador de reinicios. */
const HEALTHY_MS = 30_000;

/**
 * Un fallo al crear el renderer (`init()` sin backend utilizable) no debe tumbar la página: R3F lo
 * relanza desde el `<Canvas>`. Aquí se captura y el sitio pasa a la experiencia 2D (backend `none`).
 */
class CanvasBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch() {
    this.props.onError();
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

function EngineHost({
  boot,
  onLost,
  onDegraded,
}: {
  boot: Boot;
  onLost: (reason: string) => void;
  onDegraded: () => void;
}) {
  const gl = useThree((s) => s.gl);
  const advance = useThree((s) => s.advance);
  const engineRef = useRef<Engine | null>(null);
  const requests = useRef(0);

  useEffect(() => {
    const renderer = gl as unknown as ConstructorParameters<typeof Engine>[0];
    const engine = new Engine(renderer, boot.tier, boot.mobile, {
      onLost,
      onDegraded,
      onError: (error) => {
        if (process.env.NODE_ENV !== "production") console.error("[webgl]", error);
      },
    });
    engineRef.current = engine;
    const unregister = SCENE_DEFS.map((def) => engine.register(def));
    // La capa de movimiento (T6) despierta al motor cuando arma o mueve la superficie de la transición.
    t6.markDirty = () => engine.markDirty();

    // El render se suscribe al reloj único (prioridad 100: tras scroll, señales y animaciones).
    let stopClock: (() => void) | null = null;
    const unsubscribeClock = subscribeClock((clock) => {
      stopClock?.();
      stopClock = clock
        ? clock.subscribe(() => {
            if (!engine.needsFrame()) return;
            requests.current++;
            advance(performance.now());
          }, 100)
        : null;
    });

    // Tema: los tokens de color cambian → releerlos.
    const mo = new MutationObserver(() => engine.refreshColors());
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // Variantes `canvas` de las transiciones: se registran ANTES de marcar el canvas como listo.
    const uninstallVariants = installCanvasVariants(engine);

    // Modo Debug (change 06): stats-gl mide el renderer actual; los parámetros del postprocesado son ajustables.
    debugBridge.setRenderer(renderer);
    const unregisterTweakables = registerPostTweakables();

    const store = appStore.getState();
    store.setBackend(backendOf(renderer));
    store.setTier(boot.tier);
    store.setCanvasReady(true);
    // Contexto (re)creado con éxito: las fases vuelven de su fallback 2D a las escenas 3D.
    store.setContextLost(false);

    if (new URLSearchParams(window.location.search).has(TEST_PARAM)) {
      window.__portafolioWebgl = {
        engine: () => engineRef.current,
        stats: () => engineRef.current?.stats ?? null,
        info: () => {
          const info = renderer.info;
          return {
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            drawCalls: info.render.drawCalls,
            pixelRatio: renderer.getPixelRatio(),
          };
        },
        canvasCount: () => document.querySelectorAll("canvas[data-engine]").length,
        liveContexts,
        setTier: (tier) => engineRef.current?.setTier(tier),
        setInternals: (id, on) =>
          setTransitionInternals(id, on, () => engineRef.current?.markDirty()),
        renderRequests: () => requests.current,
        twinDeviation: () => {
          let max = 0;
          for (const twin of twins.all()) {
            const r = twin.el.getBoundingClientRect();
            max = Math.max(
              max,
              Math.abs(r.left - twin.rect.x),
              Math.abs(r.top - twin.rect.y),
              Math.abs(r.width - twin.rect.w),
              Math.abs(r.height - twin.rect.h),
            );
          }
          return max;
        },
        signals: () => ({ velocity: Number(uScrollVelocity.value), chroma: Number(uChroma.value) }),
        sceneDebug: (id) => engineRef.current?.sceneDebug(id) ?? null,
        tweakables: () =>
          tweakablesFor([]).map((p) => ({
            id: p.id,
            value: p.get(),
            defaultValue: p.defaultValue,
          })),
        wireframeCount: () => {
          let on = 0;
          let total = 0;
          const states = (
            engineRef.current as unknown as {
              states?: Map<
                string,
                { instance: { scene: { traverse(fn: (o: unknown) => void): void } } | null }
              >;
            } | null
          )?.states;
          states?.forEach((st) => {
            st.instance?.scene.traverse((o) => {
              const material = (o as { material?: unknown }).material;
              for (const m of (Array.isArray(material) ? material : material ? [material] : []) as {
                wireframe?: boolean;
              }[]) {
                if (!("wireframe" in m)) continue;
                total++;
                if (m.wireframe) on++;
              }
            });
          });
          return { on, total };
        },
        loseContext: () => {
          const backend = renderer.backend as {
            isWebGPUBackend?: boolean;
            device?: { destroy(): void };
            gl?: WebGL2RenderingContext;
          };
          if (backend.isWebGPUBackend) {
            // `device.destroy()` se notifica como «destroyed» (three lo ignora): se invoca el mismo
            // callback que dispara una pérdida real de dispositivo (`device.lost` con otra razón).
            renderer.onDeviceLost({
              api: "WebGPU",
              message: "pérdida simulada",
              reason: "unknown",
            } as never);
            return true;
          }
          const ext = backend.gl?.getExtension("WEBGL_lose_context");
          ext?.loseContext();
          return Boolean(ext);
        },
      };
    }

    return () => {
      delete window.__portafolioWebgl;
      debugBridge.setRenderer(null);
      unregisterTweakables();
      mo.disconnect();
      unsubscribeClock();
      stopClock?.();
      uninstallVariants();
      t6.markDirty = null;
      t6.ready = false;
      unregister.forEach((fn) => fn());
      engine.destroy();
      engineRef.current = null;
      const s = appStore.getState();
      s.setCanvasReady(false);
      s.setActiveScenes([]);
    };
    // El motor vive lo que el renderer: no se recrea por cambios de tier (se aplican en caliente).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, advance]);

  // El render real: prioridad > 0 desactiva el render automático de R3F; `advance()` lo dispara.
  useFrame(() => engineRef.current?.render(performance.now()), 1);
  return null;
}

export default function WebglRoot() {
  const [status, setStatus] = useState<Status>("checking");
  const [boot, setBoot] = useState<Boot | null>(null);
  const [generation, setGeneration] = useState(0);
  const restarts = useRef(0);

  // 1) ¿Hay algún backend? 2) tier de GPU (máx. 1,5 s, nunca bloquea el contenido).
  useEffect(() => {
    let cancelled = false;
    const forced = forcedBackend();
    if (forced === "none" || !hasAnyBackend()) {
      appStore.getState().setBackend("none"); // sin backend: no se monta el canvas
      return;
    }
    void detectTier().then((detection) => {
      if (cancelled) return;
      if (detection.belowMinimum) {
        // GPU por debajo del mínimo: experiencia 2D sin montar el canvas ni renderizar escenas.
        appStore.getState().setBackend("none");
        return;
      }
      setBoot({ tier: detection.tier, mobile: detection.mobile });
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Un contexto que lleva 30 s sano «perdona» las pérdidas anteriores: una GPU que se duerme de vez en
  // cuando no deja el sitio en 2D para siempre.
  useEffect(() => {
    if (status !== "ready") return;
    const timer = setTimeout(() => {
      restarts.current = 0;
    }, HEALTHY_MS);
    return () => clearTimeout(timer);
  }, [status, generation]);

  const onLost = () => {
    const store = appStore.getState();
    store.setCanvasReady(false);
    // Fallback 2D inmediato (< 1 s): las ilustraciones aparecen mientras se intenta restaurar.
    store.setContextLost(true);
    // Reintenta UNA vez: primero se espera a que el contexto anterior termine de liberarse.
    if (restarts.current >= MAX_RESTARTS) {
      store.setBackend("none");
      store.setContextLost(false);
      setStatus("none");
      return;
    }
    restarts.current++;
    void whenDisposed().then(() => setGeneration((g) => g + 1));
  };

  const onDegraded = () => appStore.getState().setFpsDegraded(true);
  const onFatal = () => {
    appStore.getState().setBackend("none");
    appStore.getState().setContextLost(false);
    setStatus("none");
  };

  if (status !== "ready" || !boot) return null;

  return (
    <div className="webgl-layer" aria-hidden="true" data-webgl>
      <CanvasBoundary key={generation} onError={onFatal}>
        <Canvas
          key={generation}
          frameloop="never"
          dpr={[1, 2]}
          flat
          gl={async (props) => {
            // Espera a que cualquier contexto anterior termine de liberarse: nunca conviven dos.
            await whenDisposed();
            const { WebGPURenderer } = await import("three/webgpu");
            const renderer = new WebGPURenderer({
              canvas: props.canvas as HTMLCanvasElement,
              antialias: true,
              alpha: true,
              powerPreference: "high-performance",
              forceWebGL: forcedBackend() === "webgl2",
            });
            await renderer.init();
            trackContext();
            // R3F no espera `dispose()` (asíncrono en r186): el desmontaje pasa por la cola de dispose.ts.
            const original = renderer.dispose.bind(renderer);
            let disposing: Promise<void> | null = null;
            renderer.dispose = () => (disposing ??= disposeRenderer({ dispose: original }));
            renderer.domElement.dataset.engine = "true";
            return renderer;
          }}
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        >
          <EngineHost boot={boot} onLost={onLost} onDegraded={onDegraded} />
        </Canvas>
      </CanvasBoundary>
    </div>
  );
}
