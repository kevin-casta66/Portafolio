import { describe, expect, it } from "vitest";
import { triangulateChip } from "./triangulate";

describe("triangulateChip", () => {
  const t = triangulateChip({});

  it("produce una malla no vacía con índices válidos", () => {
    const n = t.points.length / 2;
    expect(n).toBeGreaterThan(50);
    expect(t.triangles.length).toBeGreaterThan(90);
    expect(t.triangles.length % 3).toBe(0);
    for (const i of t.triangles) expect(i).toBeLessThan(n);
    expect(t.shade.length).toBe(t.triangles.length / 3);
  });

  it("cumple Euler para una malla planar: aristas ≤ 3·vértices − 6 (+ huecos)", () => {
    const n = t.points.length / 2;
    expect(t.edges.length / 2).toBeLessThanOrEqual(3 * n);
  });

  it("es determinista por semilla", () => {
    const again = triangulateChip({});
    expect(Array.from(again.triangles)).toEqual(Array.from(t.triangles));
    expect(Array.from(triangulateChip({ seed: 99 }).points)).not.toEqual(Array.from(t.points));
  });

  it("descarta los triángulos fuera del chip (todos con intensidad > 0,08)", () => {
    for (const s of t.shade) expect(s).toBeGreaterThan(0.08);
  });

  it("las aristas no se repiten", () => {
    const keys = new Set<string>();
    for (let i = 0; i < t.edges.length; i += 2) keys.add(`${t.edges[i]}-${t.edges[i + 1]}`);
    expect(keys.size).toBe(t.edges.length / 2);
  });
});
