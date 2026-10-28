import type { Metadata } from "next";
import { routing, type Locale } from "@/i18n/routing";
import { content } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

/**
 * Metadatos y datos estructurados comunes (change 09). Todo sale de `content/`; las URLs son
 * relativas a `metadataBase` (layout) salvo en el JSON-LD, que exige URLs absolutas.
 */

/** Canonical y `hreflang` (es, en, x-default → idioma por defecto) de una ruta sin prefijo de idioma. */
export function localizedAlternates(locale: Locale, path: string): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}${path}`])),
      "x-default": `/${routing.defaultLocale}${path}`,
    },
  };
}

/** Open Graph + Twitter coherentes con el título y la descripción de la página. */
export function socialMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: { title, description, type: "website", locale, url: `/${locale}${path}`, siteName: content.profile.name },
    twitter: { card: "summary_large_image", title, description },
  };
}

type JsonLd = Record<string, unknown>;

const skillName = (id: string) => content.skills.find((s) => s.id === id)?.name ?? id;

/** `Person` de la home: nombre, rol, URL, redes y conocimientos. */
export function personJsonLd(locale: Locale): JsonLd {
  const { profile, skills } = content;
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": absoluteUrl(`/${locale}#person`),
    name: profile.name,
    jobTitle: profile.role[locale],
    description: profile.valueProp[locale],
    url: absoluteUrl(`/${locale}`),
    sameAs: profile.socials.map((s) => s.url),
    knowsAbout: skills.map((s) => s.name),
    knowsLanguage: routing.locales,
  };
}

/** `CreativeWork` de un caso de estudio, desde el proyecto y el frontmatter del caso. */
export function caseJsonLd(locale: Locale, slug: string, title: string, summary: string): JsonLd | null {
  const project = content.projects.find((p) => p.links.caseStudy === slug);
  if (!project) return null;
  const url = absoluteUrl(`/${locale}/projects/${slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    "@id": `${url}#work`,
    name: title,
    headline: title,
    description: summary,
    url,
    inLanguage: locale,
    datePublished: String(project.year),
    author: { "@type": "Person", "@id": absoluteUrl(`/${locale}#person`), name: content.profile.name },
    keywords: project.stack.map(skillName),
    sameAs: [project.links.demo, project.links.code].filter((u): u is string => Boolean(u)),
  };
}

/** Serialización segura para incrustar en `<script type="application/ld+json">`. */
export const serializeJsonLd = (data: JsonLd): string => JSON.stringify(data).replace(/</g, String.raw`\u003c`);
