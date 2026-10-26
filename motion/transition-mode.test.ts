import { describe, expect, it } from "vitest";
import { resolveTransitionMode, type ModeInputs } from "./transition-mode";

const base: ModeInputs = {
  reduced: false,
  intensity: "full",
  backend: "webgpu",
  tier: "high",
  canvasReady: true,
  sceneReady: true,
};
const mode = (over: Partial<ModeInputs>) => resolveTransitionMode({ ...base, ...over });

describe("resolveTransitionMode", () => {
  it("canvas listo en tier alto o medio: versión completa con lente", () => {
    expect(mode({})).toBe("full");
    expect(mode({ tier: "medium" })).toBe("full");
    expect(mode({ backend: "webgl2" })).toBe("full");
    expect(mode({ intensity: "short" })).toBe("full");
  });

  it("movimiento reducido o apertura con fundido: fundido, por encima de todo lo demás", () => {
    expect(mode({ reduced: true })).toBe("fade");
    expect(mode({ intensity: "fade" })).toBe("fade");
    expect(mode({ reduced: true, backend: "none" })).toBe("fade");
  });

  it("sin ningún backend gráfico: navegación instantánea", () => {
    expect(mode({ backend: "none" })).toBe("instant");
    expect(mode({ backend: "none", canvasReady: false })).toBe("instant");
  });

  it("tier bajo: expansión 2D en el DOM, nunca la lente", () => {
    expect(mode({ tier: "low" })).toBe("2d");
    expect(mode({ tier: "low", intensity: "short" })).toBe("2d");
  });

  it("canvas o escena aún sin cargar: expansión 2D (no se espera a la red)", () => {
    expect(mode({ canvasReady: false, backend: "pending" })).toBe("2d");
    expect(mode({ sceneReady: false })).toBe("2d");
  });
});
