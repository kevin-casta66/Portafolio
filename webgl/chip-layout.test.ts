import { describe, expect, it } from "vitest";
import { DIE_INSET, coreLayout } from "./chip-layout";

describe("coreLayout", () => {
  it("devuelve un núcleo por proyecto", () => {
    expect(coreLayout(6, 2.2)).toHaveLength(6);
    expect(coreLayout(0, 2)).toEqual([]);
    expect(coreLayout(1, 2)).toHaveLength(1);
  });

  it("todos los núcleos caben dentro del die y no se solapan", () => {
    for (const count of [1, 3, 5, 6, 7, 9]) {
      const slots = coreLayout(count, 2.2);
      for (const s of slots) {
        expect(s.cx - s.w / 2).toBeGreaterThanOrEqual(DIE_INSET.x - 1e-9);
        expect(s.cx + s.w / 2).toBeLessThanOrEqual(1 - DIE_INSET.x + 1e-9);
        expect(s.cy - s.h / 2).toBeGreaterThanOrEqual(DIE_INSET.y - 1e-9);
        expect(s.cy + s.h / 2).toBeLessThanOrEqual(1 - DIE_INSET.y + 1e-9);
      }
      for (let i = 0; i < slots.length; i++)
        for (let j = i + 1; j < slots.length; j++) {
          const a = slots[i]!;
          const b = slots[j]!;
          const overlapX = Math.abs(a.cx - b.cx) < (a.w + b.w) / 2 - 1e-9;
          const overlapY = Math.abs(a.cy - b.cy) < (a.h + b.h) / 2 - 1e-9;
          expect(overlapX && overlapY, `núcleos ${i} y ${j} se solapan con ${count}`).toBe(false);
        }
    }
  });

  it("los núcleos son cuadrados en píxeles (w·aspect = h)", () => {
    for (const s of coreLayout(6, 2.2)) expect(s.w * 2.2).toBeCloseTo(s.h);
  });

  it("es determinista: el índice del núcleo es el índice del proyecto", () => {
    expect(coreLayout(6, 2).map((s) => s.index)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(coreLayout(6, 2)).toEqual(coreLayout(6, 2));
  });
});
