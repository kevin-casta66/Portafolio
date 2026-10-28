import { describe, expect, it } from "vitest";
import { limitWheelDelta } from "./smooth-scroll";

const VIEW = 1000; // adelanto máximo: 350 px

describe("limitWheelDelta", () => {
  it("un evento suelto nunca avanza más de 80 px", () => {
    expect(limitWheelDelta(600, 0, VIEW)).toBe(80);
    expect(limitWheelDelta(-600, 0, VIEW)).toBe(-80);
    expect(limitWheelDelta(40, 0, VIEW)).toBe(40);
  });

  it("el destino no se adelanta más de 0,35 ventanas a lo que se ve", () => {
    expect(limitWheelDelta(80, 300, VIEW)).toBe(50);
    expect(limitWheelDelta(80, 350, VIEW)).toBe(0);
    expect(limitWheelDelta(-80, -330, VIEW)).toBe(-20);
  });

  it("invertir la dirección siempre está permitido", () => {
    expect(limitWheelDelta(-80, 350, VIEW)).toBe(-80);
    expect(limitWheelDelta(80, -350, VIEW)).toBe(80);
  });
});
