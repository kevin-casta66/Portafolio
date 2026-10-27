"use client";

import { useTranslations } from "next-intl";
import { lazy, Suspense, useState } from "react";

/** Id del popover de sonido: lo abren el botón de la cabecera y el «now playing» del Call Stack. */
export const SOUND_POPOVER_ID = "sound-popover";

const loadPanel = () => import("./SoundPanel");
const SoundPanel = lazy(loadPanel);

/**
 * Ajustes de sonido (design D8): botón de la cabecera + popover nativo (Escape lo cierra y devuelve
 * el foco al botón) con el volumen general y dos interruptores independientes, Música y Efectos.
 * Solo el botón y el marco del popover viajan en el JS inicial: el cuerpo (`SoundPanel`) se pide al
 * acercarse al botón (hover/foco/toque) o al abrir el popover, así que está listo antes de que se vea.
 */
export function SoundSettings() {
  const t = useTranslations("Sound");
  const th = useTranslations("Header");
  const [warm, setWarm] = useState(false);
  const warmUp = () => {
    if (!warm) {
      void loadPanel();
      setWarm(true);
    }
  };

  return (
    <>
      <button
        type="button"
        popoverTarget={SOUND_POPOVER_ID}
        aria-label={th("soundSettings")}
        title={th("soundSettings")}
        data-sound-settings
        onPointerEnter={warmUp}
        onFocus={warmUp}
        onTouchStart={warmUp}
        className="inline-flex size-10 items-center justify-center rounded-md border border-border bg-surface font-mono text-sm text-fg hover:border-accent"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
        </svg>
      </button>
      <div
        id={SOUND_POPOVER_ID}
        popover="auto"
        role="dialog"
        aria-label={t("title")}
        onToggle={(event) => {
          if ((event as unknown as { newState?: string }).newState === "open") warmUp();
        }}
        className="fixed inset-auto right-4 top-16 m-0 w-72 rounded-lg border border-border bg-surface-elevated p-4 text-fg shadow-lg"
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-mono text-sm font-semibold">{t("title")}</h2>
          <button
            type="button"
            popoverTarget={SOUND_POPOVER_ID}
            popoverTargetAction="hide"
            aria-label={t("close")}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border font-mono text-sm hover:border-accent"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {warm ? (
          <Suspense fallback={null}>
            <SoundPanel />
          </Suspense>
        ) : null}
      </div>
    </>
  );
}
