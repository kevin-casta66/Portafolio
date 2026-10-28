import { describe, expect, it } from "vitest";
import { BUDGET_BYTES, extractScripts, forbiddenIn, gzipBytes } from "./check-bundle";

describe("check-bundle", () => {
  it("el presupuesto es 180 KB", () => {
    expect(BUDGET_BYTES).toBe(184_320);
  });

  it("extrae los scripts de /_next/static y distingue noModule", () => {
    const html =
      '<script src="/_next/static/chunks/a.js" async=""></script>' +
      '<script src="/_next/static/chunks/p.js" noModule=""></script>' +
      '<script src="/_next/static/chunks/a.js" async=""></script>' +
      '<script src="https://otro.example/x.js"></script>';
    expect(extractScripts(html)).toEqual([
      { src: "/_next/static/chunks/a.js", noModule: false },
      { src: "/_next/static/chunks/p.js", noModule: true },
    ]);
  });

  it("detecta librerías diferibles por sus marcas", () => {
    expect(forbiddenIn("new WebGPURenderer()")).toEqual(["three"]);
    expect(forbiddenIn("gsap.registerPlugin(x);smoothWheel")).toEqual(["gsap", "lenis"]);
    expect(forbiddenIn("console.log(1)")).toEqual([]);
  });

  it("gzipBytes comprime", () => {
    expect(gzipBytes("a".repeat(5000))).toBeLessThan(100);
  });
});
