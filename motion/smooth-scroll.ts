import Lenis from "lenis";
import type { Clock } from "./clock";
import { ScrollTrigger } from "./gsap";

/**
 * Scroll suave: Lenis solo INTERPOLA `window.scrollY` (el scroll sigue siendo el nativo: anclas,
 * teclado, buscar en la página y táctil funcionan igual). Su bucle propio está apagado
 * (`autoRaf: false`) y se avanza desde el reloj único, antes que el resto de suscriptores.
 * Sin `snap`, sin bloquear el scroll nunca.
 *
 * Ritmo de la rueda: para que un giro rápido (rueda libre, trackpad) no salte fases enteras y se
 * pierdan sus animaciones, cada evento avanza menos (`WHEEL_MULTIPLIER`), ningún evento suelto pasa
 * de `MAX_STEP_PX` y el destino nunca se adelanta más de `MAX_LEAD_VIEWPORTS` a lo que se ve. Solo
 * afecta a la rueda con puntero fino: teclado, barra de scroll, táctil y anclas no se limitan, y con
 * movimiento reducido no hay Lenis.
 */
const WHEEL_MULTIPLIER = 0.6;
const MAX_STEP_PX = 80;
const MAX_LEAD_VIEWPORTS = 0.35;

export interface SmoothScroll {
  lenis: Lenis;
  destroy(): void;
}

/**
 * Delta de rueda permitido (px, ya multiplicado) dado cuánto va adelantado el destino respecto a lo
 * que se ve (`lead`, con signo) y la altura de la ventana. Puro: se prueba sin navegador.
 */
export function limitWheelDelta(delta: number, lead: number, viewH: number): number {
  const step = Math.max(-MAX_STEP_PX, Math.min(MAX_STEP_PX, delta));
  const maxLead = viewH * MAX_LEAD_VIEWPORTS;
  // Solo se recorta en el sentido en el que ya se va adelantado: invertir la dirección siempre vale.
  if (step > 0) return Math.max(0, Math.min(step, maxLead - lead));
  if (step < 0) return Math.min(0, Math.max(step, -maxLead - lead));
  return 0;
}

export function createSmoothScroll(clock: Clock): SmoothScroll {
  const lenis: Lenis = new Lenis({
    autoRaf: false,
    smoothWheel: true,
    // Táctil: scroll nativo sin suavizado.
    syncTouch: false,
    anchors: false,
    wheelMultiplier: WHEEL_MULTIPLIER,
    virtualScroll: (data) => {
      if (data.event.type !== "wheel") return true;
      const lead = lenis.targetScroll - lenis.animatedScroll;
      data.deltaY = limitWheelDelta(data.deltaY, lead, window.innerHeight);
      return true;
    },
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
