import { ImageResponse } from "next/og";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { content } from "@/lib/content";
import { tokenColor } from "@/lib/og-colors";

export const alt = "Memory Heap";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Open Graph de `/heap`: dirección de memoria y título, con los colores de la fase RUNTIME. */
export default async function Image({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: requested } = await params;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "Heap" });
  const bg = tokenColor("--bg");
  const fg = tokenColor("--text");
  const muted = tokenColor("--text-muted");
  const accent = tokenColor("--accent-runtime");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: bg,
          color: fg,
        }}
      >
        <div style={{ display: "flex", fontSize: 34, color: accent }}>0x1a2b3c40 · {t("kicker")}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>{t("title")}</div>
          <div style={{ display: "flex", marginTop: 28, fontSize: 34, color: muted }}>
            {t("meta.description")}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 30, color: muted }}>{content.profile.name}</div>
      </div>
    ),
    size,
  );
}
