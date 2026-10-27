import { describe, expect, it } from "vitest";
import { DEMO_IDS } from "@/motion/showcase";
import { duration, easing } from "@/motion/tokens";
import { motionCatalog, type MotionEntry } from "./motion";

const textFields: (keyof MotionEntry)[] = ["name", "trigger", "technique", "reducedMotion", "lowTier", "note", "internals"];

describe("catálogo de /motion (content/motion.ts)", () => {
  it("tiene exactamente T1–T11, en orden y sin repetir", () => {
    expect(motionCatalog.map((e) => e.id)).toEqual([...DEMO_IDS]);
    expect(new Set(motionCatalog.map((e) => e.id)).size).toBe(11);
  });

  it("todo token de duración y de easing referenciado existe en motion/tokens.ts", () => {
    for (const entry of motionCatalog) {
      expect(entry.durationTokens.length).toBeGreaterThan(0);
      expect(entry.easingTokens.length).toBeGreaterThan(0);
      for (const token of entry.durationTokens) expect(duration, `${entry.id}: ${token}`).toHaveProperty(token);
      for (const token of entry.easingTokens)
        expect(token === "spring" || token in easing, `${entry.id}: ${token}`).toBe(true);
    }
  });

  it("cada entrada tiene todos los campos de texto en español e inglés", () => {
    for (const entry of motionCatalog)
      for (const field of textFields) {
        const value = entry[field] as { es: string; en: string };
        expect(value.es.trim().length, `${entry.id}.${field}.es`).toBeGreaterThan(0);
        expect(value.en.trim().length, `${entry.id}.${field}.en`).toBeGreaterThan(0);
      }
  });

  it("los glitches respetan el techo de 300 ms y el hold es el de la tabla", () => {
    expect(duration.glitchMax).toBeLessThanOrEqual(300);
    expect(motionCatalog.find((e) => e.id === "T11")?.durationTokens).toEqual(["glitchMax"]);
    expect(motionCatalog.find((e) => e.id === "T6")?.durationTokens).toContain("hold");
  });
});
