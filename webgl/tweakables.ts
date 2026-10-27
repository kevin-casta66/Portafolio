/**
 * Registro de parámetros de shader ajustables en vivo (modo Debug, design D6). Cada escena registra
 * sus `uniform()` TSL expuestos con rango y valor por defecto; el panel de Debug genera un control por
 * parámetro para la escena visible y «Restablecer» reasigna los valores por defecto. Los valores NO se
 * persisten (solo duran la sesión).
 *
 * Es lógica pura, sin `three`: lo que se registra es un par `get`/`set` sobre el `uniform().value`.
 * Los uniforms son de módulo (viven lo que la página, no lo que un renderer), así que un valor
 * ajustado SOBREVIVE a un cambio de tier (que reasigna `outputNode` del `RenderPipeline`) y a la
 * recreación del contexto, sin recompilar nada.
 */
export interface Tweakable {
  /** Identificador estable (`bloomStrength`): también la clave de traducción `Debug.param.<id>`. */
  id: string;
  min: number;
  max: number;
  step: number;
  /** Valor por defecto al que vuelve «Restablecer». */
  defaultValue: number;
  get(): number;
  set(value: number): void;
  /** El parámetro solo tiene efecto en estos tiers (p. ej. el bloom solo en `high`). */
  onlyTiers?: readonly ("high" | "medium" | "low")[];
}

/** Escena a la que pertenecen los parámetros que afectan a TODAS (postprocesado). */
export const ALL_SCENES = "all";

const registry = new Map<string, Tweakable[]>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Registra (o reemplaza) los parámetros de una escena. Devuelve la función que los retira. */
export function registerTweakables(sceneId: string, params: readonly Tweakable[]): () => void {
  registry.set(sceneId, [...params]);
  notify();
  return () => {
    if (registry.get(sceneId) === undefined) return;
    registry.delete(sceneId);
    notify();
  };
}

/** Parámetros aplicables a las escenas dadas: los globales primero y luego los de cada escena. */
export function tweakablesFor(sceneIds: readonly string[]): Tweakable[] {
  const wanted = [ALL_SCENES, ...sceneIds];
  return wanted.flatMap((id) => registry.get(id) ?? []);
}

/** Vuelve todos los parámetros registrados a su valor por defecto. */
export function resetTweakables(): void {
  for (const params of registry.values()) for (const p of params) p.set(p.defaultValue);
}

export function subscribeTweakables(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Acota un valor al rango de un parámetro. */
export const clampTweakable = (p: Pick<Tweakable, "min" | "max">, value: number): number =>
  Math.min(p.max, Math.max(p.min, value));

/** Solo para pruebas. */
export function clearTweakablesForTests(): void {
  registry.clear();
  listeners.clear();
}
