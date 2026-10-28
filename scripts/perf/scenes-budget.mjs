/**
 * Presupuesto por escena activa (change 09, 4.6): recorre las fases en cada tier (alto/medio/bajo), lee del
 * motor las llamadas de dibujo por escena activa y las partículas, y falla si alguna escena supera 100 draw
 * calls o el presupuesto de partículas (200 000 / 50 000 / 0). Uso:
 *   BASE=http://localhost:3150 node scripts/perf/scenes-budget.mjs [--json=docs/perf/scenes.json]
 * Requiere `next start` ya arrancado. El backend lo decide el navegador (WebGPU si existe; si no, WebGL2);
 * `?webgl=webgl2` fuerza WebGL2.
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const BASE = (process.env.BASE ?? "http://localhost:3150").replace(/\/+$/, "");
const jsonOut = process.argv.find((a) => a.startsWith("--json="))?.split("=")[1];
const BACKENDS = (process.env.BACKENDS ?? "default,webgl2").split(",");
const BUDGET = { high: 200_000, medium: 50_000, low: 0 };
const MAX_DRAW_CALLS = 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome" });
const report = [];
let fails = 0;
for (const backend of BACKENDS) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("portafolio:gate", "silent");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/es?motionTest=1${backend === "webgl2" ? "&webgl=webgl2" : ""}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__portafolioWebgl?.engine?.(), null, { timeout: 60000 });
  await sleep(1500);
  const info = await page.evaluate(() => {
    const e = window.__portafolioWebgl.engine();
    return { backend: e.renderer?.backend?.isWebGPUBackend ? "webgpu" : "webgl2" };
  }).catch(() => ({ backend: "?" }));
  for (const tier of ["high", "medium", "low"]) {
    await page.evaluate((t) => window.__portafolioWebgl.setTier(t), tier);
    await sleep(800);
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    const perScene = {};
    const particles = {};
    let maxTotal = 0;
    for (let y = 0; y < total; y += 500) {
      await page.evaluate((v) => window.scrollTo(0, v), y);
      await sleep(550);
      const s = await page.evaluate(() => {
        const w = window.__portafolioWebgl;
        const e = w.engine();
        const ids = e.activeIds ?? [];
        return {
          draw: w.info().drawCalls,
          per: { ...(e.stats?.perScene ?? {}) },
          part: Object.fromEntries(ids.map((id) => [id, w.sceneDebug(id)?.particles ?? null])),
        };
      });
      maxTotal = Math.max(maxTotal, s.draw);
      for (const [id, n] of Object.entries(s.per)) perScene[id] = Math.max(perScene[id] ?? 0, n);
      for (const [id, n] of Object.entries(s.part)) if (typeof n === "number") particles[id] = Math.max(particles[id] ?? 0, n);
    }
    const worstScene = Math.max(0, ...Object.values(perScene));
    const worstParticles = Math.max(0, ...Object.values(particles));
    const okDraw = worstScene < MAX_DRAW_CALLS;
    const okPart = worstParticles <= BUDGET[tier];
    if (!okDraw || !okPart) fails++;
    report.push({ backend: backend === "webgl2" ? "webgl2 (forzado)" : info.backend, tier, maxSceneDrawCalls: worstScene, maxFrameDrawCalls: maxTotal, maxParticles: worstParticles, perScene, particles, ok: okDraw && okPart });
    console.log(`${okDraw && okPart ? "OK  " : "FAIL"} ${backend === "webgl2" ? "webgl2*" : info.backend} · tier ${tier}: escena con más draw calls=${worstScene} (<${MAX_DRAW_CALLS}), frame máx=${maxTotal}, partículas máx=${worstParticles} (≤${BUDGET[tier]}) · ${JSON.stringify(perScene)}`);
  }
  await ctx.close();
}
await browser.close();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(report, null, 2));
process.exit(fails ? 1 : 0);
