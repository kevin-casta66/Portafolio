import type { KeyboardEvent } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mantiene el foco dentro de un diálogo modal: un `<dialog>` nativo hace inertes el resto de la
 * página, pero al pasar del último elemento Tab sale hacia la interfaz del navegador. Con este
 * manejador, Tab en el último elemento vuelve al primero (y Mayús+Tab en el primero salta al último).
 * Se llama desde `onKeyDown` del diálogo, después de cualquier manejador propio del hijo.
 */
export function trapTab(event: KeyboardEvent, container: HTMLElement | null): void {
  if (event.key !== "Tab" || event.defaultPrevented || !container) return;
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (!first || !last) return;
  const active = document.activeElement;
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}
