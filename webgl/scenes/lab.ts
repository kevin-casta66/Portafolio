import { Scene } from "three/webgpu";
import { createPixelCamera, fitPixelCamera } from "../core/camera";
import { twins } from "../core/twins";
import type { EngineContext, SceneInstance } from "../core/types";
import type { Experiment, ExperimentContext, ExperimentFactory } from "../lab/base";
import { defaultParams, type ExperimentKind } from "../lab/definitions";
import { labEntry, labHooks } from "../lab/store";

/**
 * Escena del laboratorio GPU: UN `Scene` con los experimentos de las tarjetas visibles, cada uno
 * dentro de su escenario gemelo (`data-twin="experiment:<id>"`). Cada tipo de experimento es un
 * chunk aparte (importación dinámica) que solo se pide cuando su tarjeta se acerca. Con tier bajo o
 * sin backend esta escena no existe y cada tarjeta muestra su imagen estática.
 */
const LOADERS: Record<ExperimentKind, () => Promise<ExperimentFactory>> = {
  shader: () => import("../lab/shader").then((m) => m.createShaderExperiment),
  physics: () => import("../lab/physics").then((m) => m.createPhysicsExperiment),
  dataviz: () => import("../lab/dataviz").then((m) => m.createDatavizExperiment),
  microinteraction: () => import("../lab/micro").then((m) => m.createMicroExperiment),
};

function datasetOf(el: HTMLElement | undefined): ExperimentContext["dataset"] {
  try {
    return JSON.parse(el?.dataset.dataset ?? "[]") as ExperimentContext["dataset"];
  } catch {
    return [];
  }
}

export function createLabScene(ctx: EngineContext): SceneInstance {
  const scene = new Scene();
  const camera = createPixelCamera();
  const release = twins.acquire();
  const live = new Map<string, Experiment>();
  const loading = new Set<string>();
  const failed = new Set<string>();
  labHooks.wake = () => ctx.markDirty();

  const spawn = (twinId: string, kind: ExperimentKind, el: HTMLElement) => {
    loading.add(twinId);
    const id = twinId.slice("experiment:".length);
    void LOADERS[kind]()
      .then((factory) => factory(ctx, { id, dataset: datasetOf(el) }))
      .then((experiment) => {
        loading.delete(twinId);
        if (!twins.get(twinId)) {
          experiment.dispose();
          return;
        }
        live.set(twinId, experiment);
        scene.add(experiment.group);
        ctx.markDirty();
      })
      .catch(() => {
        // Un experimento que falla deja su imagen estática: el resto del laboratorio sigue vivo.
        loading.delete(twinId);
        failed.add(twinId);
      });
  };

  return {
    scene,
    camera,
    emits: true,
    update(frame) {
      fitPixelCamera(camera, frame.viewW, frame.viewH);
      let animating = false;
      for (const twin of twins.all("experiment")) {
        const kind = twin.el.dataset.experiment as ExperimentKind | undefined;
        if (!kind) continue;
        let experiment = live.get(twin.id);
        if (!experiment && twin.visible && !loading.has(twin.id) && !failed.has(twin.id)) spawn(twin.id, kind, twin.el);
        experiment = live.get(twin.id);
        if (!experiment) continue;
        const entry = labEntry(twin.id.slice("experiment:".length), kind);
        // La tarjeta puede estar girada (código visible): el experimento no se dibuja.
        const flipped = twin.el.closest("[data-flipped='true']") !== null;
        experiment.group.visible = twin.visible && !flipped;
        animating = experiment.update(frame, twin, entry.input, { ...defaultParams(kind), ...entry.params }) || animating;
        entry.input.dx = entry.input.dy = 0;
      }
      return animating;
    },
    compute(renderer) {
      for (const experiment of live.values()) if (experiment.group.visible) experiment.compute?.(renderer);
    },
    applyQuality() {
      // Los experimentos dependen del tier (compute, postprocesado): se recrean con el nuevo preset.
      for (const experiment of live.values()) {
        scene.remove(experiment.group);
        experiment.dispose();
      }
      live.clear();
      failed.clear();
    },
    dispose() {
      release();
      if (labHooks.wake) labHooks.wake = null;
      for (const experiment of live.values()) experiment.dispose();
      live.clear();
    },
  };
}
