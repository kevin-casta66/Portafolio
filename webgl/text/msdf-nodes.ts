import { TSL, type N } from "../nodes/tsl";
import type { MsdfFont } from "./msdf-font";

const { texture, vec2, max, min, dot, fwidth, clamp } = TSL;

/**
 * Cobertura (alfa) de un glifo MSDF en TSL: mediana de los tres canales → distancia con signo →
 * conversión a píxeles de pantalla con las derivadas de las UV (`screenPxRange`) → alfa con borde
 * suavizado de 1 px. Es nítido a cualquier escala y densidad de píxeles.
 */
export function createMsdfSampler(font: MsdfFont) {
  const atlas = texture(font.texture);
  const unitRange = vec2(font.distanceRange / font.scaleW, font.distanceRange / font.scaleH);

  return {
    /** Alfa (0..1) del glifo en la coordenada de textura `uvNode`. */
    alphaAt(uvNode: N): N {
      const s = atlas.sample(uvNode).rgb;
      const sd = max(min(s.r, s.g), min(max(s.r, s.g), s.b));
      const screenTexSize = vec2(1, 1).div(fwidth(uvNode));
      const screenPxRange = max(dot(unitRange, screenTexSize).mul(0.5), 1);
      return clamp(sd.sub(0.5).mul(screenPxRange).add(0.5), 0, 1);
    },
  };
}
