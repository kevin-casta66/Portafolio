/**
 * Recorrido REAL del sonido (change 08c): Chrome SIN `--autoplay-policy`, interacciones reales (hover, scroll,
 * clic, teclado), recarga sin clic, niveles por efecto y fase, ducking, voces y consola sin avisos de polifonía.
 *
 *   BASE=http://localhost:3126 node scripts/audio/verify-sound-real.mjs
 *   BROWSER_CHANNEL=chrome|msedge (por defecto chrome) · BRAVE_PATH=<ruta a brave.exe> para usar Brave
 *   LEVELS_ONLY=1 solo imprime la tabla de niveles (calibración) · LEVELS_JSON=<archivo> guarda las medidas
 *   ONLY_PHASES=source,lexer limita la tabla de niveles a esas fases (con LEVELS_ONLY también se omiten los recorridos 0–2)
 *
 * Nivel de un efecto = pico del bus de efectos (dBFS) menos el RMS de la música de ese momento (dB), medidos
 * con el gancho `window.__portafolioSound` (solo existe con ?motionTest).
 */
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../../package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const B = process.env.BASE ?? "http://localhost:3126";
const results = [];
const check = (name, ok, extra = "") => {
  results.push(ok);
  console.log(`${ok ? "OK  " : "FAIL"} ${name}${extra ? "  → " + extra : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const f1 = (n) => (Number.isFinite(n) ? n.toFixed(1) : String(n));

// SIN --autoplay-policy: el navegador aplica su política real.
const launchOptions = process.env.BRAVE_PATH
  ? { executablePath: process.env.BRAVE_PATH, args: [] }
  : { channel: process.env.BROWSER_CHANNEL ?? "chrome", args: [] };
const browser = await chromium.launch(launchOptions);

/** Avisos de consola de TODO el recorrido (polifonía y callbacks de Tone) y errores. */
const consoleIssues = [];
const pageErrors = [];

async function openPage({ prefs, session, url = "/es?motionTest=1", viewport = { width: 1280, height: 800 } } = {}) {
  const ctx = await browser.newContext({ viewport });
  // Sonda de la política de autoplay: un AudioContext creado al cargar, SIN gesto (page.evaluate cuenta como gesto).
  await ctx.addInitScript(() => { try { window.__initAudioState = new AudioContext().state; } catch { window.__initAudioState = "error"; } });
  // Las semillas solo se aplican en la primera carga: una recarga conserva lo que escribió la propia página.
  if (prefs) await ctx.addInitScript((p) => { if (!sessionStorage.getItem("__seeded")) { localStorage.setItem("portafolio:prefs", JSON.stringify(p)); sessionStorage.setItem("__seeded", "1"); } }, prefs);
  if (session) await ctx.addInitScript((s) => { if (!sessionStorage.getItem("__seededS")) { for (const [k, v] of Object.entries(s)) sessionStorage.setItem(k, v); sessionStorage.setItem("__seededS", "1"); } }, session);
  const page = await ctx.newPage();
  page.on("console", (m) => {
    const text = m.text();
    if (/polyphony|scheduled callbacks|Note dropped/i.test(text)) consoleIssues.push(`${m.type()}: ${text.slice(0, 160)}`);
    if (m.type() === "error") pageErrors.push(text.slice(0, 200));
  });
  page.on("pageerror", (e) => pageErrors.push(String(e).slice(0, 200)));
  await page.goto(B + url, { waitUntil: "networkidle" });
  return { ctx, page };
}

const hook = (page, expr) => page.evaluate(`(() => { const h = window.__portafolioSound; return h ? (${expr}) : "NO-HOOK"; })()`);
const snap = (page) => hook(page, "h.snapshot()");
const started = (page) => hook(page, "h.started()");

/** Elige «Iniciar con sonido» con un clic real en la puerta y espera al motor. */
async function chooseSound(page) {
  await page.waitForSelector("[data-boot-gate] [data-boot-choice='sound']", { timeout: 20000 });
  await sleep(700);
  await page.click("[data-boot-gate] [data-boot-choice='sound']");
  await page.waitForFunction(() => window.__portafolioSound?.started() === true, null, { timeout: 20000 }).catch(() => {});
}

async function gotoPhase(page, phase) {
  const event = phase === "case" ? "case:enter" : phase === "notfound" ? "notfound:enter" : `phase:${phase}`;
  await page.evaluate((e) => window.__portafolioSound.emit(e), event);
  await page.waitForFunction((c) => window.__portafolioSound.snapshot()?.context === c, phase, { timeout: 15000 }).catch(() => {});
  await sleep(2600); // fundidos de capa (1,6 s) y asentamiento del nivel de la música
}

const flows = !process.env.LEVELS_ONLY;
const onlyPhases = process.env.ONLY_PHASES ? process.env.ONLY_PHASES.split(",") : null;

// ───────── 0. El navegador NO tiene permiso de autoplay ─────────
if (flows) {
  const { ctx, page } = await openPage({ url: "/es" });
  const state = await page.evaluate(() => window.__initAudioState);
  check("0. sin flag de autoplay: un AudioContext sin gesto nace «suspended»", state === "suspended", state);
  await ctx.close();
}

// ───────── 1. Primera visita con la puerta y recarga SIN clic (hallazgo 1) ─────────
if (flows) {
  const { ctx, page } = await openPage();
  await chooseSound(page);
  check("1. primera visita: el clic real en «Iniciar con sonido» arranca el motor", (await started(page)) === true);
  await sleep(2500);
  // Recarga: misma sesión (la puerta ya no aparece) y sin ningún clic.
  await page.reload({ waitUntil: "networkidle" });
  await sleep(1500);
  const gateVisible = await page.evaluate(() => document.querySelector("[data-boot-gate]") !== null);
  await page.mouse.move(300, 300);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 500); await sleep(120); }
  const tokens = page.locator("[data-anim='token']");
  if ((await tokens.count()) > 0) {
    await tokens.first().scrollIntoViewIfNeeded();
    await tokens.first().hover();
  }
  await sleep(1500);
  const st = await started(page);
  const hovered = await page.evaluate(() => window.__portafolioAudioLog.filter((e) => e.event === "hover:token").length);
  check("1. recarga sin clic: scroll y hover NO arrancan el motor (la rueda y el hover no son activación)", st === false, `started=${st}, hover:token emitidos=${hovered}, puerta visible=${gateVisible}`);
  const info = await page.evaluate(() => {
    const b = document.querySelector("[data-sound-unlock]");
    const r = b?.getBoundingClientRect();
    return { present: !!b, status: !!b?.closest("[role='status']"), focused: document.activeElement === b, w: Math.round(r?.width ?? 0), h: Math.round(r?.height ?? 0), text: b?.textContent ?? "" };
  });
  check("1. se muestra el aviso «Activar sonido»: pequeño, dentro de role=status y sin robar el foco", info.present && info.status && !info.focused && info.text === "Activar sonido" && info.w < 200 && info.h < 48, JSON.stringify(info));
  await page.locator("[data-sound-unlock]").click();
  await page.waitForFunction(() => window.__portafolioSound?.started() === true, null, { timeout: 20000 }).catch(() => {});
  await sleep(600);
  const st2 = await started(page);
  const gone = await page.evaluate(() => document.querySelector("[data-sound-unlock]") === null);
  check("1. al activar el aviso el motor arranca y el aviso desaparece", st2 === true && gone, `started=${st2}, aviso retirado=${gone}`);
  // Los siguientes hovers suenan (hover real sobre tokens).
  await sleep(4200); // entra la mezcla
  await page.evaluate(() => window.__portafolioSound.clearSfxLog());
  const count = await tokens.count();
  for (let i = 0; i < Math.min(4, count); i++) {
    await tokens.nth(i).scrollIntoViewIfNeeded();
    await tokens.nth(i).hover();
    await sleep(420);
  }
  await sleep(800);
  const log = (await hook(page, "h.sfxLog()")).filter((e) => e.event === "hover:token");
  const played = log.filter((e) => e.status === "played").length;
  check("1. tras activar, los hovers reales sobre tokens suenan", played >= 3, `reproducidos=${played}/${Math.min(4, count)} ${JSON.stringify(log.map((e) => e.status + (e.reason ? ":" + e.reason : "")))}`);
  await ctx.close();
}

// ───────── 1b. Recarga y primera TECLA: arranca sin pasar por el aviso ─────────
if (flows) {
  const { ctx, page } = await openPage({ prefs: { sound: true }, session: { "portafolio:gate": "sound", "portafolio:booted": "1" } });
  await sleep(1500);
  await page.mouse.move(400, 300);
  await page.mouse.wheel(0, 400);
  await sleep(600);
  const before = await started(page);
  await page.keyboard.press("Tab");
  await page.waitForFunction(() => window.__portafolioSound?.started() === true, null, { timeout: 20000 }).catch(() => {});
  const after = await started(page);
  check("1b. la primera tecla (activación válida) arranca el motor", before === false && after === true, `antes=${before}, después=${after}`);
  await ctx.close();
}

// ───────── 2. El nombre del hero suena como arpegio (hallazgo 4) ─────────
if (flows) {
  const { ctx, page } = await openPage();
  await page.evaluate(() => { window.__portafolioAudioLog.length = 0; });
  await chooseSound(page);
  await page.evaluate(() => window.__portafolioSound.clearSfxLog());
  // espera a que termine el tecleo: sin nuevos hero:key durante ~2,4 s
  let last = -1, quiet = 0;
  for (let i = 0; i < 80 && quiet < 6; i++) {
    await sleep(400);
    const n = await page.evaluate(() => window.__portafolioAudioLog.filter((e) => e.event === "hero:key").length);
    quiet = n > 0 && n === last ? quiet + 1 : 0;
    last = n;
  }
  const emitted = await page.evaluate(() => window.__portafolioAudioLog.filter((e) => e.event === "hero:key").map((e) => e.payload));
  const log = await hook(page, "h.sfxLog()");
  const notes = log.filter((e) => e.event === "hero:key");
  const pitched = emitted.filter((p) => p.pitched !== false).length;
  const playedNotes = notes.filter((e) => e.status === "played").length;
  check("2. el nombre emite una letra de cada 3 con altura (el resto solo clic)", emitted.length >= 12 && Math.abs(pitched - Math.ceil(emitted.length / 3)) <= 2, `letras=${emitted.length}, con nota=${pitched}`);
  check("2. suena al menos una nota por cada 3 letras y ninguna se descarta", emitted.length >= 12 && playedNotes >= Math.floor(emitted.length / 3) - 1 && !notes.some((e) => e.status === "dropped"), `reproducidas=${playedNotes}, descartadas=${JSON.stringify(notes.filter((e) => e.status === "dropped").map((e) => e.reason))}`);
  const clicks = log.filter((e) => e.event === "hero:click" && e.status === "played").length;
  check("2. los clics mecánicos de tecla siguen por letra", clicks >= Math.floor(emitted.length * 0.6), `clics=${clicks}/${emitted.length}`);
  await ctx.close();
}

// ───────── Sesión de medida: motor arrancado con un clic real en la puerta ─────────
const { ctx: lctx, page: lp } = await openPage();
await chooseSound(lp);
await sleep(7500);

// ───────── 3. Niveles por efecto y fase (hallazgo 2) ─────────
const TICKISH = new Set(["counter:tick", "terminal:key", "hero:click"]);
const GENERIC = [["ui:toggle"], ["ui:enter"], ["ui:open"], ["mixer:open"], ["terminal:unknown"], ["terminal:key"], ["achievement", { id: "root_access" }], ["boot:line", { index: 2 }]];
const PLAN = {
  source: [["hero:key", { index: 0, pitched: true }], ["hero:key", { index: 1, pitched: false }, "hero:click"], ["boot:done", undefined, undefined, 3400], ...GENERIC],
  lexer: [["hover:token", { kind: "keyword" }], ["hover:token", { kind: "identifier" }], ["hover:token", { kind: "string" }], ["hover:token", { kind: "number" }], ["counter:tick"], ["counter:done"], ["ui:enter"], ["terminal:key"], ["ui:open"]],
  parser: [["hover:skill", { category: "ai" }], ["hover:skill", { category: "backend" }], ["select:skill", { category: "backend" }], ["ui:enter"], ["terminal:key"], ["mixer:open"]],
  bytecode: [["bytecode:instruction"], ["bytecode:function"], ["ui:open"], ["terminal:key"], ["terminal:unknown"]],
  runtime: [["runtime:core-hover", { x: 0.1 }], ["runtime:core-hover", { x: 0.9 }], ["hold:start", undefined, undefined, 1000], ["hold:complete"], ["bytecode:instruction"], ["hover:token", { kind: "keyword" }], ["select:skill", { category: "ai" }], ["ui:open"], ["terminal:key"], ["terminal:unknown"], ["achievement", { id: "root_access" }], ["mixer:open"], ["ui:enter"]],
  gpu: [["ui:enter"], ["ui:open"], ["terminal:key"], ["hover:token", { kind: "string" }]],
  display: [["contact:focus"], ["contact:send", undefined, undefined, 1800], ["contact:ok", undefined, undefined, 2200], ["contact:error"], ["ui:enter"], ["terminal:key"]],
  case: [["case:breakpoint"], ["ui:open"], ["terminal:key"]],
  notfound: [["notfound:restart"]],
};
const REPEATS = { "counter:tick": 5, "terminal:key": 5, "hero:click": 5, "case:breakpoint": 5, "notfound:restart": 5, "bytecode:function": 3, "mixer:open": 5, "select:skill": 5, "hold:complete": 3, "bytecode:instruction": 2 };
const rows = [];
const delays = [];
const retries = [];
/** Nivel de la música de la fase: mediana de 30 lecturas del medidor del bus de música a lo largo de ~3 s. */
async function readMusic(page, n = 30, gap = 100) {
  const xs = [];
  for (let i = 0; i < n; i++) { xs.push((await hook(page, "h.levels(true)")).musicDb); await sleep(gap); }
  return median(xs);
}
for (const [phase, items] of Object.entries(PLAN)) {
  if (onlyPhases && !onlyPhases.includes(phase)) continue;
  if (phase === "notfound") {
    await lp.evaluate(() => window.__portafolioSound.emit("case:leave"));
    await sleep(3200);
  }
  await gotoPhase(lp, phase);
  const phaseMusic = await readMusic(lp);
  for (const [event, payload, tagOverride, waitMs] of items) {
    const tag = tagOverride ?? event;
    const base = phaseMusic;
    // Los sonidos de ruido (ticks, teclas, platillo) y los acordes tienen un pico distinto en cada disparo
    // (fases aleatorias): se disparan varias veces y se toma la mediana.
    const reps = REPEATS[tag] ?? 1;
    const peaks = [];
    const statuses = [];
    for (let r = 0; r < reps; r++) {
      let attempt = 0;
      retry: while (true) {
      await hook(lp, "h.levels(true)");
      await lp.evaluate(() => window.__portafolioSound.clearSfxLog());
      await lp.evaluate(([e, p]) => window.__portafolioSound.emit(e, p), [event, payload]);
      await sleep(reps > 1 && TICKISH.has(tag) ? 450 : (waitMs ?? 1500));
      const lv = await hook(lp, "h.levels(true)");
      const lg = await hook(lp, "h.sfxLog()");
      if (event === "hold:start") {
        await lp.evaluate(() => window.__portafolioSound.emit("hold:cancel"));
        await sleep(700);
      }
      const mine = lg.filter((e) => e.event === tag);
      // Intermitencia observada (pico ≈ silencio con el efecto «reproducido»): se anota y se repite UNA vez.
      if (lv.sfxPeakDb < base - 12 && mine.some((e) => e.status === "played") && attempt++ === 0) {
        const dbg = await snap(lp);
        console.log(`   (reintento) ${phase}/${tag}: pico ${f1(lv.sfxPeakDb)} dBFS con el efecto reproducido; trim efectos=${f1(dbg.sfxTrimDb)} dB, voces=${dbg.voices}`);
        retries.push(`${phase}/${tag}`);
        continue retry;
      }
      peaks.push(lv.sfxPeakDb);
      for (const e of mine) if (typeof e.delayMs === "number") delays.push({ tag, delayMs: e.delayMs });
      statuses.push(mine.length ? mine.map((e) => (e.status === "played" ? "ok" : e.reason)).join("/") : "—");
      break;
      }
    }
    const sfxPeakDb = median(peaks);
    const status = statuses.every((x) => x === "ok") ? "ok" : [...new Set(statuses)].join("/");
    const over = sfxPeakDb - base;
    rows.push({ phase, event: tag, sfxPeakDb, musicDb: base, over, status, reps, spread: [Math.min(...peaks) - base, Math.max(...peaks) - base] });

    const lo = TICKISH.has(tag) ? -3 : 0;
    const ok = status === "ok" && over >= lo && over <= 6;
    const detail = `pico ${f1(sfxPeakDb)} dBFS, música ${f1(base)} dB → ${over >= 0 ? "+" : ""}${f1(over)} dB${reps > 1 ? ` (mediana de ${reps}, rango ${f1(Math.min(...peaks) - base)}…${f1(Math.max(...peaks) - base)})` : ""} [${status}]`;
    if (process.env.LEVELS_ONLY) console.log(`${phase.padEnd(9)} ${tag.padEnd(22)} ${detail}`);
    else check(`3. ${phase}: ${tag} entre ${lo} y +6 dB sobre la música`, ok, detail);
  }
}
if (!process.env.LEVELS_ONLY) {
  // Latencia: los efectos de 16n empiezan como mucho 1 semicorchea (≈ 179 ms) después del evento.
  const q16 = delays.filter((d) => ["hover:token", "hover:skill", "ui:enter", "ui:open", "runtime:core-hover", "bytecode:instruction", "contact:focus"].includes(d.tag));
  const worst = Math.max(...q16.map((d) => d.delayMs));
  check("3. los efectos cuantizados a 16n empiezan como mucho 1 semicorchea (≈ 179 ms) tras el evento", q16.length >= 20 && worst <= 230, `peor retraso ${worst} ms en ${q16.length} disparos`);
}
if (retries.length) console.log(`   (nota) intermitencias de «efecto reproducido sin pico» repetidas: ${retries.join(", ")}`);
if (process.env.LEVELS_JSON) writeFileSync(process.env.LEVELS_JSON, JSON.stringify(rows, null, 2));

if (!process.env.LEVELS_ONLY) {
  // ───────── 4. Ducking de la música (−3 dB, recuperación ≤ 300 ms) ─────────
  await lp.evaluate(() => window.__portafolioSound.emit("case:leave"));
  await sleep(2500);
  await gotoPhase(lp, "runtime");
  const trace = await lp.evaluate(async () => {
    const h = window.__portafolioSound;
    const out = [];
    const t0 = performance.now();
    const id = setInterval(() => out.push([performance.now() - t0, h.snapshot().duckDb]), 6);
    h.emit("runtime:core-hover", { x: 0.5 });
    await new Promise((r) => setTimeout(r, 1500));
    clearInterval(id);
    return out;
  });
  const minDb = Math.min(...trace.map((s) => s[1]));
  const lastLow = trace.reduce((acc, s, i) => (s[1] <= minDb + 0.4 ? i : acc), 0);
  const back = trace.findIndex((s, i) => i > lastLow && s[1] >= -0.4);
  const releaseMs = back >= 0 ? trace[back][0] - trace[lastLow][0] : Infinity;
  check("4. ducking: mientras suena un efecto la música baja ≈ 3 dB", minDb <= -2.6 && minDb >= -3.6, `${f1(minDb)} dB`);
  check("4. ducking: la música se recupera en 300 ms o menos", releaseMs <= 300, `${Math.round(releaseMs)} ms`);

  // ───────── 5. Hover REAL rápido: sin «Max polyphony» y cada hover que supera el límite suena (hallazgo 3) ─────────
  await lp.evaluate(() => { window.__portafolioAudioLog.length = 0; window.__portafolioSound.clearSfxLog(); });
  const toks = lp.locator("[data-anim='token']");
  const nTok = await toks.count();
  if (nTok > 0) await toks.first().scrollIntoViewIfNeeded();
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < nTok; i++) {
      const box = await toks.nth(i).boundingBox();
      if (box) await lp.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 2 });
      await sleep(40);
    }
  }
  await lp.evaluate(() => document.getElementById("parser")?.scrollIntoView());
  await sleep(1200);
  const nodes = lp.locator("[role='treeitem']");
  const nNodes = await nodes.count();
  for (let round = 0; round < 3; round++) {
    for (let i = 0; i < Math.min(nNodes, 14); i++) {
      const box = await nodes.nth(i).boundingBox();
      if (box && box.y > 0 && box.y < 780) await lp.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 2 });
      await sleep(35);
    }
  }
  await sleep(1200);
  const hl = (await hook(lp, "h.sfxLog()")).filter((e) => e.event.startsWith("hover:"));
  const emittedList = await lp.evaluate(() => window.__portafolioAudioLog.filter((e) => e.event.startsWith("hover:")).map((e) => e.event));
  const emittedHover = emittedList.length;
  const byKind = (xs) => xs.reduce((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {});
  const badDrops = hl.filter((e) => e.status === "dropped" && e.reason !== "rate");
  check("5. hover rápido por tokens y skills: todo suena o cae solo por límite de frecuencia", emittedHover >= 8 && hl.length >= 8 && badDrops.length === 0, `emitidos=${emittedHover} ${JSON.stringify(byKind(emittedList))}, registrados=${hl.length} ${JSON.stringify(byKind(hl.map((e) => e.event)))}, x=${hl.length}, reproducidos=${hl.filter((e) => e.status === "played").length}, descartes no permitidos=${JSON.stringify(badDrops.slice(0, 3))}`);

  // ───────── 6. Volumen 100 %: pico < −1 dBFS y ≤ 12 voces ─────────
  await gotoPhase(lp, "runtime");
  await lp.evaluate(() => window.scrollTo(0, 0));
  await lp.click("[data-sound-settings]");
  await lp.locator("#sound-volume").fill("100");
  await sleep(900);
  await lp.keyboard.press("Escape");
  await sleep(300);
  await lp.evaluate(() => window.__portafolioSound.levels(true));
  const evs = [["hover:token", { kind: "keyword" }], ["hover:skill", { category: "ai" }], ["select:skill", { category: "backend" }], ["achievement", { id: "root_access" }], ["runtime:core-hover", { x: 0.4 }], ["terminal:key"], ["bytecode:instruction"], ["counter:tick"], ["contact:send"], ["hold:complete"], ["bytecode:function"], ["contact:ok"], ["mixer:open"], ["ui:open"]];
  let maxVoices = 0;
  const burst = lp.evaluate(async (list) => {
    const h = window.__portafolioSound;
    for (let i = 0; i < 90; i++) {
      const [e, p] = list[i % list.length];
      h.emit(e, p);
      await new Promise((r) => setTimeout(r, 25));
    }
  }, evs);
  for (let i = 0; i < 50; i++) { await sleep(60); maxVoices = Math.max(maxVoices, (await snap(lp)).voices); }
  await burst;
  const s100 = await snap(lp);
  const lv100 = await hook(lp, "h.levels(true)");
  check("6. volumen al 100 %: pico de la salida < −1 dBFS en la ráfaga de efectos", s100.volume >= 0.99 && lv100.masterPeakDb < -1, `volumen ${s100.volume}, pico ${f1(lv100.masterPeakDb)} dBFS`);
  check("6. ráfaga de 90 efectos: nunca más de 12 voces", maxVoices <= 12 && s100.voicePeak <= 12, `máx observado ${maxVoices}, pico interno ${s100.voicePeak}, rechazadas ${s100.voicesRejected}`);
  const sfxAll = await hook(lp, "h.sfxLog()");
  const reasons = {};
  for (const e of sfxAll.filter((x) => x.status === "dropped")) reasons[e.reason] = (reasons[e.reason] ?? 0) + 1;
  check("6. los descartes de la ráfaga quedan registrados con su motivo en el gancho", sfxAll.some((e) => e.status === "played") && sfxAll.filter((e) => e.status === "dropped").every((e) => typeof e.reason === "string"), JSON.stringify(reasons));
}
await lctx.close();

check("sin avisos de consola «Max polyphony exceeded» ni «scheduled callbacks» en todo el recorrido", consoleIssues.length === 0, consoleIssues.slice(0, 3).join(" | "));
check("sin errores de consola/página en todo el recorrido", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));

await browser.close();
const bad = results.filter((r) => !r).length;
console.log(`\n${results.length - bad}/${results.length} OK`);
process.exit(bad ? 1 : 0);
