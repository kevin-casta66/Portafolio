/**
 * Cintas (tubos aplanados) a lo largo de curvas: la geometría de las ramas de T3. Datos puros, sin
 * three. Cada rama es una curva de Bézier cuadrática en forma de codo (baja desde el padre y gira
 * hacia el hijo) muestreada en `segments` tramos y extruida a `width` px; el shader da el aspecto de
 * tubo con el perfil transversal (`v`) y reparte el crecimiento con `u` (0 en el padre, 1 en el hijo).
 */
export interface Branch {
  from: readonly [number, number];
  to: readonly [number, number];
  /** Retardo de crecimiento 0..1. */
  delay: number;
}

export interface RibbonGeometry {
  /** x, y por vértice (en las unidades de entrada; z = 0). */
  positions: Float32Array;
  /** u (a lo largo), v (a lo ancho, −1..1), retardo, índice de rama. */
  params: Float32Array;
  indices: Uint32Array;
  vertexCount: number;
}

/** Índice del padre de cada fila de un árbol dado su nivel (−1 para la raíz). */
export function parentIndices(levels: readonly number[]): number[] {
  const stack: { index: number; level: number }[] = [];
  return levels.map((level, index) => {
    while (stack.length > 0 && (stack[stack.length - 1] as { level: number }).level >= level) stack.pop();
    const parent = stack.length > 0 ? (stack[stack.length - 1] as { index: number }).index : -1;
    stack.push({ index, level });
    return parent;
  });
}

/** Punto de la curva cuadrática (codo) de una rama en t ∈ [0, 1]. */
export function elbowPoint(branch: Branch, t: number): [number, number] {
  const [x0, y0] = branch.from;
  const [x2, y2] = branch.to;
  // El punto de control comparte la x del padre y la y del hijo: baja y luego gira.
  const x1 = x0;
  const y1 = y2;
  const a = (1 - t) * (1 - t);
  const b = 2 * (1 - t) * t;
  const c = t * t;
  return [a * x0 + b * x1 + c * x2, a * y0 + b * y1 + c * y2];
}

export function buildRibbons(branches: readonly Branch[], segments = 24, width = 7): RibbonGeometry {
  const perBranch = (segments + 1) * 2;
  const positions = new Float32Array(branches.length * perBranch * 2);
  const params = new Float32Array(branches.length * perBranch * 4);
  const indices = new Uint32Array(branches.length * segments * 6);
  const half = width / 2;

  branches.forEach((branch, b) => {
    for (let s = 0; s <= segments; s++) {
      const t = s / segments;
      const [x, y] = elbowPoint(branch, t);
      // Tangente por diferencias finitas → normal.
      const [xa, ya] = elbowPoint(branch, Math.max(0, t - 0.01));
      const [xb, yb] = elbowPoint(branch, Math.min(1, t + 0.01));
      let tx = xb - xa;
      let ty = yb - ya;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      const nx = -ty;
      const ny = tx;
      for (let side = 0; side < 2; side++) {
        const v = side === 0 ? -1 : 1;
        const vi = b * perBranch + s * 2 + side;
        positions[vi * 2] = x + nx * half * v;
        positions[vi * 2 + 1] = y + ny * half * v;
        params[vi * 4] = t;
        params[vi * 4 + 1] = v;
        params[vi * 4 + 2] = branch.delay;
        params[vi * 4 + 3] = b;
      }
    }
    for (let s = 0; s < segments; s++) {
      const a = b * perBranch + s * 2;
      indices.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], (b * segments + s) * 6);
    }
  });
  return { positions, params, indices, vertexCount: branches.length * perBranch };
}
