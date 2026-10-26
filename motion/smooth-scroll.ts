import Lenis from "lenis";
import type { Clock } from "./clock";
import { ScrollTrigger } from "./gsap";

/**
 * Scroll suave: Lenis solo INTERPOLA `window.scrollY` (el scroll sigue siendo el nativo: anclas,
 * teclado, buscar en la página y táctil funcionan igual). Su bucle propio está apagado
 * (`autoRaf: false`) y se avanza desde el reloj único, antes que el resto de suscriptores.
 * Sin `snap`, sin bloquear el scroll nunca.
 */
export interface SmoothScroll {
  lenis: Lenis;
  destroy(): void;
}

export function createSmoothScroll(clock: Clock): SmoothScroll {
  const lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    // Táctil: scroll nativo sin suavizado.
    syncTouch: false,
    anchors: false,
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on("scroll", onScroll);
  const off = clock.subscribe((timeSeconds) => lenis.raf(timeSeconds * 1000), 0);

  return {
    lenis,
    destroy() {
      off();
      lenis.off("scroll", onScroll);
      lenis.destroy();
    },
  };
}
