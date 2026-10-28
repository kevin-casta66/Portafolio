/**
 * Recompresión SIN PÉRDIDA de los atlas MSDF (`public/webgl/msdf/*.png`, change 09 · 4.7): reescribe cada PNG
 * con compresión máxima y filtro adaptativo y SOLO lo sustituye si el resultado es más pequeño y los píxeles
 * son idénticos byte a byte (el campo de distancia no admite pérdida ni compresión de GPU).
 * Usa `sharp`, que ya viene instalado con Next (no se añade ninguna dependencia ni binario).
 * Uso: `node scripts/optimize-msdf.mjs`
 */
import { createRequire } from "node:module";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const nextRequire = createRequire(require.resolve("next/package.json"));
const sharp = nextRequire("sharp");
const dir = join(process.cwd(), "public", "webgl", "msdf");

for (const file of readdirSync(dir).filter((f) => f.endsWith(".png"))) {
  const path = join(dir, file);
  const original = readFileSync(path);
  const raw = await sharp(original).raw().toBuffer({ resolveWithObject: true });
  const optimized = await sharp(original).png({ compressionLevel: 9, adaptiveFiltering: true, effort: 10, palette: false }).toBuffer();
  const again = await sharp(optimized).raw().toBuffer({ resolveWithObject: true });
  const identical = raw.data.equals(again.data) && raw.info.width === again.info.width && raw.info.channels === again.info.channels;
  const saved = original.length - optimized.length;
  if (identical && saved > 0) {
    writeFileSync(path, optimized);
    console.log(`${file}: ${original.length} → ${optimized.length} B (−${((saved / original.length) * 100).toFixed(1)} %, píxeles idénticos)`);
  } else {
    console.log(`${file}: sin cambios (${identical ? "ya óptimo" : "NO idéntico: descartado"}; ${original.length} → ${optimized.length} B)`);
  }
}
