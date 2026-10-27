"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { appStore, useAppStore } from "@/lib/store";

/** Fase del home que corresponde a la sección de la Vista Rápida más cercana al borde superior. */
function equivalentPhase(): string | null {
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-qv-phase]"));
  let best: { phase: string; distance: number } | null = null;
  for (const section of sections) {
    const rect = section.getBoundingClientRect();
    // Sección que contiene la línea de lectura (el tercio superior) o, si no, la más próxima.
    const probe = window.innerHeight * 0.33;
    const distance = rect.top <= probe && rect.bottom >= probe ? 0 : Math.min(Math.abs(rect.top - probe), Math.abs(rect.bottom - probe));
    if (best === null || distance < best.distance) best = { phase: section.dataset.qvPhase ?? "", distance };
  }
  return best && best.phase !== "" ? best.phase : null;
}

/**
 * Sincroniza la Vista Rápida entre la URL (`?view=quick`, la fuente compartible), el store (la
 * fuente que leen los controles) y el atributo `data-view` de `<html>` (lo que usa el CSS).
 *
 *  - URL → store: abrir un enlace con `?view=quick` activa la vista.
 *  - store → URL: el toggle y el atajo la reflejan; en cualquier página distinta del home, activarla
 *    lleva al home en Vista Rápida; desactivarla vuelve a la fase equivalente (`/#runtime`…).
 *  - Navegando con la vista activa, el parámetro se conserva al volver al home.
 *
 * Las lecturas del store son SIEMPRE frescas (`getState()`): los efectos se ejecutan en orden y el
 * primero puede acabar de actualizarlo.
 */
export function QuickViewSync() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const quick = useAppStore((s) => s.quickView);
  const urlQuick = search.get("view") === "quick";
  const previousQuick = useRef<boolean | null>(null);

  // URL → store
  useEffect(() => {
    if (urlQuick && !appStore.getState().quickView) appStore.getState().setQuickView(true);
  }, [urlQuick]);

  // store → URL y atributo de <html>
  useEffect(() => {
    const current = appStore.getState().quickView;
    const previous = previousQuick.current;
    previousQuick.current = current;
    const root = document.documentElement;
    if (current && pathname === "/") root.dataset.view = "quick";
    else delete root.dataset.view;

    if (current) {
      if (pathname === "/") {
        if (!urlQuick) router.replace("/?view=quick");
      } else if (previous === false) {
        // Activada desde otra página (caso, 404): se lleva al visitante a su currículum.
        router.push("/?view=quick");
      }
      return;
    }
    if (urlQuick && pathname === "/") {
      const phase = equivalentPhase();
      router.replace(phase ? `/#${phase}` : "/");
    }
  }, [quick, urlQuick, pathname, router]);

  return null;
}
