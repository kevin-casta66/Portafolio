import { createHighlighter, type BundledLanguage, type Highlighter } from "shiki";
import { createCssVariablesTheme } from "shiki/core";

/**
 * Resaltado de sintaxis con Shiki (solo servidor, en build). El tema usa VARIABLES CSS
 * (`--shiki-token-*`, definidas en `app/globals.css` a partir de los tokens del sistema de diseño),
 * así que no hay ningún color literal y el resaltado cambia con el tema claro/oscuro.
 *
 * Un único highlighter para todo el sitio (laboratorio del change 04 y casos de estudio del 05); los
 * lenguajes se cargan bajo demanda, solo los que se usan.
 */
export interface HighlightedToken {
  content: string;
  color: string;
}

let highlighter: Promise<Highlighter> | null = null;
const loaded = new Set<string>();
const theme = createCssVariablesTheme({ name: "css-variables", variablePrefix: "--shiki-", variableDefaults: {}, fontStyle: false });

export async function highlightTokens(code: string, lang: BundledLanguage = "ts"): Promise<HighlightedToken[][]> {
  highlighter ??= createHighlighter({ themes: [theme], langs: [] });
  const h = await highlighter;
  if (!loaded.has(lang)) {
    await h.loadLanguage(lang);
    loaded.add(lang);
  }
  const { tokens } = h.codeToTokens(code, { lang, theme: "css-variables" });
  return tokens.map((line) => line.map((t) => ({ content: t.content, color: t.color ?? "var(--shiki-foreground)" })));
}

/** Lenguajes que aceptan los bloques de código de los casos (la lista corta evita errores tipográficos). */
export const CASE_LANGUAGES = ["ts", "tsx", "js", "json", "sql", "bash", "css", "yaml", "diff", "csharp"] as const;
export type CaseLanguage = (typeof CASE_LANGUAGES)[number];

export const isCaseLanguage = (value: string): value is CaseLanguage =>
  (CASE_LANGUAGES as readonly string[]).includes(value);
