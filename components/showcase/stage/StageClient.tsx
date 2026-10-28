"use client";

import { useEffect } from "react";
import { appStore } from "@/lib/store";
import { prefersReducedMotion } from "@/motion/reduced";
import {
  DEMO_USES_3D,
  DEFAULT_SPEED,
  type DemoId,
  type DemoSpeed,
  type StageApi,
  type StageInfo,
} from "@/motion/showcase";
import { resolveVariant, selectVariant } from "@/motion/transitions/select";
import type { Variant } from "@/motion/transitions/contract";
import type { Player, StageEnv } from "./players";

const READY_MS = 8000;

/** Espera a que el canvas esté listo, o a saber que no lo habrá (sin backend, tier bajo o movimiento reducido). */
function waitForCanvas(maxMs: number): Promise<void> {
  return new Promise((resolve) => {
    const settled = () => {
      const { graphics } = appStore.getState();
      return graphics.ready || graphics.backend === "none";
    };
    if (settled()) return resolve();
    const timer = setTimeout(() => {
      stop();
      resolve();
    }, maxMs);
    const stop = appStore.subscribe(() => {
      if (!settled()) return;
      clearTimeout(timer);
      stop();
      resolve();
    });
  });
}

/**
 * Cliente del escenario de `/motion` (change 08): crea el reproductor de la transición con el código
 * real de producción y publica `window.__showcaseStage` para que la tarjeta que aloja este iframe lo
 * maneje (Replay, velocidad, internos, pausa). La velocidad se aplica a GSAP (`globalTimeline`) y a las
 * animaciones WAAPI que se creen en el escenario.
 */
export function StageClient({ id }: { id: DemoId }) {
  useEffect(() => {
    let disposed = false;
    let player: Player | null = null;
    let speed: DemoSpeed = DEFAULT_SPEED;
    let internals = false;
    let info: StageInfo | null = null;

    // WAAPI (puerta de arranque, revelado de tema, fundidos): toda animación nueva nace a la velocidad vigente.
    const originalAnimate = Element.prototype.animate;
    Element.prototype.animate = function patched(
      this: Element,
      ...args: Parameters<Element["animate"]>
    ) {
      const animation = originalAnimate.apply(this, args);
      animation.playbackRate = speed;
      return animation;
    };

    const applySpeed = async (value: DemoSpeed) => {
      speed = value;
      const { gsap } = await import("@/motion/gsap");
      gsap.globalTimeline.timeScale(value);
      for (const animation of document.getAnimations()) animation.playbackRate = value;
    };

    const ready: Promise<StageInfo> = (async () => {
      // `?motion=full`: Replay completo pedido explícitamente con movimiento reducido (aviso previo en la tarjeta).
      // Solo afecta a este escenario aislado: no se persiste ni toca la elección del visitante.
      if (
        new URLSearchParams(window.location.search).get("motion") === "full" &&
        prefersReducedMotion()
      ) {
        appStore.setState((s) => ({ experience: { ...s.experience, manual: "full" } }));
      }
      const reduced = prefersReducedMotion();
      const { playerFor, waitForClock } = await import("./players");
      const clock = await waitForClock(READY_MS + 4000);
      if (!reduced && DEMO_USES_3D[id]) await waitForCanvas(READY_MS);
      const { graphics } = appStore.getState();
      const canvasUsable =
        graphics.ready &&
        (graphics.backend === "webgpu" || graphics.backend === "webgl2") &&
        graphics.tier !== "low";
      const wanted = selectVariant({
        reducedMotion: reduced,
        canvasReady: graphics.ready,
        tier: graphics.tier,
        backend: graphics.backend,
      });
      const variant: Variant = DEMO_USES_3D[id]
        ? (resolveVariant(wanted, ["canvas", "dom", "reduced"]) ?? "dom")
        : reduced
          ? "reduced"
          : "dom";
      const env: StageEnv = { variant, clock, reduced };
      const factory = playerFor(id);
      const created = await factory(env);
      if (disposed) {
        created?.destroy();
        throw new Error("Escenario descartado.");
      }
      player = created;
      const result: StageInfo = {
        id,
        variant,
        backend: graphics.backend,
        tier: graphics.tier,
        fallback2d: DEMO_USES_3D[id] && !reduced && !canvasUsable,
        reducedMotion: reduced,
        supportsInternals: created !== null,
      };
      info = result;
      return result;
    })();
    // Evita «unhandled rejection» si nadie consulta `ready` (el padre la consulta siempre).
    ready.catch(() => {});

    const api: StageApi = {
      ready,
      async replay() {
        await ready;
        await player?.play();
      },
      setSpeed(value) {
        void applySpeed(value);
      },
      setInternals(on) {
        internals = on;
        return player?.setInternals(on) ?? false;
      },
      pause() {
        void import("@/motion/gsap").then(({ gsap }) => gsap.ticker.sleep());
      },
      resume() {
        void import("@/motion/gsap").then(({ gsap }) => gsap.ticker.wake());
      },
      async showEnd() {
        await ready;
        await player?.showEnd();
      },
      progress: () => player?.progress() ?? 0,
      async seek(value) {
        await ready;
        player?.seek?.(value);
        await new Promise((resolve) => setTimeout(resolve, 60));
      },
    };
    window.__showcaseStage = api;
    // Para el script de pósters y las pruebas: el estado queda visible en el atributo.
    void ready
      .then(async () => {
        document.documentElement.dataset.stageReady = info?.variant ?? "none";
        if (new URLSearchParams(window.location.search).has("poster")) {
          await api.showEnd();
          document.documentElement.dataset.posterReady = "1";
        }
      })
      .catch(() => {});

    void internals;
    return () => {
      disposed = true;
      Element.prototype.animate = originalAnimate;
      if (window.__showcaseStage === api) delete window.__showcaseStage;
      void import("@/motion/gsap").then(({ gsap }) => {
        gsap.globalTimeline.timeScale(1);
        gsap.ticker.wake();
      });
      player?.destroy();
      player = null;
    };
  }, [id]);

  return null;
}
