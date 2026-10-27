"use client";

import { useEffect, useRef } from "react";

type Shape = "caret" | "target" | "code" | "drag";

const INTERACTIVE =
  "a[href], button, summary, select, label, input[type='checkbox'], input[type='radio'], input[type='range'], [role='button'], [role='tab'], [role='treeitem'], [role='switch']";

/**
 * Forma del cursor para el elemento bajo el puntero (delegación): `data-cursor` explícito, bloques de
 * código, elementos interactivos y, por defecto, el caret de texto.
 */
export function shapeFor(target: Element | null): Shape {
  const tagged = target?.closest<HTMLElement>("[data-cursor]")?.dataset.cursor;
  if (tagged === "code" || tagged === "drag" || tagged === "target" || tagged === "caret") return tagged;
  if (target?.closest("pre, code")) return "code";
  if (target?.closest(INTERACTIVE)) return "target";
  return "caret";
}

/**
 * Cursor contextual (change 06, design D7): un único elemento `position: fixed`, `aria-hidden`, con
 * `pointer-events: none` (el clic llega SIEMPRE al elemento de debajo). Caret de texto por defecto; mira
 * sobre controles; «⟨/⟩» sobre código; flecha de arrastre sobre el árbol de habilidades. Lo monta
 * `SystemsLoader` solo con puntero fino y sin la preferencia «usar el cursor del sistema». Se mueve con
 * `transform` directo (sin estado de React) y, con movimiento reducido, sin inercia ni transiciones.
 */
export default function Cursor() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const html = document.documentElement;
    html.dataset.cursor = "custom";
    let shape: Shape = "caret";

    const move = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
      el.dataset.visible = "true";
    };
    const over = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const next = shapeFor(event.target instanceof Element ? event.target : null);
      if (next !== shape) {
        shape = next;
        el.dataset.shape = next;
      }
    };
    const down = () => {
      el.dataset.pressed = "true";
    };
    const up = () => {
      delete el.dataset.pressed;
    };
    const leave = () => {
      delete el.dataset.visible;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerover", over, { passive: true });
    window.addEventListener("pointerdown", down, { passive: true });
    window.addEventListener("pointerup", up, { passive: true });
    html.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerover", over);
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      html.removeEventListener("pointerleave", leave);
      delete html.dataset.cursor;
    };
  }, []);

  return (
    <div ref={root} aria-hidden="true" data-custom-cursor data-shape="caret" className="custom-cursor">
      <span data-glyph="caret" className="custom-cursor-caret" />
      <svg data-glyph="target" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="7" />
        <path d="M12 2v5M12 17v5M2 12h5M17 12h5" />
      </svg>
      <span data-glyph="code" className="font-mono text-xs font-semibold">
        {"⟨/⟩"}
      </span>
      <span data-glyph="drag" className="font-mono text-base font-semibold">
        {"⟷"}
      </span>
    </div>
  );
}
