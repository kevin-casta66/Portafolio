import { describe, expect, it } from "vitest";
import {
  MOBILE_PARTICLE_FACTOR,
  PRESETS,
  createFpsMonitor,
  particlesFor,
  stepTierDown,
  tierFromDetect,
} from "./quality";

describe("tabla de presets", () => {
  it("alto/medio/bajo: partículas 200k/50k/0 y fluido solo en alto", () => {
    expect(PRESETS.high.particles).toBe(200_000);
    expect(PRESETS.medium.particles).toBe(50_000);
    expect(PRESETS.low.particles).toBe(0);
    expect(PRESETS.high.fluid).toBe(true);
    expect(PRESETS.medium.fluid).toBe(false);
    expect(PRESETS.low.fluid).toBe(false);
  });

  it("el bloom solo existe en el tier alto", () => {
    expect(PRESETS.high.bloom).toBe(true);
    expect(PRESETS.medium.bloom).toBe(false);
    expect(PRESETS.low.bloom).toBe(false);
  });

  it("la resolución de los render targets baja con el tier: 1, 0,75, 0,5", () => {
    expect([PRESETS.high.rtScale, PRESETS.medium.rtScale, PRESETS.low.rtScale]).toEqual([
      1, 0.75, 0.5,
    ]);
  });

  it("móvil usa como máximo el 30 % de las partículas del equivalente de escritorio", () => {
    expect(MOBILE_PARTICLE_FACTOR).toBe(0.3);
    expect(particlesFor("medium", true)).toBe(15_000);
    expect(particlesFor("medium", true)).toBeLessThanOrEqual(PRESETS.medium.particles * 0.3);
    expect(particlesFor("high", false)).toBe(200_000);
    expect(particlesFor("low", true)).toBe(0);
  });

  it("stepTierDown baja de uno en uno y se detiene en bajo", () => {
    expect(stepTierDown("high")).toBe("medium");
    expect(stepTierDown("medium")).toBe("low");
    expect(stepTierDown("low")).toBe("low");
  });
});

describe("detect-gpu → tier", () => {
  it("mapea 3→alto, 2→medio, 0/1→bajo y lista negra/fallback→medio", () => {
    expect(tierFromDetect({ tier: 3 })).toBe("high");
    expect(tierFromDetect({ tier: 2 })).toBe("medium");
    expect(tierFromDetect({ tier: 1 })).toBe("low");
    expect(tierFromDetect({ tier: 0 })).toBe("low");
    expect(tierFromDetect({ tier: 0, type: "BLOCKLISTED" })).toBe("medium");
    expect(tierFromDetect({ tier: 3, type: "FALLBACK" })).toBe("medium");
  });
});

describe("monitor de FPS", () => {
  it("baja un tier con < 50 FPS sostenidos durante 2 s", () => {
    const monitor = createFpsMonitor();
    let drop = false;
    for (let t = 0; t < 3000; t += 1000 / 30) drop ||= monitor.frame(t);
    expect(drop).toBe(true);
  });

  it("no cambia a 60 FPS estables", () => {
    const monitor = createFpsMonitor();
    let drop = false;
    for (let t = 0; t < 5000; t += 1000 / 60) drop ||= monitor.frame(t);
    expect(drop).toBe(false);
  });

  it("un pico de menos de 2 s no cambia el tier", () => {
    const monitor = createFpsMonitor();
    let drop = false;
    let t = 0;
    for (; t < 1000; t += 1000 / 60) drop ||= monitor.frame(t);
    for (const end = t + 1200; t < end; t += 1000 / 20) drop ||= monitor.frame(t);
    for (const end = t + 3000; t < end; t += 1000 / 60) drop ||= monitor.frame(t);
    expect(drop).toBe(false);
  });

  it("los huecos sin render (escena estática) no cuentan como lentitud", () => {
    const monitor = createFpsMonitor();
    let drop = false;
    for (let t = 0; t < 20_000; t += 1000) drop ||= monitor.frame(t);
    expect(drop).toBe(false);
  });
});
