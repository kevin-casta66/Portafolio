import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Presupuesto de assets 3D: modelos, texturas y atlas servidos al recorrer el home (`public/webgl/**`)
 * ≤ 1,5 MB. Falla con código 1 si se supera. (Los benchmarks de detect-gpu van aparte: el navegador
 * pide UN solo archivo de `public/gpu-benchmarks` y no es un asset de escena.)
 */
export const BUDGET_BYTES = 1.5 * 1024 * 1024;

export function dirSize(dir: string): { bytes: number; files: { file: string; bytes: number }[] } {
  const files: { file: string; bytes: number }[] = [];
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      const stat = statSync(full);
      if (stat.isDirectory()) walk(full);
      else files.push({ file: full, bytes: stat.size });
    }
  };
  if (existsSync(dir)) walk(dir);
  return { bytes: files.reduce((n, f) => n + f.bytes, 0), files };
}

export function checkBudget(dir: string, budget = BUDGET_BYTES): { ok: boolean; bytes: number; budget: number } {
  const { bytes } = dirSize(dir);
  return { ok: bytes <= budget, bytes, budget };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] ?? join(process.cwd(), "public", "webgl");
  const budget = process.env.BUDGET_3D_BYTES ? Number(process.env.BUDGET_3D_BYTES) : BUDGET_BYTES;
  const { files } = dirSize(dir);
  const result = checkBudget(dir, budget);
  for (const f of files.sort((a, b) => b.bytes - a.bytes).slice(0, 8))
    console.log(`  ${(f.bytes / 1024).toFixed(1).padStart(8)} KB  ${f.file.replace(dir, "")}`);
  const line = `assets 3D: ${(result.bytes / 1024).toFixed(1)} KB de ${(result.budget / 1024).toFixed(0)} KB`;
  if (!result.ok) {
    console.error(`✗ ${line}: presupuesto superado`);
    process.exit(1);
  }
  console.log(`✓ ${line}`);
}
