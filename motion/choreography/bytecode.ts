import { audio } from "@/audio";
import { EASE, ScrollTrigger, gsap, seconds } from "../gsap";
import { duration } from "../tokens";
import { docRect, qa } from "../transitions/dom";
import type { Choreography } from "./context";

/**
 * BYTECODE · «program counter» ligado al scroll: una flecha brillante (y una barra de resaltado)
 * recorre la columna de instrucciones y marca la que está alineada con el centro del viewport;
 * retroceder el scroll la mueve hacia atrás. El resaltado NO es el único medio de leer las
 * instrucciones (el texto no cambia). Al entrar en otra función, sus registros se actualizan con una
 * animación breve (duración de UI). Solo `transform`/`opacity`.
 */
export const bytecodeChoreography: Choreography = (ctx) => {
  const section = ctx.root.querySelector<HTMLElement>("#bytecode");
  if (!section || ctx.reduced) return;
  const list = section.querySelector<HTMLElement>("ol");
  const instructions = qa(section, "li[data-anim='instruction']");
  if (!list || instructions.length === 0) return;

  const originalPosition = list.style.position;
  if (getComputedStyle(list).position === "static") list.style.position = "relative";

  const bar = document.createElement("div");
  bar.className = "pc-bar";
  bar.setAttribute("aria-hidden", "true");
  const arrow = document.createElement("div");
  arrow.className = "pc-arrow";
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "▶";
  list.append(bar, arrow);

  let active = -1;
  let activeFunction: Element | null = null;
  const move = gsap.quickTo(arrow, "y", { duration: seconds(duration.ui), ease: EASE.inExpo });
  const moveBar = gsap.quickTo(bar, "y", { duration: seconds(duration.ui), ease: EASE.inExpo });
  const scaleBar = gsap.quickTo(bar, "scaleY", {
    duration: seconds(duration.ui),
    ease: EASE.inExpo,
  });

  let lastSoundAt = 0;
  /** `audible`: solo el desplazamiento del usuario suena (no el posicionado inicial ni los refrescos). */
  const select = (index: number, audible = false) => {
    if (index === active) return;
    if (audible) {
      const now = performance.now();
      if (now - lastSoundAt >= 90) {
        lastSoundAt = now;
        audio.emit("bytecode:instruction"); // pluck apagado al resaltar la instrucción
      }
    }
    instructions[active]?.removeAttribute("data-pc-active");
    active = index;
    const el = instructions[index] as HTMLElement;
    el.setAttribute("data-pc-active", "true");
    const listTop = docRect(list).y;
    const rect = docRect(el);
    const y = rect.y - listTop;
    move(y + rect.h / 2 - 10);
    moveBar(y);
    scaleBar(rect.h / 16);

    // Registros: se actualizan (pulso breve) al entrar en una función distinta.
    const fn = el.closest("li[data-anim='function']");
    if (fn && fn !== activeFunction) {
      if (audible && activeFunction) audio.emit("bytecode:function"); // platillo al cambiar de empleo
      activeFunction = fn;
      const registers = fn.querySelector("[data-anim='registers']");
      if (registers) {
        gsap.fromTo(
          registers,
          { opacity: 0.35, y: 8 },
          {
            opacity: 1,
            y: 0,
            duration: seconds(duration.ui),
            ease: EASE.inExpo,
            clearProps: "opacity,transform",
          },
        );
      }
    }
  };

  const nearestToCenter = (): number => {
    const center = window.innerHeight / 2;
    let best = 0;
    let bestDistance = Infinity;
    instructions.forEach((el, i) => {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - center);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return best;
  };

  const trigger = ScrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onUpdate: () => select(nearestToCenter(), true),
    onRefresh: () => {
      active = -1; // fuerza el reposicionado tras un cambio de layout
      select(nearestToCenter());
    },
  });
  select(nearestToCenter());

  ctx.onCleanup(() => {
    trigger.kill();
    gsap.killTweensOf([arrow, bar]);
    instructions.forEach((el) => el.removeAttribute("data-pc-active"));
    bar.remove();
    arrow.remove();
    list.style.position = originalPosition;
  });
};
