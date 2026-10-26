import { monitorAssembly } from "../objects/monitor-state";
import type { CanvasTransition } from "./state";

/**
 * T9 · GPU → DISPLAY (canvas, «convergencia»). Los píxeles de la fase GPU migran como partículas
 * hacia la silueta del monitor que enmarca el formulario y, al ensamblarse, aparece el gradiente
 * espectral de todos los acentos. El monitor (escena DISPLAY) se ensambla con la misma timeline:
 * parte de 0 y llega a 1 cuando las partículas aterrizan. Tier bajo/reducida: celdas SVG (change 03).
 */
const ASSEMBLE_AT = 0.76;
const ASSEMBLE_LEN = 0.22;

export const T9: CanvasTransition = {
  id: "T9",
  order: 100,
  dom(_ctx, tl) {
    // El monitor empieza apagado y se ensambla cuando llegan los píxeles (no depende de que la escena haya cargado).
    tl.fromTo(monitorAssembly, { value: 0 }, { value: 1, duration: ASSEMBLE_LEN }, ASSEMBLE_AT);
    return () => {
      monitorAssembly.value = 1;
    };
  },
  load: () => import("./T9.scene").then((m) => m.createT9Scene),
};
