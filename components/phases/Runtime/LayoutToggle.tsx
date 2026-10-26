"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, type KeyboardEvent } from "react";
import { prefersReducedMotion } from "@/motion/reduced";
import { cssEase, duration } from "@/motion/tokens";

export interface LayoutOption {
  id: string;
  label: string;
}

interface LayoutToggleProps {
  /** Opciones de layout. Otros changes (vista Heap, change 07) añaden las suyas aquí. */
  options?: readonly LayoutOption[];
  /** `id` de la lista cuyo atributo `data-layout` gobierna la disposición. */
  listId?: string;
  defaultLayout?: string;
}

/**
 * T7 · control de layout Grid / Lista (grupo de radio accesible, ratón/teclado/táctil). Al cambiar,
 * las tarjetas se reacomodan con FLIP (posición y tamaño por `transform`) conservando el filtro, el
 * contenido y el foco (que permanece en el control). Con movimiento reducido el cambio es un fundido.
 */
export function LayoutToggle({
  options,
  listId = "runtime-list",
  defaultLayout = "grid",
}: LayoutToggleProps) {
  const t = useTranslations("Runtime");
  const items: readonly LayoutOption[] = options ?? [
    { id: "grid", label: t("layout.grid") },
    { id: "list", label: t("layout.list") },
  ];
  const [layout, setLayout] = useState(defaultLayout);
  const group = useRef<HTMLDivElement>(null);

  const apply = async (next: string) => {
    if (next === layout) return;
    const list = document.getElementById(listId);
    setLayout(next);
    if (!list) return;

    if (prefersReducedMotion()) {
      // Fundido breve: nada se desplaza.
      list.dataset.layout = next;
      list.animate([{ opacity: 0.4 }, { opacity: 1 }], {
        duration: duration.ui,
        easing: cssEase.inExpo,
      });
      return;
    }
    const { Flip, EASE, gsap, registerGsap, seconds } = await import("@/motion/gsap");
    registerGsap();
    const cards = Array.from(list.children) as HTMLElement[];
    const state = Flip.getState(cards);
    list.dataset.layout = next;
    Flip.from(state, {
      duration: seconds(duration.ui),
      ease: EASE.inExpo,
      scale: true,
      absolute: false,
      onComplete: () => gsap.set(cards, { clearProps: "transform" }),
    });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const keys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const index = items.findIndex((o) => o.id === layout);
    const delta = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const next = items[(index + delta + items.length) % items.length];
    if (!next) return;
    void apply(next.id);
    group.current?.querySelector<HTMLElement>(`[data-layout-option="${next.id}"]`)?.focus();
  };

  return (
    <div className="flex items-center gap-2 sm:ml-auto">
      <span id="runtime-layout-label" className="font-mono text-sm text-fg-muted">
        {t("layout.label")}
      </span>
      <div
        ref={group}
        role="radiogroup"
        aria-labelledby="runtime-layout-label"
        onKeyDown={onKeyDown}
        className="inline-flex rounded-md border border-border"
      >
        {items.map((option) => {
          const checked = option.id === layout;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-layout-option={option.id}
              onClick={() => void apply(option.id)}
              className={
                "h-10 px-4 font-mono text-sm first:rounded-l-md last:rounded-r-md " +
                (checked ? "bg-phase-tint text-accent" : "text-fg-muted hover:text-fg")
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
