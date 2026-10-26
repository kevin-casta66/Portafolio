import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import es from "@/messages/es.json";
import { CONTROLS, defaultParams, type ExperimentKind } from "./definitions";

const KINDS = Object.keys(CONTROLS) as ExperimentKind[];

describe("controles del laboratorio", () => {
  it("cada experimento tiene al menos un control", () => {
    for (const kind of KINDS) expect(CONTROLS[kind].length).toBeGreaterThan(0);
  });

  it("los valores por defecto están dentro de su rango", () => {
    for (const kind of KINDS)
      for (const c of CONTROLS[kind]) {
        if (c.type === "range") {
          expect(c.default).toBeGreaterThanOrEqual(c.min);
          expect(c.default).toBeLessThanOrEqual(c.max);
          expect(c.step).toBeGreaterThan(0);
        } else expect(c.options).toContain(c.default);
      }
  });

  it("aria-valuetext describe el valor con texto no vacío en todo el rango", () => {
    for (const kind of KINDS)
      for (const c of CONTROLS[kind])
        if (c.type === "range")
          for (const v of [c.min, (c.min + c.max) / 2, c.max]) expect(c.valueText(v).trim()).not.toBe("");
  });

  it("todas las etiquetas y opciones existen en es y en", () => {
    for (const catalog of [es, en]) {
      const lab = catalog.Gpu.lab as { controls: Record<string, string>; options: Record<string, string> };
      for (const kind of KINDS)
        for (const c of CONTROLS[kind]) {
          expect(lab.controls[c.labelKey], `${kind}.${c.key}`).toBeTruthy();
          if (c.type === "select") for (const o of c.options) expect(lab.options[o], o).toBeTruthy();
        }
    }
  });

  it("defaultParams devuelve el valor inicial de cada control", () => {
    expect(defaultParams("shader")).toMatchObject({ scale: 2.4, speed: 0.5, warp: 0.55 });
    expect(defaultParams("dataviz")).toMatchObject({ metric: "years", order: "value" });
  });
});
