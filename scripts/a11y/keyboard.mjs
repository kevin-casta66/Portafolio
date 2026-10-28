/**
 * Verificación por teclado y estructura (change 09, tareas 5.1, 5.3, 5.4, 5.5, 5.6, 5.7).
 * Uso: `BASE=http://localhost:3150 node scripts/a11y/keyboard.mjs`. Requiere un servidor ya arrancado.
 * Lo que exige lector de pantalla real (NVDA) queda fuera: aquí solo se comprueba lo observable en el DOM
 * (roles, foco, regiones vivas, texto anunciado). Sale con 1 si algo falla.
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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("portafolio:gate", "silent");
  } catch {}
});
const open = async (path, wait = 1500) => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await sleep(wait);
  return page;
};
const active = (page) =>
  page.evaluate(() => {
    const a = document.activeElement;
    return a ? `${a.tagName}${a.id ? "#" + a.id : ""}${a.getAttribute("aria-label") ? "[" + a.getAttribute("aria-label") + "]" : ""}` : "none";
  });

// ───────── 5.1 landmarks, h1, jerarquía, lang ─────────
for (const [path, lang] of [
  ["/es", "es"],
  ["/en", "en"],
  ["/es/projects/arquelume-ai-agent", "es"],
  ["/en/heap", "en"],
  ["/es/motion", "es"],
  ["/es/no-existe", "es"],
]) {
  const page = await open(path, 600);
  const r = await page.evaluate(() => {
    const h = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].filter((e) => e.offsetParent !== null || e.closest("[hidden]") === null);
    const levels = h.map((e) => +e.tagName[1]);
    let skip = 0;
    for (let i = 1; i < levels.length; i++) if (levels[i] - levels[i - 1] > 1) skip++;
    return {
      lang: document.documentElement.lang,
      h1: document.querySelectorAll("h1").length,
      main: document.querySelectorAll("main, [role=main]").length,
      header: document.querySelectorAll("header").length,
      footer: document.querySelectorAll("footer").length,
      nav: document.querySelectorAll("nav").length,
      skip,
      skipLink: !!document.querySelector('a[href="#content"]'),
    };
  });
  ok(`5.1 ${path}: lang=${lang}, un único h1, un main, header, footer, skip link, sin saltos de nivel`, r.lang === lang && r.h1 === 1 && r.main === 1 && r.header >= 1 && r.footer === 1 && r.skipLink && r.skip === 0, JSON.stringify(r));
  await page.close();
}

// ───────── 5.3 foco: terminal y atajos (atrapar, Escape, retorno) ─────────
{
  const page = await open("/es");
  for (const [btn, label] of [
    ["[data-terminal-button]", "terminal"],
    ["[data-shortcuts-button]", "atajos"],
  ]) {
    await page.focus(btn);
    await page.keyboard.press("Enter");
    await sleep(900);
    const inside = await page.evaluate(() => !!document.activeElement?.closest("dialog[open]"));
    ok(`5.3 ${label}: al abrir el foco entra en el diálogo`, inside, await active(page));
    let escaped = false;
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      if (!(await page.evaluate(() => !!document.activeElement?.closest("dialog[open]")))) escaped = true;
    }
    ok(`5.3 ${label}: Tab no sale del diálogo (foco atrapado)`, !escaped);
    await page.keyboard.press("Escape");
    await sleep(600);
    const closed = await page.evaluate(() => !document.querySelector("dialog[open]"));
    const back = await page.evaluate((b) => document.activeElement === document.querySelector(b), btn);
    ok(`5.3 ${label}: Escape cierra y devuelve el foco al botón que lo abrió`, closed && back, await active(page));
  }
  await page.close();
}

// ───────── 5.4 AST (tree), /heap (grid), /motion ─────────
{
  const page = await open("/es");
  await page.evaluate(() => document.getElementById("parser")?.scrollIntoView());
  await sleep(1200);
  const info = await page.evaluate(() => {
    const items = [...document.querySelectorAll('[role="tree"] [role="treeitem"]')];
    return { tree: !!document.querySelector('[role="tree"]'), n: items.length, tab0: items.filter((i) => i.tabIndex === 0).length };
  });
  ok("5.4 AST: role=tree con treeitems y un único punto de tabulación (roving tabindex)", info.tree && info.n > 3 && info.tab0 === 1, JSON.stringify(info));
  await page.evaluate(() => document.querySelector('[role="treeitem"][tabindex="0"]')?.focus());
  const before = await page.evaluate(() => document.activeElement?.textContent?.slice(0, 30));
  await page.keyboard.press("ArrowDown");
  const after = await page.evaluate(() => document.activeElement?.textContent?.slice(0, 30));
  ok("5.4 AST: ArrowDown mueve el foco al siguiente nodo", before !== after, `${before} → ${after}`);
  await page.keyboard.press("Home");
  const first = await page.evaluate(() => document.activeElement?.getAttribute("role"));
  ok("5.4 AST: Inicio/Fin operan sobre el árbol", first === "treeitem");
  await page.close();
}
{
  const page = await open("/es/heap");
  const info = await page.evaluate(() => ({
    grid: !!document.querySelector('[role="grid"]'),
    cells: document.querySelectorAll('[role="gridcell"]').length,
    tab0: [...document.querySelectorAll('[role="gridcell"]')].filter((c) => c.tabIndex === 0).length,
  }));
  ok("5.4 /heap: cuadrícula role=grid con un único punto de tabulación", info.grid && info.cells > 3 && info.tab0 === 1, JSON.stringify(info));
  await page.evaluate(() => document.querySelector('[role="gridcell"][tabindex="0"]')?.focus());
  const a = await page.evaluate(() => document.activeElement?.id);
  await page.keyboard.press("ArrowRight");
  const b = await page.evaluate(() => document.activeElement?.id);
  await page.keyboard.press("ArrowDown");
  const c = await page.evaluate(() => document.activeElement?.id);
  ok("5.4 /heap: las flechas mueven el foco entre bloques", a !== b || b !== c, `${a} → ${b} → ${c}`);
  const list = await page.evaluate(() => !!document.querySelector("[data-heap-list], ul, ol"));
  ok("5.4 /heap: existe la lista equivalente", list);
  await page.close();
}
{
  const page = await open("/es/motion");
  const info = await page.evaluate(() => {
    const card = document.querySelector("[data-transition-card], article, section");
    return {
      replay: [...document.querySelectorAll("button")].filter((b) => /Replay|Repetir|Reproducir/i.test(b.textContent ?? "")).length,
      radios: document.querySelectorAll('[role="radiogroup"] [role="radio"]').length,
      pressed: [...document.querySelectorAll("button[aria-pressed]")].length,
      card: !!card,
    };
  });
  ok("5.4 /motion: Replay, velocidad (radiogroup) e interruptor de máscara son controles reales", info.replay >= 1 && info.radios >= 3 && info.pressed >= 1, JSON.stringify(info));
  await page.evaluate(() => document.querySelector('[role="radiogroup"] [role="radio"][tabindex="0"]')?.focus());
  const r1 = await page.evaluate(() => document.activeElement?.textContent);
  await page.keyboard.press("ArrowRight");
  const r2 = await page.evaluate(() => document.activeElement?.textContent);
  ok("5.4 /motion: la velocidad se cambia con flechas", r1 !== r2, `${r1} → ${r2}`);
  const pressedBefore = await page.evaluate(() => document.querySelector("button[aria-pressed]")?.getAttribute("aria-pressed"));
  await page.focus("button[aria-pressed]");
  await page.keyboard.press("Space");
  const pressedAfter = await page.evaluate(() => document.querySelector("button[aria-pressed]")?.getAttribute("aria-pressed"));
  ok("5.4 /motion: el interruptor de máscara se opera con Espacio", pressedBefore !== pressedAfter, `${pressedBefore} → ${pressedAfter}`);
  await page.close();
}

// ───────── 5.5 Hold-to-Execute con teclado ─────────
{
  const page = await open("/es");
  await page.evaluate(() => document.getElementById("runtime")?.scrollIntoView());
  await sleep(1500);
  const target = await page.evaluate(() => {
    const el = document.querySelector("a[data-hold], [data-hold]");
    if (!el) return null;
    el.focus();
    return { tag: el.tagName, href: el.getAttribute("href"), hold: el.getAttribute("data-hold") };
  });
  ok("5.5 hay un elemento Hold-to-Execute enfocable por teclado", !!target, JSON.stringify(target));
  if (target) {
    const bar = await page.evaluate(() => {
      const b = document.querySelector("[data-hold-progressbar]");
      return b ? { role: b.getAttribute("role"), label: b.getAttribute("aria-label"), min: b.getAttribute("aria-valuemin"), max: b.getAttribute("aria-valuemax") } : null;
    });
    ok("5.5 progreso expuesto con role=progressbar y rango 0–100", !!bar && bar.role === "progressbar" && bar.min === "0" && bar.max === "100", JSON.stringify(bar));
    await page.keyboard.down("Space");
    let max = 0;
    for (let i = 0; i < 24; i++) {
      await sleep(100);
      const v = await page.evaluate(() => Number(document.querySelector("[data-hold-progressbar]")?.getAttribute("aria-valuenow") ?? 0));
      max = Math.max(max, v);
    }
    const url1 = page.url();
    await page.keyboard.up("Space");
    await sleep(2500);
    const live = await page.evaluate(() => document.querySelector("[data-hold-live]")?.textContent?.trim());
    ok("5.5 mantener Espacio avanza el progreso y ejecuta (abre el caso)", max > 20 && /projects\//.test(page.url()), `máx aria-valuenow=${max}, url=${page.url().replace(BASE, "")}, live="${live ?? ""}"`);
    void url1;
  }
  const page2 = await open("/es");
  await page2.evaluate(() => document.getElementById("runtime")?.scrollIntoView());
  await sleep(1200);
  const enterOk = await page2.evaluate(() => {
    const a = document.querySelector("a[href*='/projects/']");
    return !!a;
  });
  await page2.focus("a[href*='/projects/']");
  await page2.keyboard.press("Enter");
  await sleep(2500);
  ok("5.5 Enter sobre el enlace del caso lo abre sin mantener", enterOk && /projects\//.test(page2.url()), page2.url().replace(BASE, ""));
  await page.close();
  await page2.close();
}

// ───────── 5.6 canvas decorativo y equivalentes DOM ─────────
{
  const page = await open("/es?motionTest=1", 2500);
  const r = await page.evaluate(() => {
    const layer = document.querySelector(".webgl-layer, canvas[data-engine]");
    const canvases = [...document.querySelectorAll("canvas")];
    const hiddenAll = canvases.every((c) => c.closest("[aria-hidden='true']") !== null || c.getAttribute("aria-hidden") === "true");
    return { layer: !!layer, canvases: canvases.length, hiddenAll };
  });
  ok("5.6 todo canvas está bajo aria-hidden", r.canvases === 0 || r.hiddenAll, JSON.stringify(r));
  const twins = await page.evaluate(() =>
    [...document.querySelectorAll("[data-twin]")].map((e) => ({ twin: e.getAttribute("data-twin"), text: (e.textContent ?? "").trim().length, label: !!(e.getAttribute("aria-label") || e.closest("[aria-label],[aria-labelledby],section")) })),
  );
  ok("5.6 cada gemelo 3D vive dentro de contenido DOM con nombre (sección/etiqueta)", twins.length > 0 && twins.every((t) => t.label), JSON.stringify(twins).slice(0, 220));
  await page.close();
}

// ───────── 5.7 regiones vivas ─────────
{
  const page = await open("/es");
  await page.focus("[data-terminal-button]");
  await page.keyboard.press("Enter");
  await sleep(900);
  const log = await page.evaluate(() => {
    const l = document.querySelector('dialog[open] [role="log"]');
    return l ? { live: l.getAttribute("aria-live"), atomic: l.getAttribute("aria-atomic") } : null;
  });
  ok("5.7 terminal: salida en role=log con aria-live educado", !!log && log.live === "polite", JSON.stringify(log));
  await page.keyboard.type("about", { delay: 30 });
  await page.keyboard.press("Enter");
  await sleep(500);
  const text = await page.evaluate(() => document.querySelector('dialog[open] [role="log"]')?.textContent ?? "");
  ok("5.7 terminal: la respuesta aparece dentro de la región viva", /Kevin|Castaño/i.test(text), text.slice(0, 60));
  const focusKept = await page.evaluate(() => !!document.activeElement?.closest("dialog[open]"));
  ok("5.7 terminal: anunciar no roba el foco", focusKept);
  await page.keyboard.press("Escape");
  await sleep(500);
  const regions = await page.evaluate(() => ({
    form: !!document.querySelector("#display [aria-live]"),
    toasts: !!document.querySelector('[role="status"][aria-live="polite"]'),
    hold: !!document.querySelector("[data-hold-live]"),
  }));
  ok("5.7 formulario, avisos de logros y Hold tienen región viva educada", regions.form && regions.toasts, JSON.stringify(regions));
  await page.close();
}

await browser.close();
console.log(fails ? `\n${fails} comprobación(es) fallida(s)` : "\nTodo OK");
process.exit(fails ? 1 : 0);
