import { audio } from "@/audio";
import { audioUnlock } from "@/lib/audio";
import { emit } from "@/lib/events";
import { appStore, type Theme } from "@/lib/store";

/**
 * Acciones globales compartidas por los controles de la interfaz, los atajos de teclado y los
 * comandos de la terminal. Una sola implementación por acción garantiza que cada atajo produce
 * EXACTAMENTE el mismo efecto que su control (spec `keyboard-shortcuts`). Es código de cliente muy
 * pequeño: no importa contenido ni nada pesado.
 */

/** Punto desde el que se revela el cambio de tema cuando no lo dispara el propio botón (atajo, comando). */
function themeOrigin(): { x: number; y: number } {
  const button = document.querySelector<HTMLElement>("[data-theme-toggle]");
  const box = button?.getBoundingClientRect();
  return box
    ? { x: box.left + box.width / 2, y: box.top + box.height / 2 }
    : { x: window.innerWidth - 80, y: 32 };
}

/** Cambia al tema indicado con el revelado circular (T10); si el módulo no carga, lo cambia igualmente. */
export function applyTheme(next: Theme, origin: { x: number; y: number } = themeOrigin()): void {
  const apply = () => {
    document.documentElement.setAttribute("data-theme", next);
    appStore.getState().setTheme(next);
  };
  void import("@/motion/uiTransition")
    .then((m) => m.revealTheme({ update: apply, origin }))
    .catch(apply);
}

export function toggleTheme(origin?: { x: number; y: number }): Theme {
  const next: Theme = appStore.getState().theme === "dark" ? "light" : "dark";
  audio.emit("theme", { theme: next });
  applyTheme(next, origin);
  return next;
}

/** Alterna el modo Debug. La primera activación desbloquea `debugger_attached`. */
export function toggleDebug(): boolean {
  const next = !appStore.getState().debug;
  appStore.getState().setDebug(next);
  audio.emit("ui:toggle");
  if (next) emit("achievement:unlock", { id: "debugger_attached" });
  return next;
}

/**
 * Alterna el sonido. Al activarlo, el `AudioContext` se crea/reanuda AQUÍ, dentro del gesto del
 * visitante (clic o tecla), como exigen las políticas de autoplay.
 */
export function toggleSound(): boolean {
  const next = !appStore.getState().sound.enabled;
  if (next) void audioUnlock();
  appStore.getState().setSoundEnabled(next);
  return next;
}

/** Alterna la Vista Rápida; `QuickViewSync` refleja el cambio en la URL y navega si hace falta. */
export function toggleQuickView(): boolean {
  const next = !appStore.getState().quickView;
  appStore.getState().setQuickView(next);
  audio.emit("ui:toggle");
  audio.emit(next ? "quickview:on" : "quickview:off");
  return next;
}

export function openTerminal(): void {
  audio.emit("ui:open");
  appStore.getState().setUi({ terminalOpen: true, shortcutsOpen: false });
}

export function closeTerminal(): void {
  appStore.getState().setUi({ terminalOpen: false });
}

export function openShortcuts(): void {
  appStore.getState().setUi({ shortcutsOpen: true, terminalOpen: false });
}

export function closeShortcuts(): void {
  appStore.getState().setUi({ shortcutsOpen: false });
}

/** Descarga un archivo con un enlace temporal (el CV desde la terminal). */
export function triggerDownload(href: string): void {
  const link = document.createElement("a");
  link.href = href;
  link.download = "";
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}
