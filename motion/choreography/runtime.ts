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
    glareX: (v: number) => void;
    glareY: (v: number) => void;
    glare: HTMLElement;
    glareFade: gsap.core.Tween;
  }
  const states = new WeakMap<HTMLElement, TiltState>();

  const ensure = (card: HTMLElement): TiltState => {
    let state = states.get(card);
    if (state) return state;
    const glare = document.createElement("div");
    glare.className = "card-glare";
    glare.setAttribute("aria-hidden", "true");
    card.appendChild(glare);
    gsap.set(card, { transformPerspective: 900, transformStyle: "preserve-3d" });
    const opts = { duration: seconds(duration.micro), ease: "power2.out" };
    state = {
      rotX: gsap.quickTo(card, "rotationX", opts) as (v: number) => void,
      rotY: gsap.quickTo(card, "rotationY", opts) as (v: number) => void,
      glareX: gsap.quickTo(glare, "x", opts) as (v: number) => void,
      glareY: gsap.quickTo(glare, "y", opts) as (v: number) => void,
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
    // Vuelta a reposo con el resorte de UI.
    gsap.to(card, {
      rotationX: 0,
      rotationY: 0,
      duration: seconds(duration.reveal),
      ease: EASE.spring,
      overwrite: "auto",
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
