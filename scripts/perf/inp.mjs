/**
 * INP por interacción en móvil emulado (change 09, 4.3, 4.4, 4.12): filtros, AST, Hold-to-Execute, `/heap`
 * (arrastre táctil y Run GC), terminal, formulario y primera apertura de los ajustes de sonido. Perfil: 390×844,
 * DPR 2, táctil, CPU ×4 (como Lighthouse móvil). Mide con `PerformanceObserver('event')` (la misma fuente que
 * las Web Vitals) y falla si alguna interacción supera 200 ms.

 * El tier gráfico se fija en `medium` (TIER=high|medium|low): un móvil de gama media no llega al tier alto, y el
 * escritorio donde se mide sí lo haría con la GPU real.
 * Uso: `BASE=http://localhost:3150 node scripts/perf/inp.mjs [--json=docs/perf/inp.json]` (CPU=6 para otra ralentización).
 */
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const BASE = (process.env.BASE ?? "http://localhost:3150").replace(/\/+$/, "");
const CPU = Number(process.env.CPU ?? 4);
const jsonOut = process.argv.find((a) => a.startsWith("--json="))?.split("=")[1];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const LIMIT = 200;

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("portafolio:gate", "silent");
  } catch {}
  window.__tag = "";
  window.__ev = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (e.interactionId) window.__ev.push({ tag: window.__tag, name: e.name, d: e.duration, input: e.processingStart - e.startTime, proc: e.processingEnd - e.processingStart, pres: e.startTime + e.duration - e.processingEnd });
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
});
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
/** Espera a que las capas diferidas (movimiento y motor 3D) terminen de montar: se mide el uso, no la carga. */
const TIER = process.env.TIER ?? "medium"; // un móvil de gama media no llega al tier alto (detect-gpu lo degrada); el escritorio de pruebas sí
const settle = async () => {
  await page.waitForFunction(() => document.documentElement.dataset.motionReady === "true" && window.__portafolioApp?.store.getState().graphics.ready === true, null, { timeout: 30000 }).catch(() => {});
  await page.evaluate((t) => window.__portafolioWebgl?.setTier?.(t), TIER);
  await sleep(2500);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
};
const tag = (t) => page.evaluate((v) => (window.__tag = v), t);

const results = {};
const collect = async () => {
  const ev = await page.evaluate(() => window.__ev.splice(0));
  for (const e of ev) {
    const r = (results[e.tag] ??= { max: 0, n: 0, worst: null });
    r.n++;
    if (e.d > r.max) {
      r.max = e.d;
      r.worst = { name: e.name, input: Math.round(e.input), processing: Math.round(e.proc), presentation: Math.round(e.pres) };
    }
  }
};

await page.goto(`${BASE}/es?motionTest=1`, { waitUntil: "networkidle" });
await settle();

// 1. Ajustes de sonido (primera apertura)
await tag("sonido: primera apertura");
await page.tap("[data-sound-settings]");
await sleep(700);
await page.keyboard.press("Escape");
await sleep(400);
await collect();

// 2. Terminal
await tag("terminal");
await page.tap("[data-terminal-button]");
await sleep(900);
await page.keyboard.type("help", { delay: 60 });
await page.keyboard.press("Enter");
await sleep(500);
await page.keyboard.press("Escape");
await sleep(500);
await collect();

// 3. AST
await tag("AST");
await page.evaluate(() => document.getElementById("parser")?.scrollIntoView());
await sleep(1200);
for (const item of await page.locator('[role="treeitem"]').all().then((l) => l.slice(0, 4))) {
  await item.tap({ timeout: 3000 }).catch(() => {});
  await sleep(250);
}
await collect();

// 4. Filtro de procesos
await tag("filtro de proyectos");
await page.evaluate(() => document.getElementById("runtime")?.scrollIntoView());
await sleep(1200);
const select = page.locator("#runtime select[name=grep]");
if (await select.count()) {
  const options = await select.locator("option").evaluateAll((o) => o.map((x) => x.value));
  for (const v of options.slice(1, 4)) {
    await select.selectOption(v);
    await sleep(700);
  }
  await select.selectOption(options[0]);
  await sleep(700);
}
await collect();

// 5. Hold-to-Execute (táctil: mantener 450 ms sobre la tarjeta)
await tag("Hold-to-Execute");
const card = page.locator("#runtime [data-hold]").first();
if (await card.count()) {
  await card.scrollIntoViewIfNeeded();
  await sleep(600);
  const box = await card.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = Math.min(Math.max(box.y + box.height / 2, 60), 780);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    await sleep(450);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await sleep(900);
  }
}
await collect();

// 6. Formulario
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await page.goto(`${BASE}/es?motionTest=1`, { waitUntil: "networkidle" });
await settle();
await tag("formulario");
await page.evaluate(() => document.getElementById("display")?.scrollIntoView());
await sleep(2500); // la escena de DISPLAY compila sus shaders al entrar: se mide el uso, no esa primera carga
await page.tap("#display input[name=name]");
await page.keyboard.type("Ada Lovelace", { delay: 40 });
await page.tap("#display input[name=email]");
await page.keyboard.type("ada@example.com", { delay: 40 });
await page.tap("#display textarea[name=message]");
await page.keyboard.type("Hola, me gustaría hablar de un proyecto.", { delay: 20 });
await page.tap("#display button[type=submit]");
await sleep(2500);
await collect();

// 7. /heap: arrastre táctil, Run GC, lista
await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
await page.goto(`${BASE}/es/heap?motionTest=1`, { waitUntil: "networkidle" });
await settle();
await tag("/heap: arrastre táctil");
const stage = page.locator("[data-heap-stage]");
if (await stage.count()) {
  const box = await stage.boundingBox();
  if (box) {
    const x = box.x + box.width / 2;
    const y = Math.min(box.y + box.height / 2, 700);
    for (let r = 0; r < 3; r++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
      for (let i = 1; i <= 8; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x - i * 15, y: y - i * 6 }] });
        await sleep(16);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await sleep(500);
    }
  }
}
await collect();
await tag("/heap: Run GC");
const gc = page.locator("button", { hasText: /Run GC|GC/ }).first();
if (await gc.count()) {
  await gc.scrollIntoViewIfNeeded();
  await gc.tap().catch(() => {});
  await sleep(1200);
  const opts = page.locator("[data-heap-gc] button, [data-gc-option]");
  if (await opts.count()) {
    await opts.first().tap().catch(() => {});
    await sleep(1200);
  }
}
await collect();
await tag("/heap: celda con teclado");
await page.evaluate(() => document.querySelector('[role="gridcell"][tabindex="0"]')?.focus());
for (let i = 0; i < 4; i++) {
  await page.keyboard.press("ArrowRight");
  await sleep(150);
}
await collect();

await browser.close();
let fails = 0;
console.log(`INP por interacción (móvil 390×844, DPR 2, táctil, CPU ×${CPU}); límite ${LIMIT} ms`);
for (const [name, r] of Object.entries(results)) {
  const ok = r.max < LIMIT;
  if (!ok) fails++;
  console.log(`${ok ? "OK  " : "FAIL"} ${name.padEnd(30)} máx ${Math.round(r.max)} ms (n=${r.n}) ${JSON.stringify(r.worst)}`);
}
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ cpu: CPU, limit: LIMIT, results }, null, 2));
process.exit(fails ? 1 : 0);
