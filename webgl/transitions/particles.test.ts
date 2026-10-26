import { describe, expect, it } from "vitest";
import { assignParticles, rng, type PointSet } from "./particles";

const set = (lane: string, x: number, color: [number, number, number]): PointSet => ({
  lane,
  color,
  points: new Float32Array([x, 0, x + 1, 0, x + 2, 0]),
});

describe("assignParticles", () => {
  const sources = [set("keyword", 0, [1, 0, 0]), set("string", 100, [0, 1, 0])];
  const targets = [set("keyword", 500, [1, 1, 1]), set("string", 700, [1, 1, 1])];

  it("genera exactamente `count` partículas", () => {
    const p = assignParticles(sources, targets, 1000, 7);
    expect(p.count).toBe(1000);
    expect(p.start.length).toBe(2000);
    expect(p.color.length).toBe(3000);
  });

  it("cada partícula termina en un destino de SU carril y conserva el color de origen", () => {
    const p = assignParticles(sources, targets, 500, 3);
    for (let i = 0; i < p.count; i++) {
      const fromKeyword = (p.start[i * 2] as number) < 50;
      const endX = p.end[i * 2] as number;
      if (fromKeyword) {
        expect(endX).toBeGreaterThan(498);
        expect(endX).toBeLessThan(504);
        expect(p.color[i * 3]).toBe(1);
      } else {
        expect(endX).toBeGreaterThan(698);
        expect(endX).toBeLessThan(704);
        expect(p.color[i * 3 + 1]).toBe(1);
      }
    }
  });

  it("es determinista por semilla", () => {
    const a = assignParticles(sources, targets, 50, 9);
    const b = assignParticles(sources, targets, 50, 9);
    expect(Array.from(a.start)).toEqual(Array.from(b.start));
    expect(rng(1)()).toBe(rng(1)());
  });

  it("sin orígenes o destinos no hay partículas", () => {
    expect(assignParticles([], targets, 10).count).toBe(0);
    expect(assignParticles(sources, [], 10).count).toBe(0);
  });

  it("si un carril no tiene destinos usa cualquiera", () => {
    const p = assignParticles([set("number", 0, [1, 1, 1])], targets, 20, 2);
    expect(p.count).toBe(20);
    for (let i = 0; i < 20; i++) expect(p.end[i * 2]).toBeGreaterThan(498);
  });
});
