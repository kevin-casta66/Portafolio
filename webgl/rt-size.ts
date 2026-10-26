/**
 * Tamaño de los render targets en PÍXELES FÍSICOS.
 *
 * Desde three r186 los viewports y scissors de un render target ya no se multiplican por el pixel
 * ratio del renderer: cualquier `RenderTarget`, `viewport` o `scissor` propio se expresa en píxeles
 * físicos, calculados aquí (`ancho CSS × DPR efectivo × escala del tier`). Un RT de transición que
 * use solo píxeles CSS quedaría en un cuarto de la pantalla con DPR 2.
 */
export const MAX_DPR = 2;

/** Densidad de píxeles del render: la del dispositivo, entre 1 y `MAX_DPR`. */
export function effectiveDpr(devicePixelRatio: number): number {
  const dpr = Number.isFinite(devicePixelRatio) ? devicePixelRatio : 1;
  return Math.min(MAX_DPR, Math.max(1, dpr));
}

export interface PixelSize {
  width: number;
  height: number;
}

export function rtSize(cssWidth: number, cssHeight: number, dpr: number, scale = 1): PixelSize {
  const factor = effectiveDpr(dpr) * scale;
  return {
    width: Math.max(1, Math.round(cssWidth * factor)),
    height: Math.max(1, Math.round(cssHeight * factor)),
  };
}
