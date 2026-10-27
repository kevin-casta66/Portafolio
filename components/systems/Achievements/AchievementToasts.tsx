"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect } from "react";
import { getAchievement } from "@/lib/achievements";
import { appStore, useAppStore } from "@/lib/store";
import "@/content/achievements";

/** Tiempo que un aviso permanece en pantalla antes de dar paso al siguiente de la cola. */
const TOAST_MS = 4000;

/**
 * Avisos de logros (design D9): `ACHIEVEMENT_UNLOCKED: <id>` con estética de log del sistema.
 *
 *  - Cola FIFO en el store (`toastQueue`): se muestra UNO a la vez, así que dos desbloqueos seguidos
 *    nunca se superponen.
 *  - Región `role="status"` persistente y educada (`aria-live="polite"`): anuncia sin interrumpir.
 *  - Nunca recibe el foco; el botón de descartar solo se alcanza con Tab.
 *  - El contenedor ignora el puntero (`pointer-events: none`); solo el aviso lo recibe, y es pequeño.
 *  - Con movimiento reducido solo hay fundido (CSS en `styles/systems.css`).
 */
export default function AchievementToasts() {
  const t = useTranslations("Achievements");
  const locale = useLocale() as "es" | "en";
  const current = useAppStore((s) => s.toastQueue[0]);

  useEffect(() => {
    if (current === undefined) return;
    const timer = window.setTimeout(() => appStore.getState().shiftToast(), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [current]);

  const def = current === undefined ? undefined : getAchievement(current);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-achievement-toasts
      className="pointer-events-none fixed bottom-4 right-4 z-[85] max-w-[min(24rem,calc(100vw-2rem))] max-lg:bottom-16"
    >
      {current !== undefined ? (
        <div
          key={current}
          data-toast={current}
          className="toast pointer-events-auto flex items-start gap-3 rounded-lg border border-accent bg-surface-elevated p-3 font-mono text-sm text-fg shadow-lg"
        >
          <div className="min-w-0">
            <p className="break-words text-accent">
              <span className="sr-only">{t("toastPrefix")}: </span>
              <span aria-hidden="true">ACHIEVEMENT_UNLOCKED: </span>
              {current}
            </p>
            {def ? <p className="mt-1 text-fg-muted">{def.description[locale]}</p> : null}
          </div>
          <button
            type="button"
            aria-label={t("dismiss")}
            onClick={() => appStore.getState().shiftToast()}
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-md border border-border hover:border-accent"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
