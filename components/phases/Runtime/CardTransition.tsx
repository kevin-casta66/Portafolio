"use client";

import { ViewTransition, type ReactNode } from "react";
import { useFilterTransition } from "@/lib/ui-transition-flag";

/**
 * T10 · `<ViewTransition>` de React alrededor de cada tarjeta de proyecto. Cada tarjeta tiene su
 * `name`, así el navegador la mueve de su posición anterior a la nueva al filtrar (y funde las que
 * entran o salen). Solo anima mientras `ProcessFilter` reordena (`useFilterTransition`): en cualquier
 * otra transición (ir a un caso con T6, volver, cambiar de tema) no hace nada. Con un navegador sin
 * transiciones de vista no anima y `ProcessFilter` usa el FLIP de respaldo.
 */
export function CardTransition({ name, children }: { name: string; children: ReactNode }) {
  const filtering = useFilterTransition();
  const mode = filtering ? "auto" : "none";
  return (
    <ViewTransition name={name} enter={mode} exit={mode} update={mode} default="none">
      {children}
    </ViewTransition>
  );
}
