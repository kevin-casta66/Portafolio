import { describe, expect, it, vi } from "vitest";
import type { Clock } from "../clock";
import { createTransitionController, type Attach } from "./controller";
import type { TransitionContext, TransitionDef, TransitionHandle } from "./contract";

const clock = { subscribe: () => () => {}, subscriberCount: () => 0, destroy: () => {} } as Clock;
const ctx = { root: {} as HTMLElement, compact: false, clock } as TransitionContext;

function fakeHandle(label: string, log: string[]): TransitionHandle {
  let progress = 0;
  return {
    timeline: {
      progress(value?: number) {
        if (value === undefined) return progress;
        progress = value;
        log.push(`${label}.progress(${value})`);
        return progress;
      },
      kill: () => log.push(`${label}.kill`),
      pause: () => {},
    },
    destroy: () => log.push(`${label}.destroy`),
  };
}

const makeDef = (log: string[], withCanvas: boolean): TransitionDef => ({
  id: "T2",
  from: "source",
  to: "lexer",
  range: () => null,
  variants: {
    dom: () => fakeHandle("dom", log),
    reduced: () => fakeHandle("reduced", log),
    ...(withCanvas ? { canvas: () => fakeHandle("canvas", log) } : {}),
  },
});

describe("controlador de transiciones", () => {
  const inputs = {
    reducedMotion: false,
    canvasReady: false,
    tier: "high",
    backend: "pending",
  } as const;

  it("monta la variante DOM/SVG mientras el canvas no está listo", () => {
    const log: string[] = [];
    const attach: Attach = () => ({ progress: () => 0, destroy: () => {} });
    const c = createTransitionController([makeDef(log, true)], ctx, attach, inputs);
    c.mount();
    expect(c.variantOf("T2")).toBe("dom");
  });

  it("mountSliced cede el hilo entre transiciones, no duplica las ya montadas y respeta la cancelación", async () => {
    const log: string[] = [];
    const attach: Attach = () => ({ progress: () => 0, destroy: () => {} });
    const defs: TransitionDef[] = [
      { ...makeDef(log, false), id: "T2" },
      { ...makeDef(log, false), id: "T3" },
      { ...makeDef(log, false), id: "T4" },
    ];
    const c = createTransitionController(defs, ctx, attach, inputs);
    let yields = 0;
    await c.mountSliced(async () => void yields++, () => false);
    expect(yields).toBe(3);
    expect(["T2", "T3", "T4"].map((id) => c.variantOf(id))).toEqual(["dom", "dom", "dom"]);

    const c2 = createTransitionController(defs, ctx, attach, inputs);
    let stop = false;
    await c2.mountSliced(async () => void (stop = true), () => stop);
    expect(c2.variantOf("T2")).toBe("dom");
    expect(c2.variantOf("T3")).toBeUndefined();
  });

  it("5.9 el canvas queda listo a mitad de recorrido: la nueva variante arranca en el mismo progreso, sin saltos", () => {
    const log: string[] = [];
    let scrollProgress = 0.43;
    const attach: Attach = vi.fn(() => ({ progress: () => scrollProgress, destroy: () => {} }));
    const c = createTransitionController([makeDef(log, true)], ctx, attach, inputs);
    c.mount();
    expect(c.variantOf("T2")).toBe("dom");

    c.setInputs({ canvasReady: true, backend: "webgpu" });
    expect(c.variantOf("T2")).toBe("canvas");
    // La variante nueva se posicionó en 0,43 ANTES de engancharse al scroll.
    expect(log).toContain("canvas.progress(0.43)");
    expect(log.indexOf("dom.kill")).toBeLessThan(log.indexOf("canvas.progress(0.43)"));
    expect(c.progressOf("T2")).toBeCloseTo(0.43);

    // Y sigue el scroll normalmente después.
    scrollProgress = 0.6;
    expect(c.progressOf("T2")).toBeCloseTo(0.6);
  });

  it("al bajar de tier (o perder el backend) vuelve a DOM/SVG con el progreso actual", () => {
    const log: string[] = [];
    const attach: Attach = () => ({ progress: () => 0.8, destroy: () => {} });
    const c = createTransitionController([makeDef(log, true)], ctx, attach, {
      ...inputs,
      canvasReady: true,
      backend: "webgl2",
    });
    c.mount();
    expect(c.variantOf("T2")).toBe("canvas");
    c.setInputs({ tier: "low" });
    expect(c.variantOf("T2")).toBe("dom");
    expect(log).toContain("dom.progress(0.8)");
  });

  it("movimiento reducido usa su variante y no se reconstruye si nada cambia", () => {
    const log: string[] = [];
    const attach: Attach = () => ({ progress: () => 0, destroy: () => {} });
    const c = createTransitionController([makeDef(log, false)], ctx, attach, {
      ...inputs,
      reducedMotion: true,
    });
    c.mount();
    expect(c.variantOf("T2")).toBe("reduced");
    const before = log.length;
    c.refresh();
    expect(log.length).toBe(before);
  });

  it("sin variante canvas registrada, canvas listo cae a DOM", () => {
    const log: string[] = [];
    const attach: Attach = () => ({ progress: () => 0, destroy: () => {} });
    const c = createTransitionController([makeDef(log, false)], ctx, attach, {
      ...inputs,
      canvasReady: true,
      backend: "webgpu",
    });
    c.mount();
    expect(c.variantOf("T2")).toBe("dom");
  });

  it("rebuild recrea la variante actual conservando el progreso (p. ej. tras redimensionar)", () => {
    const log: string[] = [];
    const attach: Attach = () => ({ progress: () => 0.25, destroy: () => {} });
    const c = createTransitionController([makeDef(log, false)], ctx, attach, inputs);
    c.mount();
    c.rebuild();
    expect(c.variantOf("T2")).toBe("dom");
    expect(log.filter((l) => l === "dom.kill")).toHaveLength(1);
    expect(log).toContain("dom.progress(0.25)");
  });

  it("destroy libera todo", () => {
    const log: string[] = [];
    const attach: Attach = () => ({
      progress: () => 0,
      destroy: () => log.push("attachment.destroy"),
    });
    const c = createTransitionController([makeDef(log, false)], ctx, attach, inputs);
    c.mount();
    c.destroy();
    expect(log).toEqual(expect.arrayContaining(["attachment.destroy", "dom.kill", "dom.destroy"]));
    expect(c.variantOf("T2")).toBeUndefined();
  });
});
