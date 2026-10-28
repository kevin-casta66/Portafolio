import { getLocale, getTranslations } from "next-intl/server";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { content } from "@/lib/content";
import { Link } from "@/i18n/navigation";
import {
  DebugToggle,
  QuickViewToggle,
  ReducedMotionToggle,
  ShortcutsButton,
  SoundToggle,
  TerminalButton,
} from "./HeaderControls";
import { SoundSettings } from "./Sound/SoundPopover";

/**
 * Header presente en todas las páginas y renderizado en el servidor: nombre, CV, Vista Rápida,
 * sonido, Debug, terminal, atajos, tema e idioma. El CV y el idioma funcionan sin JavaScript; el
 * resto de controles son pequeñas islas de cliente que comparten acciones con los atajos de teclado.
 */
export async function Header() {
  const t = await getTranslations("Header");
  const locale = await getLocale();
  const { name, cv } = content.profile;

  return (
    <header data-debug-name="Header" className="sticky top-0 z-[70] border-b border-border bg-bg/80 backdrop-blur">
      <div className="grid-12 items-center py-3">
        <div className="col-span-12 flex flex-wrap items-center justify-between gap-x-1.5 gap-y-2 sm:gap-x-4">
          <Link
            href="/"
            aria-label={`${name} — ${t("home")}`}
            className="font-display text-lg font-semibold"
          >
            {name}
          </Link>

          {/* En móvil el grupo se «disuelve» (display: contents): nombre y controles se reparten en 2 filas como máximo. */}
          <div className="contents sm:flex sm:flex-wrap sm:items-center sm:gap-2" role="group" aria-label={t("tools")}>
            <a
              href={cv[locale]}
              download
              data-cv-download
              aria-label={t("downloadCv")}
              className="inline-flex h-10 items-center rounded-md border border-accent px-2.5 text-sm font-medium text-accent hover:bg-phase-tint sm:px-4"
            >
              <span aria-hidden="true" className="sm:hidden">
                CV
              </span>
              <span className="hidden sm:inline">{t("downloadCv")}</span>
            </a>
            <QuickViewToggle />
            <SoundToggle />
            <SoundSettings />
            <DebugToggle />
            <ReducedMotionToggle />
            <TerminalButton />
            {/* Los atajos de teclado no sirven en pantallas táctiles: en móvil se oculta para que la cabecera no pase de 2 filas. */}
            <div className="hidden sm:contents">
              <ShortcutsButton />
            </div>
            <ThemeToggle />
            <LocaleSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
