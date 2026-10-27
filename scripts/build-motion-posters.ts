import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { DEMO_IDS, posterSrc } from "../motion/showcase";

/**
 * Genera los fotogramas estáticos de `/motion` (change 08, design D5): para cada transición abre su
 * escenario `/stage/es/<Tn>?poster=1` (el estado FINAL de la demo, sin animar), lo captura a 1280×720
 * con el Chrome instalado (WebGPU real) y lo guarda como WebP en `public/motion/posters/`.
 *
 *   pnpm build && pnpm start -p 3119   # en otra terminal
 *   POSTER_BASE=http://localhost:3119 pnpm motion:posters [T2,T5]   # sin argumento: las 11
 *
 * La conversión a WebP la hace el propio navegador (canvas), así no hace falta ninguna dependencia nueva.
 */
const base = process.env.POSTER_BASE ?? "http://localhost:3119";
const wanted = (process.argv[2] ?? DEMO_IDS.join(",")).split(",").map((s) => s.trim());
const outDir = resolve(process.cwd(), "public/motion/posters");
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ channel: "chrome" });
const converter = await (await browser.newContext()).newPage();

let failed = 0;
for (const id of wanted) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, colorScheme: "dark" });
  const page = await context.newPage();
  try {
    await page.goto(`${base}/stage/es/${id}?poster=1`, { waitUntil: "load" });
    await page.waitForSelector("html[data-poster-ready='1']", { timeout: 30000 });
    await page.waitForTimeout(900); // el motor dibuja con el reloj único: deja asentar el último frame
    const png = await page.screenshot({ type: "png" });
    const webp: string = await converter.evaluate(async (b64: string) => {
      const image = new Image();
      image.src = `data:image/png;base64,${b64}`;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d")?.drawImage(image, 0, 0);
      return canvas.toDataURL("image/webp", 0.8).split(",")[1] ?? "";
    }, png.toString("base64"));
    const bytes = Buffer.from(webp, "base64");
    const file = resolve(process.cwd(), "public", posterSrc(id as never).replace(/^\//, ""));
    writeFileSync(file, bytes);
    console.log(`${id}: ${(bytes.length / 1024).toFixed(0)} KB → ${posterSrc(id as never)}`);
  } catch (error) {
    failed++;
    console.error(`${id}: FALLÓ — ${String(error).slice(0, 160)}`);
  } finally {
    await context.close();
  }
}
await browser.close();
if (failed > 0) process.exit(1);
