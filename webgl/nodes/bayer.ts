import { TSL, type N } from "./tsl";

const { float, floor, mod } = TSL;

/**
 * Matriz de Bayer (umbral ordenado) 2^levels × 2^levels como nodo TSL, en (0, 1).
 * Recursión estándar: M(2n) = 4·M(n) + B2(cuadrante), con B2 = [[0, 2], [3, 1]]
 * ⇒ B = Σₖ 4^(L−1−k) · B2(bitₖ(x), bitₖ(y)). Se usa para el dithering del postprocesado (4×4) y para
 * la máscara del barrido T5 (8×8).
 */
export function bayer(x: N, y: N, levels = 3): N {
  const total = 4 ** levels;
  let acc: N = float(0);
  for (let k = 0; k < levels; k++) {
    const scale = 2 ** k;
    const bx = mod(floor(x.div(scale)), 2);
    const by = mod(floor(y.div(scale)), 2);
    // B2(bx, by) = 2·bx + 3·by − 4·bx·by  → 0, 2, 3, 1
    const b2 = bx.mul(2).add(by.mul(3)).sub(bx.mul(by).mul(4));
    acc = acc.add(b2.mul(4 ** (levels - 1 - k)));
  }
  return acc.add(0.5).div(total);
}

/** Misma matriz en JS puro (para tests y para precálculos en CPU). */
export function bayerValue(x: number, y: number, levels = 3): number {
  const total = 4 ** levels;
  let acc = 0;
  for (let k = 0; k < levels; k++) {
    const bx = Math.floor(x / 2 ** k) % 2;
    const by = Math.floor(y / 2 ** k) % 2;
    acc += (bx * 2 + by * 3 - bx * by * 4) * 4 ** (levels - 1 - k);
  }
  return (acc + 0.5) / total;
}
