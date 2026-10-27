import { audio } from "@/audio";
import { appStore } from "@/lib/store";

/** Texto visible en ambos idiomas. */
export interface Localized {
  es: string;
  en: string;
}

export interface AchievementDef {
  /** Identificador estable (`root_access`…): es lo que se persiste y lo que muestra el aviso. */
  id: string;
  title: Localized;
  /** Qué se hizo para desbloquearlo. */
  description: Localized;
  /** Pista que se ve mientras está bloqueado (sin destripar cómo). */
  hint: Localized;
}

const registry = new Map<string, AchievementDef>();

/**
 * Registra un logro. El registro es extensible: cualquier módulo (change 07 Memory Heap, 08 /motion…)
 * puede llamar a esta función con su propio logro sin tocar el sistema. Un identificador duplicado
 * lanza al importar el módulo, así que rompe el build y la suite de pruebas.
 */
export function defineAchievement(def: AchievementDef): AchievementDef {
  if (registry.has(def.id)) throw new Error(`Logro duplicado «${def.id}»: cada identificador debe ser único`);
  registry.set(def.id, def);
  return def;
}

export const getAchievements = (): AchievementDef[] => [...registry.values()];
export const getAchievement = (id: string): AchievementDef | undefined => registry.get(id);
export const achievementTotal = (): number => registry.size;

/**
 * Desbloquea un logro. Idempotente: devuelve `true` solo la primera vez (el store lo recuerda, lo
 * persiste y lo encola como aviso); un id que no está en el registro se ignora.
 */
export function unlock(id: string): boolean {
  if (!registry.has(id)) return false;
  const first = appStore.getState().unlockAchievement(id);
  if (first) audio.emit("achievement", { id });
  return first;
}

/** Solo para pruebas. */
export function resetAchievementsForTests(): void {
  registry.clear();
}
