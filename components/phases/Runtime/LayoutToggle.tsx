"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { useRouter } from "@/i18n/navigation";
import { appStore } from "@/lib/store";
import { prefersReducedMotion } from "@/motion/reduced";
import { cssEase, duration } from "@/motion/tokens";

export interface LayoutOption {
  id: string;
  label: string;
}

/** Layout de la lista de proyectos que sobrevive a ir a `/heap` y volver con «atrás». */
const LAYOUT_KEY = "portafolio:runtime-layout";
const LAYOUT_EVENT = "runtime:layout";
const HEAP_OPTION = "heap";

function readStoredLayout(): string | null {
  try {
    return sessionStorage.getItem(LAYOUT_KEY);
  } catch {
    return null;
  }
}
const subscribeLayout = (notify: () => void) => {
  window.addEventListener(LAYOUT_EVENT, notify);
  return () => window.removeEventListener(LAYOUT_EVENT, notify);
};

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
 *
 * La tercera opción, «Heap» (change 07), no es un layout de la lista sino la VISTA Memory Heap: al elegirla
 * las tarjetas se transforman en bloques de memoria en el canvas y se navega a `/heap` (T7, ver
 * `components/heap/HeapSceneEntry.ts`). Se precarga al pasar el puntero o el foco por el botón.
 */
export function LayoutToggle({
  options,
  listId = "runtime-list",
  defaultLayout = "grid",
}: LayoutToggleProps) {
  const t = useTranslations("Runtime");
  const heapT = useTranslations("Heap");
  const locale = useLocale() as "es" | "en";
  const router = useRouter();
  const items: readonly LayoutOption[] = options ?? [
    { id: "grid", label: t("layout.grid") },
    { id: "list", label: t("layout.list") },
    { id: HEAP_OPTION, label: t("layout.heap") },
  ];
  // El layout elegido se guarda en la sesión: al volver de `/heap` con «atrás» la lista conserva su disposición.
  const stored = useSyncExternalStore(subscribeLayout, readStoredLayout, () => null);
  const [picked, setPicked] = useState<string | null>(null);
  const known = (id: string | null) => id !== null && id !== HEAP_OPTION && items.some((o) => o.id === id);
  const layout = picked ?? (known(stored) ? (stored as string) : defaultLayout);
  const group = useRef<HTMLDivElement>(null);
  const entering = useRef(false);

  useEffect(() => {
    const list = document.getElementById(listId);
    if (list && layout !== defaultLayout) list.dataset.layout = layout;
  }, [layout, listId, defaultLayout]);

  const preloadHeap = () => {
    void import("@/components/heap/HeapSceneEntry").then((m) => m.preloadHeap(locale));
  };

  /** Tarjetas → bloques en el canvas y navegación a `/heap` (T7). */
  const enterHeap = async () => {
    if (entering.current) return;
    entering.current = true;
    try {
      const { graphics } = appStore.getState();
      const canAnimate =
        !prefersReducedMotion() &&
        graphics.ready &&
        (graphics.backend === "webgpu" || graphics.backend === "webgl2") &&
        graphics.tier !== "low";
      const { enterHeap: run } = await import("@/components/heap/HeapSceneEntry");
      await run({
        locale,
        labels: { project: heapT("kind.project"), experiment: heapT("kind.experiment") },
        navigate: () => router.push("/heap"),
        canAnimate,
      });
    } finally {
      entering.current = false;
    }
  };

  const apply = async (next: string) => {
    if (next === HEAP_OPTION) {
      await enterHeap();
      return;
    }
    if (next === layout) return;
    const list = document.getElementById(listId);
    setPicked(next);
    try {
      sessionStorage.setItem(LAYOUT_KEY, next);
      window.dispatchEvent(new Event(LAYOUT_EVENT));
    } catch {
      /* sin almacenamiento */
    }
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
    // Las flechas solo mueven el foco sobre «Heap»: navegar a otra ruta exige Enter, Espacio o clic.
    if (next.id !== HEAP_OPTION) void apply(next.id);
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
              {...(option.id === HEAP_OPTION
                ? { onPointerEnter: preloadHeap, onFocus: preloadHeap }
                : {})}
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
