import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const B = process.env.BASE ?? "http://localhost:3126";
const MODE = process.argv[2] ?? "sound"; // sound | silent
const THROTTLE = Number(process.env.CPU ?? 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: false, isMobile: false });
const page = await ctx.newPage();
await page.addInitScript(() => {
  window.__events = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (!e.interactionId) continue;
      window.__events.push({ name: e.name, duration: e.duration, target: e.target?.tagName ?? "", cls: (e.target?.closest("button,a,[role]")?.getAttribute("aria-label") ?? e.target?.closest("button,a,[role]")?.id ?? "").slice(0, 40), t: Math.round(e.startTime) });
    }
  }).observe({ type: "event", durationThreshold: 16, buffered: true });
});
await page.goto(B + "/es?motionTest=1", { waitUntil: "networkidle" });
const cdp = await ctx.newCDPSession(page);
await page.waitForSelector("[data-boot-gate] [data-boot-choice='sound']", { timeout: 20000 });
await sleep(800);
if (MODE === "sound") {
  await page.click("[data-boot-gate] [data-boot-choice='sound']");
  await page.waitForFunction(() => window.__portafolioSound?.started() === true, null, { timeout: 20000 });
  await sleep(4000);
} else {
  await page.click("[data-boot-gate] [data-boot-choice='silent']");
  await sleep(4000);
}
await cdp.send("Emulation.setCPUThrottlingRate", { rate: THROTTLE });
await page.evaluate(() => { window.__events.length = 0; });

// 1. ajustes de sonido
await page.click("[data-sound-settings]"); await sleep(500);
const sw = page.locator("#sound-popover [role=switch]").first();
if (await sw.count()) { await sw.click(); await sleep(200); await sw.click(); await sleep(200); }
await page.keyboard.press("Escape"); await sleep(300);
// 2. terminal
await page.keyboard.press("Shift+Backquote"); await sleep(700);
await page.keyboard.type("help", { delay: 40 }); await page.keyboard.press("Enter"); await sleep(400);
await page.keyboard.type("mixer", { delay: 40 }); await page.keyboard.press("Enter"); await sleep(600);
await page.keyboard.press("Escape"); await sleep(300);
await page.keyboard.press("Escape"); await sleep(400);
// 3. tokens del LEXER y habilidades
await page.evaluate(() => document.getElementById("lexer")?.scrollIntoView());
await sleep(900);
const tokens = page.locator("#lexer [data-token], #lexer button, #lexer [tabindex='0']");
const n = Math.min(await tokens.count(), 6);
for (let i = 0; i < n; i++) { await tokens.nth(i).hover().catch(() => {}); await sleep(120); }
await page.evaluate(() => document.getElementById("parser")?.scrollIntoView());
await sleep(900);
const skills = page.locator("#parser [role=treeitem]");
for (let i = 0; i < Math.min(await skills.count(), 3); i++) { await skills.nth(i).click().catch(() => {}); await sleep(250); }
// 4. scroll por todas las fases
for (let i = 0; i < 20; i++) { await page.mouse.wheel(0, 650); await sleep(60); }
await sleep(800);
// 5. Hold sobre una tarjeta
await page.evaluate(() => document.getElementById("runtime")?.scrollIntoView());
await sleep(1200);
const card = await page.evaluate(() => { const c = document.querySelector("[data-hold]"); if (!c) return null; c.scrollIntoView({ block: "center" }); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
if (card) {
  await sleep(500);
  const c2 = await page.evaluate(() => { const r = document.querySelector("[data-hold]").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(c2.x, c2.y); await page.mouse.down(); await sleep(450); await page.mouse.up(); await sleep(600);
}
// 6. campo del contacto
await page.evaluate(() => document.getElementById("display")?.scrollIntoView());
await sleep(1000);
await page.locator("#display input, #display textarea").first().click().catch(() => {});
await page.keyboard.type("hola", { delay: 40 });
await sleep(800);

const events = await page.evaluate(() => window.__events);
const byName = {};
for (const e of events) (byName[e.name] ??= []).push(e.duration);
const worst = [...events].sort((a, b) => b.duration - a.duration).slice(0, 5);
const all = events.map((e) => e.duration).sort((a, b) => a - b);
const p98 = all.length ? all[Math.min(all.length - 1, Math.floor(all.length * 0.98))] : 0;
console.log(`modo=${MODE} cpu×${THROTTLE} · interacciones=${events.length} · INP≈p98=${Math.round(p98)} ms · máx=${Math.round(all.at(-1) ?? 0)} ms`);
console.log("peores:", worst.map((e) => `${e.name}/${e.target}.${e.cls}=${Math.round(e.duration)}ms`).join(" | "));
console.log("por tipo (máx ms):", Object.entries(byName).map(([k, v]) => `${k}:${Math.round(Math.max(...v))}`).join(" "));
const snapshot = MODE === "sound" ? await page.evaluate(() => window.__portafolioSound?.snapshot()) : null;
if (snapshot) console.log(`audio: voces pico=${snapshot.voicePeak} rechazadas=${snapshot.voicesRejected} pico=${snapshot.peak.toFixed(1)} dBFS`);
await browser.close();
