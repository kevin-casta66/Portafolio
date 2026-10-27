"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { audio } from "@/audio";
import { appStore } from "@/lib/store";

const VISIBLE_MS = 6000;

/**
 * Aviso discreto «Pulsa M para silenciar» la primera vez que suena algo (ADDENDUM-v3 §7). Se monta
 * mientras el sonido está activo y no se ha mostrado nunca; usa una región `status` (educada) que no
 * roba el foco y desaparece sola. Se carga de forma diferida con los demás sistemas de sonido.
 */
export default function SoundHint() {
  const t = useTranslations("Sound");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let stopFirst = () => {};
    let timer = 0;
    const attach = () => {
      stopFirst();
      stopFirst = audio.controls.onFirstSound(() => {
        if (appStore.getState().sound.hintShown) return;
        appStore.getState().markHintShown();
        setVisible(true);
        timer = window.setTimeout(() => setVisible(false), VISIBLE_MS);
      });
    };
    attach();
    // El motor se registra tras cargar: engancharse otra vez cuando aparece.
    const stopRegistry = audio.onRegistryChange(attach);
    return () => {
      stopFirst();
      stopRegistry();
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-4 left-1/2 z-[60] -translate-x-1/2"
    >
      {visible ? (
        <p
          data-sound-hint
          className="rounded-md border border-border bg-surface-elevated px-4 py-2 font-mono text-sm text-fg shadow-lg"
        >
          {t("hint")}
        </p>
      ) : null}
    </div>
  );
}
