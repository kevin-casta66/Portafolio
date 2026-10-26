import { beforeEach, describe, expect, it } from "vitest";
import {
  VELOCITY_TAU_MS,
  createVelocityTracker,
  normalizeVelocity,
  stepVelocity,
  velocity,
} from "./velocity";

describe("normalizeVelocity", () => {
  it("se acota a [-1, 1] con el signo de la dirección", () => {
    expect(normalizeVelocity(100, 3)).toBe(1);
    expect(normalizeVelocity(-100, 3)).toBe(-1);
    expect(normalizeVelocity(1.5, 3)).toBeCloseTo(0.5);
    expect(normalizeVelocity(0, 3)).toBe(0);
  });
});

describe("stepVelocity", () => {
  it("tiende al objetivo sin sobrepasarlo", () => {
    let v = 0;
    for (let i = 0; i < 200; i++) {
      v = stepVelocity(v, 1, 16);
      expect(v).toBeLessThanOrEqual(1);
    }
    expect(v).toBeGreaterThan(0.99);
  });

  it("decae a ~5 % en el orden del token de revelado (≈ 3τ)", () => {
    const v = stepVelocity(1, 0, 3 * VELOCITY_TAU_MS);
    expect(v).toBeLessThan(0.06);
    expect(v).toBeGreaterThan(0.04);
  });
});

describe("tracker de velocidad", () => {
  beforeEach(() => {
    velocity.value = 0;
  });

  const make = (reduced = false) => {
    const state = { scroll: 0 };
    const update = createVelocityTracker({
      getScroll: () => state.scroll,
      isReduced: () => reduced,
      isCompact: () => false,
    });
    return { state, update };
  };

  it("scroll muy rápido → se acerca a 1 sin superarlo", () => {
    const { state, update } = make();
    let t = 0;
    for (let i = 0; i < 120; i++) {
      t += 0.016;
      state.scroll += 200; // 200 px / 16 ms = 12,5 px/ms ≫ máximo
      expect(update(t)).toBeLessThanOrEqual(1);
    }
    expect(velocity.value).toBeGreaterThan(0.95);
  });

  it("hacia arriba da signo negativo", () => {
    const { state, update } = make();
    let t = 0;
    for (let i = 0; i < 60; i++) {
      t += 0.016;
      state.scroll -= 100;
      update(t);
    }
    expect(velocity.value).toBeLessThan(-0.5);
    expect(velocity.value).toBeGreaterThanOrEqual(-1);
  });

  it("en reposo vuelve a 0 de forma progresiva", () => {
    const { state, update } = make();
    let t = 0;
    for (let i = 0; i < 60; i++) {
      t += 0.016;
      state.scroll += 100;
      update(t);
    }
    const moving = velocity.value;
    const samples: number[] = [];
    for (let i = 0; i < 120; i++) {
      t += 0.016;
      samples.push(update(t));
    }
    expect(samples[0]).toBeLessThan(moving);
    expect(samples.every((v, i) => i === 0 || v <= (samples[i - 1] ?? 1))).toBe(true);
    expect(samples.at(-1)).toBe(0);
  });

  it("con movimiento reducido permanece en 0 durante todo el scroll", () => {
    const { state, update } = make(true);
    let t = 0;
    for (let i = 0; i < 60; i++) {
      t += 0.016;
      state.scroll += 300;
      expect(update(t)).toBe(0);
    }
    expect(velocity.value).toBe(0);
  });
});
