import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Memory Heap";
export const size = ogSize;
export const contentType = ogContentType;

/** Open Graph de `/heap`: dirección de memoria y título, con los colores de la fase RUNTIME. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Heap" });
  return renderOgImage({
    kicker: `0x1a2b3c40 · ${t("kicker")}`,
    title: t("title"),
    subtitle: t("meta.description"),
    phase: "runtime",
    footer: content.profile.name,
  });
}
