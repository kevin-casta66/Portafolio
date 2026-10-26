import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Copia los benchmarks de detect-gpu a `public/gpu-benchmarks` para servirlos desde el propio sitio
 * (sin pedir nada a unpkg). Se ejecuta con `pnpm webgl:sync`; el resultado se versiona.
 */
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "node_modules", "detect-gpu", "dist", "benchmarks");
const to = join(root, "public", "gpu-benchmarks");

mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log(`gpu-benchmarks: ${readdirSync(to).length} archivos copiados a public/gpu-benchmarks`);
