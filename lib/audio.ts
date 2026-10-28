/**
 * Desbloqueo mínimo del audio. Los navegadores solo permiten reproducir tras un gesto del usuario:
 * `audioUnlock()` crea (si hace falta) y reanuda el `AudioContext` y se llama DENTRO del manejador de
 * clic de «▶ Iniciar con sonido». No carga ni reproduce ningún sonido: el diseño sonoro es del
 * change 06, que reutiliza este módulo.
 */
type AudioContextCtor = typeof AudioContext;

let context: AudioContext | null = null;

function contextClass(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function getAudioContext(): AudioContext | null {
  return context;
}

/** Crea/reanuda el contexto. Devuelve `true` si queda en ejecución. Debe llamarse en un gesto. */
export async function audioUnlock(): Promise<boolean> {
  try {
    const Ctor = contextClass();
    if (!Ctor) return false;
    context ??= new Ctor();
    if (context.state === "suspended") await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

/** Eventos que los navegadores aceptan como activación del usuario (la rueda y el hover NO cuentan). */
const GESTURES = ["pointerdown", "pointerup", "keydown", "touchend"] as const;

/**
 * Llama a `callback` UNA vez con el primer gesto de activación (clic, tecla o toque) y deja de escuchar.
 * Ignora los gestos sobre el aviso «Activar sonido» (`[data-sound-unlock]`): ese botón arranca el audio con
 * su propio clic, así no se oculta a mitad del clic. Devuelve la función que cancela la espera.
 */
export function onUnlockGesture(callback: () => void): () => void {
  const handler = (event: Event) => {
    if (event.target instanceof Element && event.target.closest("[data-sound-unlock]")) return;
    cleanup();
    callback();
  };
  const cleanup = () => GESTURES.forEach((e) => window.removeEventListener(e, handler, true));
  GESTURES.forEach((e) => window.addEventListener(e, handler, { capture: true, passive: true }));
  return cleanup;
}

/**
 * Visitas posteriores de la sesión con «sonido» ya elegido: el navegador exige un gesto, así que se
 * reanuda en el primero que ocurra (clic, toque o tecla).
 */
export function armAudioUnlockOnFirstGesture(): () => void {
  return onUnlockGesture(() => void audioUnlock());
}
