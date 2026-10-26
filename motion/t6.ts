import { EASE, gsap, seconds, registerGsap } from "./gsap";
import { t6 } from "./shared";
import { duration } from "./tokens";

/**
 * T6 · RUNTIME → caso (Hold-to-Execute). Piezas de la animación, sin navegación ni estado de página:
 *
 *  - Una «superficie» es lo que se ve expandirse: el gemelo de la tarjeta en el canvas (`canvasSurface`,
 *    con distorsión de lente y aberración en los bordes) o, en tier bajo, un recuadro del DOM
 *    (`domSurface`, solo `transform`/`opacity`).
 *  - `expandTo` la lleva del rectángulo de la tarjeta a pantalla completa y `deliverTo` de pantalla
 *    completa al rectángulo de la cabecera del caso. `motion/pageTransition.ts` las encadena con la
 *    navegación en medio; `playT6` las junta en UNA timeline reproducible sin navegar (prototipo y,
 *    después, la página /motion del change 08).
 *
 * Todo avanza con el ticker de GSAP, que es el reloj único (el motor 3D renderiza desde él).
 */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface SurfaceState extends Rect {
  /** 0..1: distorsión de lente y aberración cromática. */
  lens: number;
  alpha: number;
}

export interface Surface {
  apply(state: SurfaceState): void;
  destroy(): void;
}

export const viewportRect = (): Rect => ({ x: 0, y: 0, w: window.innerWidth, h: window.innerHeight });

export const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};

/** Superficie en el canvas persistente: escribe `t6.state`, que dibuja la escena `T6.scene.ts`. */
export function canvasSurface(): Surface {
  return {
    apply(s) {
      Object.assign(t6.state, { x: s.x, y: s.y, w: s.w, h: s.h, lens: s.lens, alpha: s.alpha, visible: true });
      t6.markDirty?.();
    },
    destroy() {
      t6.state.visible = false;
      t6.state.alpha = 0;
      t6.markDirty?.();
    },
  };
}

/** Superficie en el DOM (tier bajo): un recuadro que se desplaza y escala; nunca toca el layout. */
export function domSurface(initial: Rect): Surface {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.dataset.phase = "runtime";
  el.dataset.t6Ghost = "";
  el.className =
    "pointer-events-none fixed left-0 top-0 z-[71] origin-top-left rounded-lg border border-accent bg-surface";
  el.style.width = `${Math.max(1, initial.w)}px`;
  el.style.height = `${Math.max(1, initial.h)}px`;
  el.style.opacity = "0";
  document.body.appendChild(el);
  const baseW = Math.max(1, initial.w);
  const baseH = Math.max(1, initial.h);
  return {
    apply(s) {
      el.style.opacity = String(s.alpha);
      el.style.transform = `translate(${s.x}px, ${s.y}px) scale(${s.w / baseW}, ${s.h / baseH})`;
    },
    destroy() {
      el.remove();
    },
  };
}

/** Rótulo «Attaching debugger…»: texto DOM centrado sobre la superficie (el centro de la lente queda limpio). */
export interface AttachLabel {
  el: HTMLElement;
  /** 0..1 */
  setOpacity(value: number): void;
  destroy(): void;
}

export function createAttachLabel(text: string): AttachLabel {
  const el = document.createElement("div");
  el.dataset.phase = "runtime";
  el.dataset.attachLabel = "";
  el.setAttribute("aria-hidden", "true");
  el.className = "pointer-events-none fixed inset-0 z-[72] grid place-items-center";
  const span = document.createElement("span");
  span.className =
    "rounded-md border border-accent bg-surface px-4 py-2 font-mono text-base text-accent sm:text-lg";
  span.textContent = text;
  el.appendChild(span);
  el.style.opacity = "0";
  document.body.appendChild(el);
  return {
    el,
    setOpacity(value) {
      el.style.opacity = String(value);
    },
    destroy() {
      el.remove();
    },
  };
}

/** Estado vivo de una superficie que se anima (lo tuitean los tramos). */
export function makeProxy(from: Rect, alpha = 1): SurfaceState {
  return { ...from, lens: 0, alpha };
}

const toSeconds = (ms: number) => seconds(ms);

/** Duración del fundido final de la superficie (y de la aparición de la cabecera real): proporcional al tramo. */
export const fadeMsFor = (deliverMs: number): number =>
  Math.min(duration.micro, Math.max(40, deliverMs * 0.2));

/** Tramo de EXPANSIÓN: del rectángulo actual a pantalla completa, con la lente subiendo hasta el máximo. */
export function expandTo(surface: Surface, proxy: SurfaceState, ms: number): gsap.core.Tween {
  registerGsap();
  const full = viewportRect();
  return gsap.to(proxy, {
    ...full,
    lens: 1,
    duration: toSeconds(ms),
    ease: EASE.scene,
    onUpdate: () => surface.apply(proxy),
  });
}

/** Tramo de ENTREGA: de pantalla completa al rectángulo de la cabecera, con la lente bajando a cero. */
export function deliverTo(surface: Surface, proxy: SurfaceState, to: Rect, ms: number): gsap.core.Timeline {
  registerGsap();
  const tl = gsap.timeline();
  tl.to(
    proxy,
    { ...to, lens: 0, duration: toSeconds(ms), ease: EASE.scene, onUpdate: () => surface.apply(proxy) },
    0,
  );
  // La superficie se desvanece justo al final, cuando ya ocupa el sitio de la cabecera real.
  const fade = fadeMsFor(ms);
  tl.to(
    proxy,
    { alpha: 0, duration: toSeconds(fade), ease: EASE.inExpo, onUpdate: () => surface.apply(proxy) },
    Math.max(0, toSeconds(ms) - toSeconds(fade)),
  );
  return tl;
}

export interface PlayT6Options {
  /** Rectángulo de partida (la tarjeta) y de llegada (la cabecera), en px de viewport. */
  from: Rect;
  to: Rect;
  /** `full` (hold, ≤ 1200 ms) o `short` (clic / Enter, ≤ 500 ms). */
  intensity: "full" | "short";
  /** `canvas`: gemelo con lente en el canvas; `dom`: recuadro del DOM (tier bajo). */
  surface: "canvas" | "dom";
  /** Texto del rótulo; sin él no se muestra. */
  label?: string;
  /** Se llama a mitad de la expansión, que es cuando la transición real navega. */
  onNavigate?: () => void;
}

export interface T6Playback {
  /** Timeline en pausa y reproducible (`progress()`, `play()`…). */
  timeline: gsap.core.Timeline;
  readonly duration: number;
  destroy(): void;
}

/**
 * Transición T6 completa como UNA timeline aislada: expansión, punto de navegación (opcional) y
 * entrega. No navega ni toca el DOM de la página salvo la superficie y el rótulo, así que se puede
 * invocar desde cualquier sitio (prototipo, /motion) y se destruye con `destroy()`.
 */
export function playT6(options: PlayT6Options): T6Playback {
  registerGsap();
  const total = options.intensity === "full" ? duration.pageFull : duration.pageShort;
  const half = total / 2;
  const surface = options.surface === "canvas" ? canvasSurface() : domSurface(options.from);
  const label = options.label ? createAttachLabel(options.label) : null;
  const proxy = makeProxy(options.from);

  const tl = gsap.timeline({ paused: true });
  tl.add(expandTo(surface, proxy, half), 0);
  if (label) {
    tl.fromTo(
      label.el,
      { opacity: 0 },
      { opacity: 1, duration: toSeconds(half * 0.4), ease: EASE.inExpo },
      toSeconds(half * 0.45),
    );
    tl.to(label.el, { opacity: 0, duration: toSeconds(half * 0.5), ease: EASE.inExpo }, toSeconds(half));
  }
  if (options.onNavigate) tl.call(options.onNavigate, [], toSeconds(half * 0.6));
  tl.add(deliverTo(surface, proxy, options.to, half), toSeconds(half));
  surface.apply(proxy);

  return {
    timeline: tl,
    duration: total,
    destroy() {
      tl.kill();
      label?.destroy();
      surface.destroy();
    },
  };
}
