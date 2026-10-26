import { describe, expect, it } from "vitest";
import { bayerValue } from "./bayer";

describe("matriz de Bayer", () => {
  it("el nivel 1 es [[0,2],[3,1]] normalizado", () => {
    const m = [
      [bayerValue(0, 0, 1), bayerValue(1, 0, 1)],
      [bayerValue(0, 1, 1), bayerValue(1, 1, 1)],
    ].map((row) => row.map((v) => Math.round(v * 4 - 0.5)));
    expect(m).toEqual([
      [0, 2],
      [3, 1],
    ]);
  });

  it("8×8 contiene cada umbral exactamente una vez (64 valores distintos en [0,1))", () => {
    const seen = new Set<number>();
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) seen.add(bayerValue(x, y, 3));
    expect(seen.size).toBe(64);
    expect(Math.min(...seen)).toBeGreaterThan(0);
    expect(Math.max(...seen)).toBeLessThan(1);
  });

  it("es periódica con el lado de la matriz", () => {
    expect(bayerValue(3, 5, 3)).toBe(bayerValue(3 + 8, 5 + 16, 3));
  });
});
