import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const B = process.env.BASE ?? "http://localhost:3127";
const results = [];
const ok = (name, cond, extra = "") => {
  results.push(cond);
  console.log(`${cond ? "OK  " : "FAIL"} ${name}${extra ? " — " + extra : ""}`);
};

const browser = await chromium.launch({ channel: "chrome", args: ["--autoplay-policy=no-user-gesture-required"] });

async function ready(ctx, path = "/es") {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    try { sessionStorage.setItem("portafolio:gate", "silent"); } catch {}
  });
  await page.goto(B + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  page.errors = errors;
  return page;
}

// ───────── 4.1 popover + persistencia ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ready(ctx);
  const btn = page.locator("[data-sound-settings]");
  ok("botón de ajustes de sonido visible", await btn.isVisible());
  await btn.click();
  const pop = page.locator("#sound-popover");
  ok("popover se abre", await pop.evaluate((e) => e.matches(":popover-open")));
  ok("slider por defecto 35 %", (await page.locator("#sound-volume").inputValue()) === "35");
  ok("aria-valuetext del slider", (await page.locator("#sound-volume").getAttribute("aria-valuetext")) === "35 %");
  const switches = page.locator("#sound-popover [role=switch]");
  ok("2 interruptores (Música y Efectos)", (await switches.count()) === 2);
  await page.locator("#sound-volume").fill("60");
  await switches.nth(0).uncheck();
  await page.waitForTimeout(100);
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("portafolio:prefs") ?? "{}"));
  ok("prefs guardadas (volumen 0,6, música off, efectos on)", prefs.volume === 0.6 && prefs.music === false && prefs.sfx !== false, JSON.stringify(prefs));
  await page.keyboard.press("Escape");
  ok("Escape cierra el popover", !(await pop.evaluate((e) => e.matches(":popover-open"))));
  ok("el foco vuelve al botón", await btn.evaluate((e) => e === document.activeElement));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator("[data-sound-settings]").click();
  ok("persiste tras recargar (60, música off)", (await page.locator("#sound-volume").inputValue()) === "60" && !(await page.locator("#sound-popover [role=switch]").nth(0).isChecked()));
  const axe = await new AxeBuilder({ page }).include("#sound-popover").analyze();
  ok("axe del popover sin violaciones", axe.violations.length === 0, axe.violations.map((v) => v.id).join(","));
  ok("sin errores de página", page.errors.length === 0, page.errors.join("|"));
  await ctx.close();
}

// ───────── 5.1 mixer en terminal (sonido apagado y sin motor) ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ready(ctx);
  await page.locator("[data-terminal-button]").click();
  await page.waitForSelector("dialog[open] input", { timeout: 8000 }).catch(() => {});
  const input = page.locator("dialog[open] input");
  ok("terminal abre", (await input.count()) > 0);
  await input.fill("help");
  await page.keyboard.press("Enter");
  ok("`mixer` figura en help", (await page.locator("dialog[open]").innerText()).includes("mixer"));
  await input.fill("mixer");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const out = await page.locator("dialog[open]").innerText();
  ok("con sonido apagado lo explica", out.includes("desactivado"), out.slice(-120).replace(/\n/g, " "));
  ok("no se abrió el mezclador", (await page.locator("dialog[aria-labelledby=mixer-title][open]").count()) === 0);
  await ctx.close();
}

// ───────── 5.1/5.2 mixer con sonido activo (motor aún no listo → mensaje) ─────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(B + "/es", { waitUntil: "networkidle" });
  await page.locator("[data-boot-gate] button", { hasText: "Iniciar con sonido" }).click();
  await page.waitForTimeout(2500);
  ok("«Iniciar con sonido» deja el botón de sonido activado", (await page.locator("[data-sound-toggle]").getAttribute("aria-pressed")) === "true");
  const gate = await page.evaluate(() => ({ g: sessionStorage.getItem("portafolio:gate"), p: JSON.parse(localStorage.getItem("portafolio:prefs") ?? "{}") }));
  ok("elección registrada en la puerta y en las preferencias", gate.g === "sound" && gate.p.sound === true, JSON.stringify(gate));
  await page.locator("[data-terminal-button]").click();
  await page.waitForSelector("dialog[open] input", { timeout: 8000 });
  const input = page.locator("dialog[open] input");
  await input.fill("mixer");
  await page.keyboard.press("Enter");
  await page.waitForSelector("dialog[aria-labelledby=mixer-title][open]", { timeout: 8000 }).catch(() => {});
  const open = (await page.locator("dialog[aria-labelledby=mixer-title][open]").count()) === 1;
  ok("el mezclador se abre con sonido activo", open);
  if (open) {
    const rows = await page.locator("[data-layer]").count();
    const msg = await page.locator("dialog[aria-labelledby=mixer-title]").innerText();
    ok("sin motor: 0 filas y mensaje de motor inactivo, o 6 filas si el motor ya está", rows === 6 || (rows === 0 && msg.includes("motor de audio")), `filas=${rows}`);
    const ach = await page.evaluate(() => JSON.parse(localStorage.getItem("portafolio:achievements") ?? "[]"));
    ok("logro sound_engineer desbloqueado", ach.includes("sound_engineer"), JSON.stringify(ach));
    if (rows === 6) {
      const first = page.locator("[data-layer=bass] button").first();
      await first.click();
      ok("mute con aria-pressed", (await first.getAttribute("aria-pressed")) === "true");
    }
    const axe = await new AxeBuilder({ page }).include("dialog[aria-labelledby=mixer-title]").analyze();
    ok("axe del mezclador sin violaciones", axe.violations.length === 0, axe.violations.map((v) => v.id).join(","));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    ok("Escape cierra el mezclador", (await page.locator("dialog[aria-labelledby=mixer-title][open]").count()) === 0);
    // segunda apertura: el logro no se vuelve a anunciar
    const count = await page.evaluate(() => JSON.parse(localStorage.getItem("portafolio:achievements") ?? "[]").filter((x) => x === "sound_engineer").length);
    ok("sound_engineer una sola vez", count === 1);
  }
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r).length;
console.log(`\n${results.length - failed}/${results.length} comprobaciones OK`);
process.exit(failed ? 1 : 0);
