import { uAccents, uBg, uBorder } from "../nodes/globals";
import { fillSd, sdRoundRect, strokeSd } from "../nodes/sdf";
import { TSL, type N } from "../nodes/tsl";

const { vec2, vec3, float, mix, smoothstep, clamp, max, floor, fract, atan, abs, min, step } = TSL;

/**
 * Monitor (DISPLAY): marco con bisel, cuello y base dibujados ALREDEDOR del rectángulo del
 * formulario (nunca encima: el interior queda transparente) con el gradiente espectral de los
 * acentos de todas las fases. Lo comparten la escena DISPLAY y la transición T9 (los píxeles
 * convergen en esta silueta).
 */
export const BEZEL = 24;
export const STAND = 64;

/** Margen (px) por fuera del rectángulo del formulario que ocupa el monitor: bisel y peana. */
export const MONITOR_PAD = { top: BEZEL, side: BEZEL, bottom: BEZEL + STAND } as const;

const TAU = Math.PI * 2;

/** Color del gradiente espectral para un ángulo/posición `t` ∈ [0, 1) recorriendo los 7 acentos. */
export function spectral(t: N): N {
  const x = fract(t).mul(7);
  const i = floor(x);
  const f = x.sub(i);
  const a = uAccents.element(i.toInt());
  const b = uAccents.element(i.add(1).mod(7).toInt());
  return mix(a, b, smoothstep(0, 1, f));
}

export interface MonitorNodes {
  /** Silueta rellena (bisel + cuello + base) con alfa AA. */
  body: N;
  /** Contorno exterior (para el gradiente espectral y el brillo). */
  edge: N;
  /** Color del contorno: espectral. */
  edgeColor: N;
  /** Color del bisel. */
  bodyColor: N;
}

/**
 * `p` = px relativos al CENTRO del formulario (y hacia abajo); `half` = semitamaño del formulario.
 */
export function monitorNodes(p: N, half: N): MonitorNodes {
  const halfOuter = vec2(half.x.add(BEZEL), half.y.add(BEZEL));
  const dOuter = sdRoundRect(p, halfOuter, float(16));
  const dInner = sdRoundRect(p, half.add(vec2(2, 2)), float(8));
  const bezel = fillSd(dOuter).mul(float(1).sub(fillSd(dInner)));

  // Cuello y base, centrados bajo el bisel.
  const neckCenter = vec2(0, halfOuter.y.add(STAND * 0.28));
  const neck = fillSd(sdRoundRect(p.sub(neckCenter), vec2(26, STAND * 0.3), float(3)));
  const baseCenter = vec2(0, halfOuter.y.add(STAND * 0.8));
  const base = fillSd(sdRoundRect(p.sub(baseCenter), vec2(86, STAND * 0.18), float(7)));

  const body = clamp(max(bezel, max(neck, base)), 0, 1);
  const edge = max(strokeSd(dOuter, 2), max(strokeSd(sdRoundRect(p.sub(baseCenter), vec2(86, STAND * 0.18), float(7)), 2), strokeSd(sdRoundRect(p.sub(neckCenter), vec2(26, STAND * 0.3), float(3)), 2)));
  const t = atan(p.y, p.x).div(TAU).add(0.5);
  return {
    body,
    edge,
    edgeColor: spectral(t),
    bodyColor: mix(uBg, uBorder, 0.55),
  };
}

export { abs, min, step, vec3 };
