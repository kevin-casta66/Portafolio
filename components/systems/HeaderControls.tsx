"use client";

import { useTranslations } from "next-intl";
import {
  openShortcuts,
  openTerminal,
  toggleDebug,
  toggleQuickView,
  toggleReducedMotion,
  toggleSound,
} from "@/lib/actions";
import { useIsReduced } from "@/lib/experience";
import { useAppStore } from "@/lib/store";
import { loadShortcuts, loadTerminal } from "./chunks";

const BUTTON =
  "inline-flex size-10 items-center justify-center rounded-md border border-border bg-surface font-mono text-sm text-fg hover:border-accent aria-pressed:border-accent aria-pressed:text-accent";

/** Vista Rápida ⚡: siempre visible en el header de todas las páginas. */
export function QuickViewToggle() {
  const t = useTranslations("Header");
  const quick = useAppStore((s) => s.quickView);
  return (
    <button
      type="button"
      aria-pressed={quick}
      title={t("quickViewHint")}
      aria-label={t("quickView")}
      data-quick-view-toggle
      onClick={() => void toggleQuickView()}
      className="inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border border-border bg-surface px-2 text-sm text-fg hover:border-accent aria-pressed:border-accent aria-pressed:text-accent sm:px-3"
    >
      <span aria-hidden="true">⚡</span>
      <span className="hidden sm:inline">{t("quickView")}</span>
    </button>
  );
}

/** Botón de sonido siempre visible: silencia o reactiva TODO el audio al instante. */
export function SoundToggle() {
  const t = useTranslations("Header");
  const enabled = useAppStore((s) => s.sound.enabled);
  return (
    <button
      type="button"
      aria-pressed={enabled}
      aria-label={enabled ? t("soundOn") : t("soundOff")}
      title={enabled ? t("soundOn") : t("soundOff")}
      data-sound-toggle
      onClick={() => void toggleSound()}
      className={BUTTON}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 5 6 9H3v6h3l5 4V5Z" />
        {enabled ? (
          <>
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </>
        ) : (
          <path d="m16 9 5 6m0-6-5 6" />
        )}
      </svg>
    </button>
  );
}

/** Botón del modo Debug (también `debug` en la terminal y la tecla D). */
export function DebugToggle() {
  const t = useTranslations("Header");
  const debug = useAppStore((s) => s.debug);
  return (
    <button
      type="button"
      aria-pressed={debug}
      aria-label={debug ? t("debugOn") : t("debugOff")}
      title={debug ? t("debugOn") : t("debugOff")}
      data-debug-toggle
      onClick={() => void toggleDebug()}
      className={BUTTON}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m8 2 1.9 1.9M16 2l-1.9 1.9M9 7.1v-.2a3 3 0 0 1 6 0v.2" />
        <path d="M12 20a6 6 0 0 1-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3a6 6 0 0 1-6 6ZM12 20v-9M6.5 13H2M17.5 13H22M3 21c0-2.1 1.7-3.9 3.8-4M20.9 21c0-2.1-1.7-3.9-3.9-4" />
      </svg>
    </button>
  );
}

/**
 * Movimiento reducido manual (change 09): alterna entre el modo completo y el reducido y recuerda la
 * elección en la sesión. Hasta hidratar refleja el modo que fijó el script de `<head>`.
 */
export function ReducedMotionToggle() {
  const t = useTranslations("Header");
  const reduced = useIsReduced();
  return (
    <button
      type="button"
      aria-pressed={reduced}
      aria-label={t("reducedMotion")}
      title={reduced ? t("reducedMotionOn") : t("reducedMotionOff")}
      data-reduced-motion-toggle
      onClick={() => void toggleReducedMotion()}
      className={BUTTON}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        {reduced ? <path d="M9 9v6M15 9v6" /> : <path d="m10 8 6 4-6 4V8Z" />}
      </svg>
    </button>
  );
}

/** Abre la terminal (el atajo `~` hace lo mismo). Precarga su chunk al acercarse. */
export function TerminalButton() {
  const t = useTranslations("Header");
  return (
    <button
      type="button"
      aria-label={t("terminal")}
      title={t("terminal")}
      data-terminal-button
      onPointerEnter={() => void loadTerminal()}
      onFocus={() => void loadTerminal()}
      onClick={openTerminal}
      className={BUTTON}
    >
      <span aria-hidden="true">&gt;_</span>
    </button>
  );
}

/** Abre el panel de atajos (la tecla `?` hace lo mismo). */
export function ShortcutsButton() {
  const t = useTranslations("Header");
  return (
    <button
      type="button"
      aria-label={t("shortcuts")}
      title={t("shortcuts")}
      data-shortcuts-button
      onPointerEnter={() => void loadShortcuts()}
      onFocus={() => void loadShortcuts()}
      onClick={openShortcuts}
      className={BUTTON}
    >
      <span aria-hidden="true">?</span>
    </button>
  );
}
