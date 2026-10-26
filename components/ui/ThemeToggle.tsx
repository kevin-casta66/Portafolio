"use client";

import { useTranslations } from "next-intl";
import { useAppStore, appStore, type Theme } from "@/lib/store";

/**
 * Control simple de tema: aplica `data-theme` y persiste la elección explícita, que prevalece sobre
 * la preferencia del sistema. El cambio animado (revelado circular) llega en el change 05.
 */
export function ThemeToggle() {
  const t = useTranslations("Header");
  const theme = useAppStore((s) => s.theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onClick={() => {
        document.documentElement.setAttribute("data-theme", next);
        appStore.getState().setTheme(next);
      }}
      aria-label={next === "light" ? t("themeToLight") : t("themeToDark")}
      className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-surface text-fg hover:border-accent"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
