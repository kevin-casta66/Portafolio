import { EASE, gsap, seconds } from "../gsap";
import { duration } from "../tokens";
import type { Choreography } from "./context";

/**
 * RUNTIME · inclinación 3D sutil con reflejo especular que sigue al cursor, solo con puntero fino y
 * hover (nunca en táctil). Al salir, la tarjeta vuelve a reposo con el resorte de UI. La inclinación
 * es `transform`; el reflejo es una capa decorativa que se DESPLAZA con `transform` (no se repinta un
 * degradado). Delegación en la lista: un único listener para todas las tarjetas.
 */
const MAX_TILT_DEG = 6;

export const runtimeChoreography: Choreography = (ctx) => {
  const section = ctx.root.querySelector<HTMLElement>("#runtime");
  if (!section || !ctx.finePointer || ctx.reduced) return;

  interface TiltState {
    rotX: (v: number) => void;
    rotY: (v: number) => void;
    /**
     * `false` mientras la tarjeta vuelve a reposo: ese tween ha anulado los `quickTo` de rotación, así que
     * hay que recrearlos en el siguiente hover (causa raíz del bug «la inclinación solo se ve la primera vez»).
     */
    bound: boolean;
    glareX: (v: number) => void;
    glareY: (v: number) => void;
    glare: HTMLElement;
    glareFade: gsap.core.Tween;
  }
  const states = new WeakMap<HTMLElement, TiltState>();
  const tiltOpts = { duration: seconds(duration.micro), ease: "power2.out" };

  /** (Re)crea los `quickTo` de inclinación de una tarjeta. */
  const bindTilt = (card: HTMLElement) => ({
    rotX: gsap.quickTo(card, "rotationX", tiltOpts) as (v: number) => void,
    rotY: gsap.quickTo(card, "rotationY", tiltOpts) as (v: number) => void,
  });

  const ensure = (card: HTMLElement): TiltState => {
    let state = states.get(card);
    if (state) return state;
    const glare = document.createElement("div");
    glare.className = "card-glare";
    glare.setAttribute("aria-hidden", "true");
    card.appendChild(glare);
    gsap.set(card, { transformPerspective: 900, transformStyle: "preserve-3d" });
    state = {
      ...bindTilt(card),
      bound: true,
      glareX: gsap.quickTo(glare, "x", tiltOpts) as (v: number) => void,
      glareY: gsap.quickTo(glare, "y", tiltOpts) as (v: number) => void,
      glare,
      glareFade: gsap.to(glare, { opacity: 0, duration: 0 }),
    };
    states.set(card, state);
    return state;
  };

  const cardOf = (target: EventTarget | null): HTMLElement | null =>
    (target as HTMLElement | null)?.closest<HTMLElement>("article[data-anim='process-card']") ??
    null;

  const onMove = (event: PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    const card = cardOf(event.target);
    if (!card) return;
    const state = ensure(card);
    if (!state.bound) {
      // Vuelve el puntero mientras la tarjeta se asienta: se detiene el resorte de reposo y se recrean
      // los `quickTo` (el tween de reposo los dejó sin propiedades que animar).
      gsap.killTweensOf(card, "rotationX,rotationY");
      Object.assign(state, bindTilt(card), { bound: true });
    }
    const r = card.getBoundingClientRect();
    const nx = (event.clientX - r.left) / r.width - 0.5; // -0,5…0,5
    const ny = (event.clientY - r.top) / r.height - 0.5;
    state.rotY(nx * 2 * MAX_TILT_DEG);
    state.rotX(-ny * 2 * MAX_TILT_DEG);
    // El reflejo es un círculo grande centrado en el puntero: se mueve, no se repinta.
    state.glareX(event.clientX - r.left - state.glare.offsetWidth / 2);
    state.glareY(event.clientY - r.top - state.glare.offsetHeight / 2);
    state.glareFade.kill();
    state.glareFade = gsap.to(state.glare, { opacity: 1, duration: seconds(duration.micro) });
  };

  const rest = (card: HTMLElement) => {
    const state = states.get(card);
    if (!state) return;
    // Vuelta a reposo con el resorte de UI. Se anulan EXPLÍCITAMENTE los `quickTo` de rotación (en vez de
    // `overwrite: "auto"`, que los dejaba muertos para siempre) y se marca la tarjeta para recrearlos.
    gsap.killTweensOf(card, "rotationX,rotationY");
    state.bound = false;
    gsap.to(card, {
      rotationX: 0,
      rotationY: 0,
      duration: seconds(duration.reveal),
      ease: EASE.spring,
    });
    state.glareFade.kill();
    state.glareFade = gsap.to(state.glare, { opacity: 0, duration: seconds(duration.ui) });
  };
  const onOut = (event: PointerEvent) => {
    const card = cardOf(event.target);
    const next = cardOf(event.relatedTarget);
    if (card && card !== next) rest(card);
  };

  section.addEventListener("pointermove", onMove);
  section.addEventListener("pointerout", onOut);

  ctx.onCleanup(() => {
    section.removeEventListener("pointermove", onMove);
    section.removeEventListener("pointerout", onOut);
    section.querySelectorAll<HTMLElement>("article[data-anim='process-card']").forEach((card) => {
      gsap.killTweensOf(card);
      gsap.set(card, { clearProps: "transform,transformPerspective,transformStyle" });
      card.querySelector(".card-glare")?.remove();
    });
  });
};
