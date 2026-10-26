import type { Clock } from "../clock";

/**
 * Contexto que recibe cada coreografía de sección. Las coreografías viven aquí (y en hooks de los
 * componentes), NUNCA mezcladas con el contenido de las secciones: reciben el DOM SSR por selectores
 * `data-anim` y lo mejoran sin cambiar su contenido.
 */
export interface ChoreoContext {
  root: HTMLElement;
  reduced: boolean;
  compact: boolean;
  /** Puntero fino con hover (escritorio): habilita tilt, arrastre, etc. */
  finePointer: boolean;
  clock: Clock;
  /** Las transiciones entre fases están activas (reparten parte del revelado). */
  transitionsOn: boolean;
  /** Registra una función de limpieza (listeners, capas, suscripciones al reloj…). */
  onCleanup(fn: () => void): void;
}

export type Choreography = (ctx: ChoreoContext) => void;
