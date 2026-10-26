import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { duration, easing, spring, stagger, staggerRange, toCssBezier } from "./tokens";

const css = readFileSync(new URL("../styles/tokens.css", import.meta.url), "utf8");

/** Lee `--nombre: valor;` de tokens.css. */
function cssVar(name: string): string {
  const match = new RegExp(`--${name}:\s*([^;]+);`).exec(css);
  if (!match?.[1]) throw new Error(`Falta --${name} en styles/tokens.css`);
  return match[1].trim();
}

const ms = (value: string): number => Number.parseFloat(value.replace("ms", ""));

describe("motion/tokens.ts ↔ styles/tokens.css", () => {
  it("easings coinciden", () => {
    expect(cssVar("ease-in-expo")).toBe(toCssBezier(easing.inExpo));
    expect(cssVar("ease-scene")).toBe(toCssBezier(easing.scene));
  });

  it("duraciones coinciden (UI = 300 ms en ambos)", () => {
    expect(ms(cssVar("dur-micro"))).toBe(duration.micro);
    expect(ms(cssVar("dur-ui"))).toBe(300);
    expect(duration.ui).toBe(300);
    expect(ms(cssVar("dur-reveal"))).toBe(duration.reveal);
    expect(ms(cssVar("dur-scene-min"))).toBe(duration.sceneMin);
    expect(ms(cssVar("dur-scene-max"))).toBe(duration.sceneMax);
    expect(ms(cssVar("dur-glitch-max"))).toBe(duration.glitchMax);
    expect(ms(cssVar("hold-duration"))).toBe(duration.hold);
    expect(ms(cssVar("hold-click-max"))).toBe(duration.holdClick);
    expect(ms(cssVar("dur-page-full"))).toBe(duration.pageFull);
    expect(ms(cssVar("dur-page-short"))).toBe(duration.pageShort);
    expect(ms(cssVar("dur-fade-max"))).toBe(duration.fadeMax);
    expect(ms(cssVar("dur-theme"))).toBe(duration.theme);
  });

  it("la transición de página respeta los techos del brief", () => {
    // Margen ≥ 100 ms para las esperas de la navegación (página destino, fuentes, rectángulo estable).
    expect(duration.pageFull).toBeLessThanOrEqual(1200 - 100);
    expect(duration.pageShort).toBeLessThanOrEqual(500 - 100);
    expect(duration.fadeMax).toBeLessThanOrEqual(200);
  });

  it("staggers coinciden y están dentro de rango", () => {
    expect(ms(cssVar("stagger-char"))).toBe(stagger.char);
    expect(ms(cssVar("stagger-item"))).toBe(stagger.item);
    expect(stagger.char).toBeGreaterThanOrEqual(staggerRange.char.min);
    expect(stagger.char).toBeLessThanOrEqual(staggerRange.char.max);
    expect(stagger.item).toBeGreaterThanOrEqual(staggerRange.item.min);
    expect(stagger.item).toBeLessThanOrEqual(staggerRange.item.max);
  });

  it("resorte coincide (rigidez 300, amortiguación 30)", () => {
    expect(Number(cssVar("spring-stiffness"))).toBe(spring.stiffness);
    expect(Number(cssVar("spring-damping"))).toBe(spring.damping);
  });
});
