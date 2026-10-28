import { describe, expect, it } from "vitest";
import { buildPathRibbons, treePaths, type TreeNode } from "./tree-paths";

// Developer → IA (3 hijos), con la línea del grupo de IA en x = 300.
const nodes: TreeNode[] = [
  { left: 0, right: 100, y: 20, parent: -1, groupX: 110 },
  { left: 120, right: 280, y: 20, parent: 0, groupX: 300 },
  { left: 320, right: 500, y: 20, parent: 1 },
  { left: 320, right: 520, y: 80, parent: 1 },
  { left: 320, right: 480, y: 140, parent: 1 },
];

describe("treePaths", () => {
  const paths = treePaths(nodes, 10);

  it("dibuja tramo, tronco y una derivación por cada hijo después del primero", () => {
    // Developer: solo el tramo a IA (un hijo). IA: tramo + tronco + 2 derivaciones.
    expect(paths).toHaveLength(1 + 1 + 1 + 2);
  });

  it("el tronco va sobre la línea del grupo y termina donde empieza el codo del último hijo", () => {
    const trunk = paths.find((p) => p.points[0]?.[0] === 300 && p.points[1]?.[0] === 300);
    expect(trunk?.points).toEqual([
      [300, 20],
      [300, 130],
    ]);
  });

  it("todos los codos son cuartos de círculo idénticos (simétricos) que acaban en horizontal", () => {
    const branches = paths.filter((p) => p.gate >= 0);
    const shapes = branches.map((p) => {
      const [x0, y0] = p.points[0] as [number, number];
      const elbowEnd = p.points[10] as [number, number];
      return [elbowEnd[0] - x0, elbowEnd[1] - y0].map((n) => Math.round(n * 1000) / 1000);
    });
    expect(shapes).toEqual([
      [10, 10],
      [10, 10],
    ]);
    for (const p of branches) {
      const [, y0] = p.points[0] as [number, number];
      const end = p.points[p.points.length - 1] as [number, number];
      expect(end[1]).toBeCloseTo(p.gate);
      expect(y0).toBeCloseTo(p.gate - 10);
    }
  });
});

describe("buildPathRibbons", () => {
  it("u crece de 0 a 1 por longitud de arco y la geometría es coherente", () => {
    const g = buildPathRibbons(treePaths(nodes, 10), 6);
    expect(Math.max(...g.indices)).toBe(g.vertexCount - 1);
    const us = Array.from({ length: g.vertexCount }, (_, i) => g.params[i * 4] as number);
    expect(Math.min(...us)).toBe(0);
    expect(Math.max(...us)).toBeCloseTo(1);
  });
});
