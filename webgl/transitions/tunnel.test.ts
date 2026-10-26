import { describe, expect, it } from "vitest";
import { byRecency } from "@/lib/content/experience-order";
import { content } from "@/lib/content";
import { RING_GAP, cameraZ, tunnelEnvelope, tunnelRings } from "./tunnel";

describe("túnel de T4", () => {
  it("un anillo por empleo, en el MISMO orden que la lista de BYTECODE (lo más reciente primero)", () => {
    const domOrder = byRecency(content.experience).map((e) => e.id);
    const rings = tunnelRings(domOrder);
    expect(rings.map((r) => r.id)).toEqual(domOrder);
    expect(rings).toHaveLength(content.experience.length);
    // De más cercano a más lejano, en orden.
    expect(rings.map((r) => r.z)).toEqual([...rings.map((r) => r.z)].sort((a, b) => b - a));
  });

  it("el orden cronológico inverso coincide con `content/experience.ts`", () => {
    const sorted = [...content.experience].sort((a, b) => b.start.localeCompare(a.start));
    expect(byRecency(content.experience).map((e) => e.id)).toEqual(sorted.map((e) => e.id));
  });

  it("la cámara avanza con el progreso y atraviesa el último anillo", () => {
    expect(cameraZ(0, 3)).toBeCloseTo(0);
    expect(cameraZ(1, 3)).toBeLessThan(-3 * RING_GAP);
    expect(cameraZ(0.5, 3)).toBeGreaterThan(cameraZ(0.9, 3));
  });

  it("la envolvente es 0 en los extremos y 1 en el centro", () => {
    expect(tunnelEnvelope(0)).toBe(0);
    expect(tunnelEnvelope(1)).toBe(0);
    expect(tunnelEnvelope(0.5)).toBe(1);
  });
});
