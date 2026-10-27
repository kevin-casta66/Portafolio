import type { ComponentType } from "react";

/**
 * Cargadores diferidos de los sistemas globales (design: «cargado de forma diferida salvo lo
 * imprescindible»). Cada sistema es su propio chunk; `once` memoriza la promesa, así que el prefetch
 * (hover/foco en el botón) y la carga real comparten la misma petición. Ninguno forma parte del JS
 * inicial.
 */
const cache = new Map<string, Promise<unknown>>();

function once<T>(key: string, load: () => Promise<T>): () => Promise<T> {
  return () => {
    let promise = cache.get(key) as Promise<T> | undefined;
    if (!promise) {
      promise = load();
      cache.set(key, promise);
      // Si falla (red, bloqueo) se olvida para poder reintentar; el sitio no depende de ningún sistema.
      promise.catch(() => cache.delete(key));
    }
    return promise;
  };
}

type Module = { default: ComponentType };

export const loadCallStack = once<Module>("callstack", () => import("./CallStack"));
export const loadToasts = once<Module>("toasts", () => import("./Achievements/AchievementToasts"));
export const loadTerminal = once<Module>("terminal", () => import("./Terminal"));
export const loadShortcuts = once<Module>("shortcuts", () => import("./ShortcutsPanel"));
export const loadCursor = once<Module>("cursor", () => import("./Cursor"));
export const loadSound = once<Module>("sound", () => import("./Sound/SoundManager"));
export const loadDebug = once<Module>("debug", () => import("./Debug/DebugOverlay"));
