import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export interface StepTarget {
  slug: string;
  title: string;
}

interface StepNavProps {
  prev: StepTarget | null;
  next: StepTarget | null;
  index: number;
  total: number;
}

const linkClass =
  "inline-flex min-h-12 items-center rounded-md border border-accent px-5 font-mono text-sm text-accent hover:bg-phase-tint";
const disabledClass =
  "inline-flex min-h-12 items-center rounded-md border border-border px-5 font-mono text-sm text-fg-muted";

/**
 * «Step back ◀» / «Step over ▶» entre casos, en el orden de los proyectos. En los extremos el control
 * no se oculta: queda deshabilitado y su texto lo explica (`aria-disabled`, sin enlace). Más el enlace
 * para volver a la sección de proyectos del inicio.
 */
export async function StepNav({ prev, next, index, total }: StepNavProps) {
  const t = await getTranslations("Case.nav");
  const home = await getTranslations("Case");
  return (
    <nav aria-label={t("label")} className="border-t border-border pt-8">
      <p className="mb-4 font-mono text-sm text-fg-muted">
        {t("position", { index: index + 1, total })}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {prev ? (
          <Link
            href={`/projects/${prev.slug}`}
            data-case-step="prev"
            className={linkClass}
          >
            {t("back")}
            <span className="sr-only">. {t("backLabel", { title: prev.title })}</span>
          </Link>
        ) : (
          <span aria-disabled="true" title={t("first")} className={disabledClass}>
            {t("back")}
            <span className="sr-only">. {t("first")}</span>
          </span>
        )}

        {next ? (
          <Link
            href={`/projects/${next.slug}`}
            data-case-step="next"
            className={linkClass}
          >
            {t("over")}
            <span className="sr-only">. {t("overLabel", { title: next.title })}</span>
          </Link>
        ) : (
          <span aria-disabled="true" title={t("last")} className={disabledClass}>
            {t("over")}
            <span className="sr-only">. {t("last")}</span>
          </span>
        )}

        <Link
          href="/#runtime"
          data-case-home
          className="inline-flex min-h-12 items-center rounded-md px-3 text-sm text-fg-muted underline underline-offset-4 hover:text-accent sm:ml-auto"
        >
          {home("backHome")}
        </Link>
      </div>
    </nav>
  );
}
