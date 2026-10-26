"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useLayoutEffect, useRef, useTransition } from "react";
import { setFilterTransition } from "@/lib/ui-transition-flag";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { ListFlip } from "@/motion/uiTransition";
import { LayoutToggle } from "./LayoutToggle";

interface ProcessFilterProps {
  /** Tecnologías presentes en los proyectos (ids de habilidad). */
  options: string[];
  /** Valor activo (`""` = todos), ya validado en el servidor. */
  value: string;
  /** Procesos visibles con el filtro actual. */
  count: number;
}

/**
 * Filtro presentado como el comando `ps aux | grep <tech>`. El estado vive en `?grep=` y el servidor
 * filtra, así funciona al recargar, al compartir el enlace y sin JavaScript (formulario GET).
 */
export function ProcessFilter({ options, value, count }: ProcessFilterProps) {
  const t = useTranslations("Runtime");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const selectId = useId();
  const commandId = useId();

  const command = value ? `ps aux | grep ${value}` : "ps aux";

  // T10 · el reordenado lo anima `<ViewTransition>` (ver `RuntimeSection`) cuando el navegador soporta
  // transiciones de vista; si no, FLIP de GSAP: se captura la posición ANTES de que el servidor devuelva
  // la lista filtrada y se reproduce DESPUÉS. El resultado filtrado es el mismo en los dos casos.
  const pendingFlip = useRef<ListFlip | null>(null);

  const onFilter = async (next: string) => {
    const { currentSupport, resolveUiMode, captureListFlip } = await import("@/motion/uiTransition");
    const mode = resolveUiMode(currentSupport());
    const url = next ? `${pathname}?grep=${encodeURIComponent(next)}` : pathname;
    const apply = () => {
      // Con transiciones de vista el tipo «filter» viaja en la transición de navegación de Next (es el
      // que activa las animaciones de los `<ViewTransition>` de `RuntimeSection`, y solo ese); la
      // navegación ya es una transición de React, así que no se envuelve en otra.
      if (mode === "native") {
        // Los `<ViewTransition>` de las tarjetas solo animan con el interruptor activo (ver CardTransition).
        setFilterTransition(true);
        startTransition(() => router.replace(url, { scroll: false }));
      } else startTransition(() => router.replace(url, { scroll: false }));
    };
    if (mode === "flip") {
      const list = document.getElementById("runtime-list");
      if (list) {
        pendingFlip.current = await captureListFlip(list, (li) =>
          Boolean(
            next &&
              !(li.querySelector("article")?.getAttribute("data-stack") ?? "").split(" ").includes(next),
          ),
        );
      }
    }
    apply();
  };

  // La lista filtrada ya está pintada: los `<ViewTransition>` vuelven a quedar inactivos.
  useEffect(() => {
    setFilterTransition(false);
  }, [value]);

  useLayoutEffect(() => {
    const flip = pendingFlip.current;
    if (!flip) return;
    pendingFlip.current = null;
    void import("@/motion/uiTransition").then((m) => m.playListFlip(flip));
  }, [value]);

  return (
    <form
      method="get"
      action={`${pathname}#runtime`}
      onSubmit={(e) => e.preventDefault()}
      className="col-span-12 mb-8 flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:flex-wrap sm:items-center"
    >
      <label htmlFor={selectId} className="font-mono text-sm text-fg-muted">
        {t("filterLabel")}
      </label>

      <select
        id={selectId}
        name="grep"
        value={value}
        aria-describedby={commandId}
        onChange={(e) => void onFilter(e.target.value)}
        className="h-10 rounded-md border border-border bg-bg px-3 font-mono text-sm text-fg"
      >
        <option value="">{t("filterAll")}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      <noscript>
        <button
          type="submit"
          className="h-10 rounded-md border border-accent px-4 text-sm text-accent"
        >
          {t("apply")}
        </button>
      </noscript>

      <code
        id={commandId}
        aria-label={t("filterCommand")}
        className="rounded-md bg-bg px-3 py-2 font-mono text-sm text-syntax-string"
      >
        {`$ ${command}`}
      </code>

      <p role="status" aria-busy={pending} className="font-mono text-sm text-fg-muted">
        {t("results", { count })}
      </p>

      <LayoutToggle />
    </form>
  );
}
