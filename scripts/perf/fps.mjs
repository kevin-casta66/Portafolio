/**
 * fps en un recorrido completo de la home en escritorio (change 09, 4.11): scroll continuo de arriba abajo con la
 * rueda a velocidad constante, medido con `requestAnimationFrame` por cada backend (nueva generación y WebGL2
 * forzado). Exige mediana ≥ 58 fps y ningún tramo de 1 s por debajo de 50 fps. Se miden DOS pasadas: la primera
 * (en frío: cada escena compila sus shaders al entrar por primera vez) y la segunda (en caliente). Uso:
 *   BASE=http://localhost:3150 node scripts/perf/fps.mjs [--json=docs/perf/fps.json]
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import os from "node:os";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const BASE = (process.env.BASE ?? "http://localhost:3150").replace(/\/+$/, "");
const jsonOut = process.argv.find((a) => a.startsWith("--json="))?.split("=")[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome" });
const out = [];
let fails = 0;
for (const backend of ["default", "webgl2"]) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("portafolio:gate", "silent");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/es?motionTest=1${backend === "webgl2" ? "&webgl=webgl2" : ""}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true" && window.__portafolioApp?.store.getState().graphics.ready === true, null, { timeout: 40000 });
  await sleep(3000);
  const gpu = await page.evaluate(() => {
    const c = document.createElement("canvas").getContext("webgl2");
    const e = c?.getExtension("WEBGL_debug_renderer_info");
    return { renderer: e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : "?", backend: window.__portafolioApp.store.getState().graphics.backend, tier: window.__portafolioApp.store.getState().graphics.tier };
  });
  const idleFps = await page.evaluate(
    () =>
      new Promise((r) => {
        let n = 0;
        const t0 = performance.now();
        const f = () => {
          n++;
          if (performance.now() - t0 < 2000) requestAnimationFrame(f);
          else r(n / 2);
        };
        requestAnimationFrame(f);
      }),
  );
  for (const pass of ["en frío", "en caliente"]) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1200);
  await page.evaluate(() => {
    window.__t = [];
    const loop = (t) => {
      window.__t.push(t);
      window.__raf = requestAnimationFrame(loop);
    };
    window.__raf = requestAnimationFrame(loop);
  });
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  await page.mouse.move(960, 540);
  const STEP = 60; // px por paso de rueda
  const t0 = Date.now();
  const tStart = await page.evaluate(() => performance.now());
  for (let y = 0; y < total; y += STEP) {
    await page.mouse.wheel(0, STEP);
    await sleep(14);
  }
  const tEnd = await page.evaluate(() => performance.now());
  await sleep(600);
  const all = await page.evaluate(() => {
    cancelAnimationFrame(window.__raf);
    return window.__t;
  });
  const samples = all.filter((t) => t >= tStart && t <= tEnd);
  const deltas = samples.slice(1).map((t, i) => t - samples[i]);
  const fpsAt = deltas.map((d) => 1000 / d).sort((a, b) => a - b);
  const median = fpsAt[Math.floor(fpsAt.length / 2)];
  // Ventanas deslizantes de 1 s dentro del recorrido: fps de cada una.
  const windows = [];
  for (let i = 0, j = 0; i < samples.length; i++) {
    const limit = samples[i] + 1000;
    if (limit > tEnd) break;
    while (j < samples.length && samples[j] < limit) j++;
    windows.push(j - i);
  }
  const worstWindow = windows.length ? Math.min(...windows) : 0;
  const gaps = samples.slice(1).map((t, i) => ({ d: t - samples[i], t })).filter((g) => g.d > 120).map((g) => Math.round(g.d));
  const ok = median >= 58 && worstWindow >= 50;
  if (!ok) fails++;
  const row = { pass, idleFps, backend: backend === "webgl2" ? "webgl2 (forzado)" : gpu.backend, tier: gpu.tier, gpu: gpu.renderer, viewport: "1920×1080", medianFps: +median.toFixed(1), worst1sWindowFps: +worstWindow.toFixed(1), stallsOver120ms: gaps, frames: samples.length, seconds: +((Date.now() - t0) / 1000).toFixed(1), machine: `${os.cpus()[0].model.trim()} · ${(os.totalmem() / 2 ** 30).toFixed(0)} GB` };
  out.push(row);
  console.log(`${ok ? "OK  " : "FAIL"} ${row.backend} (${pass}; rAF en reposo ${idleFps} fps): mediana ${row.medianFps} fps, peor ventana de 1 s ${row.worst1sWindowFps} fps, paradas >120 ms: [${gaps.join(", ")}] (${row.frames} fotogramas) · ${row.gpu}`);
  }
  await ctx.close();
}
await browser.close();
if (jsonOut) writeFileSync(jsonOut, JSON.stringify(out, null, 2));
process.exit(fails ? 1 : 0);
