import type { CaseFrontmatter } from "@/lib/cases/schema";

type Diagram = NonNullable<CaseFrontmatter["diagram"]>;

export const NODE_W = 132;
export const NODE_H = 48;
const GAP_X = 76;
const GAP_Y = 44;
const PAD = 16;

export interface LaidNode {
  id: string;
  label: string;
  x: number;
  y: number;
  /** Paso en el que aparece (0 = primero). */
  step: number;
}

export interface LaidEdge {
  key: string;
  /** Curva de Bézier del borde de un nodo al del otro. */
  d: string;
  /** Punta de flecha (triángulo) al final de la curva. */
  arrow: string;
  step: number;
}

export interface DiagramLayout {
  width: number;
  height: number;
  cols: number;
  nodes: LaidNode[];
  edges: LaidEdge[];
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Triángulo con la punta en (x, y) mirando hacia (dx, dy), que es un eje (±1, 0) o (0, ±1). */
function arrowAt(x: number, y: number, dx: number, dy: number): string {
  const back = 9;
  const half = 5;
  const bx = x - dx * back;
  const by = y - dy * back;
  const px = -dy * half;
  const py = dx * half;
  return `M ${round(x)} ${round(y)} L ${round(bx + px)} ${round(by + py)} L ${round(bx - px)} ${round(by - py)} Z`;
}

/**
 * Coloca el diagrama en una rejilla (`col`, `row` de cada nodo) y calcula las curvas de las
 * conexiones. Puro y determinista: es lo mismo en el servidor (SSR) y en las pruebas.
 */
export function layoutDiagram(diagram: Diagram): DiagramLayout {
  const maxCol = Math.max(...diagram.nodes.map((n) => n.col));
  const maxRow = Math.max(...diagram.nodes.map((n) => n.row));

  const stepOfNode = new Map<string, number>();
  diagram.steps.forEach((step, k) => {
    for (const id of step.nodes) if (!stepOfNode.has(id)) stepOfNode.set(id, k);
  });

  const nodes: LaidNode[] = diagram.nodes.map((n) => ({
    id: n.id,
    label: n.label,
    x: PAD + n.col * (NODE_W + GAP_X),
    y: PAD + n.row * (NODE_H + GAP_Y),
    step: stepOfNode.get(n.id) ?? 0,
  }));
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const edges: LaidEdge[] = [];
  diagram.steps.forEach((step, k) => {
    for (const [fromId, toId] of step.edges) {
      const a = byId.get(fromId);
      const b = byId.get(toId);
      if (!a || !b) continue;
      let x1: number, y1: number, x2: number, y2: number, dx: number, dy: number, d: string;
      if (a.x !== b.x) {
        const right = b.x > a.x;
        x1 = a.x + (right ? NODE_W : 0);
        x2 = b.x + (right ? 0 : NODE_W);
        y1 = a.y + NODE_H / 2;
        y2 = b.y + NODE_H / 2;
        dx = right ? 1 : -1;
        dy = 0;
        const xm = (x1 + x2) / 2;
        d = `M ${round(x1)} ${round(y1)} C ${round(xm)} ${round(y1)}, ${round(xm)} ${round(y2)}, ${round(x2)} ${round(y2)}`;
      } else {
        const down = b.y > a.y;
        x1 = a.x + NODE_W / 2;
        x2 = x1;
        y1 = a.y + (down ? NODE_H : 0);
        y2 = b.y + (down ? 0 : NODE_H);
        dx = 0;
        dy = down ? 1 : -1;
        d = `M ${round(x1)} ${round(y1)} L ${round(x2)} ${round(y2)}`;
      }
      edges.push({ key: `${fromId}-${toId}`, d, arrow: arrowAt(x2, y2, dx, dy), step: k });
    }
  });

  return {
    width: PAD * 2 + (maxCol + 1) * NODE_W + maxCol * GAP_X,
    height: PAD * 2 + (maxRow + 1) * NODE_H + maxRow * GAP_Y,
    cols: maxCol + 1,
    nodes,
    edges,
  };
}
