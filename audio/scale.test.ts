import { describe, expect, it } from "vitest";
import { achievementIds } from "./test-helpers";
import {
  BAR_S,
  BEAT_S,
  MOTIF,
  MOTIF_VARIATIONS,
  PENTATONIC,
  PENTATONIC_LOW,
  PROGRESSION,
  SKILL_NOTE,
  TOKEN_NOTE,
  TONIC_CHORD,
  D_MAJOR_CLASSES,
  isInScale,
  msToBoundary,
  nextBoundary,
  noteToHz,
  pentatonicAt,
  pitchClass,
  progressionBarAt,
  skillChord,
  stableHash,
  variationFor,
} from "./scale";

describe("escala de Re mayor", () => {
  it("84 BPM en 4/4: un compás dura 2,857 s", () => {
    expect(BEAT_S).toBeCloseTo(60 / 84, 6);
    expect(BAR_S).toBeCloseTo((60 / 84) * 4, 6);
  });

  it("la afinación es A4 = 440 Hz", () => {
    expect(noteToHz("A4")).toBeCloseTo(440, 6);
    expect(noteToHz("D5")).toBeCloseTo(587.33, 1);
    expect(noteToHz("D3")).toBeCloseTo(146.83, 1);
  });

  it("toda nota de interacción pertenece a la pentatónica (Re, Mi, Fa#, La, Si)", () => {
    const interaction = [
      ...PENTATONIC,
      ...PENTATONIC_LOW,
      ...Object.values(TOKEN_NOTE),
      ...Object.values(SKILL_NOTE),
      ...MOTIF.map((m) => m.note),
      ...MOTIF_VARIATIONS.flat(),
      ...TONIC_CHORD,
    ];
    for (const note of interaction) expect(isInScale(note), note).toBe(true);
  });

  it("los acordes de la progresión usan solo notas de Re mayor", () => {
    expect(PROGRESSION.map((c) => c.name)).toEqual(["Bm7", "Gmaj7", "Dmaj7", "A6"]);
    for (const chord of PROGRESSION) {
      for (const note of [...chord.pad, chord.bass, ...chord.arp]) {
        expect(D_MAJOR_CLASSES.has(pitchClass(note)), `${chord.name} ${note}`).toBe(true);
      }
    }
  });

  it("el pad se desliza con movimiento mínimo (cada paso cambia como mucho 1 voz)", () => {
    for (let i = 0; i < PROGRESSION.length; i++) {
      const a = PROGRESSION[i]!.pad;
      const b = PROGRESSION[(i + 1) % PROGRESSION.length]!.pad;
      const changed = a.filter((n, k) => n !== b[k]).length;
      expect(changed).toBeLessThanOrEqual(2);
    }
  });

  it("el leitmotiv tiene 4 notas, sube y resuelve en la tónica", () => {
    expect(MOTIF).toHaveLength(4);
    expect(MOTIF.at(-1)?.note).toBe("D5");
    const hz = MOTIF.map((m) => noteToHz(m.note));
    expect(hz).toEqual([...hz].sort((a, b) => a - b));
  });

  it("pentatonicAt envuelve y es estable", () => {
    expect(pentatonicAt(0)).toBe("D4");
    expect(pentatonicAt(10)).toBe("D4");
    expect(pentatonicAt(-1)).toBe("B5");
  });

  it("skillChord devuelve 4 notas de la escala", () => {
    for (const category of Object.keys(SKILL_NOTE)) {
      const chord = skillChord(category);
      expect(chord).toHaveLength(4);
      for (const n of chord) expect(isInScale(n)).toBe(true);
    }
  });
});

describe("variaciones del leitmotiv por logro", () => {
  it("cada logro del catálogo obtiene una variación distinta y estable", () => {
    const ids = achievementIds();
    const chosen = ids.map((id) => variationFor(id, ids).join("-"));
    expect(new Set(chosen).size).toBe(ids.length);
    expect(ids.map((id) => variationFor(id, ids).join("-"))).toEqual(chosen);
  });

  it("sin catálogo conocido el hash es estable", () => {
    expect(stableHash("root_access")).toBe(stableHash("root_access"));
    expect(variationFor("algo_nuevo")).toEqual(variationFor("algo_nuevo"));
  });
});

describe("cuantización al pulso", () => {
  it("el siguiente límite es estrictamente posterior y cae en la rejilla", () => {
    expect(nextBoundary(0.1, "4n")).toBeCloseTo(BEAT_S, 6);
    expect(nextBoundary(BEAT_S + 0.01, "4n")).toBeCloseTo(2 * BEAT_S, 6);
    expect(nextBoundary(0.1, "1m")).toBeCloseTo(BAR_S, 6);
    expect(nextBoundary(BAR_S - 0.0005, "1m")).toBeCloseTo(BAR_S, 6);
  });

  it("la espera nunca supera una subdivisión", () => {
    for (let t = 0; t < 12; t += 0.037) {
      expect(msToBoundary(t, "16n")).toBeLessThanOrEqual((BEAT_S / 4) * 1000 + 1);
      expect(msToBoundary(t, "4n")).toBeLessThanOrEqual(BEAT_S * 1000 + 1);
      expect(msToBoundary(t, "1m")).toBeLessThanOrEqual(BAR_S * 1000 + 1);
    }
  });

  it("la progresión de 4 compases da la vuelta", () => {
    expect(progressionBarAt(0)).toBe(0);
    expect(progressionBarAt(BAR_S * 3 + 0.1)).toBe(3);
    expect(progressionBarAt(BAR_S * 4 + 0.1)).toBe(0);
  });
});
