import type { HeapBlock } from "@/lib/heap";
import type { HeapSceneData } from "@/webgl/scenes/heap/state";

/**
 * Transición RUNTIME → Heap (T7, design D9). Las tarjetas del home se transforman en los bloques del
 * heap SIN cortes:
 *
 *  1. La escena del heap se activa YA, en el home, con un escenario VIRTUAL (`heapView.stageOverride`: el
 *     rectángulo, en px de viewport, que ocupará el escenario de `/heap` tras alinear el scroll). Sus
 *     bloques se dibujan donde acabarán las tarjetas.
 *  2. Cada tarjeta viaja (GSAP, solo `transform`) hasta la caja de SU bloque —mismo tamaño, misma
 *     posición— y se desvanece mientras el bloque aparece: es la misma pieza cambiando de forma.
 *  3. Con la transición completa se navega a `/heap`. El canvas es persistente y la escena sigue viva
 *     durante la navegación; al montarse la página, la isla alinea el scroll y el escenario real ocupa
 *     exactamente el rectángulo virtual (ver `alignStageToEntry`).
 *
 * Sin canvas (WebGL ausente, tier bajo) o con movimiento reducido solo se navega. Todo el código de este
 * módulo se carga al pasar el puntero o el foco por el botón «Heap» (precarga, tarea 6.2) o al pulsarlo.
 */
export const HEAP_ENTRY_KEY = "portafolio:heap-entry";
/** Distancia (px) entre el borde superior del viewport y el escenario alineado: justo bajo la cabecera fija. */
export const ENTRY_STAGE_TOP = 76;

interface HeapPayload {
  blocks: HeapBlock[];
  skillNames: Record<string, string>;
}

const cache = new Map<string, Promise<HeapPayload>>();

/** Datos de los bloques (los mismos que sirve `/heap` en su HTML). */
export function loadHeapPayload(locale: string): Promise<HeapPayload> {
  let promise = cache.get(locale);
  if (!promise) {
    promise = fetch(`/${locale}/heap/data.json`).then((response) => {
      if (!response.ok) throw new Error(`heap data: ${response.status}`);
      return response.json() as Promise<HeapPayload>;
    });
    cache.set(locale, promise);
    promise.catch(() => cache.delete(locale));
  }
  return promise;
}

/** Precarga (tarea 6.2): el chunk de la escena, la lógica del layout, GSAP y los datos, antes del clic. */
export function preloadHeap(locale: string): void {
  void import("@/webgl/scenes/heap/scene");
  void import("@/webgl/scenes/heap/state");
  void import("@/lib/heap");
  void import("@/motion/gsap");
  void loadHeapPayload(locale).catch(() => undefined);
}

/** Alto del escenario real (`HeapScene`): `min(74svh, 760px)` con mínimo de 420 px. */
export const stageHeight = (viewH: number): number => Math.max(420, Math.min(viewH * 0.74, 760));

export interface EnterHeapOptions {
  locale: "es" | "en";
  labels: HeapSceneData["labels"];
  /** Navega a `/heap` (router de next-intl). */
  navigate: () => void;
  /** Hay motor 3D en marcha y se puede animar (no reducido, tier no bajo). */
  canAnimate: boolean;
}

/** Espera (hasta `ms`) a que la escena esté creada. */
async function sceneReady(isReady: () => boolean, ms: number): Promise<boolean> {
  const start = performance.now();
  while (!isReady()) {
    if (performance.now() - start > ms) return false;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  return true;
}

export async function enterHeap({ locale, labels, navigate, canAnimate }: EnterHeapOptions): Promise<void> {
  const go = () => {
    try {
      sessionStorage.setItem(HEAP_ENTRY_KEY, "1");
    } catch {
      /* sin almacenamiento: la entrada simplemente no se alinea */
    }
    navigate();
  };
  if (!canAnimate) {
    navigate();
    return;
  }
  try {
    const [payload, state, heap, motion, tokens] = await Promise.all([
      loadHeapPayload(locale),
      import("@/webgl/scenes/heap/state"),
      import("@/lib/heap"),
      import("@/motion/gsap"),
      import("@/motion/tokens"),
    ]);
    const { heapView, activateHeap } = state;
    const { Flip: _flip, EASE, gsap, registerGsap, seconds } = motion;
    void _flip;
    registerGsap();

    // Escenario virtual: donde estará el escenario real de /heap con el scroll alineado.
    const container = document.querySelector<HTMLElement>("#runtime .grid-12") ?? document.body;
    const box = container.getBoundingClientRect();
    const rect = { x: box.left, y: ENTRY_STAGE_TOP, w: box.width, h: stageHeight(window.innerHeight) };

    const data: HeapSceneData = { blocks: payload.blocks, locale, skillNames: payload.skillNames, labels };
    heapView.reveal = 0;
    heapView.stageOverride = rect;
    activateHeap(data, "none");
    const ready = await sceneReady(() => heapView.ready, 1500);
    if (!ready) {
      state.releaseStageOverride();
      state.deactivateHeap();
      go();
      return;
    }

    // Destino de cada tarjeta: la caja de su bloque (mismo origen, misma retícula que la escena).
    const layout = heap.layoutBlocks(payload.blocks, "none", heap.DEFAULT_COLUMNS);
    const { CELL_W, CELL_H, PITCH_X, PITCH_Y, STAGE_PAD } = await import("@/webgl/scenes/heap/grid");
    const cards = [...document.querySelectorAll<HTMLElement>("#runtime-list article[data-twin^='card:']")];
    const dur = seconds(tokens.duration.reveal);
    const tl = gsap.timeline({
      defaults: { ease: EASE.scene },
      onUpdate: () => heapView.markDirty?.(),
    });
    const flying = cards
      .map((card) => {
        const key = `project:${card.dataset.twin?.slice("card:".length) ?? ""}`;
        const cell = layout.cells.find((c) => c.key === key);
        return cell ? { card, cell } : null;
      })
      .filter((x): x is { card: HTMLElement; cell: (typeof layout.cells)[number] } => x !== null);
    flying.forEach(({ card, cell }, i) => {
      const from = card.getBoundingClientRect();
      const tx = rect.x + STAGE_PAD + cell.col * PITCH_X;
      const ty = rect.y + STAGE_PAD + cell.row * PITCH_Y;
      const at = i * 0.07;
      tl.to(
        card,
        {
          x: tx - from.left,
          y: ty - from.top,
          scaleX: CELL_W / from.width,
          scaleY: CELL_H / from.height,
          transformOrigin: "0 0",
          duration: dur,
        },
        at,
      );
      // El contenido de la tarjeta cede al bloque en el último tramo del viaje.
      tl.to(card, { opacity: 0, duration: dur * 0.35, ease: EASE.linear }, at + dur * 0.65);
    });
    const total = tl.duration();
    tl.to(heapView, { reveal: 1, duration: Math.max(0.2, total * 0.45), ease: EASE.linear }, Math.max(0, total * 0.45));
    await new Promise<void>((resolve) => tl.eventCallback("onComplete", () => resolve()));
    go();
    // Las tarjetas se restauran cuando la ruta ya cambió (si se hiciera antes parpadearían tras los bloques).
    // El árbol del home puede conservarse al volver con «atrás»: no deben quedar invisibles ni desplazadas.
    const restore = () => gsap.set(flying.map((f) => f.card), { clearProps: "transform,opacity" });
    const started = performance.now();
    const wait = () => {
      if (/\/heap(\/|$)/.test(window.location.pathname) || performance.now() - started > 5000) setTimeout(restore, 400);
      else setTimeout(wait, 60);
    };
    wait();
  } catch {
    // Cualquier fallo (red, chunk): se navega sin animación y la página /heap monta su propia escena.
    document
      .querySelectorAll<HTMLElement>("#runtime-list article[data-twin^='card:']")
      .forEach((card) => card.style.removeProperty("transform"));
    navigate();
  }
}

/**
 * Al montar `/heap` tras la transición: desplaza la página para que el escenario real quede exactamente
 * donde estaba el virtual (`heapView.stageOverride`) y llama a `done` cuando coinciden de forma estable
 * (entonces se suelta el virtual). El router de Next también restablece el scroll al llegar, así que la
 * alineación se comprueba durante unos fotogramas en lugar de hacerse una sola vez. Devuelve la limpieza,
 * o `null` si no hubo entrada desde RUNTIME (en ese caso no hace nada y `done` no se llama).
 */
export function alignStageToEntry(
  stage: HTMLElement,
  override: { y: number } | null,
  done: () => void,
): (() => void) | null {
  // La marca NO se consume al leerla (el modo estricto de React monta, limpia y vuelve a montar los efectos):
  // se borra cuando la alineación termina.
  let flagged = false;
  try {
    flagged = sessionStorage.getItem(HEAP_ENTRY_KEY) === "1";
  } catch {
    /* sin almacenamiento */
  }
  if (!flagged || !override) return null;
  const finish = () => {
    try {
      sessionStorage.removeItem(HEAP_ENTRY_KEY);
    } catch {
      /* sin almacenamiento */
    }
    done();
  };
  const target = override.y;
  let frames = 0;
  let stable = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tick = () => {
    const top = stage.getBoundingClientRect().top;
    if (Math.abs(top - target) > 1) {
      window.scrollTo({ top: Math.max(0, top + window.scrollY - target), behavior: "instant" });
      stable = 0;
    } else stable++;
    if (stable >= 4 || ++frames > 60) finish();
    else timer = setTimeout(tick, 16);
  };
  tick();
  return () => clearTimeout(timer);
}
