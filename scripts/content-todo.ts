/**
 * Lista los campos de contenido que siguen siendo placeholder (marcados con `ph()`).
 * Uso: `pnpm content:todo`. Antes de desplegar debe salir vacío.
 */
import { rawContent } from "../content";
import { findPlaceholders } from "../lib/content/placeholder";

const pending = Object.entries(rawContent).flatMap(([section, value]) =>
  findPlaceholders(value, section),
);

if (pending.length === 0) {
  console.log("Sin placeholders pendientes.");
} else {
  console.log(`${pending.length} campo(s) siguen siendo placeholder:\n`);
  for (const path of pending) console.log(`  - ${path}`);
  console.log("\nSustitúyelos en /content y quita la llamada a ph().");
}
