import { describe, expect, it } from "vitest";
import { resolveVariant, selectVariant, type VariantInputs } from "./select";

const base: VariantInputs = {
  reducedMotion: false,
  canvasReady: true,
  tier: "high",
  backend: "webgpu",
};

describe("selectVariant", () => {
  it("canvas listo y tier suficiente → canvas", () => {
    expect(selectVariant(base)).toBe("canvas");
    expect(selectVariant({ ...base, backend: "webgl2", tier: "medium" })).toBe("canvas");
  });

  it("sin WebGL/WebGPU → DOM/SVG", () => {
    expect(selectVariant({ ...base, backend: "none" })).toBe("dom");
  });

  it("tier bajo → DOM/SVG", () => {
    expect(selectVariant({ ...base, tier: "low" })).toBe("dom");
  });

  it("canvas aún sin cargar → DOM/SVG", () => {
    expect(selectVariant({ ...base, canvasReady: false })).toBe("dom");
    expect(selectVariant({ ...base, backend: "pending" })).toBe("dom");
  });

  it("movimiento reducido manda sobre todo lo demás", () => {
    expect(selectVariant({ ...base, reducedMotion: true })).toBe("reduced");
    expect(selectVariant({ ...base, reducedMotion: true, canvasReady: false })).toBe("reduced");
  });
});

describe("resolveVariant", () => {
  it("cae a DOM si la variante pedida no existe", () => {
    expect(resolveVariant("canvas", ["dom", "reduced"])).toBe("dom");
    expect(resolveVariant("reduced", ["dom"])).toBe("dom");
  });
  it("devuelve null si no hay ninguna", () => {
    expect(resolveVariant("dom", ["reduced"])).toBeNull();
  });
});
