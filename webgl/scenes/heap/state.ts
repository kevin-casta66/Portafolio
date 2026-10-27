import type { HeapBlock, HeapCriterion } from "@/lib/heap";

/**
 * Estado compartido entre la isla DOM del heap (`components/heap/HeapScene.tsx`) y la escena 3D
 * (`webgl/scenes/heap/scene.ts`). Son dos chunks que se cargan en cualquier orden y se encuentran aquí,
 * igual que `t6` en `motion/shared.ts`. NO importa three: la isla puede usarlo sin arrastrar el motor.
 *
 * La isla escribe (activar, datos, criterio, foco, hover) y la escena lee (y publica el hover y el
 * rectángulo del bloque bajo el puntero). Nada de esto es estado de React: se lee en cada tick.
 */
export interface HeapSceneData {
  blocks: readonly HeapBlock[];
  locale: "es" | "en";
  /** Id de habilidad → nombre visible (etiquetas de grupo por tecnología). */
  skillNames: Readonly<Record<string, string>>;
  /** Textos de la capa visual (traducidos por la isla). */
  labels: { project: string; experiment: string };
}

export interface HoverRect {
  /** Rectángulo del bloque en px de viewport (caja de su geometría ya con la lente aplicada). */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HeapView {
  /** La ruta /heap está activa: la escena existe (rango infinito en `SCENE_DEFS`). */
  active: boolean;
  /** La escena está creada y puede dibujar. */
  ready: boolean;
  data: HeapSceneData | null;
  criterion: HeapCriterion;
  /** Se incrementa en cada «Run GC» (también la primera aplicación del criterio inicial NO lo incrementa). */
  gcSerial: number;
  /** Bloque que debe quedar centrado (foco de teclado) y contador para recentrar aunque no cambie. */
  focusKey: string | null;
  focusSerial: number;
  /** Desplazamiento de la cuadrícula (px) e inercia (px/s). Los escribe la isla al arrastrar. */
  pan: { x: number; y: number };
  velocity: { x: number; y: number };
  dragging: boolean;
  /** Bloque bajo el puntero y su rectángulo (lo publica la escena; la isla coloca el proxy de hover). */
  hoverKey: string | null;
  hoverRect: HoverRect | null;
  /** La escena avisa de un cambio de hover o de un movimiento del bloque. */
  onHover: ((key: string | null, rect: HoverRect | null) => void) | null;
  /** Pide un frame al motor (lo publica la escena). */
  markDirty: (() => void) | null;
  /** Un toque breve en pantalla táctil: selecciona el bloque (lo ilumina) sin abrirlo. */
  selectedKey: string | null;
  /**
   * Escenario «virtual» en px de VIEWPORT, mientras no hay un `[data-twin="heap"]` en el DOM: durante la
   * transición RUNTIME → Heap (T7) los bloques se dibujan donde acabarán las tarjetas, ya antes de que
   * exista la página /heap, y siguen ahí durante la navegación. Al montarse la isla se alinea el scroll
   * y esto vuelve a `null` (el escenario real ocupa exactamente ese rectángulo).
   */
  stageOverride: HoverRect | null;
  /** 0..1: opacidad de los bloques (aparecen mientras las tarjetas del home se transforman en ellos). */
  reveal: number;
  /** Bloque que hay en un punto de pantalla (sin lente): lo publica la escena para los toques. */
  pick: ((x: number, y: number) => { key: string; rect: HoverRect } | null) | null;
}

export const heapView: HeapView = {
  active: false,
  ready: false,
  data: null,
  criterion: "none",
  gcSerial: 0,
  focusKey: null,
  focusSerial: 0,
  pan: { x: 0, y: 0 },
  velocity: { x: 0, y: 0 },
  dragging: false,
  hoverKey: null,
  hoverRect: null,
  onHover: null,
  markDirty: null,
  selectedKey: null,
  stageOverride: null,
  reveal: 1,
  pick: null,
};

/** La isla entra en /heap: la escena se carga (chunk propio) y existe mientras dure la ruta. */
export function activateHeap(data: HeapSceneData, criterion: HeapCriterion): void {
  heapView.data = data;
  heapView.criterion = criterion;
  heapView.active = true;
  heapView.markDirty?.();
}

/** La isla sale de /heap: el rango de la escena vuelve a `null` y el motor la libera. */
export function deactivateHeap(): void {
  heapView.active = false;
  // `stageOverride` y `reveal` NO se tocan aquí: pertenecen a la transición RUNTIME → Heap, que sobrevive a
  // la navegación (y el modo estricto de React desmonta/monta la isla en desarrollo). Los suelta
  // `releaseStageOverride`.
  heapView.data = null;
  heapView.hoverKey = null;
  heapView.hoverRect = null;
  heapView.selectedKey = null;
  heapView.focusKey = null;
  heapView.dragging = false;
  heapView.velocity.x = 0;
  heapView.velocity.y = 0;
  heapView.markDirty?.();
}

/** «Run GC»: cambia el criterio y la escena anima cada bloque hasta su nueva celda. */
export function runGc(criterion: HeapCriterion): void {
  if (criterion === heapView.criterion) return;
  heapView.criterion = criterion;
  heapView.gcSerial++;
  heapView.markDirty?.();
}

/** Teclado: centra el bloque (instantáneo con reduced motion). */
export function focusBlock(key: string | null): void {
  heapView.focusKey = key;
  heapView.focusSerial++;
  heapView.markDirty?.();
}

/** Suelta el escenario virtual de la transición RUNTIME → Heap y deja los bloques totalmente visibles. */
export function releaseStageOverride(): void {
  heapView.stageOverride = null;
  heapView.reveal = 1;
  heapView.markDirty?.();
}
