import { describe, expect, it } from "vitest";
import { SPRING_SETTLE_MS, springEase, springLinear, springStep } from "./spring";

describe("resorte de UI (rigidez 300, amortiguación 30)", () => {
  it("empieza en 0 y termina en 1", () => {
    expect(springEase(0)).toBe(0);
    expect(springEase(1)).toBe(1);
    expect(springStep(10)).toBeCloseTo(1, 5);
  });

  it("rebasa 1 muy poco (subamortiguado: ζ ≈ 0,87)", () => {
    const peak = Math.max(...Array.from({ length: 200 }, (_, i) => springEase(i / 199)));
    expect(peak).toBeGreaterThan(1);
    expect(peak).toBeLessThan(1.02);
  });

  it("se asienta en torno a medio segundo", () => {
    expect(SPRING_SETTLE_MS).toBeGreaterThan(300);
    expect(SPRING_SETTLE_MS).toBeLessThan(800);
  });

  it("genera un easing CSS linear() con valores crecientes al inicio", () => {
    const css = springLinear(20);
    expect(css.startsWith("linear(0.0000, ")).toBe(true);
    expect(css.endsWith("1.0000)")).toBe(true);
  });
});
