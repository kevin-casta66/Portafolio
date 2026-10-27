import { describe, expect, it } from "vitest";
import { MAX_OFFSET, ZONE, offsetFor } from "./magnetic-controller";

const rect = { left: 100, top: 100, width: 120, height: 48 };
const center = { x: 160, y: 124 };

describe("atracción magnética", () => {
  it("fuera de la zona de influencia no se mueve", () => {
    expect(offsetFor(rect, { x: 100 + 120 + ZONE + 5, y: 124 })).toEqual({ x: 0, y: 0 });
    expect(offsetFor(rect, { x: 160, y: 100 - ZONE - 5 })).toEqual({ x: 0, y: 0 });
  });

  it("dentro de la zona se desplaza hacia el puntero", () => {
    const right = offsetFor(rect, { x: center.x + 40, y: center.y });
    expect(right.x).toBeGreaterThan(0);
    const up = offsetFor(rect, { x: center.x, y: center.y - 30 });
    expect(up.y).toBeLessThan(0);
  });

  it("el desplazamiento está acotado, sea cual sea la distancia dentro de la zona", () => {
    for (const dx of [-500, -90, 90, 500]) {
      const { x, y } = offsetFor(rect, { x: center.x + dx, y: center.y + dx / 3 }, 10_000);
      expect(Math.abs(x)).toBeLessThanOrEqual(MAX_OFFSET);
      expect(Math.abs(y)).toBeLessThanOrEqual(MAX_OFFSET);
    }
  });

  it("con el puntero en el centro no hay desplazamiento", () => {
    expect(offsetFor(rect, center)).toEqual({ x: 0, y: 0 });
  });
});
