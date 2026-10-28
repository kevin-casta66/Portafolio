/**
 * Matriz de verificación integral (change 09, 7.1): modo (full con nueva generación, full con WebGL2 forzado,
 * reduced, fallback2d) x tema (claro/oscuro) x idioma (es/en) x páginas (home, caso, /heap, /motion). Para cada
 * combinación guarda una «firma de contenido» (texto accesible de <main>, encabezados, enlaces, secciones,
 * controles) y exige que sea IDÉNTICA entre los cuatro modos para el mismo tema, idioma y página; además
 * comprueba el estado de la experiencia (atributo, backend, canvas, ilustraciones 2D). Uso:
 *   BASE=http://localhost:3150 node scripts/perf/matrix.mjs [--json=docs/perf/matrix.json]
 */
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const BASE = (process.env.BASE ?? "http://localhost:3150").replace(/\/+$/, "");
const jsonOut = process.argv.find((a) => a.startsWith("--json="))?.split("=")[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MODES = [
  { id: "full-nueva-generacion", query: "?motionTest=1", reduced: false, expectExperience: "full", expectBackend: ["webgpu", "webgl2"] },
  { id: "full-webgl2", query: "?motionTest=1&webgl=webgl2", reduced: false, expectExperience: "full", expectBackend: ["webgl2"] },
  { id: "reduced", query: "?motionTest=1", reduced: true, expectExperience: "reduced", expectBackend: null },
  { id: "fallback2d", query: "?motionTest=1&webgl=none", reduced: false, expectExperience: "fallback2d", expectBackend: ["none"] },
];
const PAGES = [
  { id: "home", path: "" },
  { id: "caso", path: "/projects/arquelume-ai-agent" },
  { id: "heap", path: "/heap" },
  { id: "motion", path: "/motion" },
];

const browser = await chromium.launch({ channel: "chrome" });
const rows = [];
const signatures = new Map(); // `${page}|${theme}|${locale}` -> Map(mode -> firma)
let fails = 0;

for (const mode of MODES) {
  for (const theme of ["dark", "light"]) {
    for (const locale of ["es", "en"]) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
      await ctx.addInitScript(
        ([t, reduced]) => {
          try {
            localStorage.setItem("portafolio:theme", t);
            sessionStorage.setItem("portafolio:gate", "silent");
            sessionStorage.setItem("portafolio:motion", reduced ? "reduced" : "full");
          } catch {}
        },
        [theme, mode.reduced],
      );
      for (const pg of PAGES) {
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
        await page.goto(`${BASE}/${locale}${pg.path}${mode.query}`, { waitUntil: "networkidle" });
        await sleep(2500);
        // Recorrer la página para que todo lo diferido monte y los fundidos terminen.
        await page.evaluate(async () => {
          const step = Math.max(400, innerHeight * 0.8);
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 90));
          }
        });
        await sleep(1200);
        const r = await page.evaluate(() => {
          const main = document.querySelector("main");
          const norm = (s) => (s ?? "").replace(/\s+/g, " ").trim();
          const state = window.__portafolioApp?.store.getState();
          return {
            // Líneas de texto de contenido (hojas), sin orden: el orden visual puede variar entre modos, el contenido no.
            lines: [
              ...new Set(
                [...document.querySelectorAll("main p, main li, main h1, main h2, main h3, main h4, main dt, main dd, main th, main td, main summary, main label, main button, main a, main figcaption, main option")]
                  .filter((e) => !e.querySelector("p, li, h1, h2, h3, h4, dt, dd, th, td, summary, label, button, a, figcaption, option"))
                  .map((e) => norm(e.textContent))
                  .filter(Boolean),
              ),
            ].sort(),
            headings: [...document.querySelectorAll("main h1, main h2, main h3")].map((h) => norm(h.textContent)).join("|"),
            links: [...document.querySelectorAll("main a[href]")].map((a) => a.getAttribute("href")).join("|"),
            sections: [...document.querySelectorAll("main section[id]")].map((s) => s.id).join("|"),
            controls: document.querySelectorAll("main button, main input, main select, main textarea").length,
            exp: document.documentElement.getAttribute("data-experience"),
            backend: state?.graphics.backend ?? null,
            canvases: document.querySelectorAll("canvas[data-engine]").length,
            illustrations: [...document.querySelectorAll("[data-phase-illustration]")].filter((e) => getComputedStyle(e).display !== "none").length,
            htmlLang: document.documentElement.lang,
            theme: document.documentElement.getAttribute("data-theme"),
          };
        });
        const signature = createHash("sha1").update([r.lines.join("\n"), r.headings, r.links, r.sections].join("\n#\n")).digest("hex").slice(0, 12);
        const key = `${pg.id}|${theme}|${locale}`;
        if (!signatures.has(key)) signatures.set(key, new Map());
        signatures.get(key).set(mode.id, { signature, lines: r.lines, headings: r.headings, links: r.links, sections: r.sections, controls: r.controls });
        const isFull = mode.id === "full-nueva-generacion" || mode.id === "full-webgl2";
        // /motion no monta el motor 3D (sus demos viven en escenarios aislados): sin motor no se decide fallback2d.
        const expOk = r.exp === mode.expectExperience || (mode.id === "fallback2d" && pg.id === "motion" && r.exp === "full");
        const backendOk = mode.expectBackend === null || pg.id === "motion" || (r.backend !== null && mode.expectBackend.includes(r.backend));
        const canvasOk = isFull ? pg.id === "motion" || r.canvases >= 1 : r.canvases === 0;
        const illOk = isFull || pg.id === "motion" ? true : pg.id !== "home" || r.illustrations >= 6;
        const langOk = r.htmlLang === locale && r.theme === theme;
        const ok = expOk && backendOk && canvasOk && illOk && langOk && errors.length === 0;
        if (!ok) fails++;
        rows.push({ mode: mode.id, theme, locale, page: pg.id, signature, experience: r.exp, backend: r.backend, canvases: r.canvases, illustrations: r.illustrations, ok, errors });
        if (!ok) console.log(`FAIL estado ${mode.id} · ${theme} · ${locale} · ${pg.id}: exp=${r.exp} backend=${r.backend} canvases=${r.canvases} ilustraciones=${r.illustrations} lang=${r.htmlLang} theme=${r.theme} errores=${errors.join(";")}`);
        await page.close();
      }
      await ctx.close();
    }
  }
}
await browser.close();

// Identidad de contenido entre modos (mismo tema, idioma y página).
let identityFails = 0;
const identity = [];
for (const [key, byMode] of signatures) {
  const [first, ...rest] = [...byMode.entries()];
  const same = rest.every(([, v]) => v.signature === first[1].signature);
  identity.push({ key, same, signatures: Object.fromEntries([...byMode].map(([m, v]) => [m, v.signature])) });
  if (!same) {
    identityFails++;
    const diffs = rest
      .filter(([, v]) => v.signature !== first[1].signature)
      .map(([m, v]) => {
        const base = new Set(first[1].lines);
        const mine = new Set(v.lines);
        const extra = v.lines.filter((l) => !base.has(l)).slice(0, 5);
        const missing = first[1].lines.filter((l) => !mine.has(l)).slice(0, 5);
        const parts = [];
        if (v.headings !== first[1].headings) parts.push("encabezados distintos");
        if (v.links !== first[1].links) parts.push("enlaces distintos");
        if (v.sections !== first[1].sections) parts.push("secciones distintas");
        return `${m} vs ${first[0]}: ${parts.join("; ")} · solo en ${m}: ${JSON.stringify(extra)} · falta en ${m}: ${JSON.stringify(missing)}`;
      });
    console.log(`FAIL contenido distinto entre modos en ${key}:\n   ${diffs.join("\n   ")}`);
  }
}
const total = rows.length;
console.log(`${total - fails}/${total} combinaciones con el estado de experiencia esperado · contenido idéntico entre modos en ${identity.length - identityFails}/${identity.length} (página x tema x idioma)`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ rows, identity }, null, 2));
process.exit(fails || identityFails ? 1 : 0);
