/**
 * Verifica el contraste WCAG AA de todas las parejas texto/fondo de ambos temas, incluido el
 * texto sobre vidrio en el peor fondo posible. Uso: `pnpm tokens:contrast`. Sale con 1 si falla.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { minGlassAlpha, runChecks, themeVars } from "./contrast";

const css = readFileSync(join(process.cwd(), "styles", "tokens.css"), "utf8");
const checks = runChecks(css);

for (const c of checks) {
  const mark = c.ok ? "ok  " : "FAIL";
  console.log(`${mark} [${c.theme}] ${c.label}: ${c.ratio.toFixed(2)}:1 (mín ${c.min}:1)`);
}

// Opacidad mínima del vidrio por tema contra el peor caso, frente a lo que fijan los tokens.
console.log("");
for (const theme of ["dark", "light"] as const) {
  const vars = themeVars(css, theme);
  const required = minGlassAlpha(css, theme);
  for (const name of ["glass-bg-min-alpha", "glass-bg-strong-alpha"]) {
    const configured = Number(vars[name]);
    const ok = configured >= required;
    console.log(
      `${ok ? "ok  " : "FAIL"} [${theme}] --${name} = ${configured} (mínima requerida ${required.toFixed(3)})`,
    );
    if (!ok) {
      checks.push({ theme, label: `--${name} bajo el mínimo del vidrio`, tokens: [name], ratio: configured, min: required, ok: false });
    }
  }
}

const failed = checks.filter((c) => !c.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} pareja(s) no cumplen AA. Tokens afectados:`);
  for (const f of failed)
    console.error(`  - [${f.theme}] ${f.label} → ${f.tokens.map((t) => `--${t}`).join(", ")}`);
  process.exit(1);
}
console.log(`\n${checks.length} parejas verificadas: todas cumplen AA.`);
