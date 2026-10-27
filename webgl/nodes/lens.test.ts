import { describe, expect, it } from "vitest";
import { HEAP_LENS_MAGNIFY, lensScale } from "./lens";

describe("lensScale (magnificación radial del heap)", () => {
  it("amplía el centro 1 + m veces y vale 1 en el borde y fuera", () => {
    expect(lensScale(0)).toBeCloseTo(1 + HEAP_LENS_MAGNIFY, 6);
    expect(lensScale(1)).toBe(1);
    expect(lensScale(2)).toBe(1);
  });

  it("es continua en el borde (sin saltos entre dentro y fuera)", () => {
    expect(Math.abs(lensScale(0.999) - lensScale(1.001))).toBeLessThan(1e-5);
  });

  it("el mapa t → t·escala es monótono creciente: la lente no se pliega sobre sí misma", () => {
    let prev = -1;
    for (let i = 0; i <= 200; i++) {
      const t = i / 100; // 0..2
      const mapped = t * lensScale(t);
      expect(mapped).toBeGreaterThan(prev);
      prev = mapped;
    }
  });

  it("magnificaciones ≥ 3 sí pliegan la lente (límite del diseño)", () => {
    let monotonic = true;
    let prev = -1;
    for (let i = 0; i <= 200; i++) {
      const t = i / 100;
      const mapped = t * lensScale(t, 3.5);
      if (mapped <= prev) monotonic = false;
      prev = mapped;
    }
    expect(monotonic).toBe(false);
  });
});
