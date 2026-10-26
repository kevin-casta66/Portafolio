"use client";

import { useTranslations } from "next-intl";
import { useAppStore, appStore, type Theme } from "@/lib/store";

/**
 * Control de tema: aplica `data-theme` y persiste la elección explícita, que prevalece sobre la
 * preferencia del sistema. El cambio es un revelado circular desde el botón (transición de vista; sin
 * soporte, fundido cruzado; con movimiento reducido, instantáneo): `motion/uiTransition.ts`, que se
 * carga bajo demanda y NO forma parte del JS inicial.
 */
export function ThemeToggle() {
  const t = useTranslations("Header");
  const theme = useAppStore((s) => s.theme);
  const next: Theme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      onPointerEnter={() => void import("@/motion/uiTransition")}
      onFocus={() => void import("@/motion/uiTransition")}
      onClick={(event) => {
        const apply = () => {
          document.documentElement.setAttribute("data-theme", next);
          appStore.getState().setTheme(next);
        };
        const box = event.currentTarget.getBoundingClientRect();
        const origin = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        // Si el módulo de la transición no carga (red, bloqueo), el tema se cambia igualmente.
        void import("@/motion/uiTransition")
          .then((m) => m.revealTheme({ update: apply, origin }))
          .catch(apply);
      }}
      aria-label={next === "light" ? t("themeToLight") : t("themeToDark")}
      className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-surface text-fg hover:border-accent"
    >
      <span aria-hidden="true">{theme === "dark" ? "☀" : "☾"}</span>
    </button>
  );
}
