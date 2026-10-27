import { afterEach, describe, expect, it, vi } from "vitest";
import { createTransitionState, setTransitionInternals, transitionStates } from "./state";

describe("TransitionState.internals (contrato de «Ver internos»)", () => {
  afterEach(() => transitionStates.clear());

  it("nace apagado y con progreso 0", () => {
    expect(createTransitionState()).toEqual({ p: 0, internals: false });
  });

  it("setTransitionInternals escribe el flag y pide un frame solo si cambia", () => {
    const state = createTransitionState();
    transitionStates.set("T2", state);
    const dirty = vi.fn();
    expect(setTransitionInternals("T2", true, dirty)).toBe(true);
    expect(state.internals).toBe(true);
    expect(dirty).toHaveBeenCalledTimes(1);
    setTransitionInternals("T2", true, dirty);
    expect(dirty).toHaveBeenCalledTimes(1);
    setTransitionInternals("T2", false, dirty);
    expect(state.internals).toBe(false);
    expect(dirty).toHaveBeenCalledTimes(2);
  });

  it("devuelve false si la transición no tiene variante canvas viva", () => {
    expect(setTransitionInternals("T9", true)).toBe(false);
  });
});
