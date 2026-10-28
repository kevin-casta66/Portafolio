import type { RibbonGeometry } from "../transitions/ribbons";

/**
 * Trazado de los tubos del árbol de habilidades (escena PARSER). Datos puros, sin three ni DOM.
 *
 * En lugar de una curva por hijo (que se solapan y cuelgan asimétricas), cada padre dibuja:
 *  - un TRAMO horizontal desde su borde derecho hasta su primer hijo (que comparte su fila);
 *  - un TRONCO vertical sobre la línea de su grupo, de la fila del padre a la del último hijo;
 *  - una DERIVACIÓN por cada hijo siguiente: cuarto de círculo de radio fijo desde el tronco y tramo
 *    horizontal hasta el hijo. Todos los codos son iguales: el árbol se lee simétrico.
 * Ningún tramo se dibuja dos veces, así que no hay zonas más brillantes por solapamiento.
 */
export interface TreeNode {
  /** Bordes horizontales de la fila (sin transformar) y centro vertical, en px de documento. */
  left: number;
  right: number;
  y: number;
  /** Índice del padre (−1 en la raíz). */
  parent: number;
  /** x de la línea de su grupo de hijos (si tiene hijos visibles). */
  groupX?: number | undefined;
}

export interface TreePath {
  points: [number, number][];
  /**
   * −1: el tramo se revela por la y de cada vértice (troncos y tramos horizontales, que siguen al
   * frente de aparición). ≥ 0: y de documento del hijo; la derivación crece a lo largo (u) al
   * acercarse ese hijo a la línea de aparición.
   */
  gate: number;
}

/** Segmentos de cada cuarto de círculo. */
const ARC_STEPS = 10;

function arc(cx: number, cy: number, r: number, from: number, to: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i <= ARC_STEPS; i++) {
    const a = from + ((to - from) * i) / ARC_STEPS;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

export function treePaths(nodes: readonly TreeNode[], radius = 10): TreePath[] {
  const paths: TreePath[] = [];
  nodes.forEach((parent, p) => {
    const children = nodes.filter((n) => n.parent === p);
    const first = children[0];
    if (!first) return;
    // Tramo horizontal padre → primer hijo (misma fila).
    paths.push({
      points: [
        [parent.right + 2, first.y],
        [first.left - 2, first.y],
      ],
      gate: -1,
    });
    const x = parent.groupX ?? (parent.right + first.left) / 2;
    const rest = children.slice(1);
    const last = rest[rest.length - 1];
    if (!last) return;
    const r = Math.max(2, Math.min(radius, (first.left - x) / 2, (last.y - first.y) / 2));
    // Tronco: de la fila del padre hasta donde empieza el codo del último hijo.
    paths.push({
      points: [
        [x, first.y],
        [x, last.y - r],
      ],
      gate: -1,
    });
    // Derivaciones: codo (cuarto de círculo de 180° a 90°, en y hacia abajo) + horizontal.
    for (const child of rest) {
      const elbow = arc(x + r, child.y - r, r, Math.PI, Math.PI / 2);
      paths.push({ points: [...elbow, [child.left - 2, child.y]], gate: child.y });
    }
  });
  return paths;
}

/**
 * Extruye cada trazado como cinta de `width` px. Parámetros por vértice: u (0..1 por longitud de
 * arco), v (−1..1 a lo ancho), `gate` y la y de documento del vértice (para el revelado por frente).
 */
export function buildPathRibbons(paths: readonly TreePath[], width = 6): RibbonGeometry {
  const vertexCount = paths.reduce((n, path) => n + path.points.length * 2, 0);
  const segmentCount = paths.reduce((n, path) => n + Math.max(0, path.points.length - 1), 0);
  const positions = new Float32Array(vertexCount * 2);
  const params = new Float32Array(vertexCount * 4);
  const indices = new Uint32Array(segmentCount * 6);
  const half = width / 2;
  let v0 = 0;
  let i0 = 0;
  for (const path of paths) {
    const pts = path.points;
    const lengths = [0];
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1] as [number, number];
      const [bx, by] = pts[i] as [number, number];
      lengths.push((lengths[i - 1] as number) + Math.hypot(bx - ax, by - ay));
    }
    const total = (lengths[lengths.length - 1] as number) || 1;
    pts.forEach(([x, y], i) => {
      // Tangente media de los tramos vecinos → normal (juntas sin huecos en los codos).
      const [px, py] = pts[Math.max(0, i - 1)] as [number, number];
      const [nx2, ny2] = pts[Math.min(pts.length - 1, i + 1)] as [number, number];
      let tx = nx2 - px;
      let ty = ny2 - py;
      const len = Math.hypot(tx, ty) || 1;
      tx /= len;
      ty /= len;
      for (let side = 0; side < 2; side++) {
        const v = side === 0 ? -1 : 1;
        const vi = v0 + i * 2 + side;
        positions[vi * 2] = x - ty * half * v;
        positions[vi * 2 + 1] = y + tx * half * v;
        params[vi * 4] = (lengths[i] as number) / total;
        params[vi * 4 + 1] = v;
        params[vi * 4 + 2] = path.gate;
        params[vi * 4 + 3] = y;
      }
    });
    for (let s = 0; s < pts.length - 1; s++) {
      const a = v0 + s * 2;
      indices.set([a, a + 1, a + 2, a + 2, a + 1, a + 3], i0);
      i0 += 6;
    }
    v0 += pts.length * 2;
  }
  return { positions, params, indices, vertexCount };
}
