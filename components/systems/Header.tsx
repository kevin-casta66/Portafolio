import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { content } from "@/lib/content";
import { Link } from "@/i18n/navigation";

/**
 * Header presente en todas las páginas y renderizado en el servidor: nombre, CV, hueco de la Vista
 * Rápida e idioma funcionan sin JavaScript (el tema es el único control que lo necesita).
 */
export async function Header() {
  const t = await getTranslations("Header");
  const locale = await getLocale();
  const { name, cv } = content.profile;

  return (
    <header className="sticky top-0 z-[70] border-b border-border bg-bg/80 backdrop-blur">
      <div className="grid-12 items-center py-3">
        <div className="col-span-12 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <Link
            href="/"
            aria-label={`${name} — ${t("home")}`}
            className="font-display text-lg font-semibold"
          >
            {name}
          </Link>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={cv[locale]}
              download
              className="inline-flex h-10 items-center rounded-md border border-accent px-4 text-sm font-medium text-accent hover:bg-phase-tint"
            >
              {t("downloadCv")}
            </a>

            {/* Hueco reservado: la Vista Rápida se activa en el change 06 */}
            <div data-slot="quick-view">
              <button
                type="button"
                disabled
                title={t("quickViewSoon")}
                className="inline-flex h-10 items-center gap-1 rounded-md border border-border px-3 text-sm text-fg-muted disabled:cursor-not-allowed"
              >
                <span aria-hidden="true">⚡</span>
                {t("quickView")}
              </button>
            </div>

            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
