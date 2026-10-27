import { describe, expect, it } from "vitest";
import { shapeFor } from "./index";

/** Elemento falso con `closest` por selectores exactos (el entorno de pruebas no tiene DOM). */
const el = (matches: Record<string, { dataset?: { cursor?: string } } | boolean>) =>
  ({
    closest: (selector: string) => {
      const hit = Object.entries(matches).find(([key]) => selector.includes(key));
      return hit ? (typeof hit[1] === "object" ? hit[1] : {}) : null;
    },
  }) as unknown as Element;

describe("forma del cursor", () => {
  it("caret de texto por defecto", () => {
    expect(shapeFor(el({}))).toBe("caret");
    expect(shapeFor(null)).toBe("caret");
  });

  it("mira sobre botones y enlaces", () => {
    expect(shapeFor(el({ "a[href]": true }))).toBe("target");
  });

  it("⟨/⟩ sobre bloques de código", () => {
    expect(shapeFor(el({ "pre, code": true }))).toBe("code");
  });

  it("flecha de arrastre sobre el área marcada del árbol de habilidades", () => {
    expect(shapeFor(el({ "[data-cursor]": { dataset: { cursor: "drag" } } }))).toBe("drag");
  });
});
