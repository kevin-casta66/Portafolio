import type { MDXComponents } from "mdx/types";
import { AnnotatedCode } from "@/components/case-study/AnnotatedCode";
import { Breakpoint } from "@/components/case-study/Breakpoint";
import { CodeBlock } from "@/components/case-study/CodeBlock";

/**
 * Componentes globales de MDX (los casos de estudio de `content/cases/`). La tipografía de la prosa
 * sale de los tokens del sistema de diseño; `<ArchitectureDiagram />` y `<MetricChart />` dependen de
 * los metadatos de cada caso y los inyecta la página (`app/[locale]/projects/[slug]/page.tsx`).
 */
const components = {
  Breakpoint,
  AnnotatedCode,
  pre: CodeBlock,
  h3: (props) => <h3 {...props} className="mt-8 font-display text-xl font-semibold" />,
  p: (props) => <p {...props} className="max-w-prose" />,
  ul: (props) => <ul {...props} className="max-w-prose list-disc space-y-2 pl-6 marker:text-accent" />,
  ol: (props) => <ol {...props} className="max-w-prose list-decimal space-y-2 pl-6 marker:text-accent" />,
  strong: (props) => <strong {...props} className="font-semibold text-fg" />,
  a: (props) => <a {...props} className="text-accent underline underline-offset-4 hover:no-underline" />,
  code: (props) => (
    <code {...props} className="rounded bg-surface px-1.5 py-0.5 font-mono text-[0.9em] text-syntax-string" />
  ),
  blockquote: (props) => (
    <blockquote {...props} className="max-w-prose border-l-2 border-accent pl-4 text-fg-muted" />
  ),
} satisfies MDXComponents;

export function useMDXComponents(): MDXComponents {
  return components;
}
