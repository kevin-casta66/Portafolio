import type { ReactNode } from "react";

interface SectionHeaderProps {
  /** Prefijo del `id` de la sección (`runtime` → `runtime-title`). */
  id: string;
  /** Etapa del pipeline, p. ej. `LEXER`. */
  phase: string;
  title: ReactNode;
  intro?: ReactNode;
  /** El encabezado de proyectos es el más grande de la página. */
  size?: "default" | "dominant";
}

/** Encabezado común de sección: etapa, título (h2 enfocable por ancla) e introducción. */
export function SectionHeader({ id, phase, title, intro, size = "default" }: SectionHeaderProps) {
  return (
    <header className="reveal-view col-span-12 mb-10 max-w-3xl">
      <p className="font-mono text-sm tracking-wide text-accent" aria-hidden="true">
        {phase}
      </p>
      <h2
        id={`${id}-title`}
        tabIndex={-1}
        className={
          size === "dominant"
            ? "mt-2 font-display text-display font-semibold leading-none"
            : "mt-2 font-display text-3xl font-semibold leading-tight"
        }
      >
        {title}
      </h2>
      {intro ? <p className="mt-4 text-lg text-fg-muted">{intro}</p> : null}
    </header>
  );
}
