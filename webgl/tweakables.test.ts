import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ALL_SCENES,
  clampTweakable,
  clearTweakablesForTests,
  registerTweakables,
  resetTweakables,
  subscribeTweakables,
  tweakablesFor,
  type Tweakable,
} from "./tweakables";

const param = (id: string, initial: number, extra: Partial<Tweakable> = {}): Tweakable & { current: () => number } => {
  let value = initial;
  return {
    id,
    min: 0,
    max: 10,
    step: 0.5,
    defaultValue: initial,
    get: () => value,
    set: (v) => {
      value = v;
    },
    current: () => value,
    ...extra,
  };
};

describe("registro de parámetros de shader (modo Debug)", () => {
  beforeEach(() => clearTweakablesForTests());

  it("los parámetros globales aplican a cualquier escena y los de escena solo a ella", () => {
    registerTweakables(ALL_SCENES, [param("bloomStrength", 1)]);
    registerTweakables("source", [param("gridGlow", 2)]);
    registerTweakables("runtime", [param("coreGlow", 3)]);
    expect(tweakablesFor([]).map((p) => p.id)).toEqual(["bloomStrength"]);
    expect(tweakablesFor(["source"]).map((p) => p.id)).toEqual(["bloomStrength", "gridGlow"]);
    expect(tweakablesFor(["source", "runtime"]).map((p) => p.id)).toEqual(["bloomStrength", "gridGlow", "coreGlow"]);
  });

  it("«Restablecer» devuelve TODOS los parámetros a su valor por defecto", () => {
    const a = param("bloomStrength", 0.9);
    const b = param("noise", 1);
    registerTweakables(ALL_SCENES, [a, b]);
    a.set(2.5);
    b.set(4);
    resetTweakables();
    expect(a.current()).toBe(0.9);
    expect(b.current()).toBe(1);
  });

  it("retirar los parámetros de una escena los quita de la lista y avisa a los suscriptores", () => {
    const listener = vi.fn();
    const stop = subscribeTweakables(listener);
    const unregister = registerTweakables("gpu", [param("x", 1)]);
    expect(tweakablesFor(["gpu"])).toHaveLength(1);
    unregister();
    expect(tweakablesFor(["gpu"])).toHaveLength(0);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
  });

  it("acota un valor al rango del parámetro", () => {
    const p = param("aberration", 1, { min: 0, max: 4 });
    expect(clampTweakable(p, 9)).toBe(4);
    expect(clampTweakable(p, -3)).toBe(0);
    expect(clampTweakable(p, 2)).toBe(2);
  });

  it("los valores no se persisten: un registro nuevo parte de su valor por defecto", () => {
    const p = param("noise", 1);
    registerTweakables(ALL_SCENES, [p]);
    p.set(5);
    clearTweakablesForTests();
    const fresh = param("noise", 1);
    registerTweakables(ALL_SCENES, [fresh]);
    expect(tweakablesFor([])[0]?.get()).toBe(1);
  });
});
