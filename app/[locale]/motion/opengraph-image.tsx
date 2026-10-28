import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { ogContentType, ogSize, renderOgImage } from "@/lib/og-image";

export const alt = "Motion";
export const size = ogSize;
export const contentType = ogContentType;

/** Open Graph de `/motion` (change 08): título y descripción, con los colores de la fase GPU. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Motion" });
  return renderOgImage({
    kicker: `${t("kicker")} · T1–T11`,
    title: t("title"),
    subtitle: t("metaDescription"),
    phase: "gpu",
    footer: content.profile.name,
  });
}
