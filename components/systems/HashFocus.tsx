"use client";

import { useEffect } from "react";

/**
 * Al llegar por ancla (`#runtime`, `#project-<slug>`) mueve el foco al encabezado de la sección o a
 * la tarjeta objetivo, para que teclado y lectores de pantalla continúen desde ahí. El scroll ya lo
 * hace el navegador; sin JavaScript el ancla sigue funcionando (solo sin mover el foco).
 */
export function HashFocus() {
  useEffect(() => {
    const focusTarget = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id || id === "content") return;
      const target = document.getElementById(id);
      if (!target) return;
      const labelledBy = target.matches("section") ? target.getAttribute("aria-labelledby") : null;
      const focusable = labelledBy ? document.getElementById(labelledBy) : target;
      focusable?.focus({ preventScroll: true });
    };

    focusTarget();
    window.addEventListener("hashchange", focusTarget);
    return () => window.removeEventListener("hashchange", focusTarget);
  }, []);

  return null;
}
