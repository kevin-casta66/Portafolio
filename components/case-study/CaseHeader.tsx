import { getTranslations } from "next-intl/server";
import type { Project } from "@/lib/content";
import type { Locale } from "@/i18n/routing";

interface CaseHeaderProps {
  title: string;
  summary: string;
  project: Project;
  locale: Locale;
  placeholder: boolean;
}

/**
 * Cabecera del caso («Attaching debugger…» → el proceso adjunto). Es la superficie en la que acaba
 * la transición T6: el motor 3D contrae la tarjeta expandida hasta el rectángulo de este elemento
 * (`data-case-header`), así que su posición y tamaño no dependen de nada que cargue después.
 */
export async function CaseHeader({ title, summary, project, locale, placeholder }: CaseHeaderProps) {
  const t = await getTranslations("Case");
  const r = await getTranslations("Runtime");

  return (
    <header
      data-case-header
      className="col-span-12 rounded-lg border border-border bg-surface p-6 sm:p-10"
    >
      <p className="flex flex-wrap items-center gap-x-3 font-mono text-sm text-accent">
        <span>{t("kicker")}</span>
        <span className="text-fg-muted">
          {r("pid")} {project.pid} · {project.status} · {project.year}
        </span>
      </p>
      <h1
        id="case-title"
        tabIndex={-1}
        className="mt-3 max-w-4xl font-display text-3xl font-semibold leading-tight outline-offset-8 sm:text-5xl"
      >
        {title}
      </h1>
      <p className="mt-4 max-w-3xl text-lg text-fg-muted">{summary}</p>
      <p className="mt-5 font-mono text-sm text-fg-muted">
        {r("role")}: {project.role[locale]}
      </p>
      {placeholder ? (
        <p
          role="note"
          className="mt-5 inline-block rounded-md border border-dashed border-border px-3 py-2 text-sm text-fg-muted"
        >
          {t("placeholderNotice")}
        </p>
      ) : null}
    </header>
  );
}
