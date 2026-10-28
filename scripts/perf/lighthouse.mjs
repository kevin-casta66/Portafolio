/**
 * Lighthouse móvil local (change 09, 4.10). Lanza el Chrome instalado, audita las rutas indicadas con el perfil
 * móvil por defecto de Lighthouse (emulación Moto G Power, 4G lento simulado, CPU ×4) y TODAS las capas activas
 * (movimiento, 3D, sonido diferido), guarda los informes (HTML + JSON) en `docs/perf/lighthouse/` y un resumen
 * en `docs/perf/lighthouse/summary.json`. Falla (código 1) si Performance < 90, A11y/BP/SEO < 100, LCP ≥ 2,5 s
 * o CLS ≥ 0,05. Uso (contra `next start` ya arrancado):
 *   BASE=http://localhost:3150 node scripts/perf/lighthouse.mjs [ruta ...]
 * Sin rutas: /es, /en, un caso, /heap y /motion. Variables: CHROME_PATH (opcional), RUNS (por defecto 1).
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(new URL("../../package.json", import.meta.url));
const lighthouse = (await import(pathToFileURL(require.resolve("lighthouse")).href)).default;
const lhRequire = createRequire(require.resolve("lighthouse"));
const chromeLauncher = lhRequire("chrome-launcher");

const BASE = (process.env.BASE ?? "http://localhost:3150").replace(/\/+$/, "");
const outDir = join(process.cwd(), "docs", "perf", "lighthouse");
mkdirSync(outDir, { recursive: true });

const caseSlug = readdirSync(join(process.cwd(), "content", "cases")).find((f) => f.endsWith(".es.mdx"))?.replace(/\.es\.mdx$/, "");
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/es", "/en", `/es/projects/${caseSlug}`, "/es/heap", "/es/motion"];
const RUNS = Number(process.env.RUNS ?? 1);

const chrome = await chromeLauncher.launch({
  chromePath: process.env.CHROME_PATH,
  chromeFlags: ["--headless=new", "--no-sandbox", ...(process.env.CHROME_FLAGS ? process.env.CHROME_FLAGS.split(" ") : [])],
});
const rows = [];
let fails = 0;
try {
  for (const route of routes) {
    const runs = [];
    for (let i = 0; i < RUNS; i++) {
      const result = await lighthouse(`${BASE}${route}`, {
        port: chrome.port,
        output: ["html", "json"],
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      });
      runs.push(result);
    }
    // Mediana por Performance.
    runs.sort((a, b) => a.lhr.categories.performance.score - b.lhr.categories.performance.score);
    const best = runs[Math.floor(runs.length / 2)];
    const { lhr } = best;
    const slug = route.replace(/^\//, "").replace(/\//g, "_") || "root";
    writeFileSync(join(outDir, `${slug}.html`), best.report[0]);
    writeFileSync(join(outDir, `${slug}.json`), best.report[1]);
    const score = (id) => Math.round((lhr.categories[id].score ?? 0) * 100);
    const audit = (id) => lhr.audits[id].numericValue;
    const row = {
      route,
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
      lcpMs: Math.round(audit("largest-contentful-paint")),
      cls: +audit("cumulative-layout-shift").toFixed(4),
      tbtMs: Math.round(audit("total-blocking-time")),
      fcpMs: Math.round(audit("first-contentful-paint")),
      speedIndexMs: Math.round(audit("speed-index")),
      lighthouse: lhr.lighthouseVersion,
    };
    row.ok = row.performance >= 90 && row.accessibility === 100 && row.bestPractices === 100 && row.seo === 100 && row.lcpMs < 2500 && row.cls < 0.05;
    if (!row.ok) fails++;
    rows.push(row);
    console.log(`${row.ok ? "OK  " : "FAIL"} ${route}: Perf ${row.performance} · A11y ${row.accessibility} · BP ${row.bestPractices} · SEO ${row.seo} · LCP ${row.lcpMs} ms · CLS ${row.cls} · TBT ${row.tbtMs} ms`);
  }
} finally {
  await chrome.kill();
}
writeFileSync(join(outDir, "summary.json"), JSON.stringify({ base: BASE, date: new Date().toISOString(), rows }, null, 2));
process.exit(fails ? 1 : 0);
