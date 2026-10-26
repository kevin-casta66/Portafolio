import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseCase, type ParsedCase } from "./parse";

export { CaseError, parseCase } from "./parse";
export * from "./schema";

export type CaseLocale = "es" | "en";

const casesDir = join(process.cwd(), "content", "cases");
const cache = new Map<string, ParsedCase>();

export const caseFile = (slug: string, locale: CaseLocale) => `${slug}.${locale}.mdx`;

/** Metadatos validados de un caso (solo servidor / build). `null` si no existe el archivo. */
export function loadCase(slug: string, locale: CaseLocale): ParsedCase | null {
  const file = caseFile(slug, locale);
  const path = join(casesDir, file);
  if (!existsSync(path)) return null;
  const hit = cache.get(file);
  if (hit) return hit;
  const parsed = parseCase(readFileSync(path, "utf8"), file);
  cache.set(file, parsed);
  return parsed;
}
