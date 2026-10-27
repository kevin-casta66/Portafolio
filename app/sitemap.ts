import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";

/**
 * Sitemap mínimo generado desde el contenido (change 07): home, casos de estudio, Memory Heap y la vitrina /motion (change 08)
 * en cada idioma, con las alternativas hreflang. El change 09 lo amplía (`/motion`, robots, JSON-LD).
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ["", "/heap", "/motion", ...content.caseNav.entries.map((e) => `/projects/${e.slug}`)];
  return paths.map((path) => ({
    url: absoluteUrl(`/${routing.defaultLocale}${path}`),
    lastModified: new Date(),
    alternates: {
      languages: Object.fromEntries(routing.locales.map((l) => [l, absoluteUrl(`/${l}${path}`)])),
    },
  }));
}
