import { ScrollTrigger, gsap } from "../gsap";
import { qa } from "../transitions/dom";
import type { Choreography } from "./context";
import { buildTreeReveal } from "./tree-reveal";

/**
 * PARSER · (1) si las transiciones están desactivadas, el árbol se revela al entrar en viewport
 * (ramas con DrawSVG, nodos con resorte); con transiciones lo hace T3. (2) En escritorio el árbol
 * horizontal se explora arrastrando con el puntero, con inercia. El teclado no necesita arrastre: al
 * enfocar un nodo el navegador lo mantiene visible (scroll nativo del contenedor).
 */
const FRICTION_MS = 240; // constante de decaimiento de la inercia
const DRAG_THRESHOLD = 5; // px antes de considerar que es un arrastre y no un clic

export const parserChoreography: Choreography = (ctx) => {
  const section = ctx.root.querySelector<HTMLElement>("#parser");
  if (!section) return;

  if (!ctx.transitionsOn && !ctx.reduced) {
    const reveal = buildTreeReveal(ctx.root);
    ScrollTrigger.create({
      trigger: section,
      start: "top 75%",
      once: true,
      animation: reveal,
      toggleActions: "play none none none",
    });
  }

  // Arrastre con inercia (solo ratón/lápiz con puntero fino y árbol horizontal desbordado).
  const tree = qa(section, "[role='tree']")[0];
  if (!tree || !ctx.finePointer || ctx.compact || ctx.reduced) return;

  let down = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;
  let lastX = 0;
  let lastT = 0;
  let velocity = 0; // px/ms del scroll (signo del scrollLeft)
  let stopInertia: (() => void) | undefined;

  const draggable = () => tree.scrollWidth > tree.clientWidth + 1;
  const onDown = (event: PointerEvent) => {
    if (event.pointerType === "touch" || event.button !== 0 || !draggable()) return;
    stopInertia?.();
    down = true;
    moved = false;
    startX = lastX = event.clientX;
    startScroll = tree.scrollLeft;
    lastT = performance.now();
  };
  const onMove = (event: PointerEvent) => {
    if (!down) return;
    const dx = event.clientX - startX;
    if (!moved && Math.abs(dx) > DRAG_THRESHOLD) {
      moved = true;
      tree.setPointerCapture(event.pointerId);
      tree.dataset.dragging = "true";
    }
    if (!moved) return;
    tree.scrollLeft = startScroll - dx;
    const now = performance.now();
    const dt = Math.max(1, now - lastT);
    velocity = -(event.clientX - lastX) / dt;
    lastX = event.clientX;
    lastT = now;
  };
  const onUp = (event: PointerEvent) => {
    if (!down) return;
    down = false;
    delete tree.dataset.dragging;
    if (tree.hasPointerCapture(event.pointerId)) tree.releasePointerCapture(event.pointerId);
    if (!moved) return;
    // Inercia: decae exponencialmente; se avanza desde el reloj único, sin bucle propio.
    let v = velocity;
    stopInertia = ctx.clock.subscribe((_t, deltaMs) => {
      tree.scrollLeft += v * deltaMs;
      v *= Math.exp(-deltaMs / FRICTION_MS);
      if (Math.abs(v) < 0.01) stopInertia?.();
    });
  };
  // Un arrastre no debe seleccionar la hoja sobre la que termina el puntero.
  const onClickCapture = (event: MouseEvent) => {
    if (moved) {
      event.stopPropagation();
      event.preventDefault();
      moved = false;
    }
  };

  tree.addEventListener("pointerdown", onDown);
  tree.addEventListener("pointermove", onMove);
  tree.addEventListener("pointerup", onUp);
  tree.addEventListener("pointercancel", onUp);
  tree.addEventListener("click", onClickCapture, true);
  tree.classList.add("is-draggable");

  ctx.onCleanup(() => {
    stopInertia?.();
    tree.removeEventListener("pointerdown", onDown);
    tree.removeEventListener("pointermove", onMove);
    tree.removeEventListener("pointerup", onUp);
    tree.removeEventListener("pointercancel", onUp);
    tree.removeEventListener("click", onClickCapture, true);
    tree.classList.remove("is-draggable");
    gsap.killTweensOf(tree);
  });
};
