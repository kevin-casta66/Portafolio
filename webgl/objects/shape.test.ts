import { describe, expect, it } from "vitest";
import { CHIP_TRIANGLES, CHIP_VERTICES, triangleArea, uniqueEdges } from "./shape";

describe("malla del chip", () => {
  it("todos los índices de los triángulos existen", () => {
    for (const tri of CHIP_TRIANGLES) for (const i of tri) expect(CHIP_VERTICES[i]).toBeDefined();
  });

  it("los triángulos cubren exactamente el octógono (suma de áreas = área del octógono)", () => {
    const total = CHIP_TRIANGLES.reduce((sum, [a, b, c]) => {
      const area = triangleArea(CHIP_VERTICES[a]!, CHIP_VERTICES[b]!, CHIP_VERTICES[c]!);
      return sum + Math.abs(area);
    }, 0);
    // Octógono: cuadrado 2×2 menos cuatro esquinas de 0,4×0,4/2.
    expect(total).toBeCloseTo(4 - 4 * 0.08, 5);
  });

  it("ningún triángulo es degenerado y todos tienen la misma orientación", () => {
    const signs = CHIP_TRIANGLES.map(([a, b, c]) =>
      Math.sign(triangleArea(CHIP_VERTICES[a]!, CHIP_VERTICES[b]!, CHIP_VERTICES[c]!)),
    );
    expect(signs.every((s) => s !== 0)).toBe(true);
    expect(new Set(signs).size).toBe(1);
  });

  it("las aristas únicas cumplen Euler: V − E + F = 1 (disco)", () => {
    const edges = uniqueEdges();
    expect(CHIP_VERTICES.length - edges.length + CHIP_TRIANGLES.length).toBe(1);
  });
});
