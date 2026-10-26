import { Children, isValidElement, type ReactNode } from "react";
import { CASE_LANGUAGES, isCaseLanguage } from "@/lib/highlight";
import { AnnotatedCode } from "./AnnotatedCode";

/**
 * Bloques de código de Markdown (```ts … ```) de los casos: pasan por el mismo componente que
 * `<AnnotatedCode>` (un solo resaltador, en el servidor). Para anotar líneas usa `<AnnotatedCode>`.
 */
export async function CodeBlock({ children }: { children?: ReactNode }) {
  const child = Children.toArray(children)[0];
  if (!isValidElement<{ className?: string; children?: ReactNode }>(child)) return null;
  const match = /language-([\w-]+)/.exec(child.props.className ?? "");
  const lang = match?.[1] ?? "ts";
  if (!isCaseLanguage(lang)) {
    throw new Error(`Bloque de código con lenguaje «${lang}» no admitido (usa ${CASE_LANGUAGES.join(", ")})`);
  }
  const text = typeof child.props.children === "string" ? child.props.children : "";
  return <AnnotatedCode lang={lang}>{text}</AnnotatedCode>;
}
