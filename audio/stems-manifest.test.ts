import { describe, expect, it } from "vitest";
import { BAR_S, PROGRESSION_BARS } from "./scale";
import {
  ALLOWED_LICENSES,
  STEMS_BUDGET_BYTES,
  STEMS_DIR,
  creditLine,
  pickStemFormat,
  validateStemsManifest,
} from "./stems-manifest";
import { LAYER_IDS } from "./types";

/** Fixture válido (no se publica): 6 capas de 500 KB con los dos formatos. */
function fixture(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    bpm: 84,
    bars: PROGRESSION_BARS,
    loopSeconds: PROGRESSION_BARS * BAR_S,
    stems: Object.fromEntries(LAYER_IDS.map((id) => [id, { webm: `${id}.webm`, m4a: `${id}.m4a`, bytes: 500_000 }])),
    credits: { title: "Fixture", author: "Test", license: "CC0-1.0", source: "https://example.test" },
    ...overrides,
  };
}

describe("manifiesto de stems", () => {
  it("acepta un manifiesto completo y dentro del presupuesto", () => {
    const result = validateStemsManifest(fixture());
    expect(result.ok).toBe(true);
  });

  it("rechaza si falta alguna de las 6 capas", () => {
    const f = fixture();
    delete (f.stems as Record<string, unknown>).shimmer;
    const result = validateStemsManifest(f);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.join(" ")).toContain("shimmer");
  });

  it("rechaza si los archivos superan los 4 MB", () => {
    const f = fixture({ stems: Object.fromEntries(LAYER_IDS.map((id) => [id, { webm: `${id}.webm`, bytes: 800_000 }])) });
    const result = validateStemsManifest(f);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors.join(" ")).toContain(String(STEMS_BUDGET_BYTES));
  });

  it("rechaza un bucle que no cuadra con 4 compases a 84 BPM", () => {
    const result = validateStemsManifest(fixture({ loopSeconds: 10 }));
    expect(result.ok).toBe(false);
  });

  it("exige una licencia CC0 o comercial documentada", () => {
    expect(ALLOWED_LICENSES).toEqual(["CC0-1.0", "commercial"]);
    for (const bad of [{}, { license: "CC-BY-NC-4.0", title: "x", author: "y", source: "z" }]) {
      const result = validateStemsManifest(fixture({ credits: bad }));
      expect(result.ok).toBe(false);
    }
  });

  it("elige Opus en WebM y cae a AAC en M4A (Safari)", () => {
    const entry = { webm: "pad.webm", m4a: "pad.m4a", bytes: 1 };
    expect(pickStemFormat(entry, () => true)).toEqual({ url: `${STEMS_DIR}pad.webm`, format: "webm" });
    expect(pickStemFormat(entry, (m) => m.startsWith("audio/mp4"))).toEqual({ url: `${STEMS_DIR}pad.m4a`, format: "m4a" });
    expect(pickStemFormat(entry, () => false)).toBeNull();
    expect(pickStemFormat({ webm: "a.webm", bytes: 1 }, (m) => m.startsWith("audio/mp4"))).toBeNull();
  });

  it("la línea de créditos nombra título, autor, licencia y fuente", () => {
    const result = validateStemsManifest(fixture());
    expect(result.ok && creditLine(result.manifest.credits)).toBe("Música: «Fixture», Test (CC0-1.0) · https://example.test");
  });
});
