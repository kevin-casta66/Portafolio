import { describe, expect, it } from "vitest";
import { RateLimiter, VoiceBudget } from "./voices";

describe("VoiceBudget (máximo 12 voces)", () => {
  it("nunca supera 12 voces simultáneas, ni siquiera con una ráfaga de efectos sobre la mezcla completa", () => {
    const budget = new VoiceBudget({ max: 12, sfxReserve: 3 });
    budget.reserve(3); // pad
    // La música ocupa hasta el límite que le corresponde…
    let granted = 0;
    for (let i = 0; i < 20; i++) if (budget.acquire("music", 0, 2, 1)) granted++;
    expect(granted).toBe(6); // 12 − 3 (efectos) − 3 (pad)
    // …y los efectos usan los huecos reservados, pero no más.
    let sfx = 0;
    for (let i = 0; i < 50; i++) if (budget.acquire("sfx", 0.1, 0.5, 0)) sfx++;
    expect(sfx).toBe(3);
    expect(budget.count(0.2)).toBe(12);
    expect(budget.peak).toBe(12);
    expect(budget.rejected).toBeGreaterThan(0);
  });

  it("las notas de prioridad alta (bajo, teclas, bombo) usan un hueco más que el resto de la música", () => {
    const budget = new VoiceBudget({ max: 12, sfxReserve: 3 });
    budget.reserve(3);
    for (let i = 0; i < 6; i++) expect(budget.acquire("music", 0, 2, 1, 0)).toBe(true);
    expect(budget.acquire("music", 0, 2, 1, 0)).toBe(false);
    expect(budget.acquire("music", 0, 2, 1, 2)).toBe(true);
  });

  it("las voces liberan su hueco al terminar (duración + cola)", () => {
    const budget = new VoiceBudget({ max: 4, sfxReserve: 0 });
    expect(budget.acquire("sfx", 0, 0.5, 0.5)).toBe(true);
    expect(budget.count(0.9)).toBe(1);
    expect(budget.count(1.01)).toBe(0);
  });

  it("un efecto muy repetido sigue respetando el tope", () => {
    const budget = new VoiceBudget({ max: 12, sfxReserve: 3 });
    budget.reserve(3);
    let maxCount = 0;
    for (let t = 0; t < 2; t += 0.04) {
      budget.acquire("sfx", t, 0.3, 0.4);
      maxCount = Math.max(maxCount, budget.count(t));
    }
    expect(maxCount).toBeLessThanOrEqual(12);
  });
});

describe("RateLimiter", () => {
  it("deja pasar un efecto como máximo cada gapMs", () => {
    const limiter = new RateLimiter();
    expect(limiter.allow("terminal:key", 0, 38)).toBe(true);
    expect(limiter.allow("terminal:key", 20, 38)).toBe(false);
    expect(limiter.allow("terminal:key", 39, 38)).toBe(true);
    expect(limiter.allow("otro", 20, 38)).toBe(true);
  });
});
