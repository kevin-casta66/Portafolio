"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { prefersReducedMotion } from "@/motion/reduced";

export interface BreakpointItem {
  id: string;
  title: string;
}

interface BreakpointNavProps {
  items: BreakpointItem[];
  label: string;
  toggleLabel: string;
  /** `Sección actual: {title}` ya traducida con una marca `%s`. */
  currentTemplate: string;
}

/**
 * Panel de breakpoints del caso («Debugger»). Cada elemento es un ancla real (`#bp-<id>`): funciona
 * sin JavaScript. Con JavaScript resalta la sección visible (IntersectionObserver, `aria-current`,
 * sin depender del motor de movimiento) y el salto mueve el foco al encabezado de la sección.
 * En escritorio es una columna fija; en móvil, un índice compacto (`<details>`) que no tapa contenido.
 */
export function BreakpointNav({ items, label, toggleLabel, currentTemplate }: BreakpointNavProps) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const details = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(`bp-${item.id}`))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;
    // Línea de lectura a ~35 % de la altura: la sección que la cruza es la activa.
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.breakpoint ?? "";
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const first = items.find((item) => visible.has(item.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-35% 0px -60% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  const jump = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return;
    const target = document.getElementById(`bp-${id}`);
    const heading = document.getElementById(`bp-${id}-title`);
    if (!target) return;
    event.preventDefault();
    // Primero se cierra el índice móvil: al plegarse cambia la altura de la página, y el scroll debe
    // calcularse ya con el layout definitivo.
    if (details.current) details.current.open = false;
    target.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#bp-${id}`);
    heading?.focus({ preventScroll: true });
    setActive(id);
  };

  const list = (
    <ul className="space-y-1">
      {items.map((item, index) => {
        const current = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#bp-${item.id}`}
              aria-current={current ? "location" : undefined}
              onClick={(e) => jump(e, item.id)}
              className={
                "flex min-h-11 items-center gap-3 rounded-md border-l-2 px-3 py-2 font-mono text-sm " +
                (current
                  ? "border-accent bg-phase-tint text-accent"
                  : "border-transparent text-fg-muted hover:text-fg")
              }
            >
              <span aria-hidden="true" className="w-4 text-right text-xs opacity-70">
                {index + 1}
              </span>
              {item.title}
            </a>
          </li>
        );
      })}
    </ul>
  );

  const activeTitle = items.find((i) => i.id === active)?.title ?? "";

  return (
    <>
      {/* Escritorio: columna fija a la izquierda */}
      <nav aria-label={label} className="hidden lg:sticky lg:top-28 lg:block">
        {list}
      </nav>

      {/* Móvil: índice compacto; cerrado ocupa una línea y abierto no tapa el contenido (empuja) */}
      <nav aria-label={label} className="lg:hidden">
        <details
          ref={details}
          className="rounded-lg border border-border bg-surface open:border-accent"
        >
          <summary
            onClick={(event) => {
              // T10: abrir/cerrar el índice con transición (de vista, o FLIP sin soporte; reducido: directo).
              const el = details.current;
              if (!el) return;
              event.preventDefault();
              void import("@/motion/uiTransition")
                .then((m) =>
                  m.toggleMenu(el, () => Array.from(document.querySelectorAll<HTMLElement>("[data-breakpoint]"))),
                )
                .catch(() => {
                  el.open = !el.open;
                });
            }}
            className="flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 font-mono text-sm"
          >
            <span>{toggleLabel}</span>
            <span className="truncate text-accent">
              {currentTemplate.replace("%s", activeTitle)}
            </span>
          </summary>
          <div className="border-t border-border p-2">{list}</div>
        </details>
      </nav>
    </>
  );
}
