import { PHASES, type PhaseId } from "@/motion/phase";

/**
 * Caché de la geometría de documento de cada fase. Se mide con `getBoundingClientRect` solo cuando
 * cambia el tamaño (ResizeObserver sobre `<html>`, `load`, fuentes), nunca por frame: el motor
 * compara `scrollY` con estos rangos para decidir qué escenas se renderizan.
 */
export interface Box {
  top: number;
  bottom: number;
}

export interface Layout {
  sections: Partial<Record<PhaseId, Box>>;
  docHeight: number;
  /** Se incrementa en cada medición: permite a los consumidores invalidar sus cachés. */
  version: number;
}

export const layout: Layout = { sections: {}, docHeight: 0, version: 0 };

export function measureLayout(): void {
  const scrollY = window.scrollY;
  const sections: Layout["sections"] = {};
  for (const id of PHASES) {
    const el = document.getElementById(id);
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    sections[id] = { top: rect.top + scrollY, bottom: rect.bottom + scrollY };
  }
  layout.sections = sections;
  layout.docHeight = document.documentElement.scrollHeight;
  layout.version++;
}

/** Observa cambios de tamaño del documento; devuelve la limpieza. */
export function watchLayout(onChange: () => void): () => void {
  measureLayout();
  const ro = new ResizeObserver(() => {
    measureLayout();
    onChange();
  });
  ro.observe(document.documentElement);
  ro.observe(document.body);
  const onLoad = () => {
    measureLayout();
    onChange();
  };
  window.addEventListener("load", onLoad);
  void document.fonts.ready.then(onLoad);
  return () => {
    ro.disconnect();
    window.removeEventListener("load", onLoad);
  };
}

export interface Range {
  start: number;
  end: number;
}

/** Rango de documento [top de `from`, bottom de `to`] con un margen en píxeles. */
export function sectionRange(from: PhaseId, to: PhaseId = from, margin = 0): Range | null {
  const a = layout.sections[from];
  const b = layout.sections[to];
  if (!a || !b) return null;
  return { start: a.top - margin, end: b.bottom + margin };
}
