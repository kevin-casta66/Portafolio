import { describe, expect, it } from "vitest";
import { PHASES, TINT_PERCENT, accentCss, readPhase, tintCss, type SectionBox } from "./phase";

// Siete secciones de 1000 px apiladas.
const boxes: SectionBox[] = PHASES.map((id, i) => ({ id, top: i * 1000, bottom: (i + 1) * 1000 }));
const read = (probe: number) => readPhase(boxes, probe, probe - 400, 7000 - 800);

describe("fase activa", () => {
  it("es la sección que contiene la línea de lectura", () => {
    expect(read(500).phase).toBe("source");
    expect(read(2500).phase).toBe("parser");
    expect(read(6999).phase).toBe("display");
  });

  it("carga con ancla: la fase inicial sale de la posición, sin pasar por las previas", () => {
    expect(read(4500).phase).toBe("runtime");
  });

  it("fuera de rango usa la primera / última", () => {
    expect(read(-50).phase).toBe("source");
    expect(read(99999).phase).toBe("display");
  });

  it("progreso dentro de la sección y progreso global acotados a [0, 1]", () => {
    const s = read(2750);
    expect(s.progress).toBeCloseTo(0.75);
    expect(s.global).toBeGreaterThanOrEqual(0);
    expect(s.global).toBeLessThanOrEqual(1);
  });
});

describe("color de acento", () => {
  it("a mitad de PARSER → BYTECODE es una mezcla de violeta y lima", () => {
    const s = read(3000); // centro de PARSER (2500) → centro de BYTECODE (3500): mitad exacta
    expect(s.from).toBe("parser");
    expect(s.to).toBe("bytecode");
    expect(s.mix).toBeCloseTo(0.5);
    const css = accentCss(s.from, s.to, s.mix);
    expect(css).toBe("color-mix(in oklch, var(--accent-parser) 50.0%, var(--accent-bytecode))");
  });

  it("en el centro de una fase el acento es exactamente el suyo (nunca cambia de golpe)", () => {
    const s = read(2500);
    expect(accentCss(s.from, s.to, s.mix)).toBe("var(--accent-parser)");
  });

  it("la interpolación es continua: pasos pequeños dan cambios pequeños", () => {
    const position = (y: number) => {
      const s = read(y);
      return PHASES.indexOf(s.from) + s.mix;
    };
    for (let y = 0; y < 6990; y += 10) {
      expect(Math.abs(position(y + 10) - position(y))).toBeLessThan(0.05);
    }
  });

  it("DISPLAY usa el acento de GPU como color sólido", () => {
    expect(accentCss("display", null, 0)).toBe("var(--accent-gpu)");
  });

  it("el tinte de fondo está entre el 4 % y el 6 %", () => {
    expect(TINT_PERCENT).toBeGreaterThanOrEqual(4);
    expect(TINT_PERCENT).toBeLessThanOrEqual(6);
    expect(tintCss("var(--x)")).toBe("color-mix(in srgb, var(--x) 5%, transparent)");
  });
});
