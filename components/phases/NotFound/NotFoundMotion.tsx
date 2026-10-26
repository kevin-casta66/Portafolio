"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/motion/reduced";
import { duration } from "@/motion/tokens";

/**
 * Capa progresiva de la 404 (T11): al cargar, un glitch de < 300 ms en el título y el volcado de
 * memoria hexadecimal que se «escribe» línea a línea. El título, el mensaje y el botón «Reiniciar
 * proceso» están en el HTML desde el primer render y no se tocan; el volcado es decorativo
 * (`aria-hidden`), así que reescribirlo no afecta a nadie. Sin JS o con movimiento reducido todo
 * queda en su estado final.
 */
export function NotFoundMotion() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const pre = document.querySelector<HTMLElement>("pre[data-anim='memory-dump']");
    const title = document.getElementById("not-found-title");
    const full = pre?.textContent ?? "";
    let cancelled = false;
    let kill: (() => void) | undefined;

    void (async () => {
      const [{ gsap, registerGsap, seconds, EASE }, { glitchTitle }] = await Promise.all([
        import("@/motion/gsap"),
        import("@/motion/transitions/glitch"),
      ]);
      if (cancelled) return;
      registerGsap();
      const glitch = title ? glitchTitle(title) : null;

      let tween: gsap.core.Tween | undefined;
      if (pre && full) {
        const lines = full.split("\n");
        const state = { visible: 0 };
        pre.textContent = "";
        tween = gsap.to(state, {
          visible: lines.length,
          duration: seconds(duration.reveal),
          ease: EASE.inExpo,
          onUpdate: () => {
            pre.textContent = lines.slice(0, Math.ceil(state.visible)).join("\n");
          },
          onComplete: () => {
            pre.textContent = full;
          },
        });
      }
      kill = () => {
        glitch?.kill();
        tween?.kill();
        if (pre) pre.textContent = full;
      };
    })();

    return () => {
      cancelled = true;
      kill?.();
      if (pre && full) pre.textContent = full;
    };
  }, []);

  return null;
}
