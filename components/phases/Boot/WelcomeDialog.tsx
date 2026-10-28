"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, type MouseEvent } from "react";
import { audio } from "@/audio";
import { trapTab } from "@/components/systems/focus-trap";
import { toggleQuickView } from "@/lib/actions";
import { appStore } from "@/lib/store";

/**
 * Bienvenida tras la puerta de arranque (primera visita de la sesión): explica qué es el portafolio y
 * ofrece las dos formas de leerlo. «Vista Rápida» activa el currículum de una página (mismo camino que
 * el botón de la cabecera y la tecla Q); «Explorar» —y también Escape o un clic fuera— cierra el
 * diálogo y deja al visitante en el hero. Viaja en el chunk de la puerta, no en el JS inicial.
 */
export function WelcomeDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("Welcome");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const exploreRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    // `showModal` enfoca el primer botón; la opción por defecto es seguir con la experiencia completa.
    // Sin desplazar: en pantallas bajas el diálogo hace scroll y el título debe verse primero.
    exploreRef.current?.focus({ preventScroll: true });
    if (dialog) dialog.scrollTop = 0;
    audio.emit("ui:open");
  }, []);

  const explore = () => dialogRef.current?.close();
  const quickView = () => {
    if (!appStore.getState().quickView) toggleQuickView();
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-title"
      aria-describedby="welcome-intro"
      data-welcome
      onKeyDown={(event) => trapTab(event, dialogRef.current)}
      onClose={() => {
        onClose();
        if (!appStore.getState().quickView) {
          audio.emit("ui:enter");
          document.getElementById("content")?.focus({ preventScroll: true });
        }
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) explore();
      }}
      className="welcome m-auto w-[min(40rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-elevated p-0 text-fg"
    >
      <div className="flex flex-col gap-4 px-5 py-5 sm:px-8 sm:py-7">
        <header className="flex flex-col gap-1">
          <p className="font-mono text-xs text-fg-muted" aria-hidden="true">
            {t("eyebrow")}
          </p>
          <h2 id="welcome-title" className="font-display text-xl font-semibold text-balance">
            {t("title")}
          </h2>
        </header>

        <div id="welcome-intro" className="flex flex-col gap-2 text-sm text-pretty sm:text-base">
          <p>
            {t.rich("greeting", {
              name: (chunks) => <strong className="font-semibold text-accent">{chunks}</strong>,
            })}
          </p>
          <p className="text-fg-muted">{t("intro")}</p>
          <p className="self-end font-mono text-sm text-accent">{t("signature")}</p>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-mono text-xs text-fg-muted">{t("question")}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              data-welcome-choice="quick"
              onClick={quickView}
              className="flex flex-col items-start gap-1 rounded-md border border-border p-3 text-left hover:border-accent sm:p-4"
            >
              <span className="font-medium">{t("quick.title")}</span>
              <span className="text-sm text-fg-muted">{t("quick.description")}</span>
            </button>
            <button
              type="button"
              data-welcome-choice="explore"
              ref={exploreRef}
              onClick={explore}
              className="flex flex-col items-start gap-1 rounded-md border border-accent bg-phase-tint p-3 text-left hover:opacity-90 sm:p-4"
            >
              <span className="font-medium text-accent">{t("explore.title")}</span>
              <span className="text-sm text-fg-muted">{t("explore.description")}</span>
            </button>
          </div>
        </fieldset>

        <p className="text-xs text-fg-muted">
          {t.rich("hint", {
            key: (chunks) => (
              <kbd className="rounded border border-border bg-surface px-1.5 py-0.5 font-mono">
                {chunks}
              </kbd>
            ),
          })}
        </p>
      </div>
    </dialog>
  );
}
