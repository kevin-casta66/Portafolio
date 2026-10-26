/**
 * Marca como «pendiente de sustituir» el texto de ejemplo. `ph()` devuelve el valor sin cambios y
 * registra sus cadenas; `pnpm content:todo` lista dónde siguen apareciendo. Úsalo solo con texto
 * visible (nombres, descripciones, URLs), no con identificadores.
 */
const registry = new Set<string>();

export function ph<T extends string | Record<string, string>>(value: T): T {
  if (typeof value === "string") registry.add(value);
  else for (const v of Object.values(value)) registry.add(v);
  return value;
}

export const isPlaceholder = (value: string): boolean => registry.has(value);

/** Recorre cualquier estructura y devuelve la ruta de cada cadena que sigue siendo placeholder. */
export function findPlaceholders(value: unknown, path = ""): string[] {
  if (typeof value === "string") return registry.has(value) ? [path] : [];
  if (Array.isArray(value)) return value.flatMap((v, i) => findPlaceholders(v, `${path}[${i}]`));
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([k, v]) =>
      findPlaceholders(v, path ? `${path}.${k}` : k),
    );
  }
  return [];
}
