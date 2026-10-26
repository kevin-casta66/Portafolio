import { describe, expect, it } from "vitest";
import type { CaseFrontmatter } from "@/lib/cases/schema";
import { NODE_H, NODE_W, layoutDiagram } from "./diagram-layout";

const diagram: NonNullable<CaseFrontmatter["diagram"]> = {
  nodes: [
    { id: "web", label: "Web", col: 0, row: 0 },
    { id: "api", label: "API", col: 1, row: 0 },
    { id: "db", label: "DB", col: 1, row: 1 },
  ],
  steps: [
    { title: "a", description: "a", nodes: ["web"], edges: [] },
    { title: "b", description: "b", nodes: ["api"], edges: [["web", "api"]] },
    { title: "c", description: "c", nodes: ["db"], edges: [["api", "db"]] },
  ],
};

describe("layoutDiagram", () => {
  const laid = layoutDiagram(diagram);

  it("asigna a cada nodo y conexión el paso en el que aparece", () => {
    expect(laid.nodes.map((n) => n.step)).toEqual([0, 1, 2]);
    expect(laid.edges.map((e) => [e.key, e.step])).toEqual([
      ["web-api", 1],
      ["api-db", 2],
    ]);
  });

  it("las conexiones horizontales salen del borde derecho y llegan al izquierdo", () => {
    const web = laid.nodes[0]!;
    const api = laid.nodes[1]!;
    expect(laid.edges[0]!.d.startsWith(`M ${web.x + NODE_W} ${web.y + NODE_H / 2}`)).toBe(true);
    expect(laid.edges[0]!.d.endsWith(`${api.x} ${api.y + NODE_H / 2}`)).toBe(true);
  });

  it("las verticales bajan del borde inferior al superior", () => {
    const api = laid.nodes[1]!;
    const db = laid.nodes[2]!;
    expect(laid.edges[1]!.d).toBe(
      `M ${api.x + NODE_W / 2} ${api.y + NODE_H} L ${db.x + NODE_W / 2} ${db.y}`,
    );
  });

  it("el lienzo cubre todos los nodos", () => {
    for (const n of laid.nodes) {
      expect(n.x + NODE_W).toBeLessThanOrEqual(laid.width);
      expect(n.y + NODE_H).toBeLessThanOrEqual(laid.height);
    }
    expect(laid.cols).toBe(2);
  });
});
