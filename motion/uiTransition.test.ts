import { afterEach, describe, expect, it, vi } from "vitest";
import { currentSupport, resolveUiMode, revealRadius, revealTheme, supportsViewTransitions } from "./uiTransition";

afterEach(() => vi.unstubAllGlobals());

describe("resolveUiMode", () => {
  it("movimiento reducido: cambio directo, aunque haya soporte", () => {
    expect(resolveUiMode({ reduced: true, supportsViewTransitions: true })).toBe("instant");
    expect(resolveUiMode({ reduced: true, supportsViewTransitions: false })).toBe("instant");
  });

  it("con soporte: transiciones de vista; sin soporte: FLIP", () => {
    expect(resolveUiMode({ reduced: false, supportsViewTransitions: true })).toBe("native");
    expect(resolveUiMode({ reduced: false, supportsViewTransitions: false })).toBe("flip");
  });
});

describe("detección de soporte", () => {
  it("sin document.startViewTransition se usa el FLIP de respaldo", () => {
    vi.stubGlobal("document", {});
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    expect(supportsViewTransitions()).toBe(false);
    expect(resolveUiMode(currentSupport())).toBe("flip");
  });

  it("con document.startViewTransition se usan las transiciones de vista", () => {
    vi.stubGlobal("document", { startViewTransition: () => undefined });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: false }) });
    expect(supportsViewTransitions()).toBe(true);
    expect(resolveUiMode(currentSupport())).toBe("native");
  });

  it("con movimiento reducido gana el cambio directo", () => {
    vi.stubGlobal("document", { startViewTransition: () => undefined });
    vi.stubGlobal("window", { matchMedia: () => ({ matches: true }) });
    expect(resolveUiMode(currentSupport())).toBe("instant");
  });
});

describe("revealRadius (revelado circular del tema)", () => {
  it("llega a la esquina más lejana del viewport desde el botón", () => {
    // Botón arriba a la derecha de 1280×800: la esquina más lejana es la inferior izquierda.
    expect(revealRadius(1200, 30, 1280, 800)).toBeCloseTo(Math.hypot(1200, 770));
    // Desde el centro: la mitad de la diagonal.
    expect(revealRadius(640, 400, 1280, 800)).toBeCloseTo(Math.hypot(640, 400));
  });
});

describe("revealTheme", () => {
  it("con movimiento reducido aplica el tema al instante, sin transición ni animación", async () => {
    const update = vi.fn();
    const mode = await revealTheme({
      update,
      origin: { x: 10, y: 10 },
      support: { reduced: true, supportsViewTransitions: true },
    });
    expect(mode).toBe("instant");
    expect(update).toHaveBeenCalledTimes(1);
  });
});
