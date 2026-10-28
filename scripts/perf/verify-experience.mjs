/**
 * Verificación de modo de experiencia, carga diferida, scroll nativo y DPR (change 09: 1.2, 1.3, 4.2, 4.5, 4.9).
 * Uso: `BASE=http://localhost:3150 node scripts/perf/verify-experience.mjs`. Requiere `next start` ya arrancado.
 */
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const BASE = (process.env.BASE ?? "http://localhost:3150").replace(/\/+$/, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (name, cond, extra = "") => {
  if (!cond) fails++;
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};
const browser = await chromium.launch({ channel: "chrome" });
const attr = (page) => page.evaluate(() => document.documentElement.getAttribute("data-experience"));

// ───────── 1.2 data-experience antes del primer pintado, sin animación con reduced emulado ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await ctx.addInitScript(() => {
    window.__exp = { set: null, first: null, anims: -1 };
    try {
      sessionStorage.setItem("portafolio:gate", "silent");
    } catch {}
    new MutationObserver(() => {
      if (window.__exp.set === null && document.documentElement.getAttribute("data-experience")) {
        window.__exp.set = performance.now();
        window.__exp.value = document.documentElement.getAttribute("data-experience");
      }
    }).observe(document, { attributes: true, subtree: true, attributeFilter: ["data-experience"] });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (e.name === "first-paint" && window.__exp.first === null) window.__exp.first = e.startTime;
    }).observe({ type: "paint", buffered: true });
  });
  const page = await ctx.newPage();
  const html = await (await fetch(`${BASE}/es`)).text();
  const head = html.slice(0, html.indexOf("</head>"));
  ok("1.2 el script inline de data-experience está en <head>", head.includes('setAttribute("data-experience"'));
  await page.goto(`${BASE}/es`, { waitUntil: "load" });
  await sleep(400);
  const r = await page.evaluate(() => ({ ...window.__exp, first: window.__exp.first ?? performance.getEntriesByName("first-paint")[0]?.startTime ?? null }));
  ok("1.2 data-experience=reduced se fija antes del primer pintado", r.value === "reduced" && r.first !== null && r.set <= r.first, JSON.stringify(r));
  await sleep(800);
  // Sin flash de animación: ninguna animación/transición CSS de transform en marcha con reduced emulado.
  const moving = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => {
        const k = (a.effect?.getKeyframes?.() ?? []).some((f) => "transform" in f || "translate" in f || "scale" in f || "rotate" in f);
        return k && a.playState === "running";
      })
      .map((a) => a.effect?.target?.className?.toString().slice(0, 40)),
  );
  ok("1.2 reduced emulado: no hay animaciones de transform en marcha tras cargar", moving.length === 0, JSON.stringify(moving.slice(0, 4)));
  await ctx.close();
}

// ───────── 1.3 control manual: header + terminal + persistencia al navegar ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      if (!sessionStorage.getItem("__s")) sessionStorage.setItem("portafolio:gate", "silent");
      sessionStorage.setItem("__s", "1");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/es`, { waitUntil: "networkidle" });
  await sleep(1500);
  ok("1.3 sin preferencia el modo es full", (await attr(page)) === "full");
  await page.click("[data-reduced-motion-toggle]");
  await sleep(300);
  ok("1.3 el botón del header activa reduced sin recargar", (await attr(page)) === "reduced" && (await page.getAttribute("[data-reduced-motion-toggle]", "aria-pressed")) === "true");
  ok("1.3 la elección se guarda en sessionStorage", (await page.evaluate(() => sessionStorage.getItem("portafolio:motion"))) === "reduced");
  // Navegación del lado cliente: caso, /heap, /motion
  for (const [sel, expected] of [
    ["a[href*='/projects/']", /projects\//],
    ["[data-layout-option='heap']", /heap/],
    ["a[href$='/motion'], a[href*='/motion']", /motion/],
  ]) {
    await page.goto(`${BASE}/es`, { waitUntil: "networkidle" });
    await sleep(800);
    const href = (await page.locator(sel).first().getAttribute("href").catch(() => null)) ?? sel;
    await page.evaluate((q) => {
      document.querySelector(q)?.scrollIntoView();
      document.querySelector(q)?.click();
    }, sel);
    await sleep(2500);
    ok(`1.3 el modo reducido se mantiene al navegar a ${href}`, expected.test(page.url()) && (await attr(page)) === "reduced", `${page.url().replace(BASE, "")} → ${await attr(page)}`);
  }
  // Comando de terminal
  await page.goto(`${BASE}/es`, { waitUntil: "networkidle" });
  await sleep(1000);
  await page.focus("[data-terminal-button]");
  await page.keyboard.press("Enter");
  await sleep(700);
  await page.keyboard.type("reduced", { delay: 20 });
  await page.keyboard.press("Enter");
  await sleep(500);
  const out = await page.evaluate(() => document.querySelector('dialog[open] [role="log"]')?.textContent ?? "");
  ok("1.3 el comando `reduced` de la terminal alterna el modo (reduced → full)", (await attr(page)) === "full" && /movimiento: completo/i.test(out), `${await attr(page)} · ${out.slice(-40)}`);
  await page.keyboard.type("reduced", { delay: 20 });
  await page.keyboard.press("Enter");
  await sleep(400);
  ok("1.3 y vuelve a reduced con el mismo comando", (await attr(page)) === "reduced");
  await ctx.close();
}

// ───────── 4.2 GSAP, Lenis y 3D empiezan después del LCP ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("portafolio:gate", "silent");
    } catch {}
    window.__lcp = 0;
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__lcp = Math.max(window.__lcp, e.startTime);
    }).observe({ type: "largest-contentful-paint", buffered: true });
  });
  const page = await ctx.newPage();
  const reqs = [];
  page.on("requestfinished", () => {});
  await page.goto(`${BASE}/es`, { waitUntil: "networkidle" });
  await sleep(1500);
  const timing = await page.evaluate(() => ({
    lcp: window.__lcp,
    res: performance.getEntriesByType("resource").filter((r) => /\/_next\/static\/chunks\/.*\.js/.test(r.name)).map((r) => ({ name: r.name, start: r.startTime })),
  }));
  const MARK = { three: /WebGPURenderer|__THREE__|MeshBasicNodeMaterial/, gsap: /gsap\.registerPlugin|GreenSock/, lenis: /smoothWheel/ };
  const late = [];
  const early = [];
  for (const r of timing.res) {
    const src = await (await fetch(r.name)).text();
    const libs = Object.entries(MARK).filter(([, re]) => re.test(src)).map(([k]) => k);
    if (libs.length) (r.start >= timing.lcp ? late : early).push(`${libs.join("+")}@${Math.round(r.start)}ms`);
  }
  ok("4.2 ninguna petición de GSAP/Lenis/three empieza antes del LCP", early.length === 0 && late.length > 0, `LCP=${Math.round(timing.lcp)}ms · después: ${late.join(", ")} · antes: ${early.join(", ") || "ninguna"}`);
  await ctx.close();
}

// ───────── 4.5 scroll nativo: teclado, retroceso y sin bloqueo ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("portafolio:gate", "silent");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/es?motionTest=1`, { waitUntil: "networkidle" });
  await sleep(4000);
  const y = () => page.evaluate(() => Math.round(scrollY));
  await page.evaluate(() => document.getElementById("bytecode").scrollIntoView());
  await sleep(1200);
  const a = await y();
  await page.keyboard.press("PageDown");
  await sleep(1500);
  const b = await y();
  await page.keyboard.press("PageUp");
  await sleep(1500);
  const c = await y();
  ok("4.5 PageDown avanza y PageUp retrocede durante secciones fijadas", b > a + 300 && c < b - 300, `${a} → ${b} → ${c}`);
  await page.keyboard.press("End");
  await sleep(2500);
  const end = await page.evaluate(() => ({ y: Math.round(scrollY), max: document.documentElement.scrollHeight - innerHeight }));
  ok("4.5 Fin llega al final de la página", Math.abs(end.y - end.max) < 50, JSON.stringify(end));
  await page.keyboard.press("Home");
  await sleep(2500);
  ok("4.5 Inicio vuelve al principio", (await y()) < 50, String(await y()));
  // Rueda hacia arriba en mitad de una transición
  await page.mouse.move(640, 400);
  await page.mouse.wheel(0, 3500);
  await sleep(1200);
  const d = await y();
  await page.mouse.wheel(0, -1500);
  await sleep(1200);
  const e = await y();
  ok("4.5 la rueda hacia arriba retrocede (sin retención)", e < d - 800, `${d} → ${e}`);
  // Call Stack durante pins
  await page.evaluate(() => document.getElementById("lexer").scrollIntoView());
  await sleep(1000);
  const frame = page.locator("a.callstack-frame, [data-callstack] a").first();
  let navigated = false;
  if (await frame.count()) {
    const t0 = await y();
    await page.evaluate(() => {
      const f = [...document.querySelectorAll("a.callstack-frame, [data-callstack] a")].find((a) => a.getAttribute("href")?.includes("#runtime")) ?? document.querySelector("a.callstack-frame");
      f?.click();
    });
    await sleep(2500);
    navigated = Math.abs((await y()) - t0) > 300;
  }
  ok("4.5 el Call Stack salta de fase durante pins", navigated);
  await ctx.close();
  // Móvil: scroll nativo, sin Lenis
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await mctx.addInitScript(() => {
    try {
      sessionStorage.setItem("portafolio:gate", "silent");
    } catch {}
  });
  const mp = await mctx.newPage();
  await mp.goto(`${BASE}/es?motionTest=1`, { waitUntil: "networkidle" });
  await sleep(3500);
  const lenisOn = await mp.evaluate(() => document.documentElement.classList.contains("lenis") || !!document.querySelector("html.lenis, html.lenis-smooth"));
  ok("4.5 en móvil (táctil) no hay Lenis: scroll nativo", lenisOn === false);
  const touchScroll = await mp.evaluate(async () => {
    window.scrollBy(0, 1500);
    await new Promise((r) => setTimeout(r, 400));
    const down = scrollY;
    window.scrollBy(0, -800);
    await new Promise((r) => setTimeout(r, 400));
    return { down: Math.round(down), up: Math.round(scrollY) };
  });
  ok("4.5 móvil: desplazar y retroceder funciona", touchScroll.down > 1000 && touchScroll.up < touchScroll.down - 500, JSON.stringify(touchScroll));
  await mctx.close();
}

// ───────── 4.9 DPR ≤ 2 con dispositivo de DPR 3 ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 3 });
  await ctx.addInitScript(() => {
    try {
      sessionStorage.setItem("portafolio:gate", "silent");
    } catch {}
  });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/es?motionTest=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__portafolioWebgl?.info, null, { timeout: 60000 });
  await sleep(2500);
  const r = await page.evaluate(() => ({ dpr: window.devicePixelRatio, pr: window.__portafolioWebgl.info().pixelRatio }));
  ok("4.9 con devicePixelRatio=3 renderer.getPixelRatio() ≤ 2", r.dpr === 3 && r.pr <= 2 && r.pr >= 1, JSON.stringify(r));
  await ctx.close();
}

await browser.close();
console.log(fails ? `\n${fails} comprobación(es) fallida(s)` : "\nTodo OK");
process.exit(fails ? 1 : 0);
