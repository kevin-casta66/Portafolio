"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, type MouseEvent } from "react";
import { closeShortcuts } from "@/lib/actions";
import type { Locale } from "@/lib/commands";
import { SHORTCUTS } from "@/lib/shortcuts";
import { appStore, useAppStore } from "@/lib/store";
import { trapTab } from "./focus-trap";

/**
 * Panel de atajos (`?`): un `<dialog>` modal nativo generado desde el MISMO registro que usa el
 * listener global (`lib/shortcuts.ts`), así lo documentado coincide siempre con lo que ocurre.
 * Incluye la preferencia «usar el cursor del sistema» (persistida).
 */
export default function ShortcutsPanel() {
  const t = useTranslations("Shortcuts");
  const locale = useLocale() as Locale;
  const open = useAppStore((s) => s.ui.shortcutsOpen);
  const cursor = useAppStore((s) => s.prefs.cursor);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="shortcuts-title"
      data-shortcuts-panel
      onKeyDown={(event) => trapTab(event, dialogRef.current)}
      onClose={() => {
        closeShortcuts();
        openerRef.current?.focus({ preventScroll: true });
      }}
      onClick={(event: MouseEvent<HTMLDialogElement>) => {
        if (event.target === event.currentTarget) closeShortcuts();
      }}
      className="shortcuts m-auto w-[min(34rem,calc(100vw-2rem))] rounded-lg border border-border bg-surface-elevated p-0 text-fg"
    >
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <h2 id="shortcuts-title" className="font-display text-lg font-semibold">
          {t("title")}
        </h2>
        <button
          type="button"
          onClick={closeShortcuts}
          aria-label={t("close")}
          className="inline-flex size-9 items-center justify-center rounded-md border border-border font-mono hover:border-accent"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <div className="px-5 py-4">
        <p className="text-sm text-fg-muted">{t("intro")}</p>
        <table className="mt-3 w-full text-left text-sm">
          <thead>
            <tr className="font-mono text-xs text-fg-muted">
              <th scope="col" className="w-16 pb-2 font-normal">
                {t("key")}
              </th>
              <th scope="col" className="pb-2 font-normal">
                {t("action")}
              </th>
              <th scope="col" className="pb-2 font-normal">
                {t("command")}
              </th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((shortcut) => (
              <tr key={shortcut.id} data-shortcut={shortcut.id} className="border-t border-border">
                <td className="py-2 pr-3 align-top">
                  <kbd className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-sm">
                    {shortcut.keys}
                  </kbd>
                </td>
                <td className="py-2 pr-3 align-top">{shortcut.description[locale]}</td>
                <td className="py-2 align-top font-mono text-fg-muted">
                  {shortcut.command ?? "—"}
                </td>
              </tr>
            ))}
            <tr data-shortcut="escape" className="border-t border-border">
              <td className="py-2 pr-3 align-top">
                <kbd className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-sm">
                  Esc
                </kbd>
              </td>
              <td className="py-2 pr-3 align-top">{t("escape")}</td>
              <td className="py-2 align-top font-mono text-fg-muted">—</td>
            </tr>
          </tbody>
        </table>

        <fieldset className="mt-5 border-t border-border pt-4">
          <legend className="sr-only">{t("preferences")}</legend>
          <h3 className="font-mono text-xs text-fg-muted" aria-hidden="true">
            {t("preferences")}
          </h3>
          <label className="mt-2 flex cursor-pointer items-center gap-3 text-sm">
            <input
              type="checkbox"
              checked={cursor === "system"}
              onChange={(event) =>
                appStore.getState().setCursorPref(event.target.checked ? "system" : "custom")
              }
              className="size-4 accent-[var(--accent)]"
            />
            {t("systemCursor")}
          </label>
        </fieldset>
      </div>
    </dialog>
  );
}
