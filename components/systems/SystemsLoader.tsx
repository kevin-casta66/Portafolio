"use client";

import { useEffect, useState, type ComponentType } from "react";
import { afterLcp } from "@/lib/after-lcp";
import { useAppStore } from "@/lib/store";
import {
  loadCallStack,
  loadCursor,
  loadDebug,
  loadMixer,
  loadShortcuts,
  loadSound,
  loadSoundHint,
  loadTerminal,
  loadToasts,
} from "./chunks";
import { useGlobalShortcuts } from "./useGlobalShortcuts";
import { useMediaQuery } from "./useMediaQuery";

/** Carga un sistema (su propio chunk) cuando `enabled`; si el import falla, el sitio sigue completo. */
function Lazy({ load, enabled }: { load: () => Promise<{ default: ComponentType }>; enabled: boolean }) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  useEffect(() => {
    if (!enabled || Component) return;
    let cancelled = false;
    load()
      .then((module) => {
        if (!cancelled) setComponent(() => module.default);
      })
      .catch(() => {
        /* sin este sistema: el contenido esencial sigue operable */
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, Component, load]);
  // El módulo se conserva descargado, pero el sistema solo está montado mientras está habilitado
  // (desactivar Debug, el sonido o el cursor propio lo desmonta y libera lo que tuviera en marcha).
  return enabled && Component ? <Component /> : null;
}

/**
 * Monta los sistemas globales UNA vez en el layout raíz (sobreviven a la navegación entre home y
 * casos). Es lo único de este change que viaja en el JS inicial junto con los botones del header:
 * el listener de atajos y la lógica de qué cargar y cuándo.
 *
 *  - Tras el LCP: Call Stack, avisos de logros y cursor (solo puntero fino y sin preferencia de sistema).
 *  - Bajo demanda: terminal y panel de atajos (al abrirlos), Debug (al activarlo), sonido (al activarlo).
 *  - Los avisos también se cargan en cuanto hay un logro en cola (p. ej. `kernel_panic` en la 404).
 */
export function SystemsLoader() {
  useGlobalShortcuts();

  const [afterPaint, setAfterPaint] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void afterLcp().then(() => {
      if (!cancelled) setAfterPaint(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const terminalOpen = useAppStore((s) => s.ui.terminalOpen);
  const shortcutsOpen = useAppStore((s) => s.ui.shortcutsOpen);
  const debug = useAppStore((s) => s.debug);
  const soundEnabled = useAppStore((s) => s.sound.enabled);
  const hintShown = useAppStore((s) => s.sound.hintShown);
  const mixerOpen = useAppStore((s) => s.ui.mixerOpen);
  const hasToast = useAppStore((s) => s.toastQueue.length > 0);
  const cursorPref = useAppStore((s) => s.prefs.cursor);

  // Una vez abiertos, terminal y panel permanecen montados (conservan su historial y su estado).
  // Estado derivado durante el render (patrón recomendado): sin efectos ni renders en cascada.
  const [terminalSeen, setTerminalSeen] = useState(false);
  if (terminalOpen && !terminalSeen) setTerminalSeen(true);
  const [shortcutsSeen, setShortcutsSeen] = useState(false);
  if (shortcutsOpen && !shortcutsSeen) setShortcutsSeen(true);
  const [mixerSeen, setMixerSeen] = useState(false);
  if (mixerOpen && !mixerSeen) setMixerSeen(true);

  const finePointer = useMediaQuery("(hover: hover) and (pointer: fine)");

  return (
    <>
      <Lazy load={loadCallStack} enabled={afterPaint} />
      <Lazy load={loadToasts} enabled={afterPaint || hasToast} />
      <Lazy load={loadCursor} enabled={afterPaint && finePointer && cursorPref === "custom"} />
      <Lazy load={loadTerminal} enabled={terminalOpen || terminalSeen} />
      <Lazy load={loadShortcuts} enabled={shortcutsOpen || shortcutsSeen} />
      <Lazy load={loadDebug} enabled={debug} />
      <Lazy load={loadSound} enabled={soundEnabled} />
      <Lazy load={loadSoundHint} enabled={soundEnabled && !hintShown} />
      <Lazy load={loadMixer} enabled={mixerOpen || mixerSeen} />
    </>
  );
}
