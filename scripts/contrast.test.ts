import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { minGlassAlpha, runChecks, themeVars } from "./contrast";

const css = readFileSync(join(process.cwd(), "styles", "tokens.css"), "utf8");

describe("contraste del vidrio líquido (liquid-glass)", () => {
  it("los tokens actuales cumplen AA en ambos temas con todos los textos sobre vidrio", () => {
    const failed = runChecks(css).filter((c) => !c.ok);
    expect(failed.map((c) => `[${c.theme}] ${c.label}`)).toEqual([]);
  });

  it("calcula una opacidad mínima distinta por tema y menor que 1", () => {
    const dark = minGlassAlpha(css, "dark");
    const light = minGlassAlpha(css, "light");
    expect(dark).toBeGreaterThan(0.5);
    expect(dark).toBeLessThan(1);
    expect(light).toBeGreaterThan(dark);
    expect(light).toBeLessThan(1);
  });

  it("los tokens de opacidad (normal y fuerte) alcanzan la mínima de cada tema", () => {
    for (const theme of ["dark", "light"] as const) {
      const vars = themeVars(css, theme);
      const required = minGlassAlpha(css, theme);
      expect(Number(vars["glass-bg-min-alpha"])).toBeGreaterThanOrEqual(required);
      expect(Number(vars["glass-bg-strong-alpha"])).toBeGreaterThanOrEqual(required);
    }
  });

  it("el verificador FALLA si un token de vidrio no alcanza 4,5:1", () => {
    const weak = css.replaceAll("--glass-bg-min-alpha: 0.9;", "--glass-bg-min-alpha: 0.5;");
    expect(weak).not.toBe(css);
    const failed = runChecks(weak).filter((c) => !c.ok);
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((c) => c.tokens.includes("glass-bg-min-alpha"))).toBe(true);
    expect(failed.some((c) => c.theme === "dark" && c.label.includes("vidrio"))).toBe(true);
  });

  it("también falla con el vidrio fuerte demasiado transparente en el tema claro", () => {
    const weak = css.replace("--glass-bg-strong-alpha: 0.97;\n  --glass-blur: 16px;", "--glass-bg-strong-alpha: 0.4;\n  --glass-blur: 16px;");
    const failed = runChecks(weak).filter((c) => !c.ok);
    expect(failed.some((c) => c.tokens.includes("glass-bg-strong-alpha"))).toBe(true);
  });
});
