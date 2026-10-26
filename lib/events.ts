/**
 * Bus de eventos global (fuera de React, sin dependencias). Cualquier módulo puede emitir; los
 * sistemas que llegan después (logros del change 06, Modo Debug…) se suscriben cuando existen. Si no
 * hay nadie escuchando, el evento se emite y se ignora: emitir nunca falla ni retrasa nada.
 */
export interface AppEvents {
  /** Un logro se desbloquea (el sistema de logros del change 06 deduplica y persiste). */
  "achievement:unlock": { id: string };
}

type Handler<K extends keyof AppEvents> = (payload: AppEvents[K]) => void;

const handlers = new Map<keyof AppEvents, Set<Handler<keyof AppEvents>>>();

/** Se suscribe a un evento; devuelve la función que cancela la suscripción. */
export function on<K extends keyof AppEvents>(event: K, handler: Handler<K>): () => void {
  let set = handlers.get(event);
  if (!set) handlers.set(event, (set = new Set()));
  set.add(handler as Handler<keyof AppEvents>);
  return () => set.delete(handler as Handler<keyof AppEvents>);
}

/** Emite un evento. Un suscriptor que falla no impide que los demás lo reciban. */
export function emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
  // Gancho de pruebas en navegador: si la página define `window.__compileEventLog = []`, se anota aquí.
  if (typeof window !== "undefined") {
    (window as { __compileEventLog?: unknown[] }).__compileEventLog?.push({ event, payload });
  }
  for (const handler of [...(handlers.get(event) ?? [])]) {
    try {
      handler(payload);
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error(`[events] ${event}`, error);
    }
  }
}

/** Almacenamiento mínimo para «una sola vez por sesión» (sessionStorage en el navegador). */
export interface OnceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const sessionOnce = (): OnceStorage | null => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

/** Claves de sesión de los eventos «una sola vez». */
export const PROCESS_EXECUTED_KEY = "compile:event:process_executed";

/**
 * Emite `achievement:unlock` con `process_executed` SOLO la primera vez de la sesión (primer
 * Hold-to-Execute completo). Sin almacenamiento disponible lo recuerda en memoria. Devuelve si emitió.
 */
let executedInMemory = false;
export function announceProcessExecuted(storage: OnceStorage | null = sessionOnce()): boolean {
  let already = executedInMemory;
  try {
    already ||= storage?.getItem(PROCESS_EXECUTED_KEY) === "1";
  } catch {
    /* almacenamiento bloqueado: basta con la memoria */
  }
  if (already) return false;
  executedInMemory = true;
  try {
    storage?.setItem(PROCESS_EXECUTED_KEY, "1");
  } catch {
    /* idem */
  }
  emit("achievement:unlock", { id: "process_executed" });
  return true;
}

/** Solo para pruebas. */
export function resetEventsForTests(): void {
  handlers.clear();
  executedInMemory = false;
}
