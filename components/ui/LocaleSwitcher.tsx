"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const LANGUAGE_NAMES: Record<Locale, string> = { es: "Español", en: "English" };

/** Enlaces reales (funcionan sin JavaScript) a la misma ruta en el otro idioma. */
export function LocaleSwitcher() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("language")} className="flex items-center gap-1 font-mono text-sm">
      {routing.locales.map((target) => {
        const current = target === locale;
        return (
          <Link
            key={target}
            href={pathname}
            locale={target}
            lang={target}
            hrefLang={target}
            aria-current={current ? "true" : undefined}
            aria-label={
              current
                ? undefined
                : t("switchTo", { language: LANGUAGE_NAMES[target], code: target.toUpperCase() })
            }
            className={
              current
                ? "rounded-sm px-2 py-1 text-accent"
                : "rounded-sm px-2 py-1 text-fg-muted hover:text-fg"
            }
          >
            {target.toUpperCase()}
          </Link>
        );
      })}
    </nav>
  );
}
