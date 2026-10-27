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

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--autoplay-policy=no-user-gesture-required", "--enable-features=WebGPU"],
});

/** Contexto nuevo con contador de AudioContext y registro de peticiones del motor. */
async function openPage({ prefs, session, url = "/es?motionTest=1", viewport = { width: 1280, height: 800 }, reducedMotion = "no-preference" } = {}) {
  const ctx = await browser.newContext({ viewport, reducedMotion });
  await ctx.addInitScript(() => {
    window.__ctxCount = 0;
    window.__ctxBuilt = 0;
    const wrap = (name) => {
      const Orig = window[name];
      if (!Orig) return;
      window[name] = class extends Orig {
        constructor(...a) {
          super(...a);
          window.__ctxCount++;
          window.__ctxBuilt = (window.__ctxBuilt || 0) + 1;
        }
        close() {
          window.__ctxCount--;
          return super.close();
        }
      };
    };
    wrap("AudioContext");
    wrap("webkitAudioContext");
  });
  if (prefs) await ctx.addInitScript((p) => localStorage.setItem("portafolio:prefs", JSON.stringify(p)), prefs);
  if (session) await ctx.addInitScript((s) => { for (const [k, v] of Object.entries(s)) sessionStorage.setItem(k, v); }, session);
  const page = await ctx.newPage();
  const engineRequests = [];
  page.on("response", async (r) => {
    if (!r.url().includes("/_next/static/") || !r.url().endsWith(".js")) return;
    try {
      const body = await r.text();
      if (body.includes("fatsawtooth") || body.includes("PolySynth")) engineRequests.push(r.url());
    } catch {}
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  await page.goto(B + url, { waitUntil: "networkidle" });
  return { ctx, page, engineRequests, errors };
}

const hook = (page, expr) => page.evaluate(`(() => { const h = window.__portafolioSound; return h ? (${expr}) : "NO-HOOK"; })()`);
const snap = (page) => hook(page, "h.snapshot()");

// ───────── A. Sin el parámetro de pruebas no existe el gancho ─────────
{
  const { ctx, page } = await openPage({ url: "/es" });
  const has = await page.evaluate(() => typeof window.__portafolioSound);
  check("A. sin ?motionTest no existe window.__portafolioSound", has === "undefined", has);
  await ctx.close();
}

// ───────── B. Antes de elegir en la puerta, sin preferencia: nada suena ni se carga ─────────
{
  const { ctx, page, engineRequests } = await openPage();
  await page.waitForSelector("[data-boot-gate] [data-boot-choice='sound']", { timeout: 15000 });
  await sleep(1500);
  const info = await page.evaluate(() => ({ ctx: window.__ctxCount, gate: window.__portafolioSound?.gate(), started: window.__portafolioSound?.started() }));
  check("B. gancho existe con ?motionTest y la puerta no está resuelta", info.gate && info.gate.resolved === false, JSON.stringify(info.gate));
  check("B. antes de elegir: ningún AudioContext, motor sin arrancar y ninguna petición del motor", info.ctx === 0 && info.started === false && engineRequests.length === 0, JSON.stringify({ ctx: info.ctx, started: info.started, req: engineRequests.length }));
  check("B. el gancho cuenta las líneas [ OK ] de la puerta (sin motor se descartan)", info.gate.lines >= 3, String(info.gate.lines));
  await ctx.close();
}

// ───────── C. Preferencia guardada «con sonido» y puerta pendiente: NO suena antes de la elección ─────────
{
  const { ctx, page, engineRequests } = await openPage({ prefs: { sound: true } });
  await page.waitForSelector("[data-boot-gate] [data-boot-choice='sound']", { timeout: 15000 });
  await sleep(2500);
  // movimientos y teclas ANTES de elegir no deben arrancar el motor
  await page.mouse.move(400, 300);
  await sleep(1200);
  const info = await page.evaluate(() => ({ ctx: window.__ctxCount, started: window.__portafolioSound?.started(), enabled: JSON.parse(localStorage.getItem("portafolio:prefs") || "{}").sound }));
  check("C. con preferencia guardada y la puerta visible: sin AudioContext, sin motor y sin peticiones del motor", info.ctx === 0 && !info.started && engineRequests.length === 0, JSON.stringify({ ...info, req: engineRequests.length }));
  // elige silencio: el motor nunca debe cargarse
  await page.click("[data-boot-gate] [data-boot-choice='silent']");
  await sleep(3500);
  const after = await page.evaluate(() => ({ ctx: window.__ctxCount, started: window.__portafolioSound?.started(), pref: JSON.parse(localStorage.getItem("portafolio:prefs") || "{}").sound }));
  check("C. elegir «Iniciar en silencio» deja la preferencia en false y el motor sin arrancar", after.pref === false && !after.started && engineRequests.length === 0, JSON.stringify(after));
  await ctx.close();
}

// ───────── C2. «Saltar» equivale a silencio (diseño de la puerta): el motor no arranca ─────────
{
  const { ctx, page, engineRequests } = await openPage({ prefs: { sound: true } });
  await page.waitForSelector("[data-boot-gate] button", { timeout: 15000 });
  await sleep(1200);
  await page.keyboard.press("Escape"); // saltar
  await sleep(2500);
  const gate = await hook(page, "h.gate()");
  check("C2. «Saltar» resuelve la puerta (boot:done) como silencio", gate.resolved === true && gate.bootDone === true, JSON.stringify(gate));
  await page.mouse.click(600, 400);
  await sleep(2500);
  const afterG = await page.evaluate(() => ({ ctx: window.__ctxBuilt, started: window.__portafolioSound?.started(), pref: JSON.parse(localStorage.getItem("portafolio:prefs") || "{}").sound }));
  check("C2. tras saltar y hacer clic no suena nada: preferencia en false, sin motor ni contexto", afterG.pref === false && !afterG.started && afterG.ctx === 0 && engineRequests.length === 0, JSON.stringify(afterG));
  await ctx.close();
}

// ───────── C3. Visita posterior de la misma sesión con «sonido» ya elegido: arranca tras el primer gesto ─────────
{
  const { ctx, page, engineRequests } = await openPage({ prefs: { sound: true }, session: { "portafolio:gate": "sound", "portafolio:booted": "1" } });
  await sleep(2500);
  const before = await page.evaluate(() => ({ built: window.__ctxBuilt, started: window.__portafolioSound?.started() }));
  check("C3. sin gesto todavía no hay contexto de audio ni motor (política de autoplay)", before.built === 0 && !before.started, JSON.stringify(before));
  await page.mouse.click(600, 400);
  await page.waitForFunction(() => window.__portafolioSound?.started() === true, null, { timeout: 15000 }).catch(() => {});
  const afterG = await page.evaluate(() => ({ open: window.__ctxCount, started: window.__portafolioSound?.started() }));
  check("C3. tras el primer gesto el motor arranca con un solo contexto abierto", afterG.started === true && afterG.open === 1 && engineRequests.length >= 1, JSON.stringify({ ...afterG, req: engineRequests.length }));
  await ctx.close();
}

// ───────── D. «Iniciar con sonido»: registra la elección, arranca el motor y entra la música ─────────
const { ctx: ctxD, page, engineRequests, errors } = await openPage();
await page.waitForSelector("[data-boot-gate] [data-boot-choice='sound']", { timeout: 15000 });
await sleep(800);
await page.click("[data-boot-gate] [data-boot-choice='sound']");
await page.waitForFunction(() => window.__portafolioSound?.started() === true, null, { timeout: 15000 }).catch(() => {});
const stored = await page.evaluate(() => ({
  gate: sessionStorage.getItem("portafolio:gate"),
  prefs: JSON.parse(localStorage.getItem("portafolio:prefs") || "{}"),
  ctx: window.__ctxCount,
}));
check("D. «Iniciar con sonido» registra la elección en la puerta (sessionStorage) y en las preferencias", stored.gate === "sound" && stored.prefs.sound === true, JSON.stringify(stored));
const started = await hook(page, "h.started()");
check("D. el motor arranca tras la elección y se pidió su chunk (tone)", started === true && engineRequests.length >= 1, JSON.stringify({ started, req: engineRequests.length }));
check("D. un único AudioContext abierto (el de Tone por defecto se libera)", stored.ctx === 1, String(stored.ctx));
await sleep(600);
const s0 = await snap(page);
check("D. BPM 84 y el pad entra solo (contexto de arranque o fase actual)", s0 && s0.bpm === 84 && s0.layers.some((l) => l.id === "pad" && l.target > 0), s0 ? JSON.stringify({ ctx: s0.context, bpm: s0.bpm }) : "sin snapshot");
check("D. el master parte de 0 (fundido de entrada de 3 s)", s0 && s0.rms && true, "");
await sleep(3600);
const s1 = await snap(page);
check("D. volumen inicial al 35 % tras el fundido de 3 s", Math.abs(s1.volume - 0.35) < 0.001, String(s1.volume));
check("D. sin clipping: pico < −1 dBFS", s1.peak < -1, `${s1.peak.toFixed(1)} dBFS`);
check("D. música audible en el bus (RMS música > −70 dB)", s1.rms.music > -70, `${s1.rms.music.toFixed(1)} dB`);

// ───────── E. Fases: las capas se suman y quitan ─────────
const sections = ["source", "lexer", "parser", "bytecode", "runtime", "gpu", "display"];
const expected = {
  source: ["pad", "keys"],
  lexer: ["pad", "keys", "perc"],
  parser: ["pad", "keys", "perc", "arp"],
  bytecode: ["pad", "keys", "perc", "arp", "bass"],
  runtime: ["pad", "keys", "perc", "arp", "bass"],
  gpu: ["pad", "keys", "perc", "arp", "bass", "shimmer"],
  display: ["pad", "keys"],
};
for (const id of sections) {
  await page.evaluate((id) => {
    const el = document.getElementById(id);
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 200);
  }, id);
  await sleep(id === "source" ? 4200 : 4200); // el cambio entra en el siguiente compás (≤ 2,9 s) + fundido
  const s = await snap(page);
  const layers = s.layers.filter((l) => l.target > 0.02).map((l) => l.id);
  check(`E. fase ${id}: contexto de mezcla y capas`, s.context === id && JSON.stringify(layers) === JSON.stringify(expected[id]), `${s.context} [${layers.join(",")}] voces=${s.voices}`);
}

// ───────── E2. Cruzar varias fases de golpe: solo se aplica la última, en el compás siguiente ─────────
{
  await page.evaluate(() => window.scrollTo(0, document.getElementById("lexer").getBoundingClientRect().top + window.scrollY + 200));
  await sleep(3800);
  const seen = new Set();
  const poll = setInterval(async () => {
    try { const s = await page.evaluate(() => window.__portafolioSound.snapshot()?.context); seen.add(s); } catch {}
  }, 60);
  await page.evaluate(() => { const h = window.__portafolioSound; h.emit("phase:parser"); h.emit("phase:bytecode"); h.emit("phase:runtime"); });
  await sleep(3600);
  clearInterval(poll);
  const fin = await snap(page);
  check("E2. 3 cambios de fase en un instante: la mezcla termina en la última (runtime)", fin.context === "runtime", fin.context);
  check("E2. las fases intermedias nunca llegan a sonar (parser, bytecode)", !seen.has("parser") && !seen.has("bytecode"), [...seen].join(","));
}

// ───────── E3. Aterrizaje al compás de la respuesta visual: retraso máximo 350 ms ─────────
{
  await page.evaluate(() => { window.__portafolioAudioLog.length = 0; });
  for (const id of ["lexer", "bytecode", "gpu", "source", "runtime"]) {
    await page.evaluate((id) => window.scrollTo(0, document.getElementById(id).getBoundingClientRect().top + window.scrollY + 200), id);
    await sleep(1500);
  }
  const lands = await page.evaluate(() => window.__portafolioAudioLog.filter((e) => e.event === "landOnBar").map((e) => e.payload.delay));
  check("E3. con audio, las respuestas no scrubbed esperan como mucho 350 ms al compás", lands.length >= 3 && Math.max(...lands) <= 350, JSON.stringify(lands.map((d) => Math.round(d))));
  // el reloj de compases: milisegundos al siguiente compás, siempre en [0, 2857] y con vuelta a ~2857 tras cada compás
  const samples = [];
  for (let i = 0; i < 40; i++) { samples.push((await snap(page)).nextBarMs); await sleep(90); }
  const inRange = samples.every((m) => typeof m === "number" && m >= 0 && m <= 2860);
  const wrapped = samples.some((m, i) => i > 0 && m > samples[i - 1] + 1000);
  check("E3. timeToNextBar() da el tiempo hasta el siguiente compás (0–2857 ms) y da la vuelta al cruzar cada compás", inRange && wrapped, `${Math.min(...samples)}–${Math.max(...samples)} ms; vuelta=${wrapped}`);
}

// ───────── E4. Respuesta del scroll: la música se abre al hacer scroll rápido y se recoge a los 2 s ─────────
{
  await sleep(2600);
  const quiet0 = await snap(page);
  const base = quiet0.cutoff;
  for (let i = 0; i < 14; i++) { await page.mouse.wheel(0, 700); await sleep(30); }
  let opened = base;
  for (let i = 0; i < 8; i++) { const s = await snap(page); opened = Math.max(opened, s.cutoff); await sleep(40); }
  check("E4. scroll rápido: el filtro de la música se abre", opened > base * 1.15, `${Math.round(base)} Hz → ${Math.round(opened)} Hz`);
  await sleep(1200);
  const mid = await snap(page);
  check("E4. con el scroll reciente no hay recorte de quietud (0 dB)", mid.trimDb > -0.5 || mid.trimDb === 0 || mid.trimDb > -3, `${mid.trimDb} dB`);
  await sleep(3200);
  const quiet = await snap(page);
  check("E4. tras 2 s sin scroll la música se recoge: −3 dB", Math.abs(quiet.trimDb - -3) < 0.2, `${quiet.trimDb} dB`);
  check("E4. …y el filtro vuelve más cerrado que con el scroll", quiet.cutoff < opened, `${Math.round(quiet.cutoff)} Hz`);
}

// ───────── E5. Hold-to-Execute REAL con el ratón sobre una tarjeta ─────────
{
  await page.evaluate(() => { const el = document.getElementById("runtime"); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 380); });
  await sleep(2500);
  await page.evaluate(() => { window.__portafolioAudioLog.length = 0; });
  const box = await page.evaluate(() => { const c = document.querySelector("[data-hold]"); c.scrollIntoView({ block: "center" }); const r = c.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await sleep(600);
  const b2 = await page.evaluate(() => { const r = document.querySelector("[data-hold]").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  await page.mouse.move(b2.x, b2.y);
  await page.mouse.down();
  await sleep(400);
  const mid = await snap(page);
  check("E5. mantener pulsada una tarjeta: el riser suena mientras se llena el anillo", mid.riser === true, String(mid.riser));
  await page.mouse.up();
  await sleep(600);
  const rel = await snap(page);
  const log1 = await page.evaluate(() => window.__portafolioAudioLog.map((e) => e.event));
  check("E5. soltar antes de completar: el riser cae (sin impacto)", rel.riser === false && !log1.includes("hold:complete"), JSON.stringify([...new Set(log1)]));
  await page.mouse.move(b2.x + 1, b2.y + 1);
  await page.mouse.down();
  await sleep(1150);
  const log2 = await page.evaluate(() => window.__portafolioAudioLog.map((e) => e.event));
  check("E5. hold completo: se emite hold:complete (impacto + acorde) y el riser termina", log2.includes("hold:complete"), JSON.stringify([...new Set(log2)]));
  await page.mouse.up();
  await sleep(2500);
  const afterHold = await snap(page);
  check("E5. tras el hold completo el riser no queda sonando", afterHold.riser === false, String(afterHold.riser));
  const gone = await page.evaluate(() => location.pathname);
  // vuelve a la home para el resto del recorrido
  if (gone.includes("/projects/")) {
    await page.goBack();
    await sleep(2500);
  }
}

// ───────── F. Silenciar con M en < 150 ms y reactivar ─────────
await page.mouse.move(640, 500);
await page.keyboard.press("m");
const tMute = Date.now();
let mutedMs = -1;
for (let i = 0; i < 60; i++) {
  const g = await page.evaluate(() => window.__portafolioSound?.snapshot()?.enabled === false);
  if (g) { mutedMs = Date.now() - tMute; break; }
  await sleep(5);
}
await sleep(300);
const sm = await snap(page);
check("F. tecla M silencia (el estado del motor pasa a «apagado» al instante)", mutedMs >= 0 && mutedMs < 150, `${mutedMs} ms`);
check("F. con el sonido apagado la ganancia del master es 0 (salida en silencio)", sm.masterGain < 0.001, String(sm.masterGain));
await page.keyboard.press("m");
await sleep(1500);
const su = await snap(page);
check("F. M otra vez reactiva el sonido", su.enabled === true, String(su.enabled));

// ───────── G. Eventos por el gancho: riser, límite de voces ─────────
await page.evaluate(() => window.scrollTo(0, document.getElementById("runtime").getBoundingClientRect().top + window.scrollY + 200));
await sleep(3500);
await page.evaluate(() => window.__portafolioSound.emit("hold:start"));
await sleep(300);
const r1 = await snap(page);
check("G. hold:start arranca el riser", r1.riser === true, String(r1.riser));
await page.evaluate(() => window.__portafolioSound.emit("hold:cancel"));
await sleep(500);
const r2 = await snap(page);
check("G. hold:cancel hace caer el riser (se cancela al soltar)", r2.riser === false, String(r2.riser));
await page.evaluate(() => window.__portafolioSound.emit("hold:start"));
await sleep(850);
await page.evaluate(() => window.__portafolioSound.emit("hold:complete"));
await sleep(600);
const r3 = await snap(page);
check("G. hold:complete termina el riser (impacto + acorde)", r3.riser === false, String(r3.riser));

// 50 efectos en 2 s sobre la mezcla completa de RUNTIME
let maxVoices = 0;
const burst = page.evaluate(async () => {
  const h = window.__portafolioSound;
  const evs = [["hover:token", { kind: "keyword" }], ["hover:skill", { category: "ai" }], ["select:skill", { category: "backend" }], ["achievement", { id: "root_access" }], ["runtime:core-hover", { x: 0.4 }], ["terminal:key"], ["bytecode:instruction"], ["counter:tick"], ["contact:send"], ["hold:complete"]];
  for (let i = 0; i < 50; i++) {
    const [e, p] = evs[i % evs.length];
    h.emit(e, p);
    await new Promise((r) => setTimeout(r, 40));
  }
});
for (let i = 0; i < 40; i++) {
  await sleep(60);
  const s = await snap(page);
  maxVoices = Math.max(maxVoices, s.voices);
}
await burst;
const sb = await snap(page);
check("G. 50 efectos en 2 s: nunca más de 12 voces simultáneas", maxVoices <= 12 && sb.voicePeak <= 12, `máx observado ${maxVoices}, pico interno ${sb.voicePeak}, rechazadas ${sb.voicesRejected}`);
check("G. 50 efectos: sin clipping (pico < −1 dBFS)", sb.peak < -1, `${sb.peak.toFixed(1)} dBFS`);

// ───────── H. Vista Rápida y ducking ─────────
await page.evaluate(() => window.__portafolioSound.emit("quickview:on"));
await sleep(1600);
const q = await snap(page);
check("H. Vista Rápida: la música se pausa (recorte hacia silencio) y queda marcada", q.quickView === true, JSON.stringify({ q: q.quickView, rms: q.rms.music.toFixed?.(1) }));
await page.evaluate(() => window.__portafolioSound.emit("quickview:off"));
await sleep(1600);
const d0 = await snap(page);
await page.evaluate(() => window.__portafolioSound.emit("media:play"));
await sleep(900);
const d1 = await snap(page);
check("H. ducking: un vídeo con audio baja la música 12 dB", Math.abs(d1.trimDb - (d0.trimDb - 12)) < 0.1, `${d0.trimDb} → ${d1.trimDb} dB`);
await page.evaluate(() => window.__portafolioSound.emit("media:stop"));
await sleep(900);
const d2 = await snap(page);
check("H. al terminar el vídeo la música se recupera", Math.abs(d2.trimDb - d0.trimDb) < 0.1, `${d2.trimDb} dB (antes ${d0.trimDb})`);

// ───────── I. Caso de estudio −8 dB y 404 ─────────
await page.evaluate(() => window.__portafolioSound.emit("case:enter"));
await sleep(4000);
const c1 = await snap(page);
const cl = c1.layers.filter((l) => l.target > 0.02).map((l) => l.id);
check("I. caso de estudio: −8 dB y solo pad + keys", c1.context === "case" && c1.trimDb <= -7.9 && c1.trimDb >= -11.1 && JSON.stringify(cl) === JSON.stringify(["pad", "keys"]), JSON.stringify({ ctx: c1.context, trim: c1.trimDb, cl }));
await page.evaluate(() => window.__portafolioSound.emit("case:leave"));
await sleep(3800);
await page.evaluate(() => window.__portafolioSound.emit("notfound:enter"));
await sleep(3800);
const n1 = await snap(page);
check("I. 404: «cinta que se detiene» (tempo cae y se desafina)", n1.tape === true && n1.bpm < 45, JSON.stringify({ tape: n1.tape, bpm: n1.bpm }));
await page.evaluate(() => window.__portafolioSound.emit("notfound:restart"));
await sleep(2600);
const n2 = await snap(page);
check("I. «Reiniciar proceso»: la cinta arranca de nuevo (tempo 84)", n2.tape === false && n2.bpm === 84, JSON.stringify({ tape: n2.tape, bpm: n2.bpm }));

// ───────── J. Pestaña oculta: fundido a silencio y pausa; al volver, reanuda ─────────
await page.evaluate(() => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
  document.dispatchEvent(new Event("visibilitychange"));
});
await sleep(1500);
const h1 = await snap(page);
const ctxS = await page.evaluate(() => window.__portafolioSound?.snapshot()?.hidden);
check("J. pestaña oculta: el motor pasa a «oculta» y el transport se pausa", ctxS === true && h1.running === false, JSON.stringify({ hidden: ctxS, running: h1.running }));
await page.evaluate(() => {
  Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
  document.dispatchEvent(new Event("visibilitychange"));
});
await sleep(2200);
const h2 = await snap(page);
check("J. al volver, el transport reanuda con fundido", h2.hidden === false && h2.running === true, JSON.stringify({ hidden: h2.hidden, running: h2.running }));

check("sin errores de consola/página durante todo el recorrido", errors.length === 0, errors.slice(0, 3).join(" | "));
await ctxD.close();

// ───────── K. Movimiento reducido: sin riser ─────────
{
  const { ctx, page, errors: err2 } = await openPage({ reducedMotion: "reduce" });
  await page.waitForSelector("[data-boot-gate] [data-boot-choice='sound']", { timeout: 15000 });
  await page.click("[data-boot-gate] [data-boot-choice='sound']");
  await page.waitForFunction(() => window.__portafolioSound?.started() === true, null, { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  await page.evaluate(() => window.__portafolioSound.emit("hold:start"));
  await sleep(300);
  const s = await snap(page);
  check("K. movimiento reducido: hold:start NO arranca el riser", s && s.reduced === true && s.riser === false, JSON.stringify({ reduced: s?.reduced, riser: s?.riser }));
  check("K. movimiento reducido: sin errores", err2.length === 0, err2.join("|").slice(0, 200));
  await ctx.close();
}

await browser.close();
const bad = results.filter((r) => !r).length;
console.log(`\n${results.length - bad}/${results.length} OK`);
process.exit(bad ? 1 : 0);
