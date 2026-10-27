"use client";

import { useTranslations } from "next-intl";
import { toggleQuickView } from "@/lib/actions";

/** Acciones de la Vista Rápida: imprimir / guardar como PDF y volver a la experiencia completa. */
export function QuickViewActions() {
  const t = useTranslations("QuickView");
  return (
    <div className="flex flex-wrap gap-2" data-quick-actions>
      <button
        type="button"
        onClick={() => window.print()}
        data-quick-print
        className="inline-flex h-10 items-center rounded-md border border-accent px-4 text-sm font-medium text-accent hover:bg-phase-tint"
      >
        {t("print")}
      </button>
      <button
        type="button"
        onClick={() => void toggleQuickView()}
        data-quick-exit
        className="inline-flex h-10 items-center rounded-md border border-border px-4 text-sm hover:border-accent"
      >
        {t("exit")}
      </button>
    </div>
  );
}
