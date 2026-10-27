import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEMO_IDS,
  DEMO_SPEEDS,
  DEFAULT_SPEED,
  SCENE_DEMO_MS,
  effectiveMs,
  posterSrc,
  stageHref,
  type StageApi,
  type StageInfo,
} from "@/motion/showcase";
import { createStageDemo } from "./stage-demo";

const info = (id: string): StageInfo => ({
  id: id as StageInfo["id"],
  variant: "canvas",
  backend: "webgpu",
  tier: "high",
  fallback2d: false,
  reducedMotion: false,
  supportsInternals: true,
});

function fakeStage(id: string) {
  const calls: string[] = [];
  const api: StageApi = {
    ready: Promise.resolve(info(id)),
    replay: vi.fn(async () => void calls.push("replay")),
    setSpeed: vi.fn((s) => void calls.push(`speed:${s}`)),
    setInternals: vi.fn((on) => (calls.push(`internals:${on}`), on)),
    pause: vi.fn(() => void calls.push("pause")),
    resume: vi.fn(() => void calls.push("resume")),
    showEnd: vi.fn(async () => {}),
    progress: () => 0,
    seek: vi.fn(async () => {}),
  };
  return { api, calls };
}

/** DOM mínimo: un iframe falso cuya ventana ya publica el `StageApi` (el entorno de pruebas es node). */
function stubDom(api: StageApi) {
  const frame = {
    style: { cssText: "" },
    attrs: {} as Record<string, string>,
    removed: false,
    contentWindow: { __showcaseStage: api },
    setAttribute(k: string, v: string) {
      this.attrs[k] = v;
    },
    remove() {
      this.removed = true;
    },
  };
  vi.stubGlobal("document", { createElement: () => frame });
  return frame;
}

afterEach(() => vi.unstubAllGlobals());

describe("contrato de las demos (TransitionDemo)", () => {
  it("las 11 transiciones exponen todos los métodos del contrato", () => {
    expect(DEMO_IDS).toHaveLength(11);
    const posters = new Set<string>();
    for (const id of DEMO_IDS) {
      const demo = createStageDemo(id, "es");
      for (const method of ["mount", "replay", "setSpeed", "setInternals", "setVisible", "renderPoster", "dispose"] as const)
        expect(typeof demo[method], `${id}.${method}`).toBe("function");
      expect(demo.id).toBe(id);
      posters.add(demo.renderPoster());
      expect(demo.renderPoster()).toBe(posterSrc(id));
    }
    expect(posters.size).toBe(11);
  });

  it("el escenario de cada demo es /stage/<locale>/<Tn>", () => {
    expect(stageHref("es", "T8")).toBe("/stage/es/T8");
    expect(stageHref("en", "T2", "?webgl=none")).toBe("/stage/en/T2?webgl=none");
  });

  it("monta el escenario en un iframe aislado, reenvía las órdenes y lo retira al terminar", async () => {
    const { api, calls } = fakeStage("T5");
    const frame = stubDom(api);
    const demo = createStageDemo("T5", "es", "?webgl=none");
    const host = { append: vi.fn() } as unknown as HTMLElement;
    const result = await demo.mount(host);
    expect(result.id).toBe("T5");
    expect(host.append).toHaveBeenCalledWith(frame);
    expect(frame.attrs["aria-hidden"]).toBe("true");
    demo.setSpeed(0.5);
    expect(demo.setInternals(true)).toBe(true);
    demo.setVisible(false);
    demo.setVisible(true);
    await demo.replay();
    expect(calls).toEqual(["speed:0.5", "internals:true", "pause", "resume", "replay"]);
    await demo.dispose();
    expect(frame.removed).toBe(true);
    // sin escenario montado, no hay nada que reproducir
    await expect(demo.replay()).rejects.toThrow();
    expect(demo.setInternals(true)).toBe(false);
  });
});

describe("control de velocidad", () => {
  it("ofrece 0.25x, 0.5x y 1x, con 1x por defecto", () => {
    expect([...DEMO_SPEEDS]).toEqual([0.25, 0.5, 1]);
    expect(DEFAULT_SPEED).toBe(1);
  });

  it("0.5x duplica la duración y 0.25x la cuadruplica", () => {
    expect(effectiveMs(SCENE_DEMO_MS, 0.5)).toBe(SCENE_DEMO_MS * 2);
    expect(effectiveMs(SCENE_DEMO_MS, 0.25)).toBe(SCENE_DEMO_MS * 4);
    expect(effectiveMs(SCENE_DEMO_MS, 1)).toBe(SCENE_DEMO_MS);
  });

  it("la duración nominal de una demo scrubbed está dentro de la banda scene-scrub (1200–1800 ms)", () => {
    expect(SCENE_DEMO_MS).toBeGreaterThanOrEqual(1200);
    expect(SCENE_DEMO_MS).toBeLessThanOrEqual(1800);
  });
});
