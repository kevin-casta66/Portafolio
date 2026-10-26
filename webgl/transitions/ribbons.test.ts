import { describe, expect, it } from "vitest";
import { buildRibbons, elbowPoint, parentIndices } from "./ribbons";

describe("parentIndices", () => {
  it("deduce el padre de cada fila a partir de los niveles", () => {
    expect(parentIndices([1, 2, 3, 3, 2, 1, 2])).toEqual([-1, 0, 1, 1, 0, -1, 5]);
  });
  it("la raíz no tiene padre", () => {
    expect(parentIndices([1])).toEqual([-1]);
  });
});

describe("buildRibbons", () => {
  const branch = { from: [0, 0] as const, to: [100, 80] as const, delay: 0.25 };

  it("la curva empieza en el padre y termina en el hijo", () => {
    expect(elbowPoint(branch, 0)).toEqual([0, 0]);
    const end = elbowPoint(branch, 1);
    expect(end[0]).toBeCloseTo(100);
    expect(end[1]).toBeCloseTo(80);
  });

  it("genera la geometría esperada por rama", () => {
    const g = buildRibbons([branch, branch], 10, 6);
    expect(g.vertexCount).toBe(2 * 11 * 2);
    expect(g.indices.length).toBe(2 * 10 * 6);
    expect(Math.max(...g.indices)).toBe(g.vertexCount - 1);
  });

  it("u va de 0 a 1 a lo largo y v vale ±1 a los lados", () => {
    const g = buildRibbons([branch], 4, 6);
    expect(g.params[0]).toBe(0);
    expect(g.params[(g.vertexCount - 1) * 4]).toBe(1);
    expect(Math.abs(g.params[1] as number)).toBe(1);
    expect(g.params[2]).toBe(0.25);
  });

  it("la anchura es la pedida (distancia entre los dos lados)", () => {
    const g = buildRibbons([branch], 4, 8);
    const d = Math.hypot(
      (g.positions[0] as number) - (g.positions[2] as number),
      (g.positions[1] as number) - (g.positions[3] as number),
    );
    expect(d).toBeCloseTo(8, 3);
  });
});
