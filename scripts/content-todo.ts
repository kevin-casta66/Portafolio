/**
 * Lista los campos de contenido que siguen siendo placeholder (marcados con `ph()`).
 * Uso: `pnpm content:todo`. Antes de desplegar debe salir vacío.
 */
import { rawContent } from "../content";
import { loadCase } from "../lib/cases";
import { findPlaceholders } from "../lib/content/placeholder";

const pending = Object.entries(rawContent).flatMap(([section, value]) =>
  findPlaceholders(value, section),
);

// Casos de estudio: siguen siendo de ejemplo mientras su metadato `placeholder` sea `true`.
for (const project of rawContent.projects) {
  const slug = project.links.caseStudy;
  if (!slug) continue;
  for (const locale of ["es", "en"] as const) {
    if (loadCase(slug, locale)?.frontmatter.placeholder)
      pending.push(`content/cases/${slug}.${locale}.mdx (placeholder: true)`);
  }
}

if (pending.length === 0) {
  console.log("Sin placeholders pendientes.");
} else {
  console.log(`${pending.length} campo(s) siguen siendo placeholder:\n`);
  for (const path of pending) console.log(`  - ${path}`);
  console.log("\nSustitúyelos en /content y quita la llamada a ph().");
}
