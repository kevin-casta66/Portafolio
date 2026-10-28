import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Portfolio";
export const size = ogSize;
export const contentType = ogContentType;

/** Open Graph de la home: nombre y rol, con los colores de la fase SOURCE. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return renderOgImage({
    kicker: "main() · SOURCE",
    title: content.profile.name,
    subtitle: `${content.profile.role[locale]} — ${t("ogTagline")}`,
    phase: "source",
    footer: content.profile.location[locale],
  });
}
