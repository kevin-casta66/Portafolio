import { describe, expect, it } from "vitest";
import { bayerMatrixRows, easeParticle, internalsOn, mosaicBlock, particleSpeed, speedNorm } from "./internals-math";

describe("vistas «Ver internos» de T5, T8 y T9", () => {
  it("la matriz de Bayer 8×8 es una permutación de 64 umbrales distintos en (0, 1)", () => {
    const rows = bayerMatrixRows(3);
    expect(rows).toHaveLength(8);
    const all = rows.flat();
    expect(all).toHaveLength(64);
    expect(new Set(all.map((v) => v.toFixed(6))).size).toBe(64);
    expect(Math.min(...all)).toBeGreaterThan(0);
    expect(Math.max(...all)).toBeLessThan(1);
  });

  it("el bloque de píxel de T8 crece de 1 a 12 y es monótono", () => {
    expect(mosaicBlock(0)).toBe(1);
    expect(mosaicBlock(0.1)).toBe(1);
    expect(mosaicBlock(0.55)).toBeCloseTo(12, 6);
    expect(mosaicBlock(1)).toBeCloseTo(12, 6);
    let prev = 0;
    for (let p = 0; p <= 1; p += 0.05) {
      const b = mosaicBlock(p);
      expect(b).toBeGreaterThanOrEqual(prev);
      prev = b;
    }
  });

  it("la velocidad de una partícula de T9 es 0 en reposo y máxima a mitad de viaje", () => {
    expect(particleSpeed(1000, 0)).toBe(0);
    expect(particleSpeed(1000, 1)).toBe(0);
    const mid = particleSpeed(1000, 0.5);
    expect(mid).toBeGreaterThan(particleSpeed(1000, 0.2));
    expect(mid).toBeGreaterThan(particleSpeed(1000, 0.8));
    expect(easeParticle(0.5)).toBeCloseTo(0.5, 9);
  });

  it("la velocidad normalizada queda acotada en [0, 1]", () => {
    expect(speedNorm(100_000, 0.5)).toBe(1);
    expect(speedNorm(0, 0.5)).toBe(0);
  });

  it("el flag es falso salvo que el estado lo active explícitamente", () => {
    expect(internalsOn({ p: 0, internals: false })).toBe(false);
    expect(internalsOn({ p: 0, internals: true })).toBe(true);
    expect(internalsOn({ p: 0, internals: false })).toBe(false);
  });
});
