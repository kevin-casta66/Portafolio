/**
 * Verifica el contraste WCAG AA de todas las parejas texto/fondo de ambos temas, incluido el
 * texto sobre vidrio en el peor fondo posible. Uso: `pnpm tokens:contrast`. Sale con 1 si falla.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runChecks } from "./contrast";

const css = readFileSync(join(process.cwd(), "styles", "tokens.css"), "utf8");
const checks = runChecks(css);

for (const c of checks) {
  const mark = c.ok ? "ok  " : "FAIL";
  console.log(`${mark} [${c.theme}] ${c.label}: ${c.ratio.toFixed(2)}:1 (mín ${c.min}:1)`);
}

const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} pareja(s) no cumplen AA. Tokens afectados:`);
  for (const f of failed)
    console.error(`  - [${f.theme}] ${f.label} → ${f.tokens.map((t) => `--${t}`).join(", ")}`);
  process.exit(1);
}
console.log(`\n${checks.length} parejas verificadas: todas cumplen AA.`);
