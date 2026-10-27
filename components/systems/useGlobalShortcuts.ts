"use client";

import { useEffect } from "react";
import {
  openShortcuts,
  openTerminal,
  toggleDebug,
  toggleQuickView,
  toggleSound,
  toggleTheme,
} from "@/lib/actions";
import { dispatchShortcut, type KeyEventLike, type ShortcutActions } from "@/lib/shortcuts";
import { appStore } from "@/lib/store";

/**
 * UN único listener `keydown` para todos los atajos (design D3). La resolución (¿es un atajo?, ¿el foco
 * está en un campo editable?, ¿hay modificadores del sistema?) vive en `lib/shortcuts.ts`, que se
 * prueba sin DOM; aquí solo se conecta con las acciones compartidas con los controles de la interfaz.
 */
export function useGlobalShortcuts(): void {
  useEffect(() => {
    const actions: ShortcutActions = {
      terminal: openTerminal,
      help: openShortcuts,
      "quick-view": () => void toggleQuickView(),
      debug: () => void toggleDebug(),
      theme: () => void toggleTheme(),
      sound: () => void toggleSound(),
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const { ui, bootDone } = appStore.getState();
      // Con una superficie modal abierta o la puerta de arranque en curso, los atajos no actúan.
      if (!bootDone || ui.terminalOpen || ui.shortcutsOpen) return;
      if (dispatchShortcut(event as unknown as KeyEventLike, actions) !== null) event.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
