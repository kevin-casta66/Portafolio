/**
 * Auditoría axe (WCAG 2.2 AA) de la matriz página × tema × locale × modo (change 09, tarea 5.9).
 * Uso: `BASE=http://localhost:3151 node scripts/a11y/axe.mjs [--only=home,heap] [--json=ruta.json]`
 * Requiere un servidor ya arrancado (dev o `next start`); no lo inicia. Sale con 1 si hay violaciones.
 * Modos: `full` (por defecto), `reduced` (preferencia manual en sessionStorage), `fallback2d`
 * (`?webgl=none`, que fuerza el backend ausente en webgl/core/backend.ts).
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const BASE = process.env.BASE ?? "http://localhost:3151";
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const only = arg("only")?.split(",");
const jsonOut = arg("json");

const PAGES = [
  { id: "home", path: "" },
  { id: "caso", path: "/projects/arquelume-ai-agent" },
  { id: "404", path: "/ruta-que-no-existe" },
  { id: "heap", path: "/heap" },
  { id: "motion", path: "/motion" },
].filter((p) => !only || only.includes(p.id));
const THEMES = ["dark", "light"];
const LOCALES = ["es", "en"];
const MODES = ["full", "reduced", "fallback2d"];
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];

const browser = await chromium.launch({ channel: "chrome" });
const report = [];
let failures = 0;

for (const theme of THEMES) {
  for (const mode of MODES) {
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      reducedMotion: mode === "reduced" ? "reduce" : "no-preference",
    });
    await ctx.addInitScript(
      ([t, m]) => {
        try {
          localStorage.setItem("portafolio:theme", t);
          sessionStorage.setItem("portafolio:gate", "silent");
          if (m === "reduced") sessionStorage.setItem("portafolio:motion", "reduced");
          if (m === "full") sessionStorage.setItem("portafolio:motion", "full");
        } catch {}
      },
      [theme, mode],
    );
    for (const locale of LOCALES) {
      for (const p of PAGES) {
        const page = await ctx.newPage();
        const url = `${BASE}/${locale}${p.path}${mode === "fallback2d" ? "?webgl=none" : ""}`;
        const response = await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(1500);
        const status = response?.status() ?? 0;
        // Recorrer la página para disparar los revelados por scroll (fundidos): axe mide el estado final.
        await page.evaluate(async () => {
          const step = Math.max(300, window.innerHeight * 0.8);
          for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 120));
          }
          window.scrollTo(0, document.documentElement.scrollHeight); // el estado final de los fundidos ligados al scroll
        });
        await page.waitForTimeout(800);
        // Cuadrar el estado visual: sin transiciones en curso que falseen el contraste.
        await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important;animation:none!important}" });
        const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
        const label = `${p.id} · ${theme} · ${locale} · ${mode}`;
        const v = results.violations;
        failures += v.length;
        console.log(`${v.length === 0 ? "OK  " : "FAIL"} ${label} (HTTP ${status})${v.length ? " — " + v.map((x) => `${x.id}×${x.nodes.length}`).join(", ") : ""}`);
        for (const x of v) {
          for (const n of x.nodes.slice(0, 3)) console.log(`       ${x.id}: ${n.target.join(" ")} — ${n.failureSummary?.split("\n")[1] ?? ""}`);
        }
        report.push({ label, status, violations: v.map((x) => ({ id: x.id, impact: x.impact, nodes: x.nodes.map((n) => n.target.join(" ")) })) });
        await page.close();
      }
    }
    await ctx.close();
  }
}
await browser.close();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
console.log(`\n${report.length} combinaciones, ${failures} violación(es).`);
process.exit(failures ? 1 : 0);
