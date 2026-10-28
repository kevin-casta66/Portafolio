import { gsap, ScrollTrigger } from "./gsap";
import { PHASES, accentCss, readPhase, type PhaseId, type SectionBox } from "./phase";
import { phaseState, writePhaseState } from "./phase-state";
import { appStore } from "@/lib/store";

/**
 * `useScrollPhase` (versión imperativa): un ScrollTrigger por sección determina la fase activa y un
 * ScrollTrigger global calcula, en cada actualización de scroll, el progreso y el color de acento.
 * Todo el progreso vive fuera de React; solo la fase discreta llega al store.
 *
 * El color se escribe en `--accent-active` (el tinte de fondo `--accent-tint` deriva de él en CSS al
 * 5 %), mezclando los tokens de fase en OKLCH, así funciona igual en el tema oscuro y en el claro.
 */
/** Pasos de la mezcla de acento entre dos fases (ver `apply`). */
export const ACCENT_STEPS = 8;

export function startPhaseTracking(): () => void {
  const root = document.documentElement;
  const sections = PHASES.map((id) => document.getElementById(id)).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
  if (sections.length < 2) return () => {};

  const setAccent = gsap.quickSetter(root, "--accent-active") as (value: string) => void;
  let boxes: SectionBox[] = [];

  const measure = () => {
    boxes = sections.map((el) => {
      const rect = el.getBoundingClientRect();
      return {
        id: el.id as PhaseId,
        top: rect.top + window.scrollY,
        bottom: rect.bottom + window.scrollY,
      };
    });
  };

  let lastAccent = "";
  const apply = () => {
    const scrollY = window.scrollY;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const snapshot = readPhase(boxes, scrollY + window.innerHeight / 2, scrollY, max);
    writePhaseState(snapshot);

    // Cada cambio de `--accent-active` en la raíz invalida el estilo de TODO el documento (~18 ms por fotograma
    // medidos en el recorrido de la home: fps 27 → 56 al quitarlo). El mezclado se discretiza en ACCENT_STEPS
    // pasos por transición: el cambio de color sigue siendo gradual (es un tinte al 5 %) pero solo se recalcula
    // el estilo unas pocas veces por transición, no en cada fotograma de scroll.
    const mix = Math.round(snapshot.mix * ACCENT_STEPS) / ACCENT_STEPS;
    const accent = accentCss(snapshot.from, snapshot.to, mix);
    if (accent !== lastAccent) {
      setAccent(accent);
      lastAccent = accent;
    }
    if (root.dataset.activePhase !== snapshot.phase) root.dataset.activePhase = snapshot.phase;
    if (appStore.getState().phase !== snapshot.phase) appStore.getState().setPhase(snapshot.phase);
  };

  measure();
  apply(); // La fase inicial sale de la posición (p. ej. #runtime): sin pasar por las previas.

  const triggers: ScrollTrigger[] = sections.map((el) =>
    ScrollTrigger.create({
      trigger: el,
      start: "top center",
      end: "bottom center",
      onToggle: (self) => {
        if (self.isActive) apply();
      },
    }),
  );
  const global = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: apply,
  });
  const onRefresh = () => {
    measure();
    apply();
  };
  ScrollTrigger.addEventListener("refresh", onRefresh);

  return () => {
    ScrollTrigger.removeEventListener("refresh", onRefresh);
    triggers.forEach((t) => t.kill());
    global.kill();
    root.style.removeProperty("--accent-active");
    delete root.dataset.activePhase;
    Object.assign(phaseState, {
      phase: "source",
      progress: 0,
      global: 0,
      from: "source",
      to: null,
      mix: 0,
    });
  };
}
