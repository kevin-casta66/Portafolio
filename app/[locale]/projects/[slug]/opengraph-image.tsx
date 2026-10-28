import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { loadCase } from "@/lib/cases";
import { content } from "@/lib/content";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Case study";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    content.caseNav.entries.map((entry) => ({ locale, slug: entry.slug })),
  );
}

/** Open Graph de un caso: nombre del proyecto y métrica principal, con el acento de la fase RUNTIME. */
export default async function Image({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: requested, slug } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const project = content.projects.find((p) => p.links.caseStudy === slug);
  const parsed = loadCase(slug, locale);
  const metric = project?.metrics[0];
  return renderOgImage({
    kicker: project ? `PID ${project.pid} · ${project.status} · ${project.year}` : "RUNTIME",
    title: project?.name ?? parsed?.frontmatter.title ?? content.profile.name,
    subtitle: metric ? `${metric.value} · ${metric.label[locale]}` : (parsed?.frontmatter.summary ?? ""),
    phase: "runtime",
    footer: content.profile.name,
  });
}
