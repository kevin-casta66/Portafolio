import { afterEach, describe, expect, it, vi } from "vitest";
import { setTitleInternals, TITLE_GLITCH_MS, titleGlitchMs, titleInternals } from "./title-text";

describe("«Ver internos» de T11 (títulos MSDF)", () => {
  afterEach(() => {
    titleInternals.on = false;
    titleInternals.invalidate = null;
  });

  it("está apagado por defecto", () => {
    expect(titleInternals.on).toBe(false);
  });

  it("pide un frame solo cuando el valor cambia", () => {
    const invalidate = vi.fn();
    titleInternals.invalidate = invalidate;
    setTitleInternals(true);
    setTitleInternals(true);
    expect(titleInternals.on).toBe(true);
    expect(invalidate).toHaveBeenCalledTimes(1);
    setTitleInternals(false);
    expect(titleInternals.on).toBe(false);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("no falla si la capa de texto aún no registró su invalidación", () => {
    expect(() => setTitleInternals(true)).not.toThrow();
  });
});

describe("velocidad del glitch (T11, /motion)", () => {
  it("a velocidad 1 (por defecto) dura lo de producción", () => {
    expect(titleGlitchMs()).toBe(TITLE_GLITCH_MS);
    expect(titleGlitchMs(1)).toBe(TITLE_GLITCH_MS);
  });

  it("escala la duración como 1/velocidad", () => {
    expect(titleGlitchMs(0.5)).toBe(TITLE_GLITCH_MS * 2);
    expect(titleGlitchMs(0.25)).toBe(TITLE_GLITCH_MS * 4);
  });

  it("ignora velocidades inválidas y acota las muy altas", () => {
    expect(titleGlitchMs(0)).toBe(TITLE_GLITCH_MS);
    expect(titleGlitchMs(-1)).toBe(TITLE_GLITCH_MS);
    expect(titleGlitchMs(Number.NaN)).toBe(TITLE_GLITCH_MS);
    expect(titleGlitchMs(100)).toBe(TITLE_GLITCH_MS / 4);
  });
});
