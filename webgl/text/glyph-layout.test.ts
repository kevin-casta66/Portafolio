import { describe, expect, it } from "vitest";
import { layoutWords, measureWord, type FontMetrics } from "./glyph-layout";

const glyph = (x: number, adv = 10) => ({
  x,
  y: 0,
  width: 8,
  height: 12,
  xoffset: 1,
  yoffset: 4,
  xadvance: adv,
});

const font: FontMetrics = {
  size: 10,
  lineHeight: 12,
  base: 10,
  scaleW: 100,
  scaleH: 100,
  glyphs: new Map([
    ["a", glyph(0)],
    ["b", glyph(10)],
    [" ", { x: 0, y: 0, width: 0, height: 0, xoffset: 0, yoffset: 0, xadvance: 4 }],
  ]),
};

describe("layoutWords", () => {
  it("genera un quad por glifo visible (el espacio no dibuja)", () => {
    const mesh = layoutWords([{ text: "ab", x: 0, y: 0, width: 20, height: 12 }], font, 10);
    expect(mesh.glyphCount).toBe(2);
    expect(mesh.positions.length).toBe(2 * 4 * 3);
    expect(mesh.indices.length).toBe(12);
  });

  it("escala la métrica del atlas al tamaño de la fuente DOM", () => {
    expect(measureWord("ab", font, 10)).toBe(20);
    expect(measureWord("ab", font, 20)).toBe(40);
  });

  it("coloca cada palabra en su rectángulo DOM (soporta varias líneas)", () => {
    const mesh = layoutWords(
      [
        { text: "a", x: 5, y: 0, width: 10, height: 12 },
        { text: "b", x: 5, y: 40, width: 10, height: 12 },
      ],
      font,
      10,
    );
    // Primer vértice de cada glifo: x0 = x + xoffset·s; y de la segunda palabra ≈ 40 + yoffset.
    expect(mesh.positions[0]).toBeCloseTo(6);
    expect(mesh.positions[12 + 1]).toBeCloseTo(44);
  });

  it("ajusta en horizontal al ancho DOM cuando la diferencia es pequeña", () => {
    const fitted = layoutWords([{ text: "ab", x: 0, y: 0, width: 22, height: 12 }], font, 10);
    const natural = layoutWords([{ text: "ab", x: 0, y: 0, width: 20, height: 12 }], font, 10);
    expect(fitted.positions[12]).toBeGreaterThan(natural.positions[12] as number);
  });

  it("ignora los glifos que no están en el atlas", () => {
    const mesh = layoutWords([{ text: "a✨b", x: 0, y: 0, width: 20, height: 12 }], font, 10);
    expect(mesh.glyphCount).toBe(2);
  });

  it("`along` va de 0 a 1 a lo largo del texto", () => {
    const mesh = layoutWords(
      [
        { text: "a", x: 0, y: 0, width: 10, height: 12 },
        { text: "b", x: 90, y: 0, width: 10, height: 12 },
      ],
      font,
      10,
    );
    expect(mesh.along[0]).toBeLessThan(0.05);
    expect(mesh.along[4]).toBeGreaterThan(0.85);
  });
});
