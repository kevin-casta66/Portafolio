"use client";

import { useTranslations } from "next-intl";
import { applyTheme } from "@/lib/actions";
import { useAppStore, type Theme } from "@/lib/store";

/**
 * Control de tema: aplica `data-theme` y persiste la elección explícita, que prevalece sobre la
 * preferencia del sistema. El cambio es un revelado circular desde el botón (transición de vista; sin
 * soporte, fundido cruzado; con movimiento reducido, instantáneo): `motion/uiTransition.ts`, que se
 * carga bajo demanda y NO forma parte del JS inicial. El atajo `T` y el comando `theme` usan la misma
 * acción (`lib/actions.ts`), así que producen exactamente el mismo efecto.
 */
export function ThemeToggle() {
  const t = useTranslations("Header");
  const theme = useAppStore((s) => s.theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      data-theme-toggle
      onPointerEnter={() => void import("@/motion/uiTransition")}
      onFocus={() => void import("@/motion/uiTransition")}
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        applyTheme(next, { x: box.left + box.width / 2, y: box.top + box.height / 2 });
      }}
      aria-label={next === "light" ? t("themeToLight") : t("themeToDark")}
      className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-surface text-fg hover:border-accent"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
