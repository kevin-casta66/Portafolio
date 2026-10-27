/**
 * Direcciones del heap (design D2). Lógica PURA: la usan la lista SSR, la cuadrícula 2D y la escena
 * 3D, y no cambian al reordenar ni entre builds.
 *
 * La dirección sale de un hash FNV-1a de 32 bits de la clave del bloque (`<tipo>:<id>`), alineado a
 * 16 bytes para que parezca una dirección real. Si dos claves colisionan, la segunda (en orden
 * alfabético de clave) avanza de 16 en 16 hasta una libre: determinista y sin azar.
 */
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const ALIGN = 16;

export function fnv1a32(text: string): number {
  let hash = FNV_OFFSET;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }
  return hash >>> 0;
}

/** `0x` + 8 dígitos hexadecimales en minúscula. */
export const formatAddress = (value: number): string =>
  `0x${(value >>> 0).toString(16).padStart(8, "0")}`;

/** Asigna una dirección única a cada clave (el orden de entrada no cambia el resultado). */
export function assignAddresses(keys: readonly string[]): Map<string, string> {
  const result = new Map<string, string>();
  const used = new Set<number>();
  for (const key of [...new Set(keys)].sort()) {
    let value = (fnv1a32(key) & ~(ALIGN - 1)) >>> 0;
    while (used.has(value)) value = (value + ALIGN) >>> 0;
    used.add(value);
    result.set(key, formatAddress(value));
  }
  return result;
}

/** Dirección de una clave; lanza si no está en el mapa (un bloque sin dirección es un error de datos). */
export function addressOf(key: string, addresses: ReadonlyMap<string, string>): string {
  const address = addresses.get(key);
  if (address === undefined) throw new Error(`heap: no hay dirección para «${key}»`);
  return address;
}
