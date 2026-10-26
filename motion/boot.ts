/**
 * Registro de arranque: el progreso del boot es REAL. Cada recurso que importa (fuentes, imágenes
 * críticas, y en el change 04 la escena 3D / la detección de GPU) se registra con `track(promise,
 * id)`; el progreso es la fracción de promesas resueltas, nunca un temporizador. La puerta aplica
 * además un tope de duración (`BOOT_MAX_MS`): si algo no terminó, los logs acaban igualmente y la
 * carga continúa en segundo plano.
 */
export const BOOT_MAX_MS = 2500;
/** Versión corta de visitas posteriores de la sesión. */
export const BOOT_SHORT_MS = 400;

export interface BootTrack {
  id: string;
  done: boolean;
  /** Valor real mostrado en la línea (p. ej. el número de proyectos o el tier de GPU). */
  value?: string | number | undefined;
}

export interface BootRegistry {
  track(id: string, promise: Promise<unknown>, value?: string | number): void;
  tracks(): BootTrack[];
  /** Fracción 0..1 de recursos resueltos (1 si no hay ninguno). */
  progress(): number;
  /** `true` cuando todo lo registrado terminó. */
  settled(): boolean;
  subscribe(listener: () => void): () => void;
  reset(): void;
}

export function createBootRegistry(): BootRegistry {
  let list: BootTrack[] = [];
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());

  return {
    track(id, promise, value) {
      const entry: BootTrack = { id, done: false, value };
      list = [...list, entry];
      emit();
      const finish = (result?: unknown) => {
        // Si no se pasó un valor y la promesa resuelve a uno mostrable (p. ej. el tier de GPU), se usa ese.
        if (entry.value === undefined && (typeof result === "string" || typeof result === "number"))
          entry.value = result;
        entry.done = true;
        list = [...list];
        emit();
      };
      // Un recurso que falla también «termina»: el arranque no debe colgarse por él.
      promise.then(finish, () => finish());
    },
    tracks: () => list,
    progress: () => (list.length === 0 ? 1 : list.filter((t) => t.done).length / list.length),
    settled: () => list.every((t) => t.done),
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    reset() {
      list = [];
      emit();
    },
  };
}

/** Registro global: el change 04 añade aquí «GPU detected» y la escena inicial. */
export const bootRegistry: BootRegistry = createBootRegistry();
