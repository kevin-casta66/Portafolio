"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { appStore, useAppStore } from "@/lib/store";
import { debugBridge } from "@/webgl/core/debug";
import {
  resetTweakables,
  subscribeTweakables,
  tweakablesFor,
  type Tweakable,
} from "@/webgl/tweakables";

/** Intervalo con el que se muestrean las métricas (al menos 1 vez por segundo, spec `debug-mode`). */
const SAMPLE_MS = 500;

interface Metrics {
  fps: number;
  cpu: number;
  gpu: number;
  /** Muestras recibidas: el tiempo de GPU «n/d» solo se concluye tras calentar. */
  samples: number;
}

const EMPTY_METRICS: Metrics = { fps: 0, cpu: 0, gpu: 0, samples: 0 };

/** El renderer vigente del motor 3D (cambia si el canvas se recrea tras una pérdida de contexto). */
function useRenderer(): unknown | null {
  return useSyncExternalStore(
    (notify) => debugBridge.subscribeRenderer(notify),
    () => debugBridge.renderer,
    () => null,
  );
}

/**
 * FPS, CPU y GPU con **stats-gl** (importado de forma dinámica: solo existe en este chunk). Se
 * inicializa con el `WebGPURenderer` del motor —que activa por sí mismo `trackTimestamp`— y se
 * REINICIALIZA cuando el renderer cambia (canvas recreado). Sin extensión de tiempo de GPU el valor
 * se queda en 0 y el panel muestra «GPU: n/d»: nunca un número inventado.
 */
function useStats(renderer: unknown | null): Metrics {
  const [metrics, setMetrics] = useState<Metrics>(EMPTY_METRICS);

  useEffect(() => {
    if (!renderer) return;
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stats: { update(): void; getData(): { fps: number; cpu: number; gpu: number }; dispose(): void } | null = null;
    const info = (renderer as { info?: { reset?: () => void } }).info;
    const originalReset = info?.reset;

    void import("stats-gl").then(async ({ default: Stats }) => {
      if (cancelled) return;
      const instance = new Stats({ trackGPU: true, trackFPS: true, logsPerSecond: 4, graphsPerSecond: 4 });
      await instance.init(renderer);
      if (cancelled) {
        instance.dispose();
        return;
      }
      stats = instance;
      // stats-gl comienza a perfilar en `renderer.info.reset()` (que el motor llama por frame) y cierra el frame aquí.
      debugBridge.onFrame = () => instance.update();
      timer = setInterval(() => {
        const data = instance.getData();
        setMetrics((previous) => ({ fps: data.fps, cpu: data.cpu, gpu: data.gpu, samples: previous.samples + 1 }));
      }, SAMPLE_MS);
    });

    return () => {
      cancelled = true;
      clearInterval(timer);
      debugBridge.onFrame = null;
      stats?.dispose();
      // stats-gl parcheó `info.reset`: se deja como estaba para no dejar trabajo colgado al apagar Debug.
      if (info && originalReset) info.reset = originalReset;
      setMetrics(EMPTY_METRICS);
    };
  }, [renderer]);

  return metrics;
}

/** Cajas de componentes: contorno por CSS (no altera el layout) y etiquetas en una capa fija. */
function useComponentBoxes(enabled: boolean): void {
  useEffect(() => {
    const root = document.documentElement;
    if (!enabled) {
      delete root.dataset.debugBoxes;
      return;
    }
    root.dataset.debugBoxes = "on";
    const layer = document.createElement("div");
    layer.setAttribute("aria-hidden", "true");
    layer.className = "debug-box-labels";
    document.body.appendChild(layer);

    const update = () => {
      const elements = Array.from(document.querySelectorAll<HTMLElement>("[data-debug-name]"));
      while (layer.children.length > elements.length) layer.lastElementChild?.remove();
      while (layer.children.length < elements.length) layer.appendChild(document.createElement("span"));
      elements.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const chip = layer.children[i] as HTMLElement;
        const visible = rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
        chip.textContent = el.dataset.debugName ?? "";
        chip.style.display = visible ? "" : "none";
        chip.style.transform = `translate(${Math.max(0, rect.left)}px, ${Math.max(0, rect.top)}px)`;
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    const timer = setInterval(update, SAMPLE_MS); // el layout también cambia sin scroll (animaciones, fuentes)
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      clearInterval(timer);
      layer.remove();
      delete root.dataset.debugBoxes;
    };
  }, [enabled]);
}

/**
 * Panel de parámetros con **Tweakpane** (importado de forma dinámica). Genera un control por parámetro
 * de la escena visible y «Restablecer». Los controles de Tweakpane llevan su texto numérico enfocable
 * (flechas ±paso); aquí se les añade el nombre accesible que Tweakpane no asocia por sí mismo.
 */
function TweakPanel({ params }: { params: Tweakable[] }) {
  const t = useTranslations("Debug");
  const host = useRef<HTMLDivElement>(null);
  const key = params.map((p) => p.id).join(",");

  useEffect(() => {
    const container = host.current;
    if (!container || params.length === 0) return;
    let disposed = false;
    let dispose: (() => void) | null = null;

    void import("tweakpane").then(({ Pane }) => {
      if (disposed) return;
      const pane = new Pane({ container, title: t("tweakables") });
      const values: Record<string, number> = {};
      for (const p of params) values[p.id] = p.get();
      for (const p of params) {
        pane
          .addBinding(values, p.id, { min: p.min, max: p.max, step: p.step, label: t(`param.${p.id as "bloomStrength"}`) })
          .on("change", (event) => p.set(event.value));
      }
      pane.addButton({ title: t("reset") }).on("click", () => {
        resetTweakables();
        for (const p of params) values[p.id] = p.get();
        pane.refresh();
      });

      // Nombre accesible: el `<label>` de Tweakpane no está asociado a su campo.
      container.querySelectorAll<HTMLElement>(".tp-lblv").forEach((row) => {
        const label = row.querySelector(".tp-lblv_l")?.textContent ?? "";
        row.querySelectorAll("input").forEach((input) => input.setAttribute("aria-label", label));
      });
      container.querySelectorAll<HTMLElement>(".tp-btnv_b").forEach((button) => button.setAttribute("aria-label", t("reset")));
      dispose = () => pane.dispose();
    });

    return () => {
      disposed = true;
      dispose?.();
    };
    // `params` cambia de identidad en cada lectura del registro; la clave de ids basta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, t]);

  return (
    <div className="mt-2">
      <p className="font-mono text-xs text-fg-muted">{t("tweakablesNote")}</p>
      <div ref={host} data-debug-tweakpane className="debug-tweakpane mt-1" />
    </div>
  );
}

/**
 * Modo Debug (change 06): superposición técnica con el backend gráfico y el tier vigentes (suscritos
 * al store: cambian en caliente), FPS/CPU/GPU, draw calls por escena, wireframes, cajas de
 * componentes y ajuste de parámetros de shaders en vivo. Las herramientas (stats-gl, Tweakpane) se
 * descargan SOLO al activar Debug. La capa ignora el puntero salvo en su propio panel y no altera el
 * layout de la página.
 */
export default function DebugOverlay() {
  const t = useTranslations("Debug");
  const backend = useAppStore((s) => s.graphics.backend);
  const tier = useAppStore((s) => s.graphics.tier);
  const activeScenes = useAppStore((s) => s.scenes.active);
  const drawCalls = useAppStore((s) => s.scenes.drawCalls);
  const tools = useAppStore((s) => s.debugTools);
  const renderer = useRenderer();
  const metrics = useStats(renderer);
  useComponentBoxes(tools.boxes);

  // Parámetros de la escena visible (se releen si una escena registra o retira los suyos).
  const params = useSyncExternalStore(
    (notify) => subscribeTweakables(notify),
    () => tweakablesCache(activeScenes),
    () => EMPTY_PARAMS,
  );

  const backendLabel =
    backend === "webgpu"
      ? t("backendWebgpu")
      : backend === "webgl2"
        ? t("backendWebgl2")
        : backend === "none"
          ? t("backendNone")
          : t("backendPending");
  const noScenes = backend === "none" || activeScenes.length === 0;
  const totalCalls = Object.values(drawCalls).reduce((sum, n) => sum + n, 0);
  const gpuAvailable = metrics.gpu > 0;
  const gpuText = gpuAvailable ? `${metrics.gpu.toFixed(2)} ms` : metrics.samples < 4 ? "…" : t("gpuUnavailable");

  return (
    <div data-debug-overlay className="pointer-events-none fixed inset-0 z-[72]">
      <aside
        role="region"
        aria-label={t("label")}
        data-debug-panel
        className="pointer-events-auto absolute right-3 top-20 max-h-[calc(100dvh-6rem)] w-72 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-border bg-surface-elevated p-3 font-mono text-xs text-fg shadow-lg"
        data-lenis-prevent
      >
        <h2 className="text-sm font-semibold text-accent">{t("panelTitle")}</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
          <dt className="text-fg-muted">{t("backend")}</dt>
          <dd data-debug-backend>{backendLabel}</dd>
          <dt className="text-fg-muted">{t("tier")}</dt>
          <dd data-debug-tier>{tier}</dd>
          <dt className="text-fg-muted">{t("fps")}</dt>
          <dd data-debug-fps>{metrics.fps > 0 ? Math.round(metrics.fps) : "…"}</dd>
          <dt className="text-fg-muted">{t("cpu")}</dt>
          <dd data-debug-cpu>{metrics.cpu > 0 ? `${metrics.cpu.toFixed(2)} ms` : "…"}</dd>
          <dt className="text-fg-muted">{t("gpu")}</dt>
          <dd data-debug-gpu>{gpuText}</dd>
          <dt className="text-fg-muted">{t("drawCalls")}</dt>
          <dd data-debug-drawcalls>{totalCalls}</dd>
        </dl>

        <p className="mt-2 text-fg-muted" data-debug-scenes>
          {noScenes
            ? t("noScenes")
            : `${t("scenes")}: ${activeScenes.map((id) => `${id}(${drawCalls[id] ?? 0})`).join(" · ")}`}
        </p>

        <fieldset className="mt-2 space-y-1 border-t border-border pt-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={tools.wireframe}
              onChange={(event) => appStore.getState().setDebugTool("wireframe", event.target.checked)}
              data-debug-wireframe
              className="size-3.5 accent-[var(--accent)]"
            />
            {t("wireframe")}
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={tools.boxes}
              onChange={(event) => appStore.getState().setDebugTool("boxes", event.target.checked)}
              data-debug-boxes
              className="size-3.5 accent-[var(--accent)]"
            />
            {t("boxes")}
          </label>
        </fieldset>

        {params.length > 0 ? (
          <>
            <p className="mt-2 text-fg-muted">
              {t("tweakables")}
              {tier !== "high" && params.some((p) => p.onlyTiers) ? ` · ${t("bloomOnlyHigh")}` : ""}
            </p>
            <TweakPanel params={params} />
          </>
        ) : null}
      </aside>
    </div>
  );
}

// `useSyncExternalStore` exige una instantánea estable: se reutiliza la lista mientras los ids no cambian.
const EMPTY_PARAMS: Tweakable[] = [];
let cacheKey = "";
let cacheValue: Tweakable[] = EMPTY_PARAMS;
function tweakablesCache(sceneIds: readonly string[]): Tweakable[] {
  const list = tweakablesFor(sceneIds);
  const key = list.map((p) => p.id).join(",");
  if (key !== cacheKey) {
    cacheKey = key;
    cacheValue = list;
  }
  return cacheValue;
}
