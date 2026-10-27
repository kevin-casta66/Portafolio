import { audio } from "@/audio";
import { EASE, ScrollTrigger, gsap, seconds } from "../gsap";
import { duration, stagger } from "../tokens";
import { qa } from "../transitions/dom";
import type { Choreography } from "./context";

/**
 * LEXER · (1) los tokens entran en sus carriles con stagger de lista cuando la sección se revela
 * (si las transiciones están activas lo hace T2 al final de su vuelo) y (2) los contadores `number`
 * arrancan UNA sola vez al entrar en viewport. El valor final está en el DOM desde SSR y los
 * lectores de pantalla siempre leen el valor final, nunca uno intermedio.
 */
export const lexerChoreography: Choreography = (ctx) => {
  const section = ctx.root.querySelector<HTMLElement>("#lexer");
  if (!section) return;
  const locale = document.documentElement.lang || "es";

  // (1) Tokens en carriles (solo si ninguna transición los revela).
  if (!ctx.transitionsOn) {
    for (const lane of qa(section, "[data-lane]")) {
      const tokens = qa(lane, "[data-anim='token']");
      ScrollTrigger.create({
        trigger: lane,
        start: "top 85%",
        once: true,
        onEnter: () => {
          gsap.fromTo(tokens, ctx.reduced ? { opacity: 0 } : { opacity: 0, y: 20 }, {
            opacity: 1,
            y: 0,
            duration: seconds(ctx.reduced ? duration.ui : duration.reveal),
            ease: EASE.inExpo,
            stagger: seconds(stagger.item),
            clearProps: "opacity,transform",
          });
        },
      });
    }
  }

  // (2) Contadores.
  const restores: (() => void)[] = [];
  for (const counter of qa(section, "[data-lane='number'] [data-value]")) {
    const target = Number(counter.dataset.value);
    if (!Number.isFinite(target)) continue;
    const finalText = counter.textContent ?? "";
    const finalNumber = target.toLocaleString(locale);
    const suffix = finalText.startsWith(finalNumber) ? finalText.slice(finalNumber.length) : "";

    ScrollTrigger.create({
      trigger: counter,
      start: "top 92%",
      once: true,
      onEnter: () => {
        if (ctx.reduced) return; // el valor final ya está
        // Lectores de pantalla: el valor final en un nodo oculto visualmente; el animado, aria-hidden.
        const sr = document.createElement("span");
        sr.className = "sr-only";
        sr.textContent = finalText;
        counter.before(sr);
        counter.setAttribute("aria-hidden", "true");
        restores.push(() => {
          counter.textContent = finalText;
          counter.removeAttribute("aria-hidden");
          sr.remove();
        });

        const state = { value: 0 };
        let lastShown = 0;
        let lastTickAt = 0;
        counter.textContent = `0${suffix}`;
        gsap.to(state, {
          value: target,
          duration: seconds(duration.reveal),
          ease: EASE.inExpo,
          onUpdate: () => {
            const shown = Math.round(state.value);
            counter.textContent = `${shown.toLocaleString(locale)}${suffix}`;
            // Ticks suaves mientras sube (como mucho uno cada 60 ms, solo si el número cambió).
            const now = performance.now();
            if (shown !== lastShown && now - lastTickAt >= 60) {
              lastShown = shown;
              lastTickAt = now;
              audio.emit("counter:tick");
            }
          },
          onComplete: () => {
            audio.emit("counter:done"); // la campanita final
            counter.textContent = finalText;
            counter.removeAttribute("aria-hidden");
            sr.remove();
          },
        });
      },
    });
  }

  // Un contador interrumpido (cambio de ruta, reduced motion en caliente) vuelve a su valor final SSR.
  ctx.onCleanup(() => restores.forEach((restore) => restore()));
};
