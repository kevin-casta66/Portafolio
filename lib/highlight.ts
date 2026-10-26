import { createHighlighter, type BundledLanguage, type Highlighter } from "shiki";
import { createCssVariablesTheme } from "shiki/core";

/**
 * Resaltado de sintaxis con Shiki (solo servidor, en build). El tema usa VARIABLES CSS
 * (`--shiki-token-*`, definidas en `app/globals.css` a partir de los tokens del sistema de diseño),
 * así que no hay ningún color literal y el resaltado cambia con el tema claro/oscuro.
 */
export interface HighlightedToken {
  content: string;
  color: string;
}

let highlighter: Promise<Highlighter> | null = null;
const theme = createCssVariablesTheme({ name: "css-variables", variablePrefix: "--shiki-", variableDefaults: {}, fontStyle: false });

export async function highlightTokens(code: string, lang: BundledLanguage = "ts"): Promise<HighlightedToken[][]> {
  highlighter ??= createHighlighter({ themes: [theme], langs: [lang] });
  const h = await highlighter;
  const { tokens } = h.codeToTokens(code, { lang, theme: "css-variables" });
  return tokens.map((line) => line.map((t) => ({ content: t.content, color: t.color ?? "var(--shiki-foreground)" })));
}
