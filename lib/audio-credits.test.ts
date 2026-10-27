import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { BAR_S, PROGRESSION_BARS } from "@/audio/scale";
import { LAYER_IDS } from "@/audio/types";
import { stemsCreditLine } from "./audio-credits";

const dirs: string[] = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

const withManifest = (manifest: unknown): string => {
  const root = mkdtempSync(path.join(tmpdir(), "audio-credits-"));
  dirs.push(root);
  mkdirSync(path.join(root, "public", "audio", "stems"), { recursive: true });
  writeFileSync(path.join(root, "public", "audio", "stems", "manifest.json"), JSON.stringify(manifest));
  return root;
};

describe("stemsCreditLine", () => {
  it("sin stems publicados no hay créditos (la música se genera en el navegador)", () => {
    expect(stemsCreditLine(mkdtempSync(path.join(tmpdir(), "audio-credits-empty-")))).toBeNull();
    expect(stemsCreditLine()).toBeNull();
  });

  it("con un manifiesto válido devuelve la línea de créditos del pie", () => {
    const root = withManifest({
      version: 1,
      bpm: 84,
      bars: PROGRESSION_BARS,
      loopSeconds: PROGRESSION_BARS * BAR_S,
      stems: Object.fromEntries(LAYER_IDS.map((id) => [id, { webm: `${id}.webm`, bytes: 100_000 }])),
      credits: { title: "Pieza", author: "Autora", license: "commercial", source: "contrato 2026-10" },
    });
    expect(stemsCreditLine(root)).toBe("Música: «Pieza», Autora (commercial) · contrato 2026-10");
  });

  it("un manifiesto inválido no publica créditos", () => {
    expect(stemsCreditLine(withManifest({ version: 2 }))).toBeNull();
  });
});
