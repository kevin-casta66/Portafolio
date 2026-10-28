/**
 * Medios y fuentes (change 09, 4.7 y 4.8). `BASE=http://localhost:3150 node scripts/perf/verify-media.mjs`
 *  - Cero peticiones a dominios de terceros en home, caso, /heap y /motion (fuentes incluidas).
 *  - Las fuentes del primer render se precargan (`<link rel=preload as=font>`) y no hay CLS de fuentes.
 *  - Con un viewport de 390 px, las imágenes optimizadas llegan en AVIF con ancho adecuado y dimensiones reservadas.
 *  - Los vídeos (si los hay) llevan `muted playsinline preload="none"` y póster.
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
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem("portafolio:gate", "silent");
  } catch {}
  window.__cls = 0;
  new PerformanceObserver((l) => {
    for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
});
const origin = new URL(BASE).origin;
for (const path of ["/es", "/en", "/es/projects/arquelume-ai-agent", "/es/heap", "/es/motion"]) {
  const page = await ctx.newPage();
  const external = [];
  const fonts = [];
  const images = [];
  page.on("request", (r) => {
    const u = r.url();
    if (!u.startsWith(origin) && !u.startsWith("data:") && !u.startsWith("blob:")) external.push(u);
  });
  page.on("response", (r) => {
    const u = r.url();
    const t = r.headers()["content-type"] ?? "";
    if (/font|woff/.test(t) || /\.woff2/.test(u)) fonts.push(u.split("/").pop());
    if (/_next\/image/.test(u)) images.push({ u: decodeURIComponent(u).split("?")[1], type: t });
  });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await sleep(1500);
  for (let y = 0; y < 20000; y += 800) {
    const end = await page.evaluate((v) => {
      scrollTo(0, v);
      return v > document.documentElement.scrollHeight;
    }, y);
    await sleep(80);
    if (end) break;
  }
  await sleep(1000);
  const r = await page.evaluate(() => ({
    cls: window.__cls,
    preloads: [...document.querySelectorAll('link[rel="preload"][as="font"]')].map((l) => l.getAttribute("href")?.split("/").pop()),
    videos: [...document.querySelectorAll("video")].map((v) => ({ muted: v.muted, playsInline: v.playsInline, preload: v.preload, poster: !!v.poster })),
    imgs: [...document.querySelectorAll("img")].map((i) => ({ w: i.getAttribute("width"), h: i.getAttribute("height"), sizes: i.sizes, src: (i.currentSrc || i.src).slice(-70) })),
  }));
  ok(`4.8 ${path}: cero peticiones a terceros`, external.length === 0, external.slice(0, 3).join(", "));
  ok(`4.8 ${path}: fuentes del primer render precargadas`, r.preloads.length >= 2, r.preloads.join(","));
  ok(`4.8 ${path}: CLS total < 0,05 (fuentes incluidas)`, r.cls < 0.05, r.cls.toFixed(4));
  ok(`4.7 ${path}: imágenes con ancho/alto reservados`, r.imgs.every((i) => i.w && i.h), `${r.imgs.length} imgs`);
  ok(`4.7 ${path}: vídeos silenciados, sin precarga y con póster`, r.videos.every((v) => v.muted && v.playsInline && v.preload === "none" && v.poster), `${r.videos.length} vídeos`);
  const raster = images.filter((i) => !/\.svg/.test(i.u ?? ""));
  ok(`4.7 ${path}: imágenes raster optimizadas llegan en AVIF`, raster.every((i) => /avif/.test(i.type)), JSON.stringify(raster.slice(0, 3)).slice(0, 200));
  await page.close();
}
// Una imagen raster del sitio (póster de /motion) pedida como un móvil de 390 px (w=640): AVIF y mucho menor que el original.
{
  const url = `${BASE}/_next/image?url=${encodeURIComponent("/motion/posters/T1.webp")}&w=640&q=75`;
  const res = await fetch(url, { headers: { accept: "image/avif,image/webp,*/*" } });
  const buf = Buffer.from(await res.arrayBuffer());
  const orig = Buffer.from(await (await fetch(`${BASE}/motion/posters/T1.webp`)).arrayBuffer());
  ok("4.7 póster a 640 px: AVIF y más ligero que el WebP de origen", /avif/.test(res.headers.get("content-type") ?? "") && buf.length < orig.length, `${res.headers.get("content-type")} ${buf.length} B vs ${orig.length} B`);
}
await browser.close();
process.exit(fails ? 1 : 0);
