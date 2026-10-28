import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Project } from "@/lib/content";
import { ProjectMedia } from "./ProjectMedia";

const STATUS_DOT: Record<Project["status"], string> = {
  running: "bg-syntax-string",
  deployed: "bg-accent",
  "open-source": "bg-syntax-type",
};

const linkClass =
  "inline-flex h-10 items-center rounded-md border border-border px-4 text-sm hover:border-accent hover:text-accent";

/** Tarjeta de «proceso»: un proyecto con PID, estado textual, métricas, media y enlaces. */
export async function ProcessCard({
  project,
  skillNames,
}: {
  project: Project;
  skillNames: Map<string, string>;
}) {
  const locale = await getLocale();
  const t = await getTranslations("Runtime");
  const titleId = `project-${project.slug}-title`;
  const { links, media } = project;
  // Hold-to-Execute (change 05): solo las tarjetas con caso de estudio se pueden «ejecutar».
  const hold = links.caseStudy
    ? {
        slug: links.caseStudy,
        descId: `project-${project.slug}-hold`,
        text: (await getTranslations("Hold"))("instruction"),
      }
    : null;

  return (
    <article
      id={`project-${project.slug}`}
      tabIndex={hold ? 0 : -1}
      aria-labelledby={titleId}
      aria-describedby={hold?.descId}
      data-hold={hold?.slug}
      data-hold-title={hold ? project.name : undefined}
      data-anim="process-card"
      data-twin={`card:${project.slug}`}
      data-status={project.status}
      data-stack={project.stack.join(" ")}
      className="relative scroll-mt-24 overflow-hidden rounded-lg border border-border bg-surface "
    >
      <ProjectMedia
        image={media.image}
        alt={media.alt[locale]}
        video={media.video}
        poster={media.poster}
        fallbackMessage={t("videoFallback")}
      />

      <div className="p-5 sm:p-6">
        <p className="flex flex-wrap items-center gap-x-3 font-mono text-xs text-fg-muted">
          <span>
            {t("pid")} {project.pid}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`size-2 rounded-full ${STATUS_DOT[project.status]}`}
            />
            <span className="sr-only">{t("state")}: </span>
            {project.status}
          </span>
        </p>

        <h3 id={titleId} className="mt-2 font-display text-2xl font-semibold">
          {project.name}
        </h3>
        <p className="mt-2 text-fg-muted">{project.problem[locale]}</p>

        <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-mono text-xs text-fg-muted">{t("role")}</dt>
            <dd>{project.role[locale]}</dd>
          </div>
          <div>
            <dt className="font-mono text-xs text-fg-muted">{t("stack")}</dt>
            <dd>{project.stack.map((id) => skillNames.get(id) ?? id).join(", ")}</dd>
          </div>
        </dl>

        <h4 className="mt-5 font-mono text-xs text-fg-muted">{t("metrics")}</h4>
        <dl className="mt-1 flex flex-wrap gap-x-8 gap-y-2">
          {project.metrics.map((metric) => (
            <div key={metric.label.en}>
              <dd className="font-mono text-xl font-semibold text-accent">{metric.value}</dd>
              <dt className="text-xs text-fg-muted">{metric.label[locale]}</dt>
            </div>
          ))}
        </dl>

        {hold ? (
          <p id={hold.descId} className="sr-only">
            {hold.text}
          </p>
        ) : null}

        {links.demo || links.code || links.caseStudy ? (
          <p className="mt-6 flex flex-wrap items-center gap-3">
            {links.demo ? (
              <a href={links.demo} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("demo")}
              </a>
            ) : null}
            {links.code ? (
              <a href={links.code} target="_blank" rel="noopener noreferrer" className={linkClass}>
                {t("code")}
              </a>
            ) : null}
            {links.caseStudy ? (
              <Link href={`/projects/${links.caseStudy}`} data-hold-link className="case-cta">
                <span className="case-cta-inner">
                  {t("caseStudy")}
                  <span aria-hidden="true" className="case-cta-arrow">
                    →
                  </span>
                </span>
              </Link>
            ) : null}
          </p>
        ) : null}
        {hold ? (
          // Pista visible del Hold-to-Execute (el lector de pantalla ya la oye en `aria-describedby`).
          <p aria-hidden="true" className="case-cta-hint mt-3 font-mono text-xs text-fg-muted">
            {t("holdHint")}
          </p>
        ) : null}
      </div>
    </article>
  );
}
