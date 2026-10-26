import { getTranslations } from "next-intl/server";
import { CASE_LANGUAGES, highlightTokens, isCaseLanguage, type CaseLanguage } from "@/lib/highlight";

interface AnnotatedCodeProps {
  /** El código, como texto: `{`…`}` en MDX. */
  children: string;
  lang?: CaseLanguage;
  /** Nombre de archivo que se muestra sobre el bloque (opcional). */
  title?: string;
  /** Anotaciones por línea (1 = primera línea): `notes={{ 3: "Por qué…" }}`. */
  notes?: Record<number, string>;
}

/**
 * Bloque de código con resaltado de sintaxis GENERADO EN EL SERVIDOR (Shiki, tema de variables CSS
 * enlazado a los tokens: no se envía ningún resaltador al cliente) y anotaciones al margen. Cada línea
 * mide lo mismo (no hay ajuste de línea; el bloque se desplaza en horizontal), así que cada anotación
 * se alinea con su línea con una variable CSS (`--line`). En escritorio las notas flotan a la derecha
 * del bloque, junto a su línea; en móvil son una lista numerada debajo. Es UNA sola lista en el DOM.
 */
export async function AnnotatedCode({ children, lang = "ts", title, notes = {} }: AnnotatedCodeProps) {
  if (!isCaseLanguage(lang)) {
    throw new Error(`AnnotatedCode: lenguaje «${lang}» no admitido (usa ${CASE_LANGUAGES.join(", ")})`);
  }
  const t = await getTranslations("Case.code");
  const code = children.replace(/^\n+|\s+$/g, "");
  const lines = await highlightTokens(code, lang);
  const annotated = Object.entries(notes)
    .map(([line, text]) => ({ line: Number(line), text }))
    .sort((a, b) => a.line - b.line);
  for (const { line } of annotated) {
    if (!Number.isInteger(line) || line < 1 || line > lines.length) {
      throw new Error(`AnnotatedCode: la anotación de la línea ${line} no existe (el bloque tiene ${lines.length})`);
    }
  }
  const markOf = new Map(annotated.map((n, i) => [n.line, i + 1]));

  return (
    <figure
      data-annotated={annotated.length > 0 ? "true" : undefined}
      className="case-code my-6 lg:data-[annotated=true]:mr-[17rem]"
    >
      {title ? (
        <figcaption className="rounded-t-lg border border-b-0 border-border bg-surface-elevated px-4 py-2 font-mono text-xs text-fg-muted">
          {title}
        </figcaption>
      ) : null}
      <div className="relative">
        <pre
          tabIndex={0}
          aria-label={t("region", { lang })}
          className={
            "case-code-pre overflow-x-auto border border-border bg-surface py-3 font-mono text-sm " +
            (title ? "rounded-b-lg" : "rounded-lg")
          }
        >
          <code>
            {lines.map((tokens, i) => {
              const mark = markOf.get(i + 1);
              return (
                <span key={i} className="case-line" data-annotated={mark ? "true" : undefined}>
                  <span className="case-line-no" aria-hidden="true">
                    {i + 1}
                  </span>
                  <span className="case-line-code">
                    {tokens.map((tk, j) => (
                      <span key={j} style={{ color: tk.color }}>
                        {tk.content}
                      </span>
                    ))}
                  </span>
                  {mark ? (
                    <span className="case-line-mark" aria-hidden="true">
                      {mark}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </code>
        </pre>

        {annotated.length > 0 ? (
          <ol
            aria-label={t("notes")}
            className="case-notes mt-3 space-y-2 text-sm text-fg-muted lg:absolute lg:inset-y-0 lg:left-[calc(100%+1rem)] lg:mt-0 lg:w-64 lg:space-y-0"
          >
            {annotated.map((n, i) => (
              <li
                key={n.line}
                style={{ "--line": n.line - 1 } as React.CSSProperties}
                className="case-note rounded-md border border-border bg-surface-elevated px-3 py-2 lg:absolute lg:inset-x-0"
              >
                <span className="font-mono text-xs text-accent">
                  {i + 1} · {t("line", { n: n.line })}
                </span>
                <span className="block">{n.text}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </figure>
  );
}
