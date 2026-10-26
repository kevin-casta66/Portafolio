import { describe, expect, it } from "vitest";
import { MAX_DPR, effectiveDpr, rtSize } from "./rt-size";

describe("rtSize", () => {
  it("devuelve píxeles físicos: CSS × DPR × escala", () => {
    expect(rtSize(1280, 800, 1)).toEqual({ width: 1280, height: 800 });
    expect(rtSize(1280, 800, 2)).toEqual({ width: 2560, height: 1600 });
    expect(rtSize(1280, 800, 2, 0.5)).toEqual({ width: 1280, height: 800 });
  });

  it("limita la densidad a 2 aunque el dispositivo sea 3", () => {
    expect(effectiveDpr(3)).toBe(MAX_DPR);
    expect(rtSize(100, 50, 3)).toEqual({ width: 200, height: 100 });
  });

  it("nunca baja de 1 px ni de DPR 1", () => {
    expect(effectiveDpr(0.5)).toBe(1);
    expect(effectiveDpr(Number.NaN)).toBe(1);
    expect(rtSize(0, 0, 2, 0.01)).toEqual({ width: 1, height: 1 });
  });
});
