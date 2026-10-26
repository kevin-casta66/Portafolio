import { EASE } from "@/motion/gsap";
import type { CanvasTransition } from "./state";

/**
 * T5 · BYTECODE → RUNTIME (canvas). Barrido en espacio de pantalla con máscara de dithering Bayer
 * 8×8 teñida de ámbar, bajo el cual el chip enciende sus núcleos uno a uno. En el DOM solo cambian
 * las tarjetas (se encienden en orden, igual que en la versión DOM del change 03).
 */
export const T5: CanvasTransition = {
  id: "T5",
  order: 100,
  dom(ctx, tl) {
    const cards = Array.from(
      ctx.root.querySelectorAll<HTMLElement>("#runtime article[data-anim='process-card']"),
    );
    if (cards.length > 0) {
      tl.fromTo(
        cards,
        { opacity: 0.35, filter: "brightness(1.7)" },
        { opacity: 1, filter: "brightness(1)", duration: 0.25, ease: EASE.inExpo, stagger: 0.09 },
        0.3,
      );
    }
  },
  load: () => import("./T5.scene").then((m) => m.createT5Scene),
};
