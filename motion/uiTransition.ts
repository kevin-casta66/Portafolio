import { prefersReducedMotion } from "./reduced";
import { cssEase, duration } from "./tokens";

/**
 * Transiciones de UI (T10): cambio de tema, reordenado por filtros y apertura/cierre del menú.
 *
 *  - Con soporte (`document.startViewTransition`): transiciones de vista. El tema se revela en un círculo
 *    creciente desde el botón; los filtros y el menú los anima `<ViewTransition>` de React (estable en
 *    React 19.3, sin flag en Next 16.4) o el navegador.
 *  - Sin soporte: la misma funcionalidad con una animación equivalente: FLIP de GSAP (filtros y menú) o
 *    un fundido cruzado con una cortina (tema). Nunca se pierde función: el resultado es idéntico.
 *  - Movimiento reducido: cambio directo, sin animación.
 *
 * Este módulo no importa GSAP al cargarse (solo el FLIP de respaldo, bajo demanda): vive fuera del JS
 * inicial y el resto del sitio lo pide con `import()` al primer uso.
 */
export type UiMode = "native" | "flip" | "instant";

export interface UiSupport {
  reduced: boolean;
  /** El navegador implementa `document.startViewTransition`. */
  supportsViewTransitions: boolean;
}

export const supportsViewTransitions = (): boolean =>
  typeof document !== "undefined" && typeof document.startViewTransition === "function";

export const currentSupport = (): UiSupport => ({
  reduced: prefersReducedMotion(),
  supportsViewTransitions: supportsViewTransitions(),
});

/** Qué técnica usar: reducido → instantáneo; con soporte → transiciones de vista; si no → FLIP. */
export function resolveUiMode(support: UiSupport): UiMode {
  if (support.reduced) return "instant";
  return support.supportsViewTransitions ? "native" : "flip";
}

const html = () => document.documentElement;

/** Marca la transición en curso (los estilos de `::view-transition-*` dependen de ella) y la quita al terminar. */
function markUiTransition(kind: "theme" | "menu", done: Promise<unknown>): void {
  html().dataset.uiTransition = kind;
  const clear = () => {
    if (html().dataset.uiTransition === kind) delete html().dataset.uiTransition;
  };
  void done.then(clear, clear);
}

// ───────────────────────────── tema ─────────────────────────────

export interface ThemeRevealOptions {
  /** Aplica el tema nuevo (atributo `data-theme` y almacén): se ejecuta dentro de la transición. */
  update(): void;
  /** Centro del botón (px de viewport): origen del círculo. */
  origin: { x: number; y: number };
  support?: UiSupport;
}

/** Radio del círculo que alcanza la esquina más lejana del viewport desde el origen. */
export const revealRadius = (x: number, y: number, width: number, height: number): number =>
  Math.hypot(Math.max(x, width - x), Math.max(y, height - y));

/**
 * Cambia el tema. Devuelve la técnica usada: `native` = revelado circular desde el botón con
 * `::view-transition-new(root)`; `flip` (sin soporte) = fundido cruzado con una cortina del color
 * anterior; `instant` = movimiento reducido.
 */
export async function revealTheme({ update, origin, support = currentSupport() }: ThemeRevealOptions): Promise<UiMode> {
  const mode = resolveUiMode(support);
  if (mode === "instant") {
    update();
    return mode;
  }

  if (mode === "native") {
    const transition = document.startViewTransition(() => {
      update();
    });
    markUiTransition("theme", transition.finished);
    try {
      await transition.ready;
      const radius = revealRadius(origin.x, origin.y, window.innerWidth, window.innerHeight);
      html().animate(
        {
          clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`],
        },
        {
          duration: duration.theme,
          easing: cssEase.scene,
          pseudoElement: "::view-transition-new(root)",
        },
      );
    } catch {
      /* la transición se saltó (p. ej. pestaña oculta): el tema ya está aplicado */
    }
    return mode;
  }

  // Sin soporte: cortina del color de fondo anterior que se desvanece sobre el tema nuevo.
  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  veil.dataset.themeVeil = "";
  veil.className = "pointer-events-none fixed inset-0 z-[74]";
  veil.style.backgroundColor = getComputedStyle(html()).backgroundColor;
  document.body.appendChild(veil);
  update();
  await veil.animate([{ opacity: 1 }, { opacity: 0 }], {
    duration: duration.theme / 2,
    easing: cssEase.inExpo,
    fill: "forwards",
  }).finished.catch(() => {});
  veil.remove();
  return mode;
}

// ───────────────────────────── listas (filtros) ─────────────────────────────

/** Estado capturado antes de reordenar una lista (FLIP de respaldo, sin transiciones de vista). */
export interface ListFlip {
  state: unknown;
  ghosts: HTMLElement[];
  list: HTMLElement;
}

/**
 * FLIP de respaldo para el filtro de proyectos: captura la posición de las tarjetas ANTES de que el
 * servidor devuelva la lista filtrada. Las que salen ya no existen: se animan «fantasmas» (clones
 * decorativos) con un fundido; las que se quedan se desplazan; las nuevas entran con fundido.
 */
export async function captureListFlip(
  list: HTMLElement,
  isLeaving: (item: HTMLElement) => boolean,
): Promise<ListFlip> {
  const { Flip, registerGsap } = await import("./gsap");
  registerGsap();
  const items = Array.from(list.children) as HTMLElement[];
  const state = Flip.getState(items);
  const listRect = list.getBoundingClientRect();
  const ghosts = items.filter(isLeaving).map((li) => {
    const rect = li.getBoundingClientRect();
    const ghost = li.cloneNode(true) as HTMLElement;
    ghost.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
    ghost.removeAttribute("data-twin");
    ghost.querySelectorAll("[data-twin],[data-hold]").forEach((el) => {
      el.removeAttribute("data-twin");
      el.removeAttribute("data-hold");
    });
    ghost.setAttribute("aria-hidden", "true");
    ghost.setAttribute("inert", "");
    Object.assign(ghost.style, {
      position: "absolute",
      left: `${rect.left - listRect.left}px`,
      top: `${rect.top - listRect.top}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      pointerEvents: "none",
      margin: "0",
    });
    return ghost;
  });
  return { state, ghosts, list };
}

/** Reproduce el FLIP capturado por `captureListFlip` una vez que la lista ya tiene su contenido nuevo. */
export async function playListFlip({ state, ghosts, list }: ListFlip): Promise<void> {
  const { Flip, EASE, gsap, seconds } = await import("./gsap");
  const targets = Array.from(list.children) as HTMLElement[];
  ghosts.forEach((ghost) => list.appendChild(ghost));
  if (ghosts.length > 0) {
    gsap.to(ghosts, {
      opacity: 0,
      duration: seconds(duration.ui),
      ease: EASE.inExpo,
      onComplete: () => ghosts.forEach((g) => g.remove()),
    });
  }
  Flip.from(state as Parameters<typeof Flip.from>[0], {
    targets,
    duration: seconds(duration.ui),
    ease: EASE.inExpo,
    scale: true,
    absolute: false,
    onEnter: (els: Element[]) =>
      els.length > 0
        ? gsap.fromTo(els, { opacity: 0 }, { opacity: 1, duration: seconds(duration.ui), ease: EASE.inExpo })
        : undefined,
    onComplete: () => {
      if (targets.length > 0) gsap.set(targets, { clearProps: "transform,opacity" });
    },
  });
}

// ───────────────────────────── menú (disclosure) ─────────────────────────────

/**
 * Abre o cierra un menú (`<details>`) con transición: con soporte, transición de vista de la raíz
 * (la altura que cambia empuja el contenido de debajo); sin soporte, FLIP de los elementos que se
 * desplazan; reducido, cambio directo. `moving` devuelve los elementos que el menú empuja.
 */
export async function toggleMenu(
  details: HTMLDetailsElement,
  moving: () => HTMLElement[],
  support: UiSupport = currentSupport(),
): Promise<UiMode> {
  const apply = () => {
    details.open = !details.open;
  };
  const mode = resolveUiMode(support);
  if (mode === "instant") {
    apply();
    return mode;
  }
  if (mode === "native") {
    const transition = document.startViewTransition(apply);
    markUiTransition("menu", transition.finished);
    await transition.finished.catch(() => {});
    return mode;
  }
  const { Flip, EASE, registerGsap, seconds } = await import("./gsap");
  registerGsap();
  const state = Flip.getState(moving());
  apply();
  Flip.from(state, { duration: seconds(duration.ui), ease: EASE.inExpo, absolute: false });
  return mode;
}
