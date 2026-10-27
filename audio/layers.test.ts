import { describe, expect, it } from "vitest";
import {
  KEYS_PATTERN,
  LAYER_TRIM_DB,
  MIX,
  PERC_STEPS,
  SHIMMER_NOTES,
  arpActiveSteps,
  arpNote,
  changedLayers,
  dominantOf,
  effectiveGain,
  mulberry32,
  shimmerSteps,
} from "./layers";
import { PENTATONIC_CLASSES, PROGRESSION, isInScale, pitchClass } from "./scale";
import { LAYER_IDS, type LayerId, type MixContext } from "./types";

const CONTEXTS = Object.keys(MIX) as MixContext[];
const none = new Set<LayerId>();

describe("mapa de mezcla por fase (ADDENDUM-v3 §4)", () => {
  it("existe una mezcla para BOOT, las 7 fases, caso de estudio y 404", () => {
    expect([...CONTEXTS].sort()).toEqual(
      ["boot", "source", "lexer", "parser", "bytecode", "runtime", "gpu", "display", "case", "notfound"].sort(),
    );
  });

  it("las capas se SUMAN fase a fase hasta RUNTIME (misma pieza, sin cambiar de canción)", () => {
    const on = (c: MixContext) => LAYER_IDS.filter((id) => MIX[c].layers[id] > 0);
    expect(on("boot")).toEqual(["pad"]);
    expect(on("source")).toEqual(["pad", "keys"]);
    expect(on("lexer")).toEqual(["pad", "keys", "perc"]);
    expect(on("parser")).toEqual(["pad", "keys", "perc", "arp"]);
    expect(on("bytecode")).toEqual(["pad", "keys", "perc", "arp", "bass"]);
    expect(on("runtime")).toEqual(["pad", "keys", "perc", "arp", "bass"]);
    expect(on("gpu")).toEqual(["pad", "keys", "perc", "arp", "bass", "shimmer"]);
    expect(on("display")).toEqual(["pad", "keys"]);
    expect(on("case")).toEqual(["pad", "keys"]);
  });

  it("el bombo solo suena en RUNTIME y la GPU añade bitcrush leve sin bombo", () => {
    for (const c of CONTEXTS) expect(MIX[c].kick).toBe(c === "runtime");
    expect(MIX.gpu.crush).toBeGreaterThan(0);
    expect(MIX.runtime.crush).toBe(0);
  });

  it("el caso de estudio baja la música 8 dB", () => {
    expect(MIX.case.trimDb).toBe(-8);
    for (const c of CONTEXTS) if (c !== "case") expect(MIX[c].trimDb).toBe(0);
  });

  it("la densidad del arpegio crece con las fases y el filtro de la música se abre hacia RUNTIME/GPU", () => {
    expect(MIX.parser.arpDensity).toBeLessThan(MIX.bytecode.arpDensity);
    expect(MIX.bytecode.arpDensity).toBeLessThan(MIX.runtime.arpDensity);
    expect(MIX.source.cutoff).toBeLessThan(MIX.runtime.cutoff);
    expect(MIX.boot.cutoff).toBeLessThan(MIX.source.cutoff);
  });

  it("changedLayers lista solo las capas que cambian entre dos mezclas", () => {
    expect(changedLayers(MIX.lexer, MIX.parser)).toEqual(["keys", "arp"]);
    expect(changedLayers(MIX.runtime, MIX.runtime)).toEqual([]);
    expect(dominantOf(MIX.source)).toBe("keys");
    expect(dominantOf(MIX.boot)).toBe("pad");
  });

  it("mute y solo del mezclador", () => {
    expect(effectiveGain("bass", MIX.runtime, { muted: new Set<LayerId>(["bass"]), solo: none })).toBe(0);
    expect(effectiveGain("pad", MIX.runtime, { muted: none, solo: new Set<LayerId>(["bass"]) })).toBe(0);
    expect(effectiveGain("bass", MIX.runtime, { muted: none, solo: new Set<LayerId>(["bass"]) })).toBeGreaterThan(0.8);
    expect(effectiveGain("bass", MIX.source, { muted: none, solo: new Set<LayerId>(["bass"]) })).toBeGreaterThan(0.8);
  });

  it("los recortes de capa son finitos", () => {
    for (const id of LAYER_IDS) expect(Number.isFinite(LAYER_TRIM_DB[id])).toBe(true);
  });
});

describe("patrones de las capas", () => {
  it("el arpegio activa más corcheas a más densidad", () => {
    expect(arpActiveSteps(0)).toEqual([]);
    expect(arpActiveSteps(0.5)).toHaveLength(4);
    expect(arpActiveSteps(1)).toHaveLength(8);
    expect(arpActiveSteps(0.5).every((s) => arpActiveSteps(1).includes(s))).toBe(true);
  });

  it("todas las notas del arpegio y del shimmer pertenecen a Re mayor (acorde o pentatónica)", () => {
    for (let bar = 0; bar < 4; bar++) {
      const chord = PROGRESSION[bar]!;
      for (let e = 0; e < 8; e++) expect(chord.arp).toContain(arpNote(bar, e));
    }
    for (const n of SHIMMER_NOTES) expect(PENTATONIC_CLASSES.has(pitchClass(n))).toBe(true);
  });

  it("las teclas tocan solo notas de la pentatónica de Re mayor", () => {
    for (const ev of KEYS_PATTERN) {
      expect(isInScale(ev.note), ev.note).toBe(true);
      expect(ev.bar).toBeGreaterThanOrEqual(0);
      expect(ev.bar).toBeLessThan(4);
    }
  });

  it("el shimmer es determinista y no repite nota seguida", () => {
    const a = shimmerSteps(2);
    expect(shimmerSteps(2)).toEqual(a);
    for (let i = 1; i < a.length; i++) expect(a[i]!.note).not.toBe(a[i - 1]!.note);
    const hits = [0, 1, 2, 3].flatMap((b) => shimmerSteps(b)).length;
    expect(hits).toBeGreaterThan(4);
    expect(hits).toBeLessThan(40);
  });

  it("la percusión usa pasos válidos de la rejilla de 16", () => {
    for (const steps of Object.values(PERC_STEPS)) {
      for (const s of steps) {
        expect(s).toBeGreaterThanOrEqual(0);
        expect(s).toBeLessThan(16);
      }
    }
  });

  it("mulberry32 es reproducible", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
});
