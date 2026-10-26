import { describe, expect, it } from "vitest";
import { chipBitmap, downsample, perimeterPoints, seededRandom, triangulatedMesh } from "./chip";

describe("chip procedural (T8)", () => {
  it("genera un mapa rectangular de intensidades en [0, 1]", () => {
    const bmp = chipBitmap(48, 30);
    expect(bmp).toHaveLength(30);
    expect(bmp.every((row) => row.length === 48)).toBe(true);
    expect(bmp.flat().every((v) => v >= 0 && v <= 1)).toBe(true);
    expect(Math.max(...bmp.flat())).toBeGreaterThan(0.9); // los núcleos
  });

  it("downsample pixela: menos celdas y el brillo medio se conserva", () => {
    const bmp = chipBitmap(48, 30);
    const coarse = downsample(bmp, 4);
    expect(coarse.length).toBe(Math.ceil(30 / 4));
    expect(coarse[0]?.length).toBe(12);
    const mean = (b: number[][]) => b.flat().reduce((a, v) => a + v, 0) / b.flat().length;
    expect(Math.abs(mean(coarse) - mean(bmp))).toBeLessThan(0.05);
  });

  it("la malla triangulada tiene puntos y aristas (horizontal, vertical y diagonal)", () => {
    const mesh = triangulatedMesh(4, 3, 10);
    expect(mesh.points).toHaveLength(12);
    // 3·3 horizontales + 4·2 verticales + 3·2 diagonales
    expect(mesh.edges).toHaveLength(9 + 8 + 6);
    expect(mesh.points[5]).toEqual({ x: 10, y: 10 });
  });
});

describe("T9: píxeles → marco del monitor", () => {
  it("el PRNG es determinista", () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it("los puntos del perímetro caen sobre el borde del rectángulo", () => {
    const pts = perimeterPoints(100, 50, 200, 100, 40);
    expect(pts).toHaveLength(40);
    for (const p of pts) {
      const onX = p.x === 100 || p.x === 300;
      const onY = p.y === 50 || p.y === 150;
      expect(onX || onY).toBe(true);
      expect(p.x).toBeGreaterThanOrEqual(100);
      expect(p.x).toBeLessThanOrEqual(300);
      expect(p.y).toBeGreaterThanOrEqual(50);
      expect(p.y).toBeLessThanOrEqual(150);
    }
  });
});
