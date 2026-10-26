/**
 * Orden de presentación de la experiencia: lo más reciente primero. Lo usan BYTECODE (la lista de
 * funciones) y el túnel de T4 (un anillo por empleo): comparten esta función, así que el orden de
 * los anillos es, por construcción, el orden del DOM.
 */
export function byRecency<T extends { start: string }>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => b.start.localeCompare(a.start));
}
