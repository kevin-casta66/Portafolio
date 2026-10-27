import type { CommandId, Locale } from "./commands";

/**
 * Registro de atajos globales (design D3). Lógica pura: un único listener `keydown` (el hook
 * `useGlobalShortcuts`) resuelve la tecla con `resolveShortcut` y ejecuta la acción. El panel `?` se
 * genera desde `SHORTCUTS`, así que la ayuda siempre coincide con el comportamiento.
 */
export type ShortcutId = "terminal" | "help" | "quick-view" | "debug" | "theme" | "sound";

export interface EventTargetLike {
  tagName?: string;
  isContentEditable?: boolean;
  getAttribute?(name: string): string | null;
}

export interface KeyEventLike {
  key: string;
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  repeat?: boolean;
  defaultPrevented?: boolean;
  target: EventTargetLike | null;
  /** `AltGraph` en teclados como el español, donde `~` se escribe con AltGr. */
  getModifierState?(key: string): boolean;
}

export interface Shortcut {
  id: ShortcutId;
  /** Tecla tal como se muestra en el panel. */
  keys: string;
  description: Record<Locale, string>;
  /** Comando de la terminal con el mismo efecto, si lo hay. */
  command?: CommandId;
  matches(event: KeyEventLike): boolean;
}

/** Atajos con modificadores del sistema (Ctrl, Cmd, Alt) se dejan siempre al navegador y a las tecnologías de asistencia. */
const hasSystemModifier = (e: KeyEventLike): boolean => {
  if (e.getModifierState?.("AltGraph")) return false; // AltGr + 4 = ~ en teclado español
  return e.ctrlKey || e.metaKey || e.altKey;
};

const plain = (letter: string) => (e: KeyEventLike) =>
  !hasSystemModifier(e) && e.key.toLowerCase() === letter;

export const SHORTCUTS: readonly Shortcut[] = [
  {
    id: "terminal",
    keys: "~",
    description: { es: "Abrir la terminal", en: "Open the terminal" },
    // `~` directo, o la tecla física de acento grave/º (en teclados donde `~` exige AltGr).
    matches: (e) => {
      // El carácter  ya llega resuelto (AltGr+4 en español, Alt+ñ en Mac): basta con que sea esa tecla.
      if (e.key === "~") return !e.metaKey;
      // Tecla física de acento grave/º: sin modificadores del sistema.
      return (e.code === "Backquote" || e.key === "º") && !hasSystemModifier(e);
    },
  },
  {
    id: "help",
    keys: "?",
    description: { es: "Mostrar los atajos", en: "Show the shortcuts" },
    matches: (e) => !hasSystemModifier(e) && e.key === "?",
  },
  {
    id: "quick-view",
    keys: "Q",
    description: { es: "Vista Rápida (currículum de una página)", en: "Quick View (one-page résumé)" },
    matches: plain("q"),
  },
  {
    id: "debug",
    keys: "D",
    description: { es: "Modo Debug", en: "Debug mode" },
    command: "debug",
    matches: plain("d"),
  },
  {
    id: "theme",
    keys: "T",
    description: { es: "Alternar tema claro/oscuro", en: "Toggle light/dark theme" },
    command: "theme",
    matches: plain("t"),
  },
  {
    id: "sound",
    keys: "M",
    description: { es: "Silenciar o activar el sonido", en: "Mute or unmute sound" },
    matches: plain("m"),
  },
];

/** ¿El foco está en un campo donde se escribe? Los atajos globales se ignoran ahí. */
export function isEditableTarget(target: EventTargetLike | null): boolean {
  if (!target) return false;
  const tag = target.tagName?.toUpperCase();
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  const editable = target.getAttribute?.("contenteditable");
  if (editable !== null && editable !== undefined && editable !== "false") return true;
  return target.getAttribute?.("role") === "textbox";
}

/** El atajo que corresponde al evento, o `null` si debe ignorarse (campo editable, repetición, ya gestionado). */
export function resolveShortcut(event: KeyEventLike): ShortcutId | null {
  if (event.defaultPrevented || event.repeat) return null;
  if (isEditableTarget(event.target)) return null;
  return SHORTCUTS.find((s) => s.matches(event))?.id ?? null;
}

export type ShortcutActions = Record<ShortcutId, () => void>;

/** Resuelve y ejecuta. Devuelve el atajo ejecutado (el llamador hace `preventDefault`) o `null`. */
export function dispatchShortcut(event: KeyEventLike, actions: ShortcutActions): ShortcutId | null {
  const id = resolveShortcut(event);
  if (id === null) return null;
  actions[id]();
  return id;
}
