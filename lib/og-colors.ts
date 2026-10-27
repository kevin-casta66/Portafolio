import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Colores de los tokens para imágenes generadas en servidor (Open Graph), donde no hay CSS. Lee
 * `styles/tokens.css` (única fuente de los colores literales) y resuelve las cadenas `var(--…)`; en
 * caso de definirse un token varias veces gana la primera declaración, que es la del tema oscuro.
 */
let cache: Map<string, string> | null = null;

function declarations(): Map<string, string> {
  if (cache) return cache;
  const css = readFileSync(join(process.cwd(), "styles", "tokens.css"), "utf-8");
  const map = new Map<string, string>();
  for (const match of css.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) {
    const name = match[1] as string;
    if (!map.has(name)) map.set(name, (match[2] as string).trim());
  }
  cache = map;
  return map;
}

/** Valor resuelto de un token de color (`--bg`, `--fg`, `--accent-runtime`…). */
export function tokenColor(name: `--${string}`): string {
  const map = declarations();
  let value = map.get(name);
  for (let hops = 0; value?.startsWith("var(") && hops < 8; hops++) {
    value = map.get(value.slice(4, -1).split(",")[0]?.trim() ?? "");
  }
  if (!value) throw new Error(`token de color desconocido: ${name}`);
  return value;
}
