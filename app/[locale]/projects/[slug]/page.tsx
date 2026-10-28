import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArchitectureDiagram } from "@/components/case-study/ArchitectureDiagram";
import { BreakpointNav } from "@/components/case-study/BreakpointNav";
import { CaseHeader } from "@/components/case-study/CaseHeader";
import { MetricChart } from "@/components/case-study/MetricChart";
import { StepNav, type StepTarget } from "@/components/case-study/StepNav";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { loadCase } from "@/lib/cases";
import { JsonLd } from "@/components/seo/JsonLd";
import { caseJsonLd, localizedAlternates, socialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

/** Solo existen las rutas de los proyectos con caso de estudio; cualquier otro slug es un 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    content.caseNav.entries.map((entry) => ({ locale, slug: entry.slug })),
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const parsed = loadCase(slug, locale);
  if (!parsed) return {};
  const title = `${parsed.frontmatter.title} — ${content.profile.name}`;
  const description = parsed.frontmatter.summary;
  const path = `/projects/${slug}`;
  return {
    title,
    description,
    alternates: localizedAlternates(locale, path),
    ...socialMetadata(locale, path, title, description),
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { locale, slug } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const nav = content.caseNav.bySlug[slug];
  const parsed = loadCase(slug, locale);
  const project = content.projects.find((p) => p.links.caseStudy === slug);
  if (!nav || !parsed || !project) notFound();
  const { frontmatter } = parsed;

  const jsonLd = caseJsonLd(locale, slug, frontmatter.title, frontmatter.summary);
  const { default: Post } = await import(`@/content/cases/${slug}.${locale}.mdx`);

  const t = await getTranslations("Case");
  const bp = await getTranslations("Case.breakpoints");
  const items = frontmatter.breakpoints.map((id) => ({ id, title: bp(id) }));

  const target = (entrySlug: string | null): StepTarget | null => {
    if (!entrySlug) return null;
    const other = loadCase(entrySlug, locale);
    return other ? { slug: entrySlug, title: other.frontmatter.title } : null;
  };

  return (
    <article
      data-phase="runtime"
      data-case-page={slug}
      aria-labelledby="case-title"
      className="case-page pb-20 pt-10 sm:pt-14"
    >
      {jsonLd ? <JsonLd data={jsonLd} /> : null}
      <div className="grid-12 gap-y-8">
        <CaseHeader
          title={frontmatter.title}
          summary={frontmatter.summary}
          project={project}
          locale={locale}
          placeholder={frontmatter.placeholder}
        />

        <div className="col-span-12 lg:col-span-3">
          <BreakpointNav
            items={items}
            label={t("indexLabel")}
            toggleLabel={t("indexToggle")}
            currentTemplate={t("indexCurrent", { title: "%s" })}
          />
        </div>

        <div className="col-span-12 min-w-0 lg:col-span-9">
          <Post
            components={{
              ArchitectureDiagram: () =>
                frontmatter.diagram ? <ArchitectureDiagram diagram={frontmatter.diagram} /> : null,
              MetricChart: () => <MetricChart metrics={frontmatter.metrics} />,
            }}
          />
          <div className="mt-12">
            <StepNav
              prev={target(nav.prev)}
              next={target(nav.next)}
              index={nav.index}
              total={nav.total}
            />
          </div>
        </div>
      </div>
    </article>
  );
}
