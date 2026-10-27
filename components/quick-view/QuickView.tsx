import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { content } from "@/lib/content";
import { SKILL_CATEGORIES } from "@/lib/content/schema";
import { QuickViewActions } from "./QuickViewActions";

const formatMonth = (value: string, locale: string): string => {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year as number, (month as number) - 1, 1)),
  );
};

/**
 * Vista Rápida (modo reclutador): el currículum completo en UNA página escaneable, renderizado en el
 * servidor con los mismos datos de `content/` que el resto del sitio. Sin animaciones de scroll ni
 * escenas 3D; con estilos de impresión propios (`styles/print.css`). Cada sección lleva
 * `data-qv-phase` para volver a la fase equivalente al desactivarla.
 */
export async function QuickView() {
  const locale = await getLocale();
  const t = await getTranslations("QuickView");
  const tParser = await getTranslations("Parser");
  const { profile, projects, skills, experience, projectsBySkill } = content;
  const featured = projects.filter((p) => p.featured);
  const others = projects.filter((p) => !p.featured);
  const cvHref = profile.cv[locale as "es" | "en"] ?? profile.cv.es;
  const nameOf = (id: string) => skills.find((s) => s.id === id)?.name ?? id;

  return (
    <article data-quick-view aria-labelledby="qv-title" className="grid-12 gap-y-10 py-10 sm:py-14">
      <header
        id="qv-profile"
        data-qv-phase="source"
        className="col-span-12 border-b border-border pb-8"
      >
        <p className="font-mono text-sm text-accent">{t("headline")}</p>
        <h1 id="qv-title" tabIndex={-1} className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
          {profile.name}
        </h1>
        <p className="mt-2 text-xl">{profile.role[locale as "es" | "en"]}</p>
        <p className="mt-3 max-w-3xl text-lg text-fg-muted">{profile.valueProp[locale as "es" | "en"]}</p>
        <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-sm">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className={
                profile.availability.available
                  ? "size-2 rounded-full bg-syntax-string"
                  : "size-2 rounded-full bg-fg-muted"
              }
            />
            {profile.availability.label[locale as "es" | "en"]}
          </span>
          <span>{profile.location[locale as "es" | "en"]}</span>
          <a href={`mailto:${profile.email}`} className="underline underline-offset-4">
            {profile.email}
          </a>
          {profile.socials.map((s) => (
            <a key={s.id} href={s.url} rel="noopener noreferrer" className="underline underline-offset-4">
              {s.label}
            </a>
          ))}
        </p>
        <div className="quick-controls mt-5 flex flex-wrap gap-2">
          <a
            href={cvHref}
            download
            className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-medium text-bg hover:opacity-90"
          >
            {t("downloadCv")}
          </a>
          <QuickViewActions />
        </div>
      </header>

      <section id="qv-experience" data-qv-phase="bytecode" aria-labelledby="qv-experience-title" className="col-span-12 lg:col-span-7">
        <h2 id="qv-experience-title" className="font-display text-2xl font-semibold">
          {t("experience")}
        </h2>
        <ol className="mt-4 space-y-6">
          {experience.map((job) => (
            <li key={job.id}>
              <h3 className="text-lg font-semibold">
                {job.role[locale as "es" | "en"]} <span className="text-fg-muted">· {job.company}</span>
              </h3>
              <p className="font-mono text-sm text-fg-muted">
                {formatMonth(job.start, locale)} – {job.end ? formatMonth(job.end, locale) : t("present")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {job.achievements.map((a, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="mt-0.5 w-20 shrink-0 font-mono text-xs text-accent" aria-hidden="true">
                      {a.op}
                    </span>
                    <span>{a.text[locale as "es" | "en"]}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      <section id="qv-skills" data-qv-phase="parser" aria-labelledby="qv-skills-title" className="col-span-12 lg:col-span-5">
        <h2 id="qv-skills-title" className="font-display text-2xl font-semibold">
          {t("skills")}
        </h2>
        <div className="mt-4 space-y-4">
          {SKILL_CATEGORIES.map((category) => {
            const group = skills.filter((s) => s.category === category);
            if (group.length === 0) return null;
            return (
              <div key={category}>
                <h3 className="font-mono text-sm text-accent">
                  {tParser(`categories.${category}`)}
                </h3>
                <ul className="mt-1 space-y-1">
                  {group.map((skill) => {
                    const evidence = (projectsBySkill[skill.id] ?? []).map((p) => p.name);
                    return (
                      <li key={skill.id} className="text-sm">
                        <span className="font-medium">{skill.name}</span>
                        <span className="text-fg-muted">
                          {" · "}
                          {t("years", { count: skill.years })}
                          {evidence.length > 0 ? ` · ${t("evidence")}: ${evidence.join(", ")}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section id="qv-projects" data-qv-phase="runtime" aria-labelledby="qv-projects-title" className="col-span-12">
        <h2 id="qv-projects-title" className="font-display text-2xl font-semibold">
          {t("projects")}
        </h2>
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {featured.map((p) => (
            <li key={p.slug} className="rounded-lg border border-border bg-surface p-4">
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="font-mono text-xs text-fg-muted">
                PID {p.pid} · {p.status} · {p.year} · {p.role[locale as "es" | "en"]}
              </p>
              <p className="mt-2 text-fg-muted">{p.problem[locale as "es" | "en"]}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-sm">
                {p.metrics.map((m, i) => (
                  <span key={i}>
                    <span className="text-accent">{m.value}</span> {m.label[locale as "es" | "en"]}
                  </span>
                ))}
              </p>
              <p className="mt-2 text-sm text-fg-muted">{p.stack.map(nameOf).join(" · ")}</p>
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {p.links.caseStudy ? (
                  <Link href={`/projects/${p.links.caseStudy}`} className="underline underline-offset-4">
                    {t("caseStudy")}
                  </Link>
                ) : null}
                {p.links.demo ? (
                  <a href={p.links.demo} rel="noopener noreferrer" className="underline underline-offset-4">
                    Demo
                  </a>
                ) : null}
                {p.links.code ? (
                  <a href={p.links.code} rel="noopener noreferrer" className="underline underline-offset-4">
                    Code
                  </a>
                ) : null}
              </p>
            </li>
          ))}
        </ul>

        {others.length > 0 ? (
          <>
            <h3 className="mt-8 font-mono text-sm text-accent">{t("otherProjects")}</h3>
            <ul className="mt-2 space-y-2">
              {others.map((p) => (
                <li key={p.slug} className="text-sm">
                  <span className="font-medium">{p.name}</span>
                  <span className="text-fg-muted">
                    {" — "}
                    {p.problem[locale as "es" | "en"]} ({p.metrics.map((m) => `${m.value} ${m.label[locale as "es" | "en"]}`).join(", ")})
                  </span>
                  {p.links.code ? (
                    <>
                      {" · "}
                      <a href={p.links.code} rel="noopener noreferrer" className="underline underline-offset-4">
                        Code
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </section>

      <section id="qv-contact" data-qv-phase="display" aria-labelledby="qv-contact-title" className="col-span-12 border-t border-border pt-6">
        <h2 id="qv-contact-title" className="font-display text-2xl font-semibold">
          {t("contact")}
        </h2>
        <p className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
          <a href={`mailto:${profile.email}`} className="underline underline-offset-4">
            {profile.email}
          </a>
          {profile.socials.map((s) => (
            <a key={s.id} href={s.url} rel="noopener noreferrer" className="underline underline-offset-4">
              {s.label}: {s.url}
            </a>
          ))}
        </p>
      </section>
    </article>
  );
}
