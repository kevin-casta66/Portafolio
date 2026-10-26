/**
 * Orden de recorrido post-order de un árbol aplanado en pre-order con sus niveles (`aria-level`).
 * T4 colapsa el árbol de habilidades en este orden: cada hoja antes que su rama y la raíz la última.
 *
 * Ejemplo: niveles [1, 2, 3, 3, 2, 3] (raíz, rama, hoja, hoja, rama, hoja) → índices [2, 3, 1, 5, 4, 0].
 */
export function postOrder(levels: readonly number[]): number[] {
  const out: number[] = [];
  const stack: number[] = []; // índices de los nodos abiertos (camino desde la raíz)
  levels.forEach((level, index) => {
    // Al subir de nivel (o quedarse en el mismo) se cierran los nodos abiertos de nivel >= actual.
    while (stack.length > 0 && (levels[stack[stack.length - 1] as number] as number) >= level) {
      out.push(stack.pop() as number);
    }
    stack.push(index);
  });
  while (stack.length > 0) out.push(stack.pop() as number);
  return out;
}
