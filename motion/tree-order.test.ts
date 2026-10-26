import { describe, expect, it } from "vitest";
import { postOrder } from "./tree-order";

describe("postOrder (T4: colapso del árbol)", () => {
  it("cada hoja colapsa antes que su rama y la raíz la última", () => {
    // root / frontend(react, ts) / backend(node)
    const levels = [1, 2, 3, 3, 2, 3];
    expect(postOrder(levels)).toEqual([2, 3, 1, 5, 4, 0]);
  });

  it("el árbol real de habilidades: 1 raíz, 6 ramas, 14 hojas", () => {
    const sizes = [5, 1, 2, 2, 2, 2]; // hojas por categoría
    const levels = [1, ...sizes.flatMap((n) => [2, ...Array.from({ length: n }, () => 3)])];
    const order = postOrder(levels);
    expect(order).toHaveLength(levels.length);
    expect(new Set(order).size).toBe(levels.length);
    expect(order.at(-1)).toBe(0); // raíz «Developer» la última
    // Ninguna rama aparece antes que alguna de sus hojas.
    const position = new Map(order.map((idx, i) => [idx, i]));
    levels.forEach((level, idx) => {
      if (level !== 2) return;
      for (let j = idx + 1; j < levels.length && (levels[j] as number) > 2; j++) {
        expect(position.get(j) as number).toBeLessThan(position.get(idx) as number);
      }
    });
  });

  it("casos límite", () => {
    expect(postOrder([])).toEqual([]);
    expect(postOrder([1])).toEqual([0]);
  });
});
